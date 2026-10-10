import { getPrisma } from "./prisma.server";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { argon2, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// the one account always has this id, so a second setup fails on the primary key
const ADMIN_ID = 1;
const COOKIE = "admin_session";
const SESSION_DAYS = 30;
const MIN_PASSWORD = 12;

export type AuthStatus = "setup" | "login" | "in";

const hashArgon = promisify(argon2);

// OWASP argon2id baseline: 19 MiB, 2 passes
const derive = (password: string, salt: Buffer) =>
  hashArgon("argon2id", {
    message: password,
    nonce: salt,
    parallelism: 1,
    tagLength: 32,
    memory: 19456,
    passes: 2,
  });

const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(password, salt)).toString("hex")}`;
};

const verifyPassword = async (password: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(
    await derive(password, Buffer.from(salt, "hex")),
    Buffer.from(hash, "hex"),
  );
};

// tokens and recovery codes are random enough that a plain sha256 is safe to store
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const sameHash = (a: string, b: string) => timingSafeEqual(Buffer.from(a), Buffer.from(b));

// 20 base32 characters (100 bits) in groups of 4: ABCD-EFGH-...
const newRecoveryCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = [...randomBytes(20)].map((byte) => alphabet[byte % alphabet.length]);
  return chars.join("").match(/.{4}/g)!.join("-");
};

const normalizeCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .match(/.{1,4}/g)
    ?.join("-") ?? "";

const startSession = async () => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  const prisma = getPrisma();

  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.adminSession.create({ data: { id: sha256(token), adminId: ADMIN_ID, expiresAt } });
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
};

const checkPassword = (password: string) => {
  if (password.length < MIN_PASSWORD)
    throw new Error(`Password needs at least ${MIN_PASSWORD} characters.`);
};

export const getStatus = async (): Promise<AuthStatus> => {
  const prisma = getPrisma();
  const token = getCookie(COOKIE);

  if (token) {
    const session = await prisma.adminSession.findUnique({ where: { id: sha256(token) } });
    if (session && session.expiresAt > new Date()) return "in";
  }
  return (await prisma.admin.count()) ? "login" : "setup";
};

/** Creates the only account and signs in. Returns the recovery code, shown once. */
export const setup = async (username: string, password: string) => {
  const prisma = getPrisma();
  if (await prisma.admin.count()) throw new Error("The account already exists.");
  if (!username.trim()) throw new Error("Username is required.");
  checkPassword(password);

  const code = newRecoveryCode();
  await prisma.admin.create({
    data: {
      id: ADMIN_ID,
      username: username.trim(),
      passwordHash: await hashPassword(password),
      recoveryHash: sha256(code),
    },
  });
  await startSession();
  return code;
};

export const login = async (username: string, password: string) => {
  const admin = await getPrisma().admin.findUnique({ where: { id: ADMIN_ID } });
  if (!admin) throw new Error("No account yet.");

  // verify the password even for a wrong username so both take the same time
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid || username.trim() !== admin.username) throw new Error("Wrong username or password.");

  await startSession();
};

/** Spends the recovery code: sets a new password, signs out everywhere, returns the next code. */
export const recover = async (username: string, code: string, password: string) => {
  const prisma = getPrisma();
  const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  if (!admin) throw new Error("No account yet.");

  const valid = sameHash(sha256(normalizeCode(code)), admin.recoveryHash);
  if (!valid || username.trim() !== admin.username)
    throw new Error("Wrong username or recovery code.");
  checkPassword(password);

  const next = newRecoveryCode();
  await prisma.$transaction([
    prisma.adminSession.deleteMany(),
    prisma.admin.update({
      where: { id: ADMIN_ID },
      data: { passwordHash: await hashPassword(password), recoveryHash: sha256(next) },
    }),
  ]);
  await startSession();
  return next;
};

export const logout = async () => {
  const token = getCookie(COOKIE);
  if (token) await getPrisma().adminSession.deleteMany({ where: { id: sha256(token) } });
  deleteCookie(COOKIE, { path: "/" });
};
