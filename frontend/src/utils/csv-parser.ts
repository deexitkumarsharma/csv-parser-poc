// Client-side CSV parser utility
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

// Excel parsing would require a library like xlsx
export async function parseExcelFile(file: File, sheetIndex: number = 0): Promise<ParsedCSV> {
  // For demo purposes, we'll simulate multiple sheets
  // In production, you'd use a library like xlsx
  
  // Simulate parsing delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Mock multiple sheets for Excel files
  const mockSheets: SheetInfo[] = [
    { name: 'Sheet1', index: 0, rowCount: 50, columnCount: 10 },
    { name: 'Customer Data', index: 1, rowCount: 100, columnCount: 8 },
    { name: 'Sales Report', index: 2, rowCount: 75, columnCount: 12 }
  ]
  
  // For demo, return mock data based on selected sheet
  const selectedSheet = mockSheets[sheetIndex] || mockSheets[0]
  
  // Mock headers based on sheet
  const headerSets = {
    0: ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Company', 'Department'],
    1: ['Customer ID', 'Full Name', 'Email Address', 'Phone Number', 'Registration Date', 'Status', 'Total Orders', 'Last Order'],
    2: ['Product ID', 'Product Name', 'Category', 'Price', 'Quantity Sold', 'Revenue', 'Date', 'Region', 'Sales Rep', 'Customer', 'Notes', 'Status']
  }
  
  const headers = headerSets[sheetIndex as keyof typeof headerSets] || headerSets[0]
  
  // Generate mock data
  const data: Record<string, string>[] = []
  for (let i = 0; i < 10; i++) {
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = `Sample ${i + 1}-${idx + 1}`
    })
    data.push(row)
  }
  
  return {
    headers,
    data,
    totalRows: selectedSheet.rowCount,
    sheets: mockSheets,
    currentSheet: selectedSheet.name
  }
}