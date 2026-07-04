import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TVA Collect - Collecte TVA pour cabinets comptables",
  description:
    "Centralisez les demandes, depots et relances TVA. Un lien par client, une vue claire pour votre equipe, sans compte cote client."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
