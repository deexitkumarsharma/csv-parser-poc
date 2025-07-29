// Demo API for GitHub Pages deployment with real CSV parsing
import { ParseJob, FilePreview, ValidationResult, Metrics, ParseStatus } from '@/types/parser'
import { parseCSVFile, parseExcelFile } from '@/utils/csv-parser'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Store uploaded file data in memory for demo
let currentFileData: {
  headers: string[]
  data: Record<string, string>[]
  mappings: Record<string, any>
  cleanedData: Record<string, string>[]
} | null = null

export const demoApi = {
  uploadFile: async (file: File, businessContext: string = 'general'): Promise<ParseJob> => {
    await delay(500)
    
    try {
      // Parse the actual file
      let parsedData
      if (file.name.endsWith('.csv')) {
        parsedData = await parseCSVFile(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For demo, we'll simulate Excel parsing
        throw new Error('Excel files are not supported in demo mode. Please use CSV.')
      } else {
        throw new Error('Unsupported file format')
      }
      
      // Store the parsed data
      currentFileData = {
        headers: parsedData.headers,
        data: parsedData.data,
        mappings: {},
        cleanedData: []
      }
      
      return {
        job_id: 'demo-' + Date.now(),
        status: ParseStatus.COMPLETED,
        message: `Successfully parsed ${parsedData.totalRows} rows`,
        file_name: file.name,
        file_size: file.size,
        row_count: parsedData.totalRows,
        column_count: parsedData.headers.length,
        created_at: new Date().toISOString(),
        progress: 100
      }
    } catch (error) {
      return {
        job_id: 'demo-error-' + Date.now(),
        status: ParseStatus.FAILED,
        message: error instanceof Error ? error.message : 'Failed to parse file',
        file_name: file.name,
        file_size: file.size,
        created_at: new Date().toISOString(),
        progress: 0
      }
    }
  },

  getJobStatus: async (jobId: string): Promise<ParseJob> => {
    await delay(300)
    return {
      job_id: jobId,
      status: ParseStatus.COMPLETED,
      message: 'File processed successfully',
      file_name: 'uploaded-file.csv',
      file_size: 1024,
      row_count: currentFileData?.data.length || 0,
      column_count: currentFileData?.headers.length || 0,
      progress: 100
    }
  },

  previewFile: async (_file: File, rows: number = 10): Promise<FilePreview> => {
    await delay(300)
    
    if (!currentFileData) {
      throw new Error('No file data available')
    }
    
    return {
      headers: currentFileData.headers,
      data: currentFileData.data.slice(0, rows),
      total_rows: currentFileData.data.length,
      file_type: 'csv',
      encoding: 'utf-8'
    }
  },

  suggestMappings: async (headers: string[], sampleData: any[], targetSchema: Record<string, string>) => {
    await delay(1500)
    
    const mappings: Record<string, any> = {}
    const targetFields = Object.keys(targetSchema)
    
    // Simple AI-like mapping logic
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // Try to find exact or close matches
      let bestMatch = null
      let bestScore = 0
      
      targetFields.forEach(field => {
        const normalizedField = field.toLowerCase().replace(/_/g, '')
        
        // Check for exact match
        if (normalizedHeader === normalizedField) {
          bestMatch = field
          bestScore = 1.0
        }
        // Check for partial matches
        else if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
          const score = 0.8
          if (score > bestScore) {
            bestMatch = field
            bestScore = score
          }
        }
        // Special cases
        else if (
          (normalizedHeader.includes('mail') && field === 'email') ||
          (normalizedHeader.includes('phone') && field === 'phone') ||
          (normalizedHeader.includes('mobile') && field === 'phone') ||
          (normalizedHeader.includes('first') && field === 'first_name') ||
          (normalizedHeader.includes('last') && field === 'last_name') ||
          (normalizedHeader.includes('street') && field === 'address') ||
          (normalizedHeader.includes('addr') && field === 'address') ||
          (normalizedHeader.includes('zip') && field === 'zip_code') ||
          (normalizedHeader.includes('postal') && field === 'zip_code')
        ) {
          bestMatch = field
          bestScore = 0.9
        }
      })
      
      if (bestMatch) {
        mappings[header] = {
          source_column: header,
          target_field: bestMatch,
          confidence: bestScore,
          reasoning: bestScore === 1.0 ? 'Exact match found' : 
                     bestScore >= 0.9 ? 'High confidence match based on field name' :
                     'Partial match with good confidence'
        }
      }
    })
    
    // Store mappings
    if (currentFileData) {
      currentFileData.mappings = mappings
    }
    
    return {
      mappings,
      status: 'success'
    }
  },

  validateData: async (jobId: string, data: any[]): Promise<ValidationResult> => {
    await delay(1000)
    
    const errors: any[] = []
    const warnings: any[] = []
    const errorColumns = new Set<string>()
    const warningColumns = new Set<string>()
    
    // Use actual data or current file data
    const dataToValidate = data.length > 0 ? data : (currentFileData?.data || [])
    
    // Validate each row
    dataToValidate.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([column, value]) => {
        const strValue = String(value || '').trim()
        
        // Email validation
        if (column.toLowerCase().includes('email')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (strValue && !emailRegex.test(strValue)) {
            errors.push({
              row_index: rowIndex,
              column,
              value: strValue,
              rule: { rule_type: 'format', severity: 'error' },
              message: 'Invalid email format'
            })
            errorColumns.add(column)
          }
        }
        
        // Phone validation
        if (column.toLowerCase().includes('phone') || column.toLowerCase().includes('mobile')) {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/
          if (strValue && !phoneRegex.test(strValue)) {
            errors.push({
              row_index: rowIndex,
              column,
              value: strValue,
              rule: { rule_type: 'format', severity: 'error' },
              message: 'Invalid phone number format'
            })
            errorColumns.add(column)
          } else if (strValue && strValue.replace(/\D/g, '').length < 10) {
            warnings.push({
              row_index: rowIndex,
              column,
              value: strValue,
              rule: { rule_type: 'format', severity: 'warning' },
              message: 'Phone number seems incomplete'
            })
            warningColumns.add(column)
          }
        }
        
        // Required field validation
        if (!strValue && (
          column.toLowerCase().includes('name') ||
          column.toLowerCase().includes('email')
        )) {
          warnings.push({
            row_index: rowIndex,
            column,
            value: strValue,
            rule: { rule_type: 'required', severity: 'warning' },
            message: 'Required field is empty'
          })
          warningColumns.add(column)
        }
        
        // ZIP code validation
        if (column.toLowerCase().includes('zip') || column.toLowerCase().includes('postal')) {
          const zipRegex = /^\d{5}(-\d{4})?$/
          if (strValue && !zipRegex.test(strValue)) {
            warnings.push({
              row_index: rowIndex,
              column,
              value: strValue,
              rule: { rule_type: 'format', severity: 'warning' },
              message: 'Invalid ZIP code format'
            })
            warningColumns.add(column)
          }
        }
      })
    })
    
    return {
      job_id: jobId,
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total_rows: dataToValidate.length,
        total_columns: Object.keys(dataToValidate[0] || {}).length,
        errors_count: errors.length,
        warnings_count: warnings.length,
        error_columns: Array.from(errorColumns),
        warning_columns: Array.from(warningColumns)
      }
    }
  },

  cleanData: async (jobId: string, data: any[], mappings: Record<string, any>) => {
    await delay(1200)
    
    const cleanedData: Record<string, string>[] = []
    const changes: Record<string, any> = {}
    let totalChanges = 0
    
    // Use actual data or current file data
    const dataToClean = data.length > 0 ? data : (currentFileData?.data || [])
    const mappingsToUse = Object.keys(mappings).length > 0 ? mappings : (currentFileData?.mappings || {})
    
    dataToClean.forEach(row => {
      const cleanedRow: Record<string, string> = {}
      
      Object.entries(mappingsToUse).forEach(([sourceColumn, mapping]) => {
        const value = row[sourceColumn] || ''
        const targetField = mapping.target_field
        let cleanedValue = String(value).trim()
        
        // Apply cleaning rules based on field type
        if (targetField === 'email') {
          // Fix common email typos
          cleanedValue = cleanedValue.toLowerCase()
            .replace('@gmial.com', '@gmail.com')
            .replace('@gmai.com', '@gmail.com')
            .replace('@gmal.com', '@gmail.com')
            .replace('@yaho.com', '@yahoo.com')
            .replace('@yahooo.com', '@yahoo.com')
            .replace('@hotmial.com', '@hotmail.com')
            .replace('@hotmai.com', '@hotmail.com')
            .replace('@outloo.com', '@outlook.com')
            .replace('@outlok.com', '@outlook.com')
          
          if (cleanedValue !== value) {
            changes.email = (changes.email || 0) + 1
            totalChanges++
          }
        }
        
        if (targetField === 'phone') {
          // Standardize phone format
          const digits = cleanedValue.replace(/\D/g, '')
          if (digits.length === 10) {
            cleanedValue = `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
            if (cleanedValue !== value) {
              changes.phone = (changes.phone || 0) + 1
              totalChanges++
            }
          }
        }
        
        if (targetField === 'first_name' || targetField === 'last_name') {
          // Proper case for names
          cleanedValue = cleanedValue
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          
          if (cleanedValue !== value) {
            changes.names = (changes.names || 0) + 1
            totalChanges++
          }
        }
        
        if (targetField === 'city' || targetField === 'state') {
          // Proper case for locations
          cleanedValue = cleanedValue
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          
          if (cleanedValue !== value) {
            changes.locations = (changes.locations || 0) + 1
            totalChanges++
          }
        }
        
        if (targetField === 'company') {
          // Proper case for company names
          cleanedValue = cleanedValue
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          
          if (cleanedValue !== value) {
            changes.companies = (changes.companies || 0) + 1
            totalChanges++
          }
        }
        
        cleanedRow[targetField] = cleanedValue
      })
      
      cleanedData.push(cleanedRow)
    })
    
    // Store cleaned data
    if (currentFileData) {
      currentFileData.cleanedData = cleanedData
    }
    
    return {
      data: cleanedData,
      changes,
      total_changes: totalChanges
    }
  },

  getMetrics: async (jobId: string): Promise<Metrics> => {
    await delay(500)
    
    const totalRows = currentFileData?.data.length || 0
    const processingTime = 3.5 + Math.random() * 2
    
    return {
      job_id: jobId,
      processing_time_seconds: processingTime,
      llm_calls: Math.floor(totalRows / 50) + 1,
      llm_tokens_used: totalRows * 25,
      estimated_cost: parseFloat((totalRows * 25 * 0.00001).toFixed(4)),
      cache_hits: Math.floor(totalRows * 0.3),
      cache_misses: Math.floor(totalRows * 0.1),
      validation_errors: 5,
      data_changes: 18,
      accuracy_score: 0.95
    }
  },

  exportData: async (jobId: string, format: string) => {
    await delay(1000)
    
    const dataToExport = currentFileData?.cleanedData && currentFileData.cleanedData.length > 0 
      ? currentFileData.cleanedData 
      : currentFileData?.data || []
    
    if (dataToExport.length === 0) {
      throw new Error('No data to export')
    }
    
    return {
      url: `/export.${format}`,
      filename: `cleaned_data_${Date.now()}.${format}`,
      data: dataToExport
    }
  },

  saveMappings: async (jobId: string, mappings: Record<string, any>) => {
    await delay(500)
    
    // Store mappings
    if (currentFileData) {
      currentFileData.mappings = mappings
    }
    
    return { status: 'success' }
  },

  // Reset data for new import
  resetData: () => {
    currentFileData = null
  }
}