import * as React from 'react'
import { cn } from '@/lib/utils'

interface FormMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'success' | 'error'
}

/**
 * Full-width feedback banner — shown after save / API errors.
 * Auto-dismissed by the consuming component (via setTimeout).
 */
function FormMessage({ type, className, children, ...props }: FormMessageProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg text-sm font-medium border',
        type === 'success'
          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/40'
          : 'bg-red-950    text-red-400    border-red-800/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { FormMessage }
