"use client";

import { useState } from "react";
import { Button, Input, Notice, NumberStepper, Select, SyncChip } from "@/components/ui";

/** Demonstration only: shows the farmhand entry pattern. Nothing is stored. */
export function FarmhandDemo() {
  const [eggs, setEggs] = useState<number | null>(null);
  const [broken, setBroken] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const brokenError =
    eggs !== null && broken !== null && broken > eggs
      ? "Broken eggs cannot be more than eggs collected."
      : undefined;
  const eggsError =
    submitted && eggs === null ? "Enter the number of eggs collected." : undefined;

  function save() {
    setSubmitted(true);
    if (eggs === null || brokenError) return;
    setSaved(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-col gap-6 rounded-lg border border-ivory-400 bg-canvas p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Egg collection</p>
        <SyncChip state={saved ? "waiting" : "synced"} />
      </div>

      <Select label="Flock" fieldSize="lg" defaultValue="a">
        <option value="a">Demo flock A (house 1)</option>
        <option value="b">Demo flock B (house 2)</option>
      </Select>

      <NumberStepper
        label="Eggs collected"
        value={eggs}
        onChange={(v) => {
          setEggs(v);
          setSaved(false);
        }}
        previous={{ label: "Yesterday", value: 412 }}
        quickAdds={[1, 10, 30]}
        hint="30 eggs is one crate."
        error={eggsError}
      />

      <NumberStepper
        label="Broken or cracked"
        value={broken}
        onChange={(v) => {
          setBroken(v);
          setSaved(false);
        }}
        error={brokenError}
      />

      <Input
        label="Note"
        optional
        fieldSize="lg"
        placeholder="Anything unusual today"
      />

      {saved ? (
        <Notice tone="success" title="Saved on this device">
          It will upload when a connection is available.
        </Notice>
      ) : null}

      <Button size="lg" block onClick={save}>
        Save collection
      </Button>
    </div>
  );
}
