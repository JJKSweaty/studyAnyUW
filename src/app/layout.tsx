import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/query-provider";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyAny Local",
  description: "Local-first study trainer with private storage and local model support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
