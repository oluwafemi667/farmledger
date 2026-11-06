import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farmledger",
    short_name: "Farmledger",
    description: "Poultry farm records, stock and sales.",
    start_url: "/",
    display: "standalone",
    background_color: "#070908",
    theme_color: "#070908",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
