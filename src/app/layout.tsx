import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsmono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "podtube",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jetbrainsmono.className}>{children}</body>
    </html>
  );
}
