import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Vibechekk - AI-Powered GitHub Profile Analysis for Technical Recruiting",
  description: "Instantly analyze any GitHub profile to reveal developer archetypes, code quality, and hiring insights. Trusted by recruiters worldwide.",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  openGraph: {
    title: "Vibechekk - Know Your Developer",
    description: "AI-Powered GitHub Profile Analysis for Technical Recruiting",
    url: "https://vibechekk.dev",
    siteName: "Vibechekk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibechekk - Know Your Developer",
    description: "AI-Powered GitHub Profile Analysis for Technical Recruiting",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
