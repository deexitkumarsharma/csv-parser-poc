import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation } from '@tanstack/react-query'
import { Upload, File, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [businessContext, setBusinessContext] = useState('general')
  const { setCurrentJob } = useParserStore()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => parserApi.uploadFile(file, businessContext),
    onSuccess: (data) => {
      setCurrentJob(data)
      toast.success('File uploaded successfully!')
      if (onUploadComplete) {
        onUploadComplete()
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload file')
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
          Business Context
        </label>
        <select
          id="context"
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="general">General</option>
          <option value="insurance">Insurance</option>
          <option value="automotive">Automotive</option>
          <option value="healthcare">Healthcare</option>
          <option value="finance">Finance</option>
          <option value="retail">Retail</option>
        </select>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
          uploadMutation.isPending && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-lg font-medium">Drop the file here...</p>
        ) : (
          <>
            <p className="text-lg font-medium">
              Drag & drop your CSV or Excel file here
            </p>
            <p className="text-sm text-gray-500 mt-2">
              or click to select a file (max 50MB)
            </p>
          </>
        )}
        
        <p className="text-xs text-gray-400 mt-4">
          Supported formats: CSV, XLSX, XLS
        </p>
      </div>

      {selectedFile && !uploadMutation.isPending && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              Upload & Process
            </Button>
          </div>
        </div>
      )}

      {uploadMutation.isPending && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Uploading...</span>
            <span className="text-sm text-gray-500">Please wait</span>
          </div>
          <Progress value={33} className="h-2" />
        </div>
      )}

      {uploadMutation.isError && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload failed</p>
            <p className="text-xs text-red-600 mt-1">
              Please check your file and try again
            </p>
          </div>
        </div>
      )}
    </div>
  )
}