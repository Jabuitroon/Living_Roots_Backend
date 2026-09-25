import type { TrendPoint } from '../utils/dashboard.utils'

/** Todos los DTOs son JSON plano (sin Date): se guardan tal cual en caché. */
export interface DashboardSummaryDto {
  herbs: number
  families: number
  consultations: {
    /** Chats guardados en total (no incluye chats sin guardar). */
    total: number
    /** Chats guardados dentro del período seleccionado. */
    inRange: number
  }
}

/** Un punto por día (o por semana) del período, con ceros donde no hubo actividad. */
export type ConsultationsTrendDto = TrendPoint[]

export interface CatalogHealthDto {
  herbsWithoutSymptoms: number
  symptomsWithoutHerbs: number
  samples: {
    herbs: Array<{ id: string; name: string }>
    symptoms: Array<{ id: string; name: string }>
  }
}
