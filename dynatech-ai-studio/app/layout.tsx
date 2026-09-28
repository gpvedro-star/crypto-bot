import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./studio.css";

export const metadata: Metadata = { title: "DynaTech AI Studio", description: "Autonomous multi-agent website creation studio" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
