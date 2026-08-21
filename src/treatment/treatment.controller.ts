import {
  Controller,
  // HttpCode,
  // HttpStatus,
  // Post,
  UseGuards
} from '@nestjs/common'
import { TreatmentService } from './treatment.service'
import { AuthGuard } from '@app/auth/guards/auth.guard'
import { RolesGuard } from '@app/auth/guards/roles.guard'
// import { CreateHerbDto } from '@app/herbs/dto/create-herb.dto'

@Controller('treatment')
@UseGuards(AuthGuard, RolesGuard)
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}
  // @Post()
  // @HttpCode(HttpStatus.CREATED)
  // create(@Body() dto: CreateHerbDto) {
  //   return this.herbsService.create(dto)
  // }

  // @Post(':id/symptoms')
  // @HttpCode(HttpStatus.CREATED)
  // addSymptom(
  //   @Param('id', ParseUUIDPipe) herbId: string,
  //   @Body() dto: AddSymptomDto
  // ) {
  //   return this.herbsService.addSymptom(herbId, dto)
  // }

  // @Get()
  // @Roles(Role.Admin, Role.Client)
  // async findAll(@Query('search') search?: string) {
  //   return this.herbsService.findAll(search)
  // }

  // @Get('search')
  // findBySymptom(@Query('symptom') symptom: string) {
  //   return this.herbsService.findBySymptom(symptom)
  // }

  // @Get(':id')
  // @Roles(Role.Admin, Role.Client)
  // findOne(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.herbsService.findOne(id)
  // }

  // @Patch(':id')
  // update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateHerbDto: UpdateHerbDto
  // ) {
  //   return this.herbsService.update(id, updateHerbDto)
  // }

  // @Delete(':id')
  // remove(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.herbsService.remove(id)
  // }
}
