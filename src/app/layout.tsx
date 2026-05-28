import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./facility.css";
import "./facility-stabilization.css";
import "./facility-embodiment.css";
import "./facility-signals.css";
import "./facility-infrastructure.css";
import "./facility-events.css";
import "./facility-residue.css";
import "./facility-inspection.css";
import "./facility-dossier.css";
import "./facility-navigation.css";
import "./projects-registry.css";
import "./temporal-cards.css";

export const metadata: Metadata = {
  title: "CCC — Continuity Command Center",
  description:
    "Nested temporal cards, decks, snapshots, and timelines for builder continuity.",
  applicationName: "CCC",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070b12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
