import { AccessToken } from 'livekit-server-sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class LiveKitService {
  async createParticipantToken(roomName: string, identity: string, name: string) {
    const apiKey = process.env.LIVEKIT_KEY;
    const apiSecret = process.env.LIVEKIT_SECRET;
    const internalUrl = process.env.LIVEKIT_URL;
    const serverUrl = process.env.LIVEKIT_PUBLIC_URL ?? internalUrl;
    if (!apiKey || !apiSecret || !serverUrl) {
      throw new ServiceUnavailableException(
        'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_KEY, and LIVEKIT_SECRET.',
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '20m',
    });
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return { serverUrl, token: await token.toJwt() };
  }
}
