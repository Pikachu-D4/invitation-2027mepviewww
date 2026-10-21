import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import { Toaster } from "@/components/ui/sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://mep-invitation.toxicsmile22936.me");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MEP Invitation 2027 – New Year Celebration",
  description:
    "Join the New Year 2027 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply, learn more, and celebrate with us.",
  keywords:
    "MEP, New Year 2027, AMV, Leaders, Co-Leaders, Application, Video Editing, Collaboration",
  authors: [{ name: "MEP 2027 Team" }],
  openGraph: {
    title: "MEP Invitation 2027 – New Year Celebration",
    description:
      "Join the New Year 2027 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply as Leader or Co-Leader today!",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "MEP 2027",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 341,
        type: "image/png",
        alt: "MEP 2027 – New Year Celebration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MEP Invitation 2027 – New Year Celebration",
    description:
      "Join the New Year 2027 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply as Leader or Co-Leader today!",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Unsplash hero bg image (opacity: 0.1) is kept in the hero section
            but its preload was removed — it is not LCP-critical and the early
            high-priority fetch wasted bandwidth, especially on mobile. */}
      </head>
      <body className="antialiased">
        <ErrorReporter />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
