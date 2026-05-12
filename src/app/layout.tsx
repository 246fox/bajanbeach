import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-S6V0BFCJPB";
const isProduction = process.env.NODE_ENV === "production";

const SEO_TITLE = "BajanBeach — Live Barbados Beach Conditions for 63 Beaches";
/** ~152 characters — tuned for Google snippet display (150–160). */
const SEO_DESCRIPTION =
  "Live wave, wind & surf for 63 Barbados beaches, updated daily. Platinum West Coast to Soup Bowl surf—webcams, photos & local picks. Plan your beach day.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bajanbeach.com"),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: "/",
    siteName: "BajanBeach",
    locale: "en_BB",
    type: "website",
    images: [
      {
        url: "/logo.jpeg",
        width: 1024,
        height: 559,
        alt: "BajanBeach — Barbados beach conditions"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: ["/logo.jpeg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
      {isProduction && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
    </html>
  );
}
