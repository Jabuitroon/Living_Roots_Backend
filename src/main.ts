import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())

  // Permite utilizar class transformer a nivel global para los dto
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: false // no lanza error, solo las descarta
    })
  )

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS,
    exposedHeaders: ['X-Vercel-AI-Data-Stream'], // ← sin esto el navegador no lo ve
    credentials: true, // Permite cookies
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Es mejor dejarlo claro
    allowedHeaders: 'Content-Type, Accept, Authorization'
  })

  const config = new DocumentBuilder()
    .setTitle('Living Roots API')
    .setDescription('The API for managing Living Roots users')
    .setVersion('1.0')
    .addTag('medicinal plants')
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)
  await app.listen(process.env.PORT || 3000)
  console.log(
    `🚀 Server running on http://localhost:${process.env.PORT || 3000}`
  )
}
bootstrap()
