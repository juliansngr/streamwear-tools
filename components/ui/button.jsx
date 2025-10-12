import { cloneElement } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "md", asChild = false, children, ...props }) {
  const base = "relative isolate inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    // Leichter Lilac-Gradient, subtile Kontur + Overlay-Highlights
    default:
      "text-[var(--primary-foreground)] bg-[linear-gradient(180deg,rgba(145,70,255,0.98)_0%,rgba(145,70,255,0.88)_100%)] ring-1 ring-[#9146ff]/55 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_20px_-6px_rgba(145,70,255,0.6)] hover:shadow-[0_12px_30px_-8px_rgba(145,70,255,0.7)] active:translate-y-[1px] active:shadow-[0_1px_0_rgba(0,0,0,0.2)_inset,0_6px_16px_-6px_rgba(145,70,255,0.6)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[var(--radius-sm)] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-60 hover:before:opacity-90 after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[var(--radius-sm)] after:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_46%,rgba(0,0,0,0.06)_54%,rgba(0,0,0,0)_100%)] after:mix-blend-overlay",
    secondary:
      "text-[var(--secondary-foreground)] bg-[color-mix(in_hsl,var(--secondary),var(--primary)_6%)] ring-1 ring-[#9146ff]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[color-mix(in_hsl,var(--secondary),white_4%)] active:translate-y-[1px]",
    ghost: "bg-transparent hover:bg-[var(--muted)]",
    outline:
      "bg-transparent text-[var(--foreground)] ring-1 ring-[#9146ff]/50 hover:bg-[var(--muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };
  const sizes = {
    sm: "h-8 px-4",
    md: "h-9 px-6",
    lg: "h-10 px-7 text-base",
  };
  const classes = cn(base, variants[variant], sizes[size], className);
  if (asChild && children) {
    return cloneElement(children, {
      className: cn(children.props?.className, classes),
      ...props,
    });
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}


