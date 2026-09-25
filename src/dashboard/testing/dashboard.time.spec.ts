import {
  addDays,
  localDateString,
  windowStart,
  zonedMidnightToUtc
} from '../utils/dashboard.time'

describe('dashboard.time', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('localDateString usa la fecha local, no la UTC', () => {
    // 01:00 UTC del 24 = 20:00 del 23 en Bogotá (UTC-5)
    expect(
      localDateString(new Date('2026-09-24T01:00:00Z'), 'America/Bogota')
    ).toBe('2026-09-23')
  })

  it('medianoche de Bogotá = 05:00 UTC', () => {
    expect(
      zonedMidnightToUtc('2026-09-17', 'America/Bogota').toISOString()
    ).toBe('2026-09-17T05:00:00.000Z')
  })

  it('maneja el cambio de horario (DST) en otras zonas', () => {
    // EE. UU. adelanta la hora el 8-mar-2026 a las 02:00
    expect(
      zonedMidnightToUtc('2026-03-08', 'America/New_York').toISOString()
    ).toBe('2026-03-08T05:00:00.000Z') // EST (UTC-5)
    expect(
      zonedMidnightToUtc('2026-03-09', 'America/New_York').toISOString()
    ).toBe('2026-03-09T04:00:00.000Z') // EDT (UTC-4)
  })

  it('windowStart(7) incluye hoy y los 6 días anteriores en hora local', () => {
    const w = windowStart(7, new Date('2026-09-24T01:00:00Z'), 'America/Bogota')
    expect(w.endDate).toBe('2026-09-23')
    expect(w.startDate).toBe('2026-09-17')
    expect(w.from.toISOString()).toBe('2026-09-17T05:00:00.000Z')
  })

  it('windowStart usa el día local también justo después de medianoche local', () => {
    const w = windowStart(
      30,
      new Date('2026-09-24T05:00:00Z'),
      'America/Bogota'
    )
    expect(w.endDate).toBe('2026-09-24')
    expect(w.startDate).toBe('2026-08-26')
  })
})
