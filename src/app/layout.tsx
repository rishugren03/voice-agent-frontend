import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mykare AI — Healthcare Assistant",
  description: "Voice-powered healthcare front-desk assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f0f4f8]">{children}</body>
    </html>
  );
}
