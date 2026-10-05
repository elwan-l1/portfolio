import { LANGUAGES, hasLocale } from "@/constants/global";
import { match } from "@formatjs/intl-localematcher";
import { createMiddleware, createStart } from "@tanstack/react-start";
import Negotiator from "negotiator";

const defaultLocale = "en";

const getLocale = (request: Request) => {
  const headers = { "accept-language": request.headers.get("accept-language") ?? "en" };
  const languages = new Negotiator({ headers }).languages();

  return match(languages, [...LANGUAGES], defaultLocale);
};

// sends `/` and any path without a locale to the browser's language
const localeRedirect = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  const [, first = ""] = url.pathname.split("/");

  if (hasLocale(first) || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_")) {
    return next();
  }
  if (url.pathname.includes(".")) return next();

  const pathname = url.pathname === "/" ? "" : url.pathname;
  return new Response(null, {
    status: 307,
    headers: { Location: `/${getLocale(request)}${pathname}${url.search}` },
  });
});

export const startInstance = createStart(() => ({ requestMiddleware: [localeRedirect] }));
