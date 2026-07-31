import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Media Archive",
  description: "A minimalist personal media archive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground selection:bg-white/10 flex flex-col" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
