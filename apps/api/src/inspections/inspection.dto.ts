import { Type } from 'class-transformer';
import { IsArray, IsBase64, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class MediaUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsOptional()
  @IsString()
  folder?: string;
}

export class MediaReferenceDto {
  @IsOptional()
  @IsString()
  s3Key?: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  capturedAt!: string;

  @IsOptional()
  @IsBase64()
  @MaxLength(2_000_000)
  contentBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sha256?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contentType?: string;
}

export class CreateInspectionDto {
  @IsOptional()
  @IsUUID()
  clientSubmissionId?: string;

  @IsOptional()
  @IsUUID()
  instituteId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  checklistResponses?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaReferenceDto)
  photos?: MediaReferenceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaReferenceDto)
  videos?: MediaReferenceDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gpsAccuracyMeters?: number;
}
