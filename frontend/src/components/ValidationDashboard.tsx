import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { ValidationError } from '@/types/parser'
import { cn } from '@/lib/utils'

interface ValidationDashboardProps {
  onComplete?: () => void
}

export function ValidationDashboard({ onComplete }: ValidationDashboardProps) {
  const { currentJob, validationResults, setValidationResults } = useParserStore()
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null)
  const [fixedErrors, setFixedErrors] = useState<Set<string>>(new Set())

  const validateMutation = useMutation({
    mutationFn: async () => {
      // Mock data for demo
      const mockData = Array(100).fill(null).map((_, i) => ({
        first_name: `User${i}`,
        last_name: `Test${i}`,
        email: i % 10 === 0 ? 'invalid-email' : `user${i}@example.com`,
        phone: i % 15 === 0 ? '123' : '555-123-4567',
      }))
      
      return parserApi.validateData(currentJob!.job_id, mockData)
    },
    onSuccess: (data) => {
      setValidationResults(data)
      toast.success('Validation completed!')
    },
    onError: () => {
      toast.error('Failed to validate data')
    },
  })

  useEffect(() => {
    if (currentJob && !validationResults) {
      validateMutation.mutate()
    }
  }, [currentJob])

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const handleFixError = (error: ValidationError) => {
    // Simulate fixing an error
    const errorKey = `${error.row_index}-${error.column}`
    setFixedErrors(prev => new Set(prev).add(errorKey))
    toast.success('Error fixed!')
  }

  const handleContinue = () => {
    if (onComplete) {
      onComplete()
    }
  }

  if (validateMutation.isPending) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <p className="text-lg font-medium">Validating your data...</p>
        <p className="text-sm text-gray-500 mt-2">
          Running AI-powered validation rules
        </p>
      </div>
    )
  }

  if (!validationResults) {
    return null
  }

  const totalIssues = validationResults.errors.length + validationResults.warnings.length
  const fixedCount = fixedErrors.size
  const remainingErrors = validationResults.errors.filter(error => {
    const errorKey = `${error.row_index}-${error.column}`
    return !fixedErrors.has(errorKey)
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Data Validation</h2>
        <p className="text-gray-600 mt-1">
          Review and fix validation issues before proceeding
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Rows</p>
              <p className="text-2xl font-bold">
                {validationResults.summary.total_rows}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Errors</p>
              <p className="text-2xl font-bold text-red-600">
                {remainingErrors.length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {validationResults.warnings.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fixed</p>
              <p className="text-2xl font-bold text-green-600">
                {fixedCount}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Validation Progress</span>
          <span className="text-sm text-gray-500">
            {fixedCount} / {totalIssues} issues resolved
          </span>
        </div>
        <Progress value={(fixedCount / totalIssues) * 100} className="h-2" />
      </div>

      {/* Issues List */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h3 className="text-lg font-semibold mb-4">Validation Issues</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...remainingErrors, ...validationResults.warnings].map((error, idx) => {
              const errorKey = `${error.row_index}-${error.column}`
              const isFixed = fixedErrors.has(errorKey)
              const isSelected = selectedError === error

              return (
                <div
                  key={idx}
                  onClick={() => !isFixed && setSelectedError(error)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected && "border-primary bg-primary/5",
                    isFixed && "opacity-50 cursor-not-allowed",
                    !isSelected && !isFixed && "hover:border-gray-400"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getErrorIcon(error.rule?.severity || 'error')}
                      <div>
                        <p className="font-medium text-sm">
                          Row {error.row_index + 1}, Column: {error.column}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {error.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Value: "{error.value}"
                        </p>
                      </div>
                    </div>
                    {isFixed && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Error Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Issue Details</h3>
          {selectedError ? (
            <div className="bg-white p-4 rounded-lg border">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm">
                    Row {selectedError.row_index + 1}, {selectedError.column}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Value</p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {selectedError.value}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Issue</p>
                  <p className="text-sm">{selectedError.message}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Suggested Fix</p>
                  <p className="text-sm text-primary">
                    AI suggests: Correct format or remove invalid characters
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleFixError(selectedError)}
                >
                  Apply Fix
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedError(null)}
                >
                  Ignore
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <p className="text-sm text-gray-500">
                Select an issue to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {remainingErrors.length > 0
            ? `${remainingErrors.length} errors must be fixed before continuing`
            : 'All critical errors have been resolved'}
        </p>
        <Button
          onClick={handleContinue}
          disabled={remainingErrors.length > 0}
        >
          Continue to Preview
        </Button>
      </div>
    </div>
  )
}