import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterAll, describe, expect, it } from '@jest/globals';
import { CameraStreamService } from '../src/cameras/camera-stream.service';

describe('CameraStreamService source allowlist', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowedHosts = process.env.RTSP_ALLOWED_HOSTS;

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RTSP_ALLOWED_HOSTS = originalAllowedHosts;
  });

  it('requires an explicit host allowlist in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RTSP_ALLOWED_HOSTS;

    expect(() => new CameraStreamService().validateSource('rtsp://10.0.0.5/live'))
      .toThrow(ServiceUnavailableException);
  });

  it('rejects an RTSP host outside the configured allowlist', () => {
    process.env.NODE_ENV = 'production';
    process.env.RTSP_ALLOWED_HOSTS = '10.0.0.5,camera.internal';

    expect(() => new CameraStreamService().validateSource('rtsp://127.0.0.1/live'))
      .toThrow(BadRequestException);
    expect(() => new CameraStreamService().validateSource('http://camera.internal/live'))
      .toThrow(BadRequestException);
  });

  it('accepts explicitly allowlisted private camera hosts', () => {
    process.env.NODE_ENV = 'production';
    process.env.RTSP_ALLOWED_HOSTS = '10.0.0.5,camera.internal';

    expect(() => new CameraStreamService().validateSource('rtsp://10.0.0.5/live'))
      .not.toThrow();
  });
});
