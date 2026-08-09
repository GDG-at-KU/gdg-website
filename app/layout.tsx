import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "./components/PwaRegister";

export const metadata: Metadata = {
  title: "GDG on Campus KU | Build what's next",
  description: "Google Developer Groups on Campus at the University of Kansas.",
  openGraph: { title: "GDG on Campus KU", description: "Build what's next, together.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="manifest" href="/manifest.webmanifest" /><meta name="theme-color" content="#0051ba" /></head><body>{children}<PwaRegister /></body></html>;
}
