// Client-side CSV parser utility
import * as XLSX from 'xlsx'

export interface ParsedCSV {
  headers: string[]
  data: Record<string, string>[]
  totalRows: number
  sheets?: SheetInfo[]
  currentSheet?: string
}

export interface SheetInfo {
  name: string
  index: number
  rowCount: number
  columnCount: number
}

export async function parseCSVFile(file: File, sheetIndex: number = 0): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text)
        
        // For CSV files, there's only one "sheet"
        const sheets: SheetInfo[] = [{
          name: file.name.replace(/\.[^/.]+$/, ''), // filename without extension
          index: 0,
          rowCount: parsed.totalRows,
          columnCount: parsed.headers.length
        }]
        
        resolve({
          ...parsed,
          sheets,
          currentSheet: sheets[0].name
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split(/\r?\n/)
  
  if (lines.length === 0) {
    throw new Error('Empty CSV file')
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const data: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    if (values.length === headers.length) {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      data.push(row)
    }
  }
  
  return {
    headers,
    data,
    totalRows: data.length
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Don't forget the last field
  result.push(current.trim())
  
  return result
}

// Real Excel parsing using xlsx library
export async function parseExcelFile(file: File, sheetIndex: number = 0): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get sheet information
        const sheets: SheetInfo[] = workbook.SheetNames.map((name: string, index: number) => {
          const worksheet = workbook.Sheets[name]
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
          const rowCount = range.e.r - range.s.r + 1
          const columnCount = range.e.c - range.s.c + 1
          
          return {
            name,
            index,
            rowCount,
            columnCount
          }
        })
        
        // Parse the selected sheet
        const selectedSheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0]
        const worksheet = workbook.Sheets[selectedSheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, // Use array of arrays
          defval: '' // Default value for empty cells
        }) as any[][]
        
        if (jsonData.length === 0) {
          throw new Error('Empty Excel file')
        }
        
        // First row is headers
        const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h !== '')
        
        // Parse data rows
        const parsedData: Record<string, string>[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row.length > 0) {
            const rowData: Record<string, string> = {}
            headers.forEach((header, index) => {
              rowData[header] = String(row[index] || '').trim()
            })
            parsedData.push(rowData)
          }
        }
        
        resolve({
          headers,
          data: parsedData,
          totalRows: parsedData.length,
          sheets,
          currentSheet: selectedSheetName
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'))
    }
    
    reader.readAsBinaryString(file)
  })
}