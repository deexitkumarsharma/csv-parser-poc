import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { MappingInterface } from '@/components/MappingInterface'
import { ValidationDashboard } from '@/components/ValidationDashboard'
import { DataPreview } from '@/components/DataPreview'
import { CostMetrics } from '@/components/CostMetrics'
import { useParserStore } from '@/stores/parserStore'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Map, CheckCircle, Eye, DollarSign } from 'lucide-react'
import { parserApi } from '@/services/api'

function App() {
  const { currentJob, resetJob } = useParserStore()
  const [activeTab, setActiveTab] = useState('upload')
  const isDemoMode = window.location.hostname.includes('github.io')

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                LLM-Powered CSV Parser
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Intelligent data parsing with AI assistance
                {isDemoMode && ' (Demo Mode)'}
              </p>
            </div>
            {currentJob && (
              <Button
                variant="outline"
                onClick={() => {
                  // Reset demo API data
                  if ('resetData' in parserApi) {
                    (parserApi as any).resetData()
                  }
                  resetJob()
                  setActiveTab('upload')
                }}
                className="text-sm"
              >
                Start New Import
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="mapping" 
              disabled={!currentJob}
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              Mapping
            </TabsTrigger>
            <TabsTrigger 
              value="validation" 
              disabled={!currentJob}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              disabled={!currentJob}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger 
              value="metrics" 
              disabled={!currentJob}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <FileUpload onUploadComplete={() => setActiveTab('mapping')} />
          </TabsContent>

          <TabsContent value="mapping" className="mt-6">
            <MappingInterface onComplete={() => setActiveTab('validation')} />
          </TabsContent>

          <TabsContent value="validation" className="mt-6">
            <ValidationDashboard onComplete={() => setActiveTab('preview')} />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <DataPreview />
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <CostMetrics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App