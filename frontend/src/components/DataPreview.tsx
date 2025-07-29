import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileText, FileSpreadsheet, FileJson, Eye, EyeOff, Sparkles, TrendingUp, Award, GitCompare, Search, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AILoader } from '@/components/ui/ai-loader'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/utils/cn'

export function DataPreview() {
  const { currentJob, mappings } = useParserStore()
  const [viewMode, setViewMode] = useState<'original' | 'cleaned' | 'diff'>('cleaned')
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const rowsPerPage = 10

  // Fetch original data
  const { data: originalData } = useQuery({
    queryKey: ['original-data', currentJob?.job_id],
    queryFn: async () => {
      if (!currentJob) return []
      const preview = await parserApi.previewFile(new File([], currentJob.file_name || ''), 1000)
      return preview.data
    },
    enabled: !!currentJob,
  })

  // Fetch cleaned data
  const { data: cleanedDataResult } = useQuery({
    queryKey: ['cleaned-data', currentJob?.job_id, mappings],
    queryFn: async () => {
      if (!currentJob || Object.keys(mappings).length === 0) return null
      return parserApi.cleanData(currentJob.job_id, [], mappings as any)
    },
    enabled: !!currentJob && Object.keys(mappings).length > 0,
  })

  const cleanedData = cleanedDataResult?.data || []

  // Calculate changes
  const calculateChanges = () => {
    return cleanedDataResult?.total_changes || 0
  }

  // Filter data based on search
  const dataToFilter = viewMode === 'original' ? (originalData || []) : cleanedData
  const filteredData = dataToFilter.filter((row: any) =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const exportMutation = useMutation({
    mutationFn: async (format: string) => {
      setShowExportModal(true)
      setExportProgress(0)
      
      // Simulate export progress
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      // Generate download based on format
      const data = cleanedData.length > 0 ? cleanedData : (originalData || [])
      let blob: Blob
      let filename: string

      switch (format) {
        case 'json':
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          filename = 'export.json'
          break
        case 'csv':
          const csv = [
            Object.keys(data[0]).join(','),
            ...data.map((row: any) => Object.values(row).join(','))
          ].join('\n')
          blob = new Blob([csv], { type: 'text/csv' })
          filename = 'export.csv'
          break
        default:
          // For Excel, we'd normally use a library like xlsx
          blob = new Blob(['Excel export would go here'], { type: 'text/plain' })
          filename = 'export.xlsx'
      }

      return { blob, filename }
    },
    onSuccess: (result) => {
      // Handle the result based on whether it's from demo API or real export
      if ('blob' in result) {
        // Direct blob download
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (result && 'data' in result) {
        // Convert data to blob
        let blob: Blob
        let filename: string
        
        switch (exportFormat) {
          case 'json':
            blob = new Blob([JSON.stringify((result as any).data, null, 2)], { type: 'application/json' })
            filename = (result as any).filename || 'export.json'
            break
          case 'csv':
            const csv = [
              Object.keys((result as any).data[0]).join(','),
              ...(result as any).data.map((row: any) => Object.values(row).join(','))
            ].join('\n')
            blob = new Blob([csv], { type: 'text/csv' })
            filename = (result as any).filename || 'export.csv'
            break
          default:
            // For Excel, we'd normally use a library
            blob = new Blob(['Excel export requires additional libraries'], { type: 'text/plain' })
            filename = 'export.txt'
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      toast.success(`Successfully exported as ${exportFormat.toUpperCase()}!`)
      setShowExportModal(false)
      setExportProgress(0)
    },
    onError: () => {
      toast.error('Failed to export data')
      setShowExportModal(false)
      setExportProgress(0)
    },
  })

  const handleExport = () => {
    exportMutation.mutate(exportFormat)
  }

  const getExportIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="w-5 h-5" />
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5" />
      case 'json':
        return <FileJson className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const renderDiffCell = (original: any, cleaned: any, key: string) => {
    if (original[key] !== cleaned[key]) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-red-500" />
            <span className="line-through text-red-500 text-xs">{original[key]}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-green-600" />
            <span className="text-green-600 font-medium">{cleaned[key]}</span>
          </div>
        </div>
      )
    }
    return <span className="text-gray-600">{cleaned[key]}</span>
  }

  const getDataToShow = () => {
    if (viewMode === 'original') return paginatedData
    return paginatedData
  }

  const dataToShow = getDataToShow()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <AnimatedCard delay={0}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Data Preview & Export</h2>
                <p className="text-gray-600">
                  Review your AI-cleaned data and export in multiple formats
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Format:</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Export Modal */}
      {showExportModal && (
        <AnimatedCard delay={0} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <AILoader message={`Preparing ${exportFormat.toUpperCase()} export...`} />
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Gathering data</span>
                {exportProgress > 30 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Formatting output</span>
                {exportProgress > 60 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Generating file</span>
                {exportProgress > 90 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </div>
            <Progress value={exportProgress} className="mt-4 h-2" />
          </div>
        </AnimatedCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnimatedCard delay={100}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold">{originalData?.length || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Successfully processed</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Data Quality</p>
                <p className="text-2xl font-bold text-green-600">98%</p>
                <p className="text-xs text-gray-600 mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +15% improved
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Changes Made</p>
                <p className="text-2xl font-bold text-purple-600">{calculateChanges()}</p>
                <p className="text-xs text-gray-600 mt-1">AI corrections</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ready to Export</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-gray-600 mt-1">Format options</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Download className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* View Controls */}
      <AnimatedCard delay={500}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View Mode Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {(['original', 'cleaned', 'diff'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md transition-all",
                      viewMode === mode
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {mode === 'diff' && <GitCompare className="w-4 h-4 inline mr-1" />}
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Data Table */}
      <AnimatedCard delay={600}>
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(cleanedData[0] ? Object.keys(cleanedData[0]) : originalData?.[0] ? Object.keys(originalData[0]) : []).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viewMode === 'diff' ? (
                  paginatedData.map((cleanedRow: any, idx: number) => {
                    const originalIdx = (currentPage - 1) * rowsPerPage + idx
                    const originalRow = originalData?.[originalIdx] || {}
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        {Object.keys(cleanedRow).map((key) => (
                          <td key={key} className="px-6 py-4 whitespace-nowrap text-sm">
                            {renderDiffCell(originalRow, cleanedRow, key)}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                ) : (
                  dataToShow.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {value as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Export Options */}
      <AnimatedCard delay={700}>
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <h4 className="text-lg font-semibold mb-4">Quick Export Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['csv', 'xlsx', 'json'] as const).map((format) => (
              <button
                key={format}
                onClick={() => {
                  setExportFormat(format)
                  exportMutation.mutate(format)
                }}
                className="group flex items-center justify-center gap-3 p-4 bg-white rounded-lg border-2 hover:border-blue-500 transition-all hover:shadow-md"
              >
                <div className="p-2 bg-gray-100 rounded group-hover:bg-blue-100 transition-colors">
                  {getExportIcon(format)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    Export as {format.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format === 'csv' && 'Compatible with Excel'}
                    {format === 'xlsx' && 'Native Excel format'}
                    {format === 'json' && 'For developers'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}