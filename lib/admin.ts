import { getStatus, login, logout, recover, setup } from "./auth.server";
import { createMiddleware, createServerFn } from "@tanstack/react-start";

type Credentials = { username: string; password: string };

const credentials = <T extends Credentials>(input: T) => {
  if (typeof input.username !== "string" || typeof input.password !== "string")
    throw new Error("username and password must be strings");
  return input;
};

// route guards only stop rendering, so admin server functions check the session themselves
export const adminOnly = createMiddleware({ type: "function" }).server(async ({ next }) => {
  if ((await getStatus()) !== "in") throw new Error("Not signed in.");
  return next();
});

export const getAuth = createServerFn({ method: "GET" }).handler(() => getStatus());

export const setupAdmin = createServerFn({ method: "POST" })
  .validator(credentials)
  .handler(({ data }) => setup(data.username, data.password));

export const loginAdmin = createServerFn({ method: "POST" })
  .validator(credentials)
  .handler(({ data }) => login(data.username, data.password));

export const recoverAdmin = createServerFn({ method: "POST" })
  .validator((input: Credentials & { code: string }) => {
    if (typeof input.code !== "string") throw new Error("code must be a string");
    return credentials(input);
  })
  .handler(({ data }) => recover(data.username, data.code, data.password));

export const logoutAdmin = createServerFn({ method: "POST" }).handler(() => logout());
