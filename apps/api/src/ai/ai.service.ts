import {
  BadGatewayException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AnomalyScoreDto, FaceMatchDto } from './ai.dto';

@Injectable()
export class AiService {
  private readonly serviceUrl = (process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

  faceMatch(dto: FaceMatchDto) {
    return this.forward('/attendance/face-match', dto);
  }

  anomalyScore(dto: AnomalyScoreDto) {
    return this.forward('/anomaly/score', dto);
  }

  private async forward<T>(path: string, body: T) {
    let response: Response;
    try {
      response = await fetch(`${this.serviceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ServiceUnavailableException('AI service request timed out.');
      }
      throw new ServiceUnavailableException('AI service is unavailable.');
    }

    const responseText = await response.text();
    let result: unknown;
    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw new BadGatewayException('AI service returned an invalid response.');
    }

    if (!response.ok) {
      const detail = (result as { detail?: unknown } | null)?.detail;
      const message = typeof detail === 'string' ? detail : `AI service request failed (${response.status}).`;
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw new HttpException(message, status);
    }

    return result;
  }
}
