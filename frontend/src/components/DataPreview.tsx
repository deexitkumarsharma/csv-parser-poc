import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/utils/cn'

export function DataPreview() {
  const { currentJob, previewData } = useParserStore()
  const [viewMode, setViewMode] = useState<'original' | 'cleaned' | 'diff'>('cleaned')
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv')

  // Mock data for demo
  const mockOriginalData = [
    { first_name: 'JOHN', last_name: 'DOE', email: 'john.doe@gmial.com', phone: '555-123-4567' },
    { first_name: 'jane', last_name: 'smith', email: 'jane@yaho.com', phone: '(555) 987-6543' },
    { first_name: 'Bob', last_name: 'JOHNSON', email: 'bob@hotmial.com', phone: '555.456.7890' },
  ]

  const mockCleanedData = [
    { first_name: 'John', last_name: 'Doe', email: 'john.doe@gmail.com', phone: '+1-555-123-4567' },
    { first_name: 'Jane', last_name: 'Smith', email: 'jane@yahoo.com', phone: '+1-555-987-6543' },
    { first_name: 'Bob', last_name: 'Johnson', email: 'bob@hotmail.com', phone: '+1-555-456-7890' },
  ]

  const exportMutation = useMutation({
    mutationFn: (format: string) => 
      parserApi.exportData(currentJob!.job_id, format),
    onSuccess: (data) => {
      toast.success(`Export ready! Downloading ${data.filename}`)
      // Trigger download
      window.open(data.download_url, '_blank')
    },
    onError: () => {
      toast.error('Failed to export data')
    },
  })

  const handleExport = () => {
    exportMutation.mutate(exportFormat)
  }

  const getExportIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="w-4 h-4" />
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4" />
      case 'json':
        return <FileJson className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const renderDiffCell = (original: any, cleaned: any, key: string) => {
    if (original[key] !== cleaned[key]) {
      return (
        <div>
          <span className="line-through text-red-500 text-xs">{original[key]}</span>
          <span className="block text-green-600 font-medium">{cleaned[key]}</span>
        </div>
      )
    }
    return <span>{cleaned[key]}</span>
  }

  const dataToShow = viewMode === 'original' ? mockOriginalData : mockCleanedData

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Data Preview</h2>
          <p className="text-gray-600 mt-1">
            Review your cleaned and transformed data
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Format:</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="text-sm rounded-md border-gray-300"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['original', 'cleaned', 'diff'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                viewMode === mode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
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
                mockCleanedData.map((cleanedRow, idx) => {
                  const originalRow = mockOriginalData[idx]
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
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
                  <tr key={idx} className="hover:bg-gray-50">
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
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900">Total Records</h4>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {mockCleanedData.length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900">Data Quality Score</h4>
          <p className="text-2xl font-bold text-green-900 mt-1">98%</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-purple-900">Changes Made</h4>
          <p className="text-2xl font-bold text-purple-900 mt-1">12</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium mb-3">Export Options</h4>
        <div className="grid grid-cols-3 gap-3">
          {(['csv', 'xlsx', 'json'] as const).map((format) => (
            <button
              key={format}
              onClick={() => {
                setExportFormat(format)
                exportMutation.mutate(format)
              }}
              className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border hover:border-primary transition-colors"
            >
              {getExportIcon(format)}
              <span className="text-sm font-medium">
                Export as {format.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}