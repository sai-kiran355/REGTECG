import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  gray:   'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={clsx('badge', styles[variant], className)}>
      {children}
    </span>
  )
}
