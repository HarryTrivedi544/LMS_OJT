import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
