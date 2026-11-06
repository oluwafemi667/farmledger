import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { OwnerPreview } from "./preview";

export const metadata: Metadata = { title: "Owner screens" };

export default function OwnerPreviewPage() {
  return (
    <main className="mx-auto flex max-w-page flex-col gap-16 px-4 py-10 md:px-8 md:py-16">
      <PageHeader
        eyebrow="Farmledger / Stage 3"
        title="Owner screens"
        description="The flock directory, a flock's own page and the add and edit forms, on demonstration data."
        actions={
          <Link
            href="/design/farmhand"
            className="inline-flex min-h-11 items-center rounded border border-ivory-400 bg-ivory-50 px-4 text-sm font-medium transition-colors duration-150 ease-ledger hover:bg-ivory-200"
          >
            Farmhand screens
          </Link>
        }
      />
      <OwnerPreview />
    </main>
  );
}
