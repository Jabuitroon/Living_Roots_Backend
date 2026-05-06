import { Controller, Get, Query } from '@nestjs/common'
import { SymptomsService } from './symptoms.service'

@Controller('symptoms')
export class SymptomsController {
  constructor(private readonly symptomsService: SymptomsService) {}

  @Get()
  search(@Query('search') search: string) {
    return this.symptomsService.search(search)
  }
}
