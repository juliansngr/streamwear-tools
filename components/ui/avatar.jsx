"use client";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-default",
        className
      )}
      {...props}
    />
  );
}

export function AvatarImage(props) {
  return <AvatarPrimitive.Image {...props} />;
}

export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      className={cn("flex h-full w-full items-center justify-center bg-[var(--muted)]", className)}
      {...props}
    />
  );
}


