import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import "@/components/ui/study-panels.css";
import "@/components/account/account.css";

export const metadata: Metadata = {
  title: "NeuroQuest — A place for everything you know",
  description:
    "Turn knowledge into a world you can explore. Build your 3D memory palace, connect ideas to places, and practice active recall.",
  applicationName: "NeuroQuest",
  appleWebApp: {
    capable: true,
    title: "NeuroQuest",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f8f7fc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
