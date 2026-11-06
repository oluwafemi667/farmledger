import { FarmhandShell } from "@/components/farmhand/farmhand-shell";
import { LogMenu } from "@/components/farmhand/log-menu";
import { PageHeader } from "@/components/ui";

// Preview of the real farmhand frame (top bar, Back link, Add entry, bottom tabs) with no sign-in.
export default function ShellPreview() {
  return (
    <FarmhandShell profile={{ userId: "x", email: null, fullName: "Dudu Labi", role: "owner", farmId: "x" }} farmName="Demo Farm" isDemo>
      <PageHeader eyebrow="Log" title="Record eggs" description="Preview of the farmhand frame." />
      <LogMenu />
    </FarmhandShell>
  );
}
