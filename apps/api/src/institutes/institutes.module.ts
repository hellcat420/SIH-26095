import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CameraStreamService } from '../cameras/camera-stream.service';
import { Institute } from './institute.entity';
import { InstitutesController } from './institutes.controller';
import { InstitutesService } from './institutes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Institute]), AuthModule],
  controllers: [InstitutesController],
  providers: [InstitutesService, CameraStreamService],
  exports: [InstitutesService],
})
export class InstitutesModule {}
