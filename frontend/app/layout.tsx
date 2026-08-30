import type { Metadata } from "next";
import PageViewTracker from "@/components/PageViewTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI硬件选型助手",
  description: "用自然语言描述需求，AI 帮你选元器件、生成 BOM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
