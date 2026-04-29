import type { Metadata } from "next";
import "./globals.css";
import { DashboardLayout } from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "SalesMaya | Mykare AI",
  description: "Advanced AI healthcare assistant for sales teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
