import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LMS OJT",
  description: "OJT LMS and performance tracking MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
