import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata = {
  title: "Expense Orbit",
  description: "Smart home expense tracking with shared projects and PIN unlock.",
  applicationName: "Expense Orbit",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expense Orbit",
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
