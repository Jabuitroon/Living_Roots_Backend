<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
# HU-13: traducción Nasa Yuwe

## Importar el glosario

Entre los Excel, el importador requiere coincidencia exacta del nombre
normalizado. Para enlazar con `tbl_herb`, prioriza coincidencias exactas y luego
reconoce nombres alternativos explícitos separados por `o`, `u`, `/` o coma
(por ejemplo, `Acetaminofén` con `Boldo o Acetaminofén`), siempre que el
resultado sea único y no reutilice el mismo registro para otra planta. No hay
alias predefinidos: otras similitudes se reportan como sugerencias, pero no se
aceptan automáticamente. Primero ejecútalo sin `--apply`; `--report` guarda las
parejas detectadas y cualquier ambigüedad. `--apply` se bloquea mientras queden plantas sin pareja única. Para pruebas,
`--apply --allow-partial` importa únicamente las coincidencias exactas o
inclusivas únicas; las demás quedan omitidas y detalladas en el reporte. Las
filas importadas quedan como `DRAFT`, sin validar traducciones automáticamente:

```powershell
pnpm exec prisma migrate deploy
pnpm glossary:import -- --glossary "ruta\Glosario_Plantas_Lengua_Materna.xlsx" --spanish "ruta\Primer hoja - Plantas tratamientos y sintomas español.xlsx" --report "glossary-import-report.json"
pnpm glossary:import -- --glossary "ruta\Glosario_Plantas_Lengua_Materna.xlsx" --spanish "ruta\Primer hoja - Plantas tratamientos y sintomas español.xlsx" --apply --report "glossary-import-report.json"
pnpm glossary:import -- --glossary "ruta\Glosario_Plantas_Lengua_Materna.xlsx" --spanish "ruta\Primer hoja - Plantas tratamientos y sintomas español.xlsx" --apply --allow-partial --report "glossary-import-report.json"
```

`--apply` requiere que las 80 plantas tengan una coincidencia única por nombre
en `tbl_herb`; la importación se cancela completa si no es así. El modo de
simulación consulta el catálogo y muestra `databaseMatches` y `readyToApply` en
el reporte. El script carga automáticamente `.env` desde la carpeta `Living_Roots_Backend` al ejecutarse
desde allí. El reporte incluye nombres sin pareja, sugerencias, cambios de
normalización y plantas sin nombre Nasa Yuwe. También verifica la corrección
D12 (`acxasa yut`). Las entradas `DRAFT` no se usan en traducciones; tras su
aprobación, el servicio Python las detecta en un máximo de 60 segundos.

## Preferencia e integración

La preferencia se guarda con `PATCH /auth/profile`, por ejemplo:
`{"preferredLanguage":"NSY"}`. Se lee desde PostgreSQL en cada solicitud del
chat, por lo que el siguiente turno aplica el cambio. La respuesta SSE incluye
un evento `data-translation` con los textos en español/Nasa Yuwe, segmentos,
procedencia, nivel y cobertura. Si el traductor no responde, se conserva la
respuesta en español y se envía `warning.code=TRANSLATION_UNAVAILABLE`.

## Revisión de T2

```powershell
pnpm translation:review -- export "translation-review.xlsx"
pnpm translation:review -- import "translation-review.xlsx"
```

La exportación prioriza por frecuencia e incluye evidencia, variantes
observadas y columnas `correcta`, `incorrecta` y `corrección`. La importación
marca la revisión y conserva la corrección del hablante; no valida
automáticamente entradas del glosario.

La regla T2 `R-CONJUNCTION` puede desactivarse con
`TRANSLATION_ALLOW_DERIVED=false`. Solo se aplica entre términos T1 respaldados
por registros de plantas distintas; cada uso se registra para revisión.
