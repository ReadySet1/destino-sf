import { cn } from "@/lib/utils"

interface FormMessageProps {
  message?: string
  type?: 'error' | 'success'
  className?: string
}

export function FormMessage({
  message,
  type = 'error',
  className,
}: FormMessageProps) {
  if (!message) return null

  return (
    <div
      className={cn(
        'rounded-md p-3 text-sm',
        type === 'error' && 'bg-red-50 text-red-500',
        type === 'success' && 'bg-green-50 text-green-500',
        className
      )}
    >
      {message}
    </div>
  )
}
