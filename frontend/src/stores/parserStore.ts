import { create } from 'zustand'
import { ParseJob, ColumnMapping, ValidationResult } from '@/types/parser'

interface ParserStore {
  currentJob: ParseJob | null
  mappings: Record<string, ColumnMapping>
  validationResults: ValidationResult | null
  previewData: any[]
  
  setCurrentJob: (job: ParseJob) => void
  updateJob: (updates: Partial<ParseJob>) => void
  setMappings: (mappings: Record<string, ColumnMapping>) => void
  updateMapping: (column: string, mapping: ColumnMapping) => void
  setValidationResults: (results: ValidationResult) => void
  setPreviewData: (data: any[]) => void
  resetJob: () => void
}

export const useParserStore = create<ParserStore>((set) => ({
  currentJob: null,
  mappings: {},
  validationResults: null,
  previewData: [],
  
  setCurrentJob: (job) => set({ currentJob: job }),
  
  updateJob: (updates) => set((state) => ({
    currentJob: state.currentJob ? { ...state.currentJob, ...updates } : null
  })),
  
  setMappings: (mappings) => set({ mappings }),
  
  updateMapping: (column, mapping) => set((state) => ({
    mappings: { ...state.mappings, [column]: mapping }
  })),
  
  setValidationResults: (results) => set({ validationResults: results }),
  
  setPreviewData: (data) => set({ previewData: data }),
  
  resetJob: () => set({
    currentJob: null,
    mappings: {},
    validationResults: null,
    previewData: []
  })
}))