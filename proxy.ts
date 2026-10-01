import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "fr", "de", "it"];
const defaultLocale = "en";

const getLocale = (request: NextRequest): string => {
  const acceptLanguage = request.headers.get("accept-language") ?? "en";

  const headers = {
    "accept-language": acceptLanguage,
  };

  const languages = new Negotiator({ headers }).languages();

  return match(languages, locales, defaultLocale);
};

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathnameHasLocale) {
    return;
  }

  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
};

export const config = {
  matcher: ["/((?!_next|.*\\..*|robots.txt|sitemap|static|images/|icons/).*)"],
};
