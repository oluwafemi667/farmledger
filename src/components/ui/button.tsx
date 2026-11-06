import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/** `md` for the owner interface, `lg` for farmhand touch targets (56px+). */
export type ButtonSize = "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-forest-800 text-ivory-50 hover:bg-forest-700 active:bg-forest-900 disabled:bg-stone-400",
  secondary:
    "border border-ivory-400 bg-ivory-50 text-ink hover:bg-ivory-200 active:bg-ivory-300 disabled:text-stone-500",
  ghost:
    "text-forest-800 hover:bg-ivory-200 active:bg-ivory-300 disabled:text-stone-500",
  danger:
    "bg-danger-500 text-white hover:brightness-110 active:brightness-90 disabled:bg-stone-400",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-touch px-6 text-base gap-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Expand to the full width of the container. */
  block?: boolean;
}

/** Class names for anything that should look like a button, such as a link. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  block = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
} = {}): string {
  return cn(
    "inline-flex select-none items-center justify-center rounded font-medium",
    "transition-[background-color,transform] duration-150 ease-ledger",
    "active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0",
    variants[variant],
    sizes[size],
    block && "w-full",
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      block = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonStyles({ variant, size, block }), className)}
        {...rest}
      >
        {loading ? <Spinner label="Working" /> : null}
        {children}
      </button>
    );
  },
);
