import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as net from 'net';
import { Repository } from 'typeorm';
import { Camera, CameraStatus } from './camera.entity';

@Injectable()
export class CameraHealthService {
  private readonly logger = new Logger(CameraHealthService.name);

  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepository: Repository<Camera>,
  ) {}

  async checkAllCameras(): Promise<Camera[]> {
    const cameras = await this.cameraRepository.find();
    const results: Camera[] = [];

    for (const camera of cameras) {
      const updated = await this.checkCamera(camera);
      results.push(updated);
    }

    return results;
  }

  async checkCamera(camera: Camera): Promise<Camera> {
    const nextStatus = await this.pingRtspEndpoint(camera.rtspUrl);
    camera.status = nextStatus;
    camera.lastPingAt = new Date();
    return this.cameraRepository.save(camera);
  }

  private async pingRtspEndpoint(rtspUrl: string): Promise<CameraStatus> {
    try {
      const url = new URL(rtspUrl);
      const port = Number(url.port || 554);
      const host = url.hostname;

      return await new Promise<CameraStatus>((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
          socket.destroy();
          resolve(CameraStatus.Offline);
        }, 4000);

        socket.once('connect', () => {
          clearTimeout(timer);
          socket.destroy();
          resolve(CameraStatus.Online);
        });

        socket.once('error', () => {
          clearTimeout(timer);
          resolve(CameraStatus.Offline);
        });

        socket.connect(port, host);
      });
    } catch {
      this.logger.warn('Invalid RTSP URL supplied for camera health check.');
      this.logger.warn('Unable to reach camera endpoint for a health check.');
      return CameraStatus.Offline;
    }
  }
}
