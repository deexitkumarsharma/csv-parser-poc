import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles, Check, X, Wand2, Brain, Zap, RefreshCw, GitBranch, Link2, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AILoader } from '@/components/ui/ai-loader'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/utils/cn'

interface MappingInterfaceProps {
  onComplete?: () => void
}

const targetSchema: Record<string, { type: string; description: string; required: boolean }> = {
  first_name: { type: 'string', description: 'Customer first name', required: true },
  last_name: { type: 'string', description: 'Customer last name', required: true },
  email: { type: 'email', description: 'Email address', required: true },
  phone: { type: 'phone', description: 'Phone number', required: false },
  address: { type: 'address', description: 'Street address', required: false },
  city: { type: 'string', description: 'City name', required: false },
  state: { type: 'string', description: 'State/Province', required: false },
  zip_code: { type: 'string', description: 'ZIP/Postal code', required: false },
  company: { type: 'string', description: 'Company name', required: false },
  department: { type: 'string', description: 'Department', required: false },
}

interface DragItem {
  type: 'source'
  column: string
}

export function MappingInterface({ onComplete }: MappingInterfaceProps) {
  const { currentJob, mappings, setMappings, updateMapping } = useParserStore()
  const [headers, setHeaders] = useState<string[]>([])
  const [sampleData, setSampleData] = useState<any[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [aiProgress, setAiProgress] = useState(0)
  const [showAiInsights, setShowAiInsights] = useState(false)

  // Fetch file preview
  const { data: preview } = useQuery({
    queryKey: ['preview', currentJob?.job_id],
    queryFn: async () => {
      if (!currentJob?.file_name) return null
      // Fetch actual file preview
      return parserApi.previewFile(new File([], currentJob.file_name))
    },
    enabled: !!currentJob,
  })

  useEffect(() => {
    if (preview) {
      console.log('Preview data:', preview)
      setHeaders(preview.headers)
      setSampleData(preview.data)
    }
  }, [preview])

  const suggestMutation = useMutation({
    mutationFn: () => {
      setAiProgress(0)
      setShowAiInsights(true)
      
      // Simulate AI progress
      const interval = setInterval(() => {
        setAiProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      const simplifiedSchema = Object.entries(targetSchema).reduce((acc, [key, value]) => {
        acc[key] = value.type
        return acc
      }, {} as Record<string, string>)
      
      return parserApi.suggestMappings(headers, sampleData, simplifiedSchema, 'general')
    },
    onSuccess: (data) => {
      setMappings(data.mappings)
      toast.success('AI mapping suggestions generated!')
      setTimeout(() => {
        setShowAiInsights(false)
        setAiProgress(0)
      }, 1500)
    },
    onError: () => {
      toast.error('Failed to generate mapping suggestions')
      setShowAiInsights(false)
      setAiProgress(0)
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => 
      parserApi.saveMappings(currentJob!.job_id, mappings),
    onSuccess: () => {
      toast.success('Mappings saved successfully!')
      if (onComplete) {
        onComplete()
      }
    },
    onError: () => {
      toast.error('Failed to save mappings')
    },
  })

  const handleDragStart = (e: React.DragEvent, column: string) => {
    setDraggedItem({ type: 'source', column })
    e.dataTransfer.effectAllowed = 'link'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'link'
  }

  const handleDragEnter = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    setDragOverTarget(target)
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem.type === 'source') {
      updateMapping(draggedItem.column, {
        source_column: draggedItem.column,
        target_field: target,
        confidence: 1.0,
        reasoning: 'Manual mapping via drag-and-drop',
      })
      toast.success(`Mapped "${draggedItem.column}" to "${target}"`)
    }
    setDraggedItem(null)
    setDragOverTarget(null)
  }

  const handleSourceClick = (source: string) => {
    setSelectedSource(source)
  }

  const handleTargetClick = (target: string) => {
    if (selectedSource) {
      updateMapping(selectedSource, {
        source_column: selectedSource,
        target_field: target,
        confidence: 1.0,
        reasoning: 'Manual mapping',
      })
      setSelectedSource(null)
      toast.success(`Mapped "${selectedSource}" to "${target}"`)
    }
  }

  const removeMapping = (source: string) => {
    const newMappings = { ...mappings }
    delete newMappings[source]
    setMappings(newMappings)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <Zap className="w-4 h-4 text-green-600" />
    if (confidence >= 0.7) return <Brain className="w-4 h-4 text-yellow-600" />
    return <RefreshCw className="w-4 h-4 text-red-600" />
  }

  const getMappedTarget = (source: string) => {
    return mappings[source]?.target_field
  }

  const getMappedSource = (target: string) => {
    return Object.entries(mappings).find(([_, mapping]) => 
      mapping.target_field === target
    )?.[0]
  }

  const getMappingProgress = () => {
    const mapped = Object.keys(mappings).length
    const required = Object.entries(targetSchema).filter(([_, schema]) => schema.required).length
    const requiredMapped = Object.values(mappings).filter(m => 
      targetSchema[m.target_field]?.required
    ).length
    
    return {
      total: (mapped / headers.length) * 100,
      required: (requiredMapped / required) * 100,
      mapped,
      requiredMapped,
      totalRequired: required
    }
  }

  const progress = getMappingProgress()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <AnimatedCard delay={0}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GitBranch className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Smart Column Mapping</h2>
                <p className="text-gray-600">
                  Drag and drop or use AI to map your columns
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => suggestMutation.mutate()}
                disabled={suggestMutation.isPending}
                className="group"
              >
                <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                AI Auto-Map
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || Object.keys(mappings).length === 0}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Save & Continue
              </Button>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Progress */}
      <AnimatedCard delay={100}>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Overall Progress</span>
                <span className="text-gray-600">{progress.mapped} / {headers.length} columns</span>
              </div>
              <Progress value={progress.total} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Required Fields</span>
                <span className="text-gray-600">{progress.requiredMapped} / {progress.totalRequired} mapped</span>
              </div>
              <Progress 
                value={progress.required} 
                className="h-2" 
                style={{ 
                  '--progress-foreground': progress.required === 100 ? 'rgb(34 197 94)' : 'rgb(239 68 68)' 
                } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* AI Insights Modal */}
      {showAiInsights && (
        <AnimatedCard delay={0} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <AILoader message="Analyzing column patterns..." />
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pattern recognition</span>
                {aiProgress > 30 && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Data type analysis</span>
                {aiProgress > 60 && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Semantic matching</span>
                {aiProgress > 90 && <Check className="w-4 h-4 text-green-500" />}
              </div>
            </div>
            <Progress value={aiProgress} className="mt-4 h-2" />
          </div>
        </AnimatedCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Columns */}
        <AnimatedCard delay={200}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Source Columns (Your Data)
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {headers.map((header) => {
                const mapping = mappings[header]
                const isSelected = selectedSource === header
                const isMapped = !!getMappedTarget(header)

                return (
                  <div
                    key={header}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, header)}
                    onClick={() => !isMapped && handleSourceClick(header)}
                    className={cn(
                      "p-4 rounded-lg border transition-all cursor-move group",
                      isSelected && "border-purple-500 bg-purple-50 shadow-md scale-[1.02]",
                      isMapped && "bg-gray-50 cursor-not-allowed opacity-60",
                      !isSelected && !isMapped && "hover:border-gray-400 hover:shadow-sm hover:scale-[1.01]",
                      draggedItem?.column === header && "opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{header}</p>
                        {sampleData[0] && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {sampleData[0][header]}
                          </p>
                        )}
                      </div>
                      {isMapped && mapping && (
                        <div className="flex items-center gap-2 ml-4">
                          <Link2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {getMappedTarget(header)}
                          </span>
                          <div className="flex items-center gap-1">
                            {getConfidenceIcon(mapping.confidence)}
                            <span className={cn("text-xs font-medium", getConfidenceColor(mapping.confidence))}>
                              {(mapping.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMapping(header)
                            }}
                            className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                    {mapping?.reasoning && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {mapping.reasoning}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </AnimatedCard>

        {/* Target Schema */}
        <AnimatedCard delay={300}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Target Schema
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {Object.entries(targetSchema).map(([field, schema]) => {
                const mappedSource = getMappedSource(field)
                const canAcceptMapping = (selectedSource || draggedItem) && !mappedSource
                const isDropTarget = dragOverTarget === field

                return (
                  <div
                    key={field}
                    onClick={() => canAcceptMapping && handleTargetClick(field)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, field)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, field)}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      canAcceptMapping && "cursor-pointer hover:border-purple-400 hover:bg-purple-50 hover:shadow-sm",
                      mappedSource && "bg-green-50 border-green-200",
                      !canAcceptMapping && !mappedSource && "opacity-60",
                      isDropTarget && "border-purple-500 bg-purple-100 scale-[1.02] shadow-lg",
                      schema.required && !mappedSource && "border-red-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                          {schema.required && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{schema.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Type: {schema.type}</p>
                      </div>
                      {mappedSource && (
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Tips */}
      <AnimatedCard delay={400}>
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Pro Tips:</p>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li>• Drag and drop columns for quick mapping</li>
                <li>• Click AI Auto-Map for intelligent suggestions</li>
                <li>• Red-bordered fields are required for processing</li>
                <li>• Review AI confidence scores to ensure accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}