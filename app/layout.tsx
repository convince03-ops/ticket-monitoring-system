import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import brandIcon from "./assets/BRANDCOM ICON.png";

export const metadata: Metadata = {
  title: "Ticket Monitoring System",
  description: "Internal Multimedia Department ticket monitoring dashboard",
  icons: {
    icon: brandIcon.src,
    shortcut: brandIcon.src,
    apple: brandIcon.src
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
