import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/contexts/cart-context";
import { Toaster } from "@/components/toaster";
import { MainLayout } from "@/components/main-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IDEBS - Admin Dashboard",
  description: "A comprehensive eCommerce admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script src="https://js.paystack.co/v1/inline.js" async></script>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <CartProvider>
            <MainLayout>{children}</MainLayout>
            <Toaster />
          </CartProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
