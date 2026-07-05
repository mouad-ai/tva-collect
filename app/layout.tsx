import type { Metadata, Viewport } from "next";
import "./globals.css";

const metadataBase = new URL(process.env.APP_URL || "https://app.tvacollect.com");
const title = "TVA Collect - Collecte TVA pour cabinets comptables";
const description =
  "Centralisez les demandes, depots et relances TVA. Un lien par client, une vue claire pour votre equipe, sans compte cote client.";

export const metadata: Metadata = {
  metadataBase,
  applicationName: "TVA Collect",
  title: {
    default: title,
    template: "%s | TVA Collect"
  },
  description,
  manifest: "/site.webmanifest",
  category: "business",
  keywords: ["TVA", "collecte documents", "cabinet comptable", "Maroc", "fiduciaire"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "TVA Collect",
    statusBarStyle: "default"
  },
  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: "/",
    siteName: "TVA Collect",
    title,
    description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TVA Collect - collecte TVA pour cabinets comptables"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
