import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import {
  Button,
  DataTable,
  EmptyState,
  LedgerStat,
  Notice,
  PageHeader,
  SectionHeading,
  StatSkeleton,
  StatusChip,
  SyncChip,
  type Column,
} from "@/components/ui";
import type { SyncState } from "@/types/sync";
import { FarmhandDemo } from "./farmhand-demo";

export const metadata: Metadata = { title: "Design system" };

const palette = [
  { name: "Ivory 100", token: "bg-ivory-100", hex: "#F6F1E7", use: "Application background" },
  { name: "Ivory 200", token: "bg-ivory-200", hex: "#EEE7D7", use: "Sunken surfaces, hover" },
  { name: "Ivory 300", token: "bg-ivory-300", hex: "#E0D7C3", use: "Hairline rules" },
  { name: "Forest 800", token: "bg-forest-800", hex: "#1F3A2E", use: "Brand, primary action" },
  { name: "Forest 600", token: "bg-forest-600", hex: "#2F5A45", use: "On or above expected" },
  { name: "Olive 500", token: "bg-olive-500", hex: "#7A8450", use: "Secondary data series" },
  { name: "Stone 600", token: "bg-stone-600", hex: "#615C51", use: "Supporting text, unchanged" },
  { name: "Stone 900", token: "bg-stone-900", hex: "#1F1D18", use: "Ink" },
  { name: "Terracotta 600", token: "bg-attention-600", hex: "#AC512B", use: "Needs attention only" },
  { name: "Brick 600", token: "bg-danger-600", hex: "#9B2C20", use: "Failure, error, destructive" },
];

interface DemoFlock {
  id: string;
  name: string;
  birds: number;
  henDay: string;
  mortality: string;
  state: "positive" | "attention" | "neutral";
  label: string;
}

// Demonstration data. It is defined here, in the design page only, and is
// never read by any production screen.
const demoFlocks: DemoFlock[] = [
  { id: "a", name: "Demo flock A", birds: 1180, henDay: "88.4%", mortality: "0.1%", state: "positive", label: "On curve" },
  { id: "b", name: "Demo flock B", birds: 960, henDay: "79.2%", mortality: "0.6%", state: "attention", label: "Below curve" },
  { id: "c", name: "Demo flock C", birds: 540, henDay: "84.0%", mortality: "0.2%", state: "neutral", label: "Settling in" },
];

const flockColumns: Column<DemoFlock>[] = [
  { key: "name", header: "Flock", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "birds", header: "Live birds", numeric: true, hideOnMobile: true, render: (r) => r.birds.toLocaleString("en-NG") },
  { key: "hd", header: "Hen-day", numeric: true, render: (r) => r.henDay },
  { key: "mort", header: "Mortality", numeric: true, hideOnMobile: true, render: (r) => r.mortality },
  {
    key: "state",
    header: "Against curve",
    render: (r) => <StatusChip tone={r.state}>{r.label}</StatusChip>,
  },
];

const syncStates: SyncState[] = ["local", "waiting", "syncing", "synced", "failed"];

export default function DesignPage() {
  return (
    <main className="mx-auto flex max-w-page flex-col gap-16 px-4 py-10 md:px-8 md:py-16">
      <PageHeader
        eyebrow="Farmledger / Stage 1"
        title="Design system"
        description="Tokens and components for both interfaces. Every figure on this page is demonstration data."
      />

      <section className="flex flex-col gap-6" aria-labelledby="colour">
        <SectionHeading
          title="Colour with a job"
          description="Green means on or above expected. Terracotta means needs attention. Brick means something failed. Nothing else uses those colours."
        />
        <h3 id="colour" className="sr-only">Palette</h3>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-5">
          {palette.map((c) => (
            <li key={c.name} className="flex flex-col gap-2">
              <span className={`${c.token} h-14 rounded border border-ivory-400`} />
              <span className="text-sm font-medium">{c.name}</span>
              <span className="figure text-xs text-stone-600">{c.hex}</span>
              <span className="text-xs text-stone-700">{c.use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Type"
          description="Geist for the whole interface, Geist Mono with tabular figures for every number."
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Display, 48px</p>
            <p className="font-display text-4xl font-medium">Good morning, Femi</p>
            <p className="eyebrow">Section heading, 28px</p>
            <p className="font-display text-2xl font-medium">Flocks that need a look</p>
            <p className="eyebrow">Body, 16px</p>
            <p className="max-w-prose">
              Flock B laid fewer eggs than the expected curve for its age on each
              of the last three days. This is a pattern in the records, not a
              diagnosis.
            </p>
            <p className="eyebrow">Supporting, 15px</p>
            <p className="text-sm text-stone-700">Last entry by Demo farmhand at 06:42</p>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
            <LedgerStat label="Eggs today" value="2,214" />
            <LedgerStat label="Sales this week" value="N 1,486,000" />
            <LedgerStat label="Hen-day rate" value="84.9" unit="%" size="lg" className="sm:col-span-2" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Owner: ledger figures"
          description="Figures sit on rules, not in boxes. Direction is shown by an icon and words as well as colour, and tone reflects meaning: more deaths is attention, not positive."
        />
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          <LedgerStat
            label="Live birds"
            value="2,680"
            note="Placed 2,712"
          />
          <LedgerStat
            label="Hen-day rate"
            value="84.9"
            unit="%"
            delta={{ value: "1.8 pts", direction: "down", tone: "attention", against: "vs last week" }}
          />
          <LedgerStat
            label="Mortality, 7 days"
            value="9"
            unit="birds"
            delta={{ value: "6", direction: "up", tone: "attention", against: "vs prior 7" }}
          />
          <LedgerStat
            label="Net, this month"
            value="N 612,400"
            delta={{ value: "N 48,000", direction: "up", tone: "positive", against: "vs last month" }}
          />
        </div>

        <DataTable
          caption="Demonstration comparison of three flocks"
          columns={flockColumns}
          rows={demoFlocks}
          rowKey={(r) => r.id}
        />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Farmhand: one screen to log"
          description="56px minimum targets, previous value beside the field, one-tap crate addition, one Save button. Try saving with no eggs, or with more broken than collected."
        />
        <FarmhandDemo />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Sync states"
          description="The five states are never merged. Failed records stay on the device and can be retried."
        />
        <ul className="flex flex-wrap gap-3">
          {syncStates.map((s) => (
            <li key={s}>
              <SyncChip state={s} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Buttons and feedback" />
        <div className="flex flex-wrap items-center gap-3">
          <Button>Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">View history</Button>
          <Button variant="danger">Remove flock</Button>
          <Button loading>Saving</Button>
          <Button disabled>Unavailable</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Notice tone="success" title="Collection saved on this device">
            It will upload as soon as there is a connection.
          </Notice>
          <Notice tone="attention" title="Flock B is below its expected curve">
            Three days in a row. Check the fresh water and feed levels.
          </Notice>
          <Notice
            tone="danger"
            title="2 records failed to sync"
            action={<Button size="md" variant="secondary">Retry</Button>}
          >
            Nothing is lost. Both records are still on this device.
          </Notice>
          <Notice tone="info" title="You are offline">
            You can keep logging. Records upload when you reconnect.
          </Notice>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Loading and empty states" />
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <EmptyState
          icon={Inbox}
          title="No sales recorded yet"
          description="Record the first sale and the monthly summary will appear here."
          action={<Button variant="secondary">Record a sale</Button>}
        />
      </section>
    </main>
  );
}
