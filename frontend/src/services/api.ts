import axios from 'axios'
import { ParseJob, FilePreview, ValidationResult, Metrics } from '@/types/parser'
import { demoApi } from './demo-api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const IS_DEMO_MODE = import.meta.env.VITE_API_URL?.includes('demo') || 
                     window.location.hostname.includes('github.io')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Use demo API if running on GitHub Pages or in demo mode
export const parserApi = IS_DEMO_MODE ? demoApi : {
  uploadFile: async (file: File, businessContext: string = 'general') => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post<ParseJob>('/parse/upload', formData, {
      params: { business_context: businessContext },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  getJobStatus: async (jobId: string) => {
    const response = await api.get<ParseJob>(`/parse/${jobId}`)
    return response.data
  },

  previewFile: async (file: File, rows: number = 10) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post<FilePreview>('/parse/preview', formData, {
      params: { rows },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  suggestMappings: async (headers: string[], sampleData: any[], targetSchema: Record<string, string>, businessContext: string) => {
    const response = await api.post('/parse/mappings/suggest', {
      headers,
      sample_data: sampleData,
      target_schema: targetSchema,
      business_context: businessContext,
    })
    
    return response.data
  },

  saveMappings: async (jobId: string, mappings: Record<string, any>) => {
    const response = await api.put(`/parse/mappings/save?job_id=${jobId}`, mappings)
    return response.data
  },

  validateData: async (jobId: string, data: any[], rules?: any[]) => {
    const response = await api.post<ValidationResult>('/parse/validate', {
      job_id: jobId,
      data,
      rules,
    })
    
    return response.data
  },

  cleanData: async (jobId: string, data: any[], cleaningRules?: any[]) => {
    const response = await api.post('/parse/clean', {
      job_id: jobId,
      data,
      cleaning_rules: cleaningRules,
    })
    
    return response.data
  },

  exportData: async (jobId: string, format: string = 'csv') => {
    const response = await api.get(`/parse/export/${jobId}`, {
      params: { format },
    })
    
    return response.data
  },

  getMetrics: async (jobId: string) => {
    const response = await api.get<Metrics>(`/parse/metrics/${jobId}`)
    return response.data
  },

  getExcelSheets: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/parse/excel/sheets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  previewExcelSheet: async (file: File, sheetName: string, rows: number = 20) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/parse/excel/preview-sheet', formData, {
      params: { sheet_name: sheetName, rows },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  extractJsonFromExcel: async (
    file: File,
    sheetName: string,
    options: {
      headerRow?: number
      startRow?: number
      endRow?: number
      columns?: string[]
    } = {}
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const params: any = { sheet_name: sheetName }
    if (options.headerRow !== undefined) params.header_row = options.headerRow
    if (options.startRow !== undefined) params.start_row = options.startRow
    if (options.endRow !== undefined) params.end_row = options.endRow
    if (options.columns) params.columns = options.columns
    
    const response = await api.post('/parse/excel/extract-json', formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },
}