import type { Metadata } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import { Toaster } from "@/components/ui/sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mep.eomeg.in";

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
        width: 1200,
        height: 630,
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
        <link
          rel="preload"
          as="image"
          href="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop"
        />
      </head>
      <body className="antialiased">
        <ErrorReporter />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
