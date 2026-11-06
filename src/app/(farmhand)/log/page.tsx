import type { Metadata } from "next";
import { LogMenu } from "@/components/farmhand/log-menu";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Log" };

export default function LogPage() {
  return (
    <>
      <PageHeader eyebrow="Log" title="What are you recording?" />
      <LogMenu />
    </>
  );
}
