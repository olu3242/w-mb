import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ówàmbẹ̀ — Give. Plan. Celebrate.",
  description:
    "Unified platform for gifting, planning, and executing any occasion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@700;800&family=Playfair+Display:ital,wght@1,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
