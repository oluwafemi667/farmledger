"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type FieldSize = "md" | "lg";

interface ShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Right-aligned context next to the label, e.g. "Yesterday 412". */
  aside?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}

/** Label, hint and error wiring shared by every form control. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  aside,
  optional,
  children,
}: ShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-stone-600">Optional</span>
          ) : null}
        </label>
        {aside ? (
          <span className="text-xs text-stone-600">{aside}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-danger-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-stone-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control = (size: FieldSize, error?: string) =>
  cn(
    "w-full rounded border bg-ivory-50 text-ink placeholder:text-stone-500",
    "transition-colors duration-150 ease-ledger",
    "hover:border-stone-500 disabled:cursor-not-allowed disabled:bg-ivory-200 disabled:text-stone-500",
    size === "lg" ? "min-h-touch px-4 text-lg" : "min-h-11 px-3 text-base",
    error ? "border-danger-600" : "border-ivory-400",
  );

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

interface CommonProps {
  label: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  optional?: boolean;
  fieldSize?: FieldSize;
}

export const Input = forwardRef<
  HTMLInputElement,
  CommonProps & InputHTMLAttributes<HTMLInputElement>
>(function Input(
  { label, hint, error, aside, optional, fieldSize = "md", className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      aside={aside}
      optional={optional}
    >
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(control(fieldSize, error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  CommonProps & SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  {
    label,
    hint,
    error,
    aside,
    optional,
    fieldSize = "md",
    className,
    id,
    children,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      aside={aside}
      optional={optional}
    >
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(
            control(fieldSize, error),
            "appearance-none pr-10",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600"
        />
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(
  { label, hint, error, aside, optional, fieldSize = "md", className, id, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      aside={aside}
      optional={optional}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(control(fieldSize, error), "py-2.5", className)}
        {...rest}
      />
    </FieldShell>
  );
});
