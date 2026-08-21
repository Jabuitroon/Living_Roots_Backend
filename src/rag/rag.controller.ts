import { Body, Controller, Post } from '@nestjs/common'
import { RagService } from './rag.service'
import { AskQuestionDto } from './dto/ask-question.dto'

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  async ask(@Body() dto: AskQuestionDto) {
    return this.ragService.answerQuestion(dto.question, dto.topK)
  }
}
