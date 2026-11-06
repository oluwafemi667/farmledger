import type { MetadataRoute } from "next";

// Keep crawlers and link previews out of the one-click demo sign-in.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: ["/demo", "/design", "/reports/export"] } };
}
