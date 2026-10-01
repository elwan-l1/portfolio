import "./globals.css";
import { art, martian } from "./fonts";
import { VERSION } from "@/constants/global";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Portfolio V${VERSION}`,
  description: "Hey, welcome to my portfolio! I'm a software engineer that do things.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${martian.variable} ${art.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
