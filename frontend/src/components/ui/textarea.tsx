import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // TurnosApp: mismo estilo "hundido" que Input.
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-inset px-3 py-2.5 text-base transition-colors outline-none placeholder:text-faint hover:border-line-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
