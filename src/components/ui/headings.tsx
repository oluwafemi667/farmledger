import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Top of a page: eyebrow, large display title, optional description. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="flex max-w-prose flex-col gap-1.5">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="text-balance text-2xl font-semibold md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-base text-stone-700">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

/** A named section, introduced by a strong rule. */
export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4 border-t border-ivory-300 pt-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="max-w-prose text-sm text-stone-700">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}
