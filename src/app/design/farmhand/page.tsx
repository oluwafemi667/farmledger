import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { FarmhandPreview } from "./preview";

export const metadata: Metadata = { title: "Farmhand screens" };

export default function FarmhandPreviewPage() {
  return (
    <main className="mx-auto flex max-w-page flex-col gap-12 px-4 py-10 md:px-8 md:py-16">
      <PageHeader
        eyebrow="Farmledger / Stage 3"
        title="Farmhand screens"
        description="The daily checklist and the four logging forms on demonstration data. Sized for a phone."
        actions={
          <Link
            href="/design"
            className="inline-flex min-h-11 items-center rounded border border-ivory-400 bg-ivory-50 px-4 text-sm font-medium transition-colors duration-150 ease-ledger hover:bg-ivory-200"
          >
            Design system
          </Link>
        }
      />
      <FarmhandPreview />
    </main>
  );
}
