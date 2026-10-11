import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** While true the button is disabled and shows `busyLabel` instead of its content. */
  busy?: boolean;
  busyLabel?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent enabled:hover:brightness-[1.08]",
  ghost: "border border-line text-muted enabled:hover:border-accent enabled:hover:text-accent",
  danger: "bg-danger text-white enabled:hover:brightness-110",
};

export function Button({
  variant = "primary",
  busy = false,
  busyLabel,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const label = busy ? (busyLabel ?? (variant === "danger" ? "Usuwanie…" : "Zapisywanie…")) : children;
  return (
    <button
      type={type}
      disabled={disabled || busy}
      className={`inline-block cursor-pointer rounded-lg px-4 py-[9px] text-sm font-[560] whitespace-nowrap disabled:cursor-default disabled:opacity-55 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {label}
    </button>
  );
}
