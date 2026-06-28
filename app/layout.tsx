import type { Metadata, Viewport } from "next";
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
  title: "Sticker Maker — Custom Text Overlay",
  description:
    "Add custom text to your favorite character stickers from Project Sekai and Arcaea. Pick a character, type your text, and download.",
  keywords: ["sticker", "meme", "project sekai", "pjsk", "arcaea", "text overlay", "meme generator"],
  openGraph: {
    title: "Sticker Maker",
    description: "Create custom text overlays on character stickers",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
