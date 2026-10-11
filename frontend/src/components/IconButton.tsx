import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Names the action and its target, e.g. "Edytuj Glock 17". */
  label: string;
  large?: boolean;
}

/**
 * Square icon button (✎, ✕). The click does not reach the element underneath,
 * so an icon on a clickable card never opens the card.
 */
export function IconButton({ label, large, onClick, className = "", children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={`grid flex-none cursor-pointer place-items-center rounded-[7px] border border-line bg-card text-xs text-muted hover:border-accent hover:bg-accent-soft hover:text-accent ${large ? "h-8 w-8" : "h-7 w-7"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
