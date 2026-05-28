import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-xl border-[1.5px] border-candy-border bg-white/80 px-2.5 py-1 text-base text-candy-cocoa transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-candy-cocoa placeholder:text-candy-caramel/50 focus-visible:border-candy-yellow focus-visible:ring-3 focus-visible:ring-candy-yellow/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-candy-pink aria-invalid:ring-3 aria-invalid:ring-candy-pink/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
