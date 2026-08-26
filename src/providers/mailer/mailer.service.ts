import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class MailerService {
  private readonly resend: Resend
  private readonly fromEmail: string

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'))
    // Mientras no haya un dominio propio verificado en Resend, se puede
    // seguir usando el dominio de pruebas (onboarding@resend.dev) en dev.
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ??
      'onboarding@resend.dev'
  }

  async sendTwoFactorCode(to: string, code: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Tu código de verificación',
      html: `
        <div style="font-family: sans-serif;">
          <p>Tu código de verificación es:</p>
          <h2 style="letter-spacing: 4px;">${code}</h2>
          <p>Este código expira en 5 minutos. Si no fuiste tú, ignora este mensaje.</p>
        </div>
      `
    })

    if (error) {
      throw new InternalServerErrorException(
        `Error al enviar el email: ${error.message}`
      )
    }
  }
}
