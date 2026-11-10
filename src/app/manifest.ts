import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mahfaza",
    short_name: "Mahfaza",
    description: "Personal money automation",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#f3eee4",
    lang: "en",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
