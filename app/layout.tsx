import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "TVA Collect — Collecte TVA pour cabinets comptables",
  description:
    "Centralisez les demandes, dépôts et relances TVA. Un lien par client, une vue claire pour votre équipe — sans compte côté client."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={sans.className}>{children}</body>
    </html>
  );
}
