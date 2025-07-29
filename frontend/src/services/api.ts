import axios from 'axios'
import { ParseJob, FilePreview, ValidationResult, Metrics } from '@/types/parser'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const parserApi = {
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
}