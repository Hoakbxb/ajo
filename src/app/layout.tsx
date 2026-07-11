import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ConditionalChrome from "@/components/ConditionalChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Friends Reward Circle",
  description:
    "A private community with a simple 2× matrix reward system. Join voluntarily, contribute ₦5,000, and receive ₦10,000 when your matrix completes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <ConditionalChrome>{children}</ConditionalChrome>
      </body>
    </html>
  );
}
