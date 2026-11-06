import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Farmledger",
    template: "%s | Farmledger",
  },
  description:
    "Poultry farm records, finances and a daily briefing, built to keep working without a connection.",
};

export const viewport: Viewport = {
  themeColor: "#070908",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dark is the default. The choice is kept in a cookie, not script, so the
  // right theme is in the first paint and the strict CSP needs no inline script.
  const theme = cookies().get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
