import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button";

/** A navigation link that looks exactly like a Button. */
export function LinkButton({
  variant = "secondary",
  size = "md",
  block,
  className,
  ...rest
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}) {
  return (
    <Link className={cn(buttonStyles({ variant, size, block }), className)} {...rest} />
  );
}
