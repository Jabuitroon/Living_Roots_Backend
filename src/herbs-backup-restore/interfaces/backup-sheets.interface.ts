export interface ExcelHerbBackup {
  'ID Planta': string
  Nombre: string
  Descripción: string
  'URL Imagen': string
  Cultivador?: string
  'Info Importante'?: string
}

export interface ExcelSymptomBackup {
  'ID Síntoma': string
  'Nombre Síntoma': string
  'Descripción Síntoma'?: string
}

export interface ExcelTreatmentBackup {
  'ID Planta': string
  'ID Síntoma': string
  'Partes Utilizadas': string
  Preparación: string
  Aplicación?: string
}
