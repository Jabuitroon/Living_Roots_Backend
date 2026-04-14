// Obliga a cualquier servicio a tener un método de validación
export interface IOwnable {
  isOwner(resourceId: string | number, userEmail: string): Promise<boolean>;
}
