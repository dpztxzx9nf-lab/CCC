import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./facility.css";
import "./facility-stabilization.css";
import "./facility-embodiment.css";
import "./facility-signals.css";

export const metadata: Metadata = {
  title: "CCC — Continuity Command Center",
  description:
    "Living operational projection layer for projects, systems, workflows, and goals.",
  applicationName: "CCC",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
