import { IconBook2 } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoIcon />
      <span className="font-heading text-lg font-semibold tracking-normal">OpenBayan</span>
    </span>
  )
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <IconBook2 className="size-5" />
    </span>
  )
}
