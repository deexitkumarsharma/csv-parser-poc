import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
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
  const { currentJob } = useParserStore()
  const [viewMode, setViewMode] = useState<'original' | 'cleaned' | 'diff'>('cleaned')
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const rowsPerPage = 10

  // Mock data for demo with more realistic examples
  const mockOriginalData = [
    { first_name: 'JOHN', last_name: 'DOE', email: 'john.doe@gmial.com', phone: '555-123-4567', city: 'new york', company: 'ACME CORP' },
    { first_name: 'jane', last_name: 'smith', email: 'jane@yaho.com', phone: '(555) 987-6543', city: 'Los Angeles', company: 'tech solutions' },
    { first_name: 'Bob', last_name: 'JOHNSON', email: 'bob@hotmial.com', phone: '555.456.7890', city: 'chicago', company: 'Global Industries' },
    { first_name: 'Alice', last_name: 'Williams', email: 'alice@gmai.com', phone: '555 321 9876', city: 'HOUSTON', company: 'startup inc' },
    { first_name: 'CHARLIE', last_name: 'brown', email: 'charlie@outloo.com', phone: '5554567890', city: 'Phoenix', company: 'BROWN ENTERPRISES' },
    { first_name: 'david', last_name: 'DAVIS', email: 'david@yaho.co', phone: '(555)654-3210', city: 'philadelphia', company: 'Davis & Co' },
    { first_name: 'Eva', last_name: 'Martinez', email: 'eva@hotmai.com', phone: '555-789-0123', city: 'San Antonio', company: 'Martinez LLC' },
    { first_name: 'FRANK', last_name: 'Wilson', email: 'frank@gmal.com', phone: '555.890.1234', city: 'san diego', company: 'wilson tech' },
    { first_name: 'grace', last_name: 'TAYLOR', email: 'grace@outlok.com', phone: '(555) 901-2345', city: 'Dallas', company: 'TAYLOR GROUP' },
    { first_name: 'Henry', last_name: 'Anderson', email: 'henry@yahooo.com', phone: '555 012 3456', city: 'san jose', company: 'Anderson Solutions' },
  ]

  const mockCleanedData = [
    { first_name: 'John', last_name: 'Doe', email: 'john.doe@gmail.com', phone: '+1-555-123-4567', city: 'New York', company: 'Acme Corp' },
    { first_name: 'Jane', last_name: 'Smith', email: 'jane@yahoo.com', phone: '+1-555-987-6543', city: 'Los Angeles', company: 'Tech Solutions' },
    { first_name: 'Bob', last_name: 'Johnson', email: 'bob@hotmail.com', phone: '+1-555-456-7890', city: 'Chicago', company: 'Global Industries' },
    { first_name: 'Alice', last_name: 'Williams', email: 'alice@gmail.com', phone: '+1-555-321-9876', city: 'Houston', company: 'Startup Inc' },
    { first_name: 'Charlie', last_name: 'Brown', email: 'charlie@outlook.com', phone: '+1-555-456-7890', city: 'Phoenix', company: 'Brown Enterprises' },
    { first_name: 'David', last_name: 'Davis', email: 'david@yahoo.com', phone: '+1-555-654-3210', city: 'Philadelphia', company: 'Davis & Co' },
    { first_name: 'Eva', last_name: 'Martinez', email: 'eva@hotmail.com', phone: '+1-555-789-0123', city: 'San Antonio', company: 'Martinez LLC' },
    { first_name: 'Frank', last_name: 'Wilson', email: 'frank@gmail.com', phone: '+1-555-890-1234', city: 'San Diego', company: 'Wilson Tech' },
    { first_name: 'Grace', last_name: 'Taylor', email: 'grace@outlook.com', phone: '+1-555-901-2345', city: 'Dallas', company: 'Taylor Group' },
    { first_name: 'Henry', last_name: 'Anderson', email: 'henry@yahoo.com', phone: '+1-555-012-3456', city: 'San Jose', company: 'Anderson Solutions' },
  ]

  // Calculate changes
  const calculateChanges = () => {
    let changes = 0
    mockOriginalData.forEach((original, idx) => {
      const cleaned = mockCleanedData[idx]
      Object.keys(original).forEach(key => {
        if ((original as any)[key] !== (cleaned as any)[key]) changes++
      })
    })
    return changes
  }

  // Filter data based on search
  const filteredData = mockCleanedData.filter(row =>
    Object.values(row).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
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
      const data = mockCleanedData
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
            ...data.map(row => Object.values(row).join(','))
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
    onSuccess: ({ blob, filename }) => {
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
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
    if (viewMode === 'original') return paginatedData.map((_, idx) => mockOriginalData[(currentPage - 1) * rowsPerPage + idx])
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
                <p className="text-2xl font-bold">{mockCleanedData.length}</p>
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
                  {Object.keys(mockCleanedData[0]).map((key) => (
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
                  paginatedData.map((cleanedRow, idx) => {
                    const originalIdx = (currentPage - 1) * rowsPerPage + idx
                    const originalRow = mockOriginalData[originalIdx]
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
                  dataToShow.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {value}
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