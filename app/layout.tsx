import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/sidebar";
import { MobileNav } from "./components/mobile-nav";
import { TopBar } from "./components/top-bar";

export const metadata: Metadata = {
  title: "UI Standardization Platform",
  description: "Enterprise Web UI Standardization Platform (mock data)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="flex min-h-screen">
          {/* Sidebar: เดสก์ท็อปเท่านั้น (ซ่อนบน mobile → ใช้ MobileNav drawer แทน) */}
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <TopBar />
            <main className="min-w-0 flex-1 bg-[var(--color-surface)] p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
