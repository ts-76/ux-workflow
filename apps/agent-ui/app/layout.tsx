import { Inter } from "next/font/google";
import "./globals.css";
import { WorkflowStateProvider } from "@/components/WorkflowStateProvider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <WorkflowStateProvider>
          {children}
        </WorkflowStateProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: "UX評価エージェント",
  description: "AIを活用したUXデザインの自動評価システム",
};
