import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SOPProvider } from "@/contexts/SOPContext";

export const metadata: Metadata = {
  title: "A3 Brands - Knowledge Base",
  description: "Internal Knowledge Base for A3 Brands team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#F8FAFC] text-[#0F172A]">
        <AuthProvider>
          <SOPProvider>{children}</SOPProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
