import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border shadow-sm transition-all duration-500 hover:shadow-lg hover:scale-[1.02]",
        "animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}