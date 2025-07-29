import { useState } from 'react'
import { Copy, Download, Eye, Code, Table as TableIcon, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { cn } from '@/utils/cn'

interface JsonDataViewerProps {
  data: {
    sheet_name: string
    total_rows: number
    headers: string[]
    data: any[]
    metadata?: any
  }
  onBack?: () => void
}

export function JsonDataViewer({ data, onBack }: JsonDataViewerProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<number[]>([])

  const filteredData = data.data.filter(row => {
    if (!searchTerm) return true
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.sheet_name.replace(/\s+/g, '_')}_data.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('JSON file downloaded!')
  }

  const downloadCsv = () => {
    // Convert JSON to CSV
    const headers = data.headers
    const csvContent = [
      headers.join(','),
      ...data.data.map(row => 
        headers.map(h => {
          const value = row[h]
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value ?? ''
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.sheet_name.replace(/\s+/g, '_')}_data.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV file downloaded!')
  }

  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const selectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredData.map((_, i) => i))
    }
  }

  const getSelectedData = () => {
    return selectedRows.length > 0 
      ? filteredData.filter((_, i) => selectedRows.includes(i))
      : filteredData
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Extracted Data</h2>
              <p className="text-gray-600 mt-1">
                {data.sheet_name} - {data.total_rows} rows × {data.headers.length} columns
              </p>
            </div>
            
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
          </div>

          {/* Metadata */}
          {data.metadata && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-600">
                Header row: {data.metadata.header_row} | 
                Data range: {data.metadata.data_start_row}-{data.metadata.data_end_row} | 
                Sheet size: {data.metadata.sheet_dimensions.rows}×{data.metadata.sheet_dimensions.columns}
                {data.metadata.merged_cells_count > 0 && ` | Merged cells: ${data.metadata.merged_cells_count}`}
              </p>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Controls */}
      <AnimatedCard delay={100}>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search in data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="w-4 h-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('json')}
              >
                <Code className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(getSelectedData(), null, 2))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadJson}
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsv}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {selectedRows.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {selectedRows.length} row(s) selected
            </p>
          )}
        </div>
      </AnimatedCard>

      {/* Data Display */}
      <AnimatedCard delay={200}>
        <div className="p-6">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                    {data.headers.map((header, idx) => (
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
                  {filteredData.slice(0, 100).map((row, rowIdx) => (
                    <tr 
                      key={rowIdx}
                      className={cn(
                        "hover:bg-gray-50",
                        selectedRows.includes(rowIdx) && "bg-blue-50"
                      )}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowIdx)}
                          onChange={() => toggleRowSelection(rowIdx)}
                          className="rounded"
                        />
                      </td>
                      {data.headers.map((header, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[header] !== null && row[header] !== undefined 
                            ? String(row[header]) 
                            : <span className="text-gray-400">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredData.length > 100 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 100 rows of {filteredData.length} filtered results
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                <code>{JSON.stringify(getSelectedData(), null, 2)}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(JSON.stringify(getSelectedData(), null, 2))}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  )
}