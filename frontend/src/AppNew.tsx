import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { ExcelSheetSelector } from '@/components/ExcelSheetSelector'
import { JsonDataViewer } from '@/components/JsonDataViewer'
import { MappingInterface } from '@/components/MappingInterface'
import { ValidationDashboard } from '@/components/ValidationDashboard'
import { DataPreview } from '@/components/DataPreview'
import { CostMetrics } from '@/components/CostMetrics'
import { useParserStore } from '@/stores/parserStore'
import { Button } from '@/components/ui/button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Map, CheckCircle, Eye, DollarSign, FileSpreadsheet, Code } from 'lucide-react'
import { parserApi } from '@/services/api'

type WorkflowMode = 'traditional' | 'excel-json'
type WorkflowStep = 'upload' | 'excel-select' | 'json-view' | 'mapping' | 'validation' | 'preview' | 'metrics'

function AppNew() {
  const { currentJob, resetJob } = useParserStore()
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode | null>(null)
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const isDemoMode = window.location.hostname.includes('github.io')

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Excel file - show workflow selection
      setWorkflowMode(null)
      setCurrentStep('excel-select')
    } else {
      // CSV file - use traditional workflow
      setWorkflowMode('traditional')
      setCurrentStep('mapping')
    }
  }

  const handleExcelExtract = (data: any) => {
    setExtractedData(data)
    setCurrentStep('json-view')
  }

  const handleReset = () => {
    if ('resetData' in parserApi) {
      (parserApi as any).resetData()
    }
    resetJob()
    setWorkflowMode(null)
    setCurrentStep('upload')
    setUploadedFile(null)
    setExtractedData(null)
  }

  const handleWorkflowChoice = (mode: WorkflowMode) => {
    setWorkflowMode(mode)
    if (mode === 'excel-json') {
      setCurrentStep('excel-select')
    } else {
      setCurrentStep('mapping')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Advanced Data Parser
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Parse CSV and Excel files with AI assistance
                {isDemoMode && ' (Demo Mode)'}
              </p>
            </div>
            {(currentJob || uploadedFile) && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="text-sm"
              >
                Start New Import
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Step */}
        {currentStep === 'upload' && (
          <FileUpload 
            onFileSelected={handleFileUpload}
            onUploadComplete={() => {
              if (uploadedFile) {
                const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase()
                if (fileExtension === 'csv') {
                  setWorkflowMode('traditional')
                  setCurrentStep('mapping')
                }
              }
            }}
          />
        )}

        {/* Workflow Selection for Excel */}
        {currentStep === 'excel-select' && uploadedFile && !workflowMode && (
          <AnimatedCard>
            <div className="p-8 text-center">
              <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Excel File Detected</h2>
              <p className="text-gray-600 mb-8">
                Choose how you want to process this Excel file:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                  onClick={() => handleWorkflowChoice('excel-json')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all text-left"
                >
                  <Code className="w-8 h-8 text-blue-500 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Extract as JSON</h3>
                  <p className="text-sm text-gray-600">
                    Select sheets, preview data, and extract clean JSON with flexible options
                  </p>
                </button>
                
                <button
                  onClick={() => handleWorkflowChoice('traditional')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-left"
                >
                  <Map className="w-8 h-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Traditional Parsing</h3>
                  <p className="text-sm text-gray-600">
                    Use AI-powered mapping, validation, and cleaning workflow
                  </p>
                </button>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Excel to JSON Workflow */}
        {workflowMode === 'excel-json' && currentStep === 'excel-select' && uploadedFile && (
          <ExcelSheetSelector
            file={uploadedFile}
            onExtractComplete={handleExcelExtract}
            onCancel={handleReset}
          />
        )}

        {workflowMode === 'excel-json' && currentStep === 'json-view' && extractedData && (
          <JsonDataViewer
            data={extractedData}
            onBack={() => setCurrentStep('excel-select')}
          />
        )}

        {/* Traditional Workflow */}
        {workflowMode === 'traditional' && currentJob && (
          <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as WorkflowStep)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mapping" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                Mapping
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Validation
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Metrics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mapping" className="mt-6">
              <MappingInterface onComplete={() => setCurrentStep('validation')} />
            </TabsContent>

            <TabsContent value="validation" className="mt-6">
              <ValidationDashboard onComplete={() => setCurrentStep('preview')} />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              <DataPreview />
            </TabsContent>

            <TabsContent value="metrics" className="mt-6">
              <CostMetrics />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}

export default AppNew