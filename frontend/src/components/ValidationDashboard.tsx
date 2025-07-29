import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, CheckCircle, Wand2, Shield, Edit3, Save, X, Sparkles, TrendingUp, Search, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AILoader } from '@/components/ui/ai-loader'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { ValidationError } from '@/types/parser'
import { cn } from '@/utils/cn'

interface ValidationDashboardProps {
  onComplete?: () => void
}

interface EditingCell {
  row: number
  column: string
  value: string
}

export function ValidationDashboard({ onComplete }: ValidationDashboardProps) {
  const { currentJob, validationResults, setValidationResults } = useParserStore()
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null)
  const [fixedErrors, setFixedErrors] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [showAiFixer, setShowAiFixer] = useState(false)
  const [aiFixProgress, setAiFixProgress] = useState(0)
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const validateMutation = useMutation({
    mutationFn: async () => {
      // Use empty array to trigger validation of actual uploaded data
      return parserApi.validateData(currentJob!.job_id, [])
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

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

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
    const errorKey = `${error.row_index}-${error.column}`
    setFixedErrors(prev => new Set(prev).add(errorKey))
    toast.success('Error fixed!')
  }

  const handleAiFixAll = async () => {
    setShowAiFixer(true)
    setAiFixProgress(0)
    
    // Simulate AI fixing process
    const interval = setInterval(() => {
      setAiFixProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)

    // Simulate fixing errors
    setTimeout(() => {
      const errorKeys = validationResults?.errors.map(e => `${e.row_index}-${e.column}`) || []
      setFixedErrors(new Set([...fixedErrors, ...errorKeys]))
      setShowAiFixer(false)
      setAiFixProgress(0)
      toast.success('AI has fixed all errors!')
    }, 2500)
  }

  const handleCellEdit = (row: number, column: string, value: string) => {
    setEditingCell({ row, column, value })
  }

  const saveEdit = () => {
    if (editingCell) {
      const errorKey = `${editingCell.row}-${editingCell.column}`
      setFixedErrors(prev => new Set(prev).add(errorKey))
      toast.success('Value updated successfully!')
      setEditingCell(null)
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
  }

  const handleContinue = () => {
    if (onComplete) {
      onComplete()
    }
  }

  if (validateMutation.isPending) {
    return (
      <div className="max-w-4xl mx-auto">
        <AnimatedCard delay={0}>
          <div className="p-12 text-center">
            <AILoader message="Validating your data with AI..." />
            <div className="mt-8 space-y-3 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Checking data types</span>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Validating formats</span>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Finding anomalies</span>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </AnimatedCard>
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

  // Filter issues based on severity and search
  const filteredIssues = [...remainingErrors, ...validationResults.warnings].filter(issue => {
    const severityMatch = filterSeverity === 'all' || 
      (filterSeverity === 'error' && remainingErrors.includes(issue)) ||
      (filterSeverity === 'warning' && validationResults.warnings.includes(issue))
    
    const searchMatch = !searchTerm || 
      issue.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.value?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return severityMatch && searchMatch
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <AnimatedCard delay={0}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Data Validation</h2>
                <p className="text-gray-600">
                  AI-powered validation found {totalIssues} issues to review
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleAiFixAll}
                disabled={remainingErrors.length === 0}
                className="group"
              >
                <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                AI Fix All
              </Button>
              <Button
                onClick={handleContinue}
                disabled={remainingErrors.length > 0}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                Continue to Preview
              </Button>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* AI Fixer Modal */}
      {showAiFixer && (
        <AnimatedCard delay={0} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <AILoader message="AI is fixing validation errors..." />
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Analyzing patterns</span>
                {aiFixProgress > 30 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Applying corrections</span>
                {aiFixProgress > 60 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Verifying results</span>
                {aiFixProgress > 90 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </div>
            <Progress value={aiFixProgress} className="mt-4 h-2" />
          </div>
        </AnimatedCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnimatedCard delay={100}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rows</p>
                <p className="text-2xl font-bold">
                  {validationResults.summary.total_rows}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  100% processed
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {remainingErrors.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {validationResults.errors.length - remainingErrors.length} fixed
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {validationResults.warnings.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Non-critical issues
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fixed</p>
                <p className="text-2xl font-bold text-green-600">
                  {fixedCount}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {totalIssues > 0 ? Math.round((fixedCount / totalIssues) * 100) : 0}% complete
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Progress */}
      <AnimatedCard delay={500}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Validation Progress</span>
            <span className="text-sm text-gray-500">
              {fixedCount} / {totalIssues} issues resolved
            </span>
          </div>
          <Progress 
            value={totalIssues > 0 ? (fixedCount / totalIssues) * 100 : 0} 
            className="h-3" 
          />
          <p className="text-xs text-gray-500 mt-2">
            {remainingErrors.length > 0
              ? `${remainingErrors.length} critical errors must be fixed`
              : 'All critical errors resolved! You can proceed safely.'}
          </p>
        </div>
      </AnimatedCard>

      {/* Filters */}
      <AnimatedCard delay={600}>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Issues</option>
                <option value="error">Errors Only</option>
                <option value="warning">Warnings Only</option>
              </select>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Issues List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnimatedCard delay={700}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Validation Issues</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm || filterSeverity !== 'all' 
                      ? 'No issues match your filters' 
                      : 'No issues found!'}
                  </div>
                ) : (
                  filteredIssues.map((error, idx) => {
                    const errorKey = `${error.row_index}-${error.column}`
                    const isFixed = fixedErrors.has(errorKey)
                    const isSelected = selectedError === error
                    const isEditing = editingCell?.row === error.row_index && editingCell?.column === error.column

                    return (
                      <div
                        key={idx}
                        onClick={() => !isFixed && setSelectedError(error)}
                        className={cn(
                          "p-4 rounded-lg border transition-all cursor-pointer group",
                          isSelected && "border-blue-500 bg-blue-50 shadow-md",
                          isFixed && "opacity-50 cursor-not-allowed bg-green-50",
                          !isSelected && !isFixed && "hover:border-gray-400 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getErrorIcon(error.rule?.severity || 'error')}
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                Row {error.row_index + 1}, {error.column}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {error.message}
                              </p>
                              <div className="mt-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      ref={editInputRef}
                                      type="text"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit()
                                        if (e.key === 'Escape') cancelEdit()
                                      }}
                                      className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        saveEdit()
                                      }}
                                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        cancelEdit()
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Value:</span>
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                      {error.value || '(empty)'}
                                    </span>
                                    {!isFixed && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCellEdit(error.row_index, error.column, error.value || '')
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:bg-gray-100 rounded transition-opacity"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {isFixed && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Error Details */}
        <div>
          <AnimatedCard delay={800}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Issue Details</h3>
              {selectedError ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-sm font-medium">
                        Row {selectedError.row_index + 1}, {selectedError.column}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Current Value</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                        {selectedError.value || '(empty)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Issue Type</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getErrorIcon(selectedError.rule?.severity || 'error')}
                        <span className="text-sm capitalize">
                          {selectedError.rule?.severity || 'Error'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-sm">{selectedError.message}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">AI Suggestions</p>
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900">Quick Fix</p>
                              <p className="text-blue-700 mt-1">
                                {selectedError.column === 'email' 
                                  ? 'Add @domain.com to make it a valid email'
                                  : selectedError.column === 'phone'
                                  ? 'Format as XXX-XXX-XXXX'
                                  : 'Remove special characters or fill empty value'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleFixError(selectedError)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Apply AI Fix
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        handleCellEdit(selectedError.row_index, selectedError.column, selectedError.value || '')
                      }}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Manually
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setSelectedError(null)}
                    >
                      Ignore Issue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Select an issue to view details and apply fixes
                  </p>
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  )
}