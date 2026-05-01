import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BajanBeach",
  description: "Live Barbados beach conditions at a glance."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
