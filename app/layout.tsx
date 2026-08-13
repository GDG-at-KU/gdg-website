import type { Metadata } from "next";
import { BrandLoader } from "./components/BrandLoader";
import { GdgCursor } from "./components/GdgCursor";
import { PwaRegister } from "./components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDG on Campus KU | Build what's next",
  description: "Google Developer Groups on Campus at the University of Kansas.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "256x256" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "GDG on Campus KU",
    description: "Build what's next, together.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="stylesheet" href="/member.css" />
        <meta name="theme-color" content="#0051ba" />
      </head>
      <body>
        <BrandLoader />
        {children}
        <PwaRegister />
        <GdgCursor />
      </body>
    </html>
  );
}
