import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileSpreadsheet, ChevronRight, Table, Eye, Download, Settings } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AILoader } from '@/components/ui/ai-loader'
import { parserApi } from '@/services/api'
import { cn } from '@/utils/cn'

interface ExcelSheet {
  index: number
  name: string
  rows: number
  columns: number
  non_empty_rows: number
  hidden: boolean
}

interface ExcelSheetSelectorProps {
  file: File
  onExtractComplete: (data: any) => void
  onCancel: () => void
}

export function ExcelSheetSelector({ file, onExtractComplete, onCancel }: ExcelSheetSelectorProps) {
  const [sheets, setSheets] = useState<ExcelSheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const [sheetPreview, setSheetPreview] = useState<any>(null)
  const [extractOptions, setExtractOptions] = useState({
    headerRow: 0,
    startRow: undefined as number | undefined,
    endRow: undefined as number | undefined,
    selectedColumns: [] as string[]
  })
  const [showOptions, setShowOptions] = useState(false)

  // Load sheets on component mount
  const loadSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await parserApi.getExcelSheets(file)
      return response.sheets
    },
    onSuccess: (data) => {
      setSheets(data)
      // Auto-select first non-hidden sheet
      const firstSheet = data.find(s => !s.hidden) || data[0]
      if (firstSheet) {
        setSelectedSheet(firstSheet.name)
      }
    },
    onError: (error: any) => {
      toast.error('Failed to load Excel sheets')
      console.error(error)
    }
  })

  // Preview sheet data
  const previewSheetMutation = useMutation({
    mutationFn: async (sheetName: string) => {
      const response = await parserApi.previewExcelSheet(file, sheetName)
      return response
    },
    onSuccess: (data) => {
      setSheetPreview(data)
    },
    onError: (error: any) => {
      toast.error('Failed to preview sheet')
      console.error(error)
    }
  })

  // Extract JSON data
  const extractJsonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSheet) throw new Error('No sheet selected')
      
      const response = await parserApi.extractJsonFromExcel(file, selectedSheet, {
        headerRow: extractOptions.headerRow,
        startRow: extractOptions.startRow,
        endRow: extractOptions.endRow,
        columns: extractOptions.selectedColumns.length > 0 ? extractOptions.selectedColumns : undefined
      })
      
      return response
    },
    onSuccess: (data) => {
      toast.success(`Extracted ${data.total_rows} rows from ${data.sheet_name}`)
      onExtractComplete(data)
    },
    onError: (error: any) => {
      toast.error('Failed to extract data')
      console.error(error)
    }
  })

  useEffect(() => {
    loadSheetsMutation.mutate()
  }, [])

  useEffect(() => {
    if (selectedSheet) {
      previewSheetMutation.mutate(selectedSheet)
    }
  }, [selectedSheet])

  const handleColumnToggle = (column: string) => {
    setExtractOptions(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(column)
        ? prev.selectedColumns.filter(c => c !== column)
        : [...prev.selectedColumns, column]
    }))
  }

  if (loadSheetsMutation.isPending) {
    return (
      <AnimatedCard>
        <div className="p-8">
          <AILoader message="Analyzing Excel file structure..." />
        </div>
      </AnimatedCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sheet Selection */}
      <AnimatedCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Select Excel Sheet
          </h3>
          
          <div className="space-y-2">
            {sheets.map((sheet) => (
              <button
                key={sheet.index}
                onClick={() => setSelectedSheet(sheet.name)}
                disabled={sheet.hidden}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-all",
                  selectedSheet === sheet.name
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300",
                  sheet.hidden && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sheet.name}</p>
                    <p className="text-sm text-gray-500">
                      {sheet.non_empty_rows} rows × {sheet.columns} columns
                      {sheet.hidden && " (Hidden)"}
                    </p>
                  </div>
                  {selectedSheet === sheet.name && (
                    <ChevronRight className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </AnimatedCard>

      {/* Sheet Preview */}
      {sheetPreview && selectedSheet && (
        <AnimatedCard delay={100}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview: {sheetPreview.sheet_name}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Options
              </Button>
            </div>

            {/* Options Panel */}
            {showOptions && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Header Row (0-based index)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={extractOptions.headerRow}
                    onChange={(e) => setExtractOptions(prev => ({
                      ...prev,
                      headerRow: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Start Row (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={extractOptions.startRow || ''}
                      onChange={(e) => setExtractOptions(prev => ({
                        ...prev,
                        startRow: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Auto"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      End Row (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={extractOptions.endRow || ''}
                      onChange={(e) => setExtractOptions(prev => ({
                        ...prev,
                        endRow: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Auto"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {/* Column Selection */}
                {sheetPreview.headers && sheetPreview.headers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Columns (all if none selected)
                    </label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                      <div className="flex flex-wrap gap-2">
                        {sheetPreview.headers.map((header: string) => (
                          <label
                            key={header}
                            className="flex items-center gap-1 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={extractOptions.selectedColumns.includes(header)}
                              onChange={() => handleColumnToggle(header)}
                              className="rounded"
                            />
                            <span>{header}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Data Preview Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {sheetPreview.headers?.map((header: string, idx: number) => (
                      <th
                        key={idx}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sheetPreview.data?.slice(0, 10).map((row: any, rowIdx: number) => (
                    <tr key={rowIdx}>
                      {sheetPreview.headers?.map((header: string, colIdx: number) => (
                        <td
                          key={colIdx}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Showing first 10 rows of {sheetPreview.total_rows} total rows
            </p>
          </div>
        </AnimatedCard>
      )}

      {/* Action Buttons */}
      <AnimatedCard delay={200}>
        <div className="p-6 flex items-center justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => extractJsonMutation.mutate()}
              disabled={!selectedSheet || extractJsonMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {extractJsonMutation.isPending ? (
                <>
                  <AILoader className="w-4 h-4 mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Extract JSON Data
                </>
              )}
            </Button>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}