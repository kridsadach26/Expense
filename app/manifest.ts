import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "บ้านเรา - รายรับรายจ่าย",
    short_name: "บ้านเรา",
    description: "บันทึกรายรับรายจ่าย บิลแชร์ และค่าใช้จ่ายโปรเจกต์",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#ff8a1f",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
    ]
  };
}
