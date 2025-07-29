// Client-side CSV parser utility
export interface ParsedCSV {
  headers: string[]
  data: Record<string, string>[]
  totalRows: number
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text)
        resolve(parsed)
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

// Excel parsing would require a library like xlsx
export async function parseExcelFile(file: File): Promise<ParsedCSV> {
  // For demo purposes, we'll just show a message
  // In production, you'd use a library like xlsx
  throw new Error('Excel parsing requires additional libraries. Please use CSV format for now.')
}