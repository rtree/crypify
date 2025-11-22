import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypify - Crypto Payments Made Easy",
  description: "Accept crypto payments and earn rewards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
