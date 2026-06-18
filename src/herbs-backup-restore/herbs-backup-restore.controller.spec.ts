import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import * as request from 'supertest'
import { BackupRestoreController } from './herbs-backup-restore.controller'
import { BackupRestoreService } from './herbs-backup-restore.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Reflector } from '@nestjs/core'

// ---------------------------------------------------------------------------
// Shared mock service — reset between test groups with jest.clearAllMocks()
// ---------------------------------------------------------------------------
const mockService = {
  exportDatabase: jest.fn(),
  restoreDatabase: jest.fn(),
}

// ---------------------------------------------------------------------------
// Helper: build a Nest app with guard behaviour controlled by factory fns
// ---------------------------------------------------------------------------
async function buildApp(
  authActivate: () => boolean,
  rolesActivate: () => boolean,
): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [BackupRestoreController],
    providers: [
      { provide: BackupRestoreService, useValue: mockService },
      { provide: Reflector, useValue: new Reflector() },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: jest.fn(authActivate) })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: jest.fn(rolesActivate) })
    .compile()

  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('BackupRestoreController – guard cases', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Case 1: GET /herbs/backup sin token → 401
  // =========================================================================
  it('GET /herbs/backup sin token debe retornar 401 y nunca llamar exportDatabase', async () => {
    const app = await buildApp(
      () => { throw new UnauthorizedException() },
      () => true,
    )

    try {
      await request(app.getHttpServer())
        .get('/herbs/backup')
        .expect(401)

      expect(mockService.exportDatabase).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  // =========================================================================
  // Case 2: POST /herbs/restore sin token → 401
  // =========================================================================
  it('POST /herbs/restore sin token debe retornar 401 y nunca llamar restoreDatabase', async () => {
    const app = await buildApp(
      () => { throw new UnauthorizedException() },
      () => true,
    )

    try {
      await request(app.getHttpServer())
        .post('/herbs/restore')
        .expect(401)

      expect(mockService.restoreDatabase).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  // =========================================================================
  // Case 3: GET /herbs/backup con rol no-admin → 403
  // =========================================================================
  it('GET /herbs/backup con rol no-admin debe retornar 403', async () => {
    const app = await buildApp(
      () => true,
      () => { throw new ForbiddenException() },
    )

    try {
      await request(app.getHttpServer())
        .get('/herbs/backup')
        .set('Authorization', 'Bearer non-admin-token')
        .expect(403)
    } finally {
      await app.close()
    }
  })

  // =========================================================================
  // Case 4: POST /herbs/restore con rol no-admin → 403
  // =========================================================================
  it('POST /herbs/restore con rol no-admin debe retornar 403', async () => {
    const app = await buildApp(
      () => true,
      () => { throw new ForbiddenException() },
    )

    try {
      await request(app.getHttpServer())
        .post('/herbs/restore')
        .set('Authorization', 'Bearer non-admin-token')
        .expect(403)
    } finally {
      await app.close()
    }
  })

  // =========================================================================
  // Case 5: GET /herbs/backup exitoso con admin → 200 + headers correctos
  // =========================================================================
  it('GET /herbs/backup con admin debe retornar 200 con Content-Disposition y Content-Type XLSX', async () => {
    const fakeBuffer = Buffer.from('fake-xlsx-bytes')
    mockService.exportDatabase.mockResolvedValueOnce(fakeBuffer)

    const app = await buildApp(
      () => true,
      () => true,
    )

    try {
      const response = await request(app.getHttpServer())
        .get('/herbs/backup')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200)

      const disposition: string = response.headers['content-disposition'] ?? ''
      const contentType: string = response.headers['content-type'] ?? ''

      expect(disposition).toContain('attachment')
      expect(disposition).toContain('.xlsx')
      expect(contentType).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    } finally {
      await app.close()
    }
  })
})
