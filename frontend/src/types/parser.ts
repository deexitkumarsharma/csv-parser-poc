export enum ParseStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  MAPPING = "mapping",
  VALIDATING = "validating",
  CLEANING = "cleaning",
  COMPLETED = "completed",
  FAILED = "failed"
}

export interface ParseJob {
  job_id: string
  status: ParseStatus
  message: string
  file_name?: string
  file_size?: number
  row_count?: number
  column_count?: number
  created_at?: string
  updated_at?: string
  progress?: number
  errors?: string[]
}

export interface ColumnMapping {
  source_column: string
  target_field: string
  confidence: number
  reasoning?: string
  data_type?: string
}

export interface ValidationError {
  row_index: number
  column: string
  value: any
  rule: any
  message: string
}

export interface ValidationResult {
  job_id: string
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    total_rows: number
    total_columns: number
    errors_count: number
    warnings_count: number
    error_columns: string[]
    warning_columns: string[]
  }
}

export interface FilePreview {
  headers: string[]
  data: Record<string, any>[]
  total_rows: number
  file_type: string
  encoding: string
}

export interface Metrics {
  job_id: string
  processing_time_seconds: number
  llm_calls: number
  llm_tokens_used: number
  estimated_cost: number
  cache_hits: number
  cache_misses: number
  validation_errors: number
  data_changes: number
  accuracy_score?: number
}