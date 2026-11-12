import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PrintPhoneCover – Custom Photo Phone Cases, Printed in Texas",
  description: "Design your own phone case with your photo. iPhone, Samsung Galaxy, Google Pixel and moto. Printed in Texas and shipped across the US, or picked up free at our machines.",
  applicationName: "PrintPhoneCover",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", siteName: "PrintPhoneCover", locale: "en_US", url: "/",
    title: "PrintPhoneCover – Your photo on your phone case",
    description: "Design a custom photo case online for 60 phone models. Shipped across the US or picked up free at our Texas machines.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PrintPhoneCover custom photo phone cases" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Pacifico&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
