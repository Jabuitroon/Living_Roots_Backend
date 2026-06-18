/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'

export interface ExcelSheetData {
  name: string
  data: any[]
}

@Injectable()
export class ExcelGeneratorService {
  /**
   * Crea un archivo Excel en memoria con múltiples pestañas
   */
  createWorkbookBuffer(sheets: ExcelSheetData[]): Buffer {
    const workbook = XLSX.utils.book_new()

    for (const sheet of sheets) {
      // Transforma el array de objetos JSON a una hoja de cálculo
      const worksheet = XLSX.utils.json_to_sheet(sheet.data)
      // Añade la hoja al libro de trabajo
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    }

    // Genera el buffer binario del archivo Excel
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }
}
