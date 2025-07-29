import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/utils/cn'

interface MappingInterfaceProps {
  onComplete?: () => void
}

const targetSchema: Record<string, string> = {
  first_name: 'string',
  last_name: 'string',
  email: 'email',
  phone: 'phone',
  address: 'address',
  city: 'string',
  state: 'string',
  zip_code: 'string',
  company: 'string',
  department: 'string',
}

export function MappingInterface({ onComplete }: MappingInterfaceProps) {
  const { currentJob, mappings, setMappings, updateMapping } = useParserStore()
  const [headers, setHeaders] = useState<string[]>([])
  const [sampleData, setSampleData] = useState<any[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  // Fetch file preview
  const { data: preview } = useQuery({
    queryKey: ['preview', currentJob?.job_id],
    queryFn: async () => {
      if (!currentJob?.file_name) return null
      // This would normally fetch from the API, but for now we'll use mock data
      return {
        headers: ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Street Address', 'City', 'State', 'ZIP', 'Company Name', 'Dept'],
        data: [
          {
            'First Name': 'John',
            'Last Name': 'Doe',
            'Email Address': 'john.doe@example.com',
            'Phone Number': '555-123-4567',
            'Street Address': '123 Main St',
            'City': 'New York',
            'State': 'NY',
            'ZIP': '10001',
            'Company Name': 'Acme Corp',
            'Dept': 'Engineering'
          }
        ]
      }
    },
    enabled: !!currentJob,
  })

  useEffect(() => {
    if (preview) {
      setHeaders(preview.headers)
      setSampleData(preview.data)
    }
  }, [preview])

  const suggestMutation = useMutation({
    mutationFn: () => 
      parserApi.suggestMappings(headers, sampleData, targetSchema, 'general'),
    onSuccess: (data) => {
      setMappings(data.mappings)
      toast.success('AI mapping suggestions generated!')
    },
    onError: () => {
      toast.error('Failed to generate mapping suggestions')
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
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getMappedTarget = (source: string) => {
    return mappings[source]?.target_field
  }

  const getMappedSource = (target: string) => {
    return Object.entries(mappings).find(([_, mapping]) => 
      mapping.target_field === target
    )?.[0]
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Column Mapping</h2>
          <p className="text-gray-600 mt-1">
            Map your CSV columns to the target schema
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Suggest
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || Object.keys(mappings).length === 0}
          >
            Save & Continue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Source Columns */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Source Columns (CSV)</h3>
          <div className="space-y-2">
            {headers.map((header) => {
              const mapping = mappings[header]
              const isSelected = selectedSource === header
              const isMapped = !!getMappedTarget(header)

              return (
                <div
                  key={header}
                  onClick={() => !isMapped && handleSourceClick(header)}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer",
                    isSelected && "border-primary bg-primary/5",
                    isMapped && "bg-gray-50 cursor-not-allowed",
                    !isSelected && !isMapped && "hover:border-gray-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{header}</p>
                      {sampleData[0] && (
                        <p className="text-sm text-gray-500 mt-1">
                          Sample: {sampleData[0][header]}
                        </p>
                      )}
                    </div>
                    {isMapped && (
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {getMappedTarget(header)}
                        </span>
                        {mapping && (
                          <span className={cn("text-xs", getConfidenceColor(mapping.confidence))}>
                            {(mapping.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {mapping?.reasoning && (
                    <p className="text-xs text-gray-500 mt-2">
                      {mapping.reasoning}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Target Schema */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Target Schema</h3>
          <div className="space-y-2">
            {Object.entries(targetSchema).map(([field, type]) => {
              const mappedSource = getMappedSource(field)
              const canAcceptMapping = selectedSource && !mappedSource

              return (
                <div
                  key={field}
                  onClick={() => canAcceptMapping && handleTargetClick(field)}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    canAcceptMapping && "cursor-pointer hover:border-primary hover:bg-primary/5",
                    mappedSource && "bg-green-50 border-green-200",
                    !canAcceptMapping && !mappedSource && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{field}</p>
                      <p className="text-sm text-gray-500">Type: {type}</p>
                    </div>
                    {mappedSource && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Mapped</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Mapped: {Object.keys(mappings).length} / {headers.length} columns
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click on source columns and target fields to create manual mappings
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMappings({})}
            disabled={Object.keys(mappings).length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  )
}