// Demo API for GitHub Pages deployment
import { ParseJob, FilePreview, ValidationResult, Metrics, ParseStatus } from '@/types/parser'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const demoApi = {
  uploadFile: async (file: File, _businessContext: string = 'general'): Promise<ParseJob> => {
    await delay(1000)
    return {
      job_id: 'demo-' + Date.now(),
      status: ParseStatus.PROCESSING,
      message: 'Demo mode: File uploaded successfully',
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
      progress: 30
    }
  },

  getJobStatus: async (jobId: string): Promise<ParseJob> => {
    await delay(500)
    return {
      job_id: jobId,
      status: ParseStatus.COMPLETED,
      message: 'Demo processing completed',
      file_name: 'demo-file.csv',
      file_size: 1024,
      row_count: 100,
      column_count: 10,
      progress: 100
    }
  },

  previewFile: async (_file: File, _rows: number = 10): Promise<FilePreview> => {
    await delay(800)
    return {
      headers: ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP'],
      data: [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Email': 'john.doe@example.com',
          'Phone': '555-123-4567',
          'Address': '123 Main St',
          'City': 'New York',
          'State': 'NY',
          'ZIP': '10001'
        }
      ],
      total_rows: 100,
      file_type: 'csv',
      encoding: 'utf-8'
    }
  },

  suggestMappings: async () => {
    await delay(1500)
    return {
      mappings: {
        'First Name': {
          target_field: 'first_name',
          confidence: 0.95,
          reasoning: 'Direct match with high confidence'
        },
        'Last Name': {
          target_field: 'last_name',
          confidence: 0.95,
          reasoning: 'Direct match with high confidence'
        },
        'Email': {
          target_field: 'email',
          confidence: 0.98,
          reasoning: 'Email pattern detected'
        },
        'Phone': {
          target_field: 'phone',
          confidence: 0.92,
          reasoning: 'Phone number format recognized'
        }
      },
      status: 'success'
    }
  },

  validateData: async (): Promise<ValidationResult> => {
    await delay(1000)
    return {
      job_id: 'demo-job',
      valid: false,
      errors: [
        {
          row_index: 5,
          column: 'email',
          value: 'invalid-email',
          rule: { rule_type: 'format', severity: 'error' },
          message: 'Invalid email format'
        }
      ],
      warnings: [
        {
          row_index: 10,
          column: 'phone',
          value: '123',
          rule: { rule_type: 'format', severity: 'warning' },
          message: 'Phone number seems incomplete'
        }
      ],
      summary: {
        total_rows: 100,
        total_columns: 8,
        errors_count: 2,
        warnings_count: 3,
        error_columns: ['email', 'phone'],
        warning_columns: ['address']
      }
    }
  },

  cleanData: async () => {
    await delay(1200)
    return {
      data: [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@gmail.com',
          phone: '+1-555-123-4567'
        }
      ],
      changes: {
        email: { fixed_typos: 5, standardized: 3 },
        phone: { formatted: 10 }
      },
      total_changes: 18
    }
  },

  getMetrics: async (): Promise<Metrics> => {
    await delay(500)
    return {
      job_id: 'demo-job',
      processing_time_seconds: 8.5,
      llm_calls: 3,
      llm_tokens_used: 1250,
      estimated_cost: 0.08,
      cache_hits: 5,
      cache_misses: 3,
      validation_errors: 2,
      data_changes: 18,
      accuracy_score: 0.95
    }
  },

  exportData: async () => {
    await delay(1000)
    return {
      url: '/demo-export.csv',
      filename: 'cleaned_data.csv'
    }
  },

  saveMappings: async () => {
    await delay(500)
    return { status: 'success' }
  }
}