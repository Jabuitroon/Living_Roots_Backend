import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prisma.module'
import { MailerModule } from '../providers/mailer/mailer.module'
import { PreAuthGuard } from './guards/pre-auth.guard'
import { TwoFactorService } from './two-factor.service'
import { HashingService } from '@app/providers/hashing/hashing.service'
import { BcryptService } from '@app/providers/hashing/bcrypt.service'

@Module({
  imports: [
    PrismaModule,
    MailerModule,
    // Secreto y expiración PROPIOS para el pre-auth token, separados del
    // JwtModule que usa el AuthModule para el access_token real. Así un
    // pre-auth token nunca puede verificarse como si fuera un access
    // token válido, sin depender solo de revisar el claim `typ`.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_PRE_AUTH_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_EXPIRES_IN') || 3600) }
      })
    })
  ],
  providers: [
    TwoFactorService,
    PreAuthGuard,
    {
      provide: HashingService,
      useClass: BcryptService
    }
  ],
  exports: [TwoFactorService, PreAuthGuard]
})
export class TwoFactorModule {}
