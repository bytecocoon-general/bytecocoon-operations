import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground',
        'rounded-lg px-3 py-2',
        'focus:outline-none focus:ring-2 focus:ring-ring/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
