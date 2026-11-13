import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { UsersModule } from '../users/users.module'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { JwtModule } from '@nestjs/jwt'
import { HashingService } from '../providers/hashing/hashing.service'
import { BcryptService } from '../providers/hashing/bcrypt.service'
import { TwoFactorModule } from '@app/two-factor/two-factor.module'
import { parseJwtExpiry } from './jwt-expiry'

// RegisterAsync para inyectar el ConfigService y evitar errores de "undefined" al intentar leer la clave secreta.
@Module({
  imports: [
    UsersModule,
    PassportModule,
    TwoFactorModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredExpiry = config.get<string>(
          'JWT_EXPIRES_IN',
          '3600s'
        )
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: parseJwtExpiry(configuredExpiry) }
        }
      }
    })
  ],
  providers: [
    AuthService,
    {
      provide: HashingService, // Cuando alguien pida HashingService...
      useClass: BcryptService // ...dale una instancia de BcryptService.
    }
  ],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
