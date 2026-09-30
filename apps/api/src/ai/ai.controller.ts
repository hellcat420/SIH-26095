import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { AiService } from './ai.service';
import { AnomalyScoreDto, FaceMatchDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles(UserRole.Inspector, UserRole.Official)
  @Post('attendance/face-match')
  faceMatch(@Body() dto: FaceMatchDto) {
    return this.aiService.faceMatch(dto);
  }

  @Roles(UserRole.Official, UserRole.Authority)
  @Post('anomaly/score')
  anomalyScore(@Body() dto: AnomalyScoreDto) {
    return this.aiService.anomalyScore(dto);
  }
}
