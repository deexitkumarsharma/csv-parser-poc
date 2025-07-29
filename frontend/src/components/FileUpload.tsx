import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation } from '@tanstack/react-query'
import { Upload, File, AlertCircle, CheckCircle, Sparkles, FileText, BarChart, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AILoader } from '@/components/ui/ai-loader'
import { AnimatedCard } from '@/components/ui/animated-card'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/utils/cn'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [businessContext, setBusinessContext] = useState('general')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [aiProgress, setAiProgress] = useState(0)
  const [sheets, setSheets] = useState<any[]>([])
  const [selectedSheet, setSelectedSheet] = useState(0)
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const { setCurrentJob } = useParserStore()

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const result = await parserApi.uploadFile(file, businessContext)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      return result
    },
    onSuccess: (data) => {
      setCurrentJob(data)
      
      // Check if file has multiple sheets
      if ('getSheets' in parserApi) {
        const availableSheets = (parserApi as any).getSheets()
        if (availableSheets && availableSheets.length > 1) {
          setSheets(availableSheets)
          setShowSheetSelector(true)
          toast.success('File uploaded! Please select a sheet to import.')
          return
        }
      }
      
      toast.success('File uploaded successfully! AI is now analyzing...')
      
      // Start AI progress animation
      const aiInterval = setInterval(() => {
        setAiProgress(prev => {
          if (prev >= 100) {
            clearInterval(aiInterval)
            if (onUploadComplete) {
              setTimeout(onUploadComplete, 500)
            }
            return 100
          }
          return prev + 5
        })
      }, 100)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload file')
      setUploadProgress(0)
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setUploadProgress(0)
      setAiProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'csv') return <FileText className="h-8 w-8 text-green-500" />
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="h-8 w-8 text-blue-500" />
    return <File className="h-8 w-8 text-gray-400" />
  }

  const handleSheetSelection = async () => {
    if (!('switchSheet' in parserApi)) return
    
    try {
      await (parserApi as any).switchSheet(selectedSheet)
      setShowSheetSelector(false)
      toast.success(`Selected sheet: ${sheets[selectedSheet]?.name}`)
      
      // Continue with the upload process
      const aiInterval = setInterval(() => {
        setAiProgress(prev => {
          if (prev >= 100) {
            clearInterval(aiInterval)
            if (onUploadComplete) {
              setTimeout(onUploadComplete, 500)
            }
            return 100
          }
          return prev + 5
        })
      }, 100)
    } catch (error) {
      toast.error('Failed to switch sheet')
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <AnimatedCard delay={0}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Your Data</h2>
              <p className="text-gray-600">Our AI will intelligently parse and clean your CSV or Excel files</p>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Business Context */}
      <AnimatedCard delay={100}>
        <div className="p-6">
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Business Context
          </label>
          <select
            id="context"
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all"
          >
            <option value="general">General</option>
            <option value="insurance">Insurance</option>
            <option value="automotive">Automotive</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="retail">Retail</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Select your industry for more accurate AI predictions
          </p>
        </div>
      </AnimatedCard>

      {/* Upload Area */}
      <AnimatedCard delay={200}>
        <div
          {...getRootProps()}
          className={cn(
            "relative overflow-hidden border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300",
            isDragActive ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-gray-300 hover:border-gray-400",
            uploadMutation.isPending && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          
          {isDragActive && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="mx-auto h-16 w-16 text-blue-600 animate-bounce" />
                <p className="text-xl font-semibold text-blue-600 mt-4">Drop your file here</p>
              </div>
            </div>
          )}
          
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          <p className="text-lg font-medium">
            Drag & drop your CSV or Excel file here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            or click to select a file (max 50MB)
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>CSV</span>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Selected File */}
      {selectedFile && !uploadMutation.isPending && (
        <AnimatedCard delay={0}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getFileIcon(selectedFile.name)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={uploadMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upload & Analyze
              </Button>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Sheet Selection */}
      {showSheetSelector && sheets.length > 0 && (
        <AnimatedCard delay={0}>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Sheet to Import</h3>
                <p className="text-sm text-gray-600">
                  This file contains multiple sheets. Please select which one to import:
                </p>
              </div>
              
              <div className="space-y-2">
                {sheets.map((sheet, index) => (
                  <label
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                      selectedSheet === index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="sheet"
                        value={index}
                        checked={selectedSheet === index}
                        onChange={() => setSelectedSheet(index)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{sheet.name}</p>
                        <p className="text-sm text-gray-500">
                          {sheet.rowCount} rows × {sheet.columnCount} columns
                        </p>
                      </div>
                    </div>
                    <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                  </label>
                ))}
              </div>
              
              <Button
                onClick={handleSheetSelection}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Import Selected Sheet
              </Button>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Upload Progress */}
      {uploadMutation.isPending && uploadProgress < 100 && (
        <AnimatedCard delay={0}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uploading file...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              Securely transferring your data to our servers
            </p>
          </div>
        </AnimatedCard>
      )}

      {/* AI Processing */}
      {uploadMutation.isPending && uploadProgress === 100 && (
        <AnimatedCard delay={0}>
          <div className="p-8">
            <AILoader message="AI is analyzing your data structure..." />
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Detecting column types</span>
                {aiProgress > 20 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Identifying data patterns</span>
                {aiProgress > 50 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Generating smart mappings</span>
                {aiProgress > 80 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Error State */}
      {uploadMutation.isError && (
        <AnimatedCard delay={0}>
          <div className="p-6 bg-red-50 border border-red-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Upload failed</p>
                <p className="text-xs text-red-600 mt-1">
                  Please check your file and try again
                </p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}