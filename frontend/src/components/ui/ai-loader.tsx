import { cn } from '@/utils/cn'

interface AILoaderProps {
  message?: string
  className?: string
}

export function AILoader({ message = "AI is processing...", className }: AILoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-purple-200 rounded-full animate-pulse"></div>
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-t-purple-600 rounded-full animate-spin-slow"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-900">{message}</p>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}