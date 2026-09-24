import {
  buildBucketKeys,
  countDistinctFamilies,
  fillTrend,
  mondayOf,
  normalizeFamily
} from '../dashboard.utils'

describe('normalizeFamily', () => {
  it('recorta, colapsa espacios, minúsculas y quita tildes', () => {
    expect(normalizeFamily('  Familia   Pérez ')).toBe('familia perez')
    expect(normalizeFamily('FAMILIA PEREZ')).toBe('familia perez')
  })

  it('conserva la ñ (cañas ≠ canas)', () => {
    expect(normalizeFamily('Cañas')).toBe('cañas')
    expect(normalizeFamily('Canas')).toBe('canas')
    // ñ descompuesta (n + U+0303) se trata igual que la precompuesta
    expect(normalizeFamily('Cañas')).toBe('cañas')
  })

  it('devuelve null para null, undefined, vacío o solo espacios', () => {
    expect(normalizeFamily(null)).toBeNull()
    expect(normalizeFamily(undefined)).toBeNull()
    expect(normalizeFamily('')).toBeNull()
    expect(normalizeFamily('   ')).toBeNull()
  })
})

describe('countDistinctFamilies', () => {
  it('devuelve 0 sin datos (E2)', () => {
    expect(countDistinctFamilies([])).toBe(0)
    expect(countDistinctFamilies([null, '', '  '])).toBe(0)
  })

  it('cuenta como una sola las variantes de la misma familia', () => {
    expect(
      countDistinctFamilies([
        'Familia Pérez',
        ' familia perez ',
        'FAMILIA PÉREZ'
      ])
    ).toBe(1)
  })

  it('cuenta distintas e ignora nulos/vacíos', () => {
    expect(
      countDistinctFamilies(['Pérez', 'Cañas', 'Canas', null, '', 'perez'])
    ).toBe(3)
  })
})

describe('mondayOf', () => {
  it('devuelve el lunes de la semana ISO', () => {
    expect(mondayOf('2026-09-23')).toBe('2026-09-21') // miércoles
    expect(mondayOf('2026-09-21')).toBe('2026-09-21') // lunes
    expect(mondayOf('2026-09-27')).toBe('2026-09-21') // domingo
  })
})

describe('buildBucketKeys', () => {
  it('genera un bucket por día, ambos extremos incluidos', () => {
    const keys = buildBucketKeys('2026-09-17', '2026-09-23', 'day')
    expect(keys).toHaveLength(7)
    expect(keys[0]).toBe('2026-09-17')
    expect(keys[6]).toBe('2026-09-23')
  })

  it('cruza fin de mes y de año', () => {
    expect(buildBucketKeys('2026-12-30', '2027-01-02', 'day')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02'
    ])
  })

  it('genera un bucket por semana empezando en el lunes de la primera', () => {
    expect(buildBucketKeys('2026-09-17', '2026-09-23', 'week')).toEqual([
      '2026-09-14',
      '2026-09-21'
    ])
  })
})

describe('fillTrend', () => {
  const keys = buildBucketKeys('2026-09-21', '2026-09-24', 'day')

  it('rellena con 0 todos los días cuando no hay datos (E2)', () => {
    expect(fillTrend([], keys)).toEqual([
      { bucket: '2026-09-21', count: 0 },
      { bucket: '2026-09-22', count: 0 },
      { bucket: '2026-09-23', count: 0 },
      { bucket: '2026-09-24', count: 0 }
    ])
  })

  it('conserva los conteos existentes y descarta buckets fuera de rango', () => {
    const filled = fillTrend(
      [
        { bucket: '2026-09-22', count: 3 },
        { bucket: '2026-01-01', count: 99 }
      ],
      keys
    )
    expect(filled.map((p) => p.count)).toEqual([0, 3, 0, 0])
  })
})
