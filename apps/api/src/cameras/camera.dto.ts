import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { CameraStatus } from './camera.entity';

export class CreateCameraDto {
  @IsUUID()
  instituteId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^rtsp:\/\/.+/i, { message: 'RTSP URL must start with rtsp://' })
  rtspUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsEnum(CameraStatus)
  status?: CameraStatus;
}

export class UpdateCameraDto {
  @IsOptional()
  @IsUUID()
  instituteId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^rtsp:\/\/.+/i, { message: 'RTSP URL must start with rtsp://' })
  rtspUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsEnum(CameraStatus)
  status?: CameraStatus;

  @IsOptional()
  @Type(() => Date)
  lastPingAt?: Date;
}
