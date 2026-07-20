import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "บ้านเรา",
  description: "รายรับรายจ่ายและโปรเจกต์ร่วม",
  applicationName: "บ้านเรา",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "บ้านเรา",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff8a1f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
