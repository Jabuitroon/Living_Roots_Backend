/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// Táctica de Fiabilidad: captura excepciones de Prisma y HTTP de forma centralizada,
// devolviendo mensajes controlados sin exponer detalles internos.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Prisma } from '../../generated/prisma/client'

interface ErrorResponse {
  statusCode: number
  message: string
  error: string
  timestamp: string
  path: string
}

@Catch()
export class StoryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StoryExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const { status, message } = this.resolveException(exception)

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url
    }

    this.logger.error(
      `[${request.method}] ${request.url} → ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined
    )

    response.status(status).json(body)
  }

  private resolveException(exception: unknown): {
    status: number
    message: string
  } {
    // Excepciones HTTP nativas de NestJS
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      const message =
        typeof res === 'object' && 'message' in res
          ? Array.isArray((res as any).message)
            ? (res as any).message.join('. ')
            : String((res as any).message)
          : exception.message
      return { status: exception.getStatus(), message }
    }

    // Violación de restricción única (ej. tag duplicado)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Ya existe un registro con esos datos únicos.'
        }
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'El recurso solicitado no existe.'
        }
      }
      // Falla de conexión / persistencia
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Error de persistencia, intente más tarde.'
      }
    }

    // Error de validación de Prisma (campos requeridos faltantes)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Los datos enviados no son válidos para persistir.'
      }
    }

    // Cualquier otro error no controlado
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error inesperado. Por favor, intente más tarde.'
    }
  }
}
