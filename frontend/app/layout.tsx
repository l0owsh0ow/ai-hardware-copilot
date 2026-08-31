import type { Metadata } from "next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import PageViewTracker from "@/components/PageViewTracker";
import VoltBackground from "@/components/VoltBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI硬件选型助手",
  description: "用自然语言描述需求，AI 帮你选元器件、生成 BOM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <VoltBackground />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
