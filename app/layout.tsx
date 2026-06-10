import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCR Web",
  description: "Document OCR to DOCX with Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
