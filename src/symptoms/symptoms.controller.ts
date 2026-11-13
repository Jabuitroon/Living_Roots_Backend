import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { SymptomsService } from './symptoms.service'
import { Role } from '@app/auth/enums'
import { Roles } from '@app/auth/decorators/roles.decorator'
import { AuthGuard } from '@app/auth/guards/auth.guard'
import { RolesGuard } from '@app/auth/guards/roles.guard'

@Controller('symptoms')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Client)
export class SymptomsController {
  constructor(private readonly symptomsService: SymptomsService) {}

  @Get()
  search(@Query('search') search: string) {
    return this.symptomsService.search(search)
  }

  @Get('all')
  findAll() {
    return this.symptomsService.findAll()
  }
}
