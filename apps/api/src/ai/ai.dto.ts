import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FaceMatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_400_000)
  registered_image!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1_400_000)
  captured_image!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}

export class ActivityLogDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  cctv_uptime_pct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  attendance_variance_pct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  false_attendance_rate_pct!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  days_since_last_inspection!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  anomaly_count!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  inspection_compliance_rate_pct!: number;
}

export class AnomalyScoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  institute_id!: string;

  @ValidateNested()
  @Type(() => ActivityLogDto)
  logs!: ActivityLogDto;
}
