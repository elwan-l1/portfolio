import type { ReactNode } from "react";

import { fontCss, fontLinks } from "../fonts";
import appCss from "../globals.css?url";
import { HeadContent, Outlet, Scripts, createRootRoute, useParams } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1e1e2e" },
      { name: "color-scheme", content: "dark" },
    ],
    links: [
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
      ...fontLinks,
      { rel: "stylesheet", href: appCss },
    ],
    styles: [{ children: fontCss }],
  }),
  shellComponent: RootDocument,
  component: Outlet,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { lang } = useParams({ strict: false });

  return (
    <html lang={lang ?? "en"} className="h-full antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
