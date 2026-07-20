import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata = {
  title: "Harmony Haven",
  description: "Smart home expense tracking with shared projects and PIN unlock.",
  applicationName: "Harmony Haven",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Harmony Haven",
  },
};

export const viewport = {
  themeColor: "#ff8a1f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
