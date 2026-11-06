import { notFound } from "next/navigation";

// The design previews are working pages for the developer. They are not part of the product,
// so a production build hides them unless NEXT_PUBLIC_SHOW_DESIGN=1 is set.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SHOW_DESIGN !== "1") notFound();
  return children;
}
