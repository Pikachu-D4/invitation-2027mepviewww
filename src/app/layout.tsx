import type { Metadata } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import { Toaster } from "@/components/ui/sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mep.eomeg.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MEP Invitation 2026 – New Year Celebration",
  description:
    "Join the New Year 2026 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply, learn more, and celebrate with us.",
  keywords:
    "MEP, New Year 2026, AMV, Leaders, Co-Leaders, Application, Video Editing",
  authors: [{ name: "MEP 2026 Team" }],
  openGraph: {
    title: "MEP Invitation 2026 – New Year Celebration",
    description:
      "Join the New Year 2026 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply as Leader or Co-Leader today!",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "MEP 2026",
    images: [
      {
        url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
        width: 1600,
        height: 900,
        alt: "New Year 2026 MEP Invitation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MEP Invitation 2026 – New Year Celebration",
    description:
      "Join the New Year 2026 MEP: a 30-member initiative led by 3 leaders and 3 co-leaders. Apply as Leader or Co-Leader today!",
    images: [
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
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
      <body className="antialiased">
        <ErrorReporter />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
