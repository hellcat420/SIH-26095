import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class CameraStreamService {
  private readonly controlUrl = process.env.MEDIA_MTX_API_URL;
  private readonly hlsUrl = process.env.MEDIA_MTX_HLS_URL;

  validateSource(rtspUrl: string): void {
    let source: URL;
    try {
      source = new URL(rtspUrl);
    } catch {
      throw new BadRequestException('Camera source must be a valid RTSP URL.');
    }
    if (source.protocol !== 'rtsp:' || !source.hostname) {
      throw new BadRequestException('Camera source must use the RTSP protocol and include a host.');
    }

    const allowedHosts = process.env.RTSP_ALLOWED_HOSTS
      ?.split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean) ?? [];
    if (process.env.NODE_ENV === 'production' && allowedHosts.length === 0) {
      throw new ServiceUnavailableException('RTSP_ALLOWED_HOSTS must be configured in production.');
    }
    if (allowedHosts.length > 0 && !allowedHosts.includes(source.hostname.toLowerCase())) {
      throw new BadRequestException('Camera source host is not in the configured RTSP allowlist.');
    }
  }

  async registerSource(cameraId: string, rtspUrl: string, update = false): Promise<void> {
    this.validateSource(rtspUrl);
    if (!this.controlUrl) {
      throw new ServiceUnavailableException('MediaMTX is not configured for camera streaming.');
    }

    const path = `camera-${cameraId}`;
    let response = await fetch(
      `${this.controlUrl}/v3/config/paths/${update ? 'patch' : 'add'}/${encodeURIComponent(path)}`,
      {
        method: update ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: rtspUrl, sourceOnDemand: true }),
      },
    );

    if (!update && response.status === 400) {
      response = await fetch(`${this.controlUrl}/v3/config/paths/patch/${encodeURIComponent(path)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: rtspUrl, sourceOnDemand: true }),
      });
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `MediaMTX could not configure the camera source (${response.status}).`,
      );
    }
  }

  async removeSource(cameraId: string): Promise<void> {
    if (!this.controlUrl) {
      throw new ServiceUnavailableException('MediaMTX is not configured for camera streaming.');
    }
    const response = await fetch(
      `${this.controlUrl}/v3/config/paths/delete/${encodeURIComponent(`camera-${cameraId}`)}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        `MediaMTX could not remove the camera source (${response.status}).`,
      );
    }
  }

  getHlsUrl(cameraId: string): string | null {
    if (!this.hlsUrl) return null;
    return `${this.hlsUrl.replace(/\/$/, '')}/${encodeURIComponent(`camera-${cameraId}`)}/index.m3u8`;
  }
}
