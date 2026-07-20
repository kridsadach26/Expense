export default function manifest() {
  return {
    name: "Harmony Haven",
    short_name: "Haven",
    description: "Track household expenses, shared bills, and trip projects in one elegant app.",
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
