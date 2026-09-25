import 'reflect-metadata'
import { INestApplication } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test } from '@nestjs/testing'
import request = require('supertest')
// AJUSTAR: rutas reales (y el nombre de la constante de metadata de @Roles).
import { AuthGuard } from '../auth/guard/auth.guard'
import { ROLES_KEY } from '../auth/decorators/roles.decorator'
import { Role } from '../common/enums/role.enum'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

describe('DashboardController', () => {
  let app: INestApplication
  let allowAccess = true
  const service = {
    getSummary: jest.fn(),
    getConsultationsTrend: jest.fn(),
    getCatalogHealth: jest.fn()
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }]
    })
      // El guard real se prueba en su propio módulo; aquí solo importa que esté aplicado.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => allowAccess })
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    allowAccess = true
    jest.resetAllMocks()
    service.getSummary.mockResolvedValue({ herbs: 1 })
    service.getConsultationsTrend.mockResolvedValue([])
    service.getCatalogHealth.mockResolvedValue({ herbsWithoutSymptoms: 0 })
  })

  describe('seguridad (E8)', () => {
    it('el controlador aplica AuthGuard', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, DashboardController)
      ).toContain(AuthGuard)
    })

    it('CADA handler exige rol admin (también los que se agreguen después)', () => {
      const proto = DashboardController.prototype as unknown as Record<
        string,
        unknown
      >
      const handlers = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor'
      )
      expect(handlers.length).toBeGreaterThan(0)
      for (const name of handlers) {
        expect({
          name,
          roles: Reflect.getMetadata(ROLES_KEY, proto[name] as object)
        }).toEqual({
          name,
          roles: [Role.Admin]
        })
      }
    })

    it.each([
      '/admin/dashboard/summary',
      '/admin/dashboard/consultations-trend',
      '/admin/dashboard/catalog-health'
    ])(
      '%s responde 403 si el guard deniega y no toca el servicio',
      async (url) => {
        allowAccess = false
        await request(app.getHttpServer()).get(url).expect(403)
        expect(service.getSummary).not.toHaveBeenCalled()
        expect(service.getConsultationsTrend).not.toHaveBeenCalled()
        expect(service.getCatalogHealth).not.toHaveBeenCalled()
      }
    )
  })

  describe('GET /admin/dashboard/summary', () => {
    it('usa 30 días por defecto', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard/summary')
        .expect(200)
      expect(res.body).toEqual({ herbs: 1 })
      expect(service.getSummary).toHaveBeenCalledWith(30)
    })

    it.each([7, 30, 90])(
      'acepta days=%i y lo entrega como número',
      async (days) => {
        await request(app.getHttpServer())
          .get(`/admin/dashboard/summary?days=${days}`)
          .expect(200)
        expect(service.getSummary).toHaveBeenCalledWith(days)
      }
    )

    it.each(['15', '0', '-7', 'abc', ''])(
      'rechaza days=%p con 400',
      async (days) => {
        await request(app.getHttpServer())
          .get(`/admin/dashboard/summary?days=${days}`)
          .expect(400)
        expect(service.getSummary).not.toHaveBeenCalled()
      }
    )
  })

  describe('GET /admin/dashboard/consultations-trend', () => {
    it('usa days=30 y granularity=day por defecto', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/consultations-trend')
        .expect(200)
      expect(service.getConsultationsTrend).toHaveBeenCalledWith(30, 'day')
    })

    it('acepta days y granularity válidos', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/consultations-trend?days=90&granularity=week')
        .expect(200)
      expect(service.getConsultationsTrend).toHaveBeenCalledWith(90, 'week')
    })

    it.each(['month', 'DAY', ''])(
      'rechaza granularity=%p con 400',
      async (g) => {
        await request(app.getHttpServer())
          .get(`/admin/dashboard/consultations-trend?granularity=${g}`)
          .expect(400)
        expect(service.getConsultationsTrend).not.toHaveBeenCalled()
      }
    )

    it('rechaza days inválido con 400', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/consultations-trend?days=45')
        .expect(400)
    })
  })

  describe('GET /admin/dashboard/catalog-health', () => {
    it('delega en el servicio', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard/catalog-health')
        .expect(200)
      expect(res.body).toEqual({ herbsWithoutSymptoms: 0 })
      expect(service.getCatalogHealth).toHaveBeenCalledTimes(1)
    })
  })
})
