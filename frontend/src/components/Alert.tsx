import { clsx } from 'clsx'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  className?: string
}

const icons = {
  error: XCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
}

const styles = {
  error:   'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

const iconStyles = {
  error:   'text-red-500',
  success: 'text-green-500',
  info:    'text-blue-500',
  warning: 'text-yellow-500',
}

export function Alert({ variant = 'info', title, message, className }: AlertProps) {
  const Icon = icons[variant]
  return (
    <div className={clsx('flex gap-3 rounded-lg border p-4', styles[variant], className)}>
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', iconStyles[variant])} />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}
