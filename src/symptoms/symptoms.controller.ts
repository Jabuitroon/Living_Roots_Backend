import { Controller, Get, Query } from '@nestjs/common'
import { SymptomsService } from './symptoms.service'
import { Role } from '@app/auth/enums'
import { Roles } from '@app/auth/decorators/roles.decorator'

@Controller('symptoms')
@Roles(Role.Admin, Role.Client)
export class SymptomsController {
  constructor(private readonly symptomsService: SymptomsService) {}

  @Get()
  search(@Query('search') search: string) {
    return this.symptomsService.search(search)
  }
}
