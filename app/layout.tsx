import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas FE",
  description: "前端面试复习社区：八股文、算法、前端手写与在线练习",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
