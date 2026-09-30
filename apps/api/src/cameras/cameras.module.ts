import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Institute } from '../institutes/institute.entity';
import { CameraHealthService } from './camera-health.service';
import { CameraStreamService } from './camera-stream.service';
import { Camera } from './camera.entity';
import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';

@Module({
  imports: [TypeOrmModule.forFeature([Camera, Institute]), AuthModule],
  controllers: [CamerasController],
  providers: [CamerasService, CameraHealthService, CameraStreamService],
  exports: [CamerasService, CameraHealthService],
})
export class CamerasModule implements OnModuleInit {
  private readonly logger = new Logger(CamerasModule.name);

  constructor(private readonly cameraHealthService: CameraHealthService) {}

  onModuleInit() {
    this.cameraHealthService.checkAllCameras().catch((error: unknown) => {
      this.logger.error('Initial camera health check failed', error instanceof Error ? error.stack : String(error));
    });
    setInterval(() => {
      this.cameraHealthService.checkAllCameras().catch((error: unknown) => {
        this.logger.error('Scheduled camera health check failed', error instanceof Error ? error.stack : String(error));
      });
    }, 5 * 60 * 1000);
  }
}
