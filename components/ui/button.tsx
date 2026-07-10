import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base: layout + text + interaction
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        /** Violet — primary actions */
        default:     'bg-primary text-primary-foreground hover:bg-primary/80',
        /** Zinc border — cancel / secondary */
        outline:     'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground',
        /** Transparent — icon buttons, inline links */
        ghost:       'text-muted-foreground hover:bg-secondary hover:text-foreground',
        /** Red — destructive confirmation */
        destructive: 'bg-destructive text-destructive-foreground border border-destructive/30 hover:bg-destructive/80',
      },
      size: {
        default: 'px-4 py-2',
        sm:      'px-3 py-1.5 text-xs',
        icon:    'p-1.5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
