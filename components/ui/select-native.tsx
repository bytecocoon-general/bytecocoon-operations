import * as React from 'react'
import { cn } from '@/lib/utils'

export type SelectNativeProps = React.SelectHTMLAttributes<HTMLSelectElement>

/**
 * Styled wrapper around a native `<select>` element.
 * Use this instead of the complex Radix Select for simple dropdowns.
 */
const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full text-sm bg-input border border-border text-foreground',
        'rounded-lg px-3 py-2',
        'focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
SelectNative.displayName = 'SelectNative'

export { SelectNative }
