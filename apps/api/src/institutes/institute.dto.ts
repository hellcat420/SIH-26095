import { Type } from 'class-transformer';
import { IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { InstituteStatus, InstituteType } from './institute.entity';

export class CreateInstituteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEnum(InstituteType)
  type!: InstituteType;

  @IsString()
  @IsNotEmpty()
  schemeType!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @IsString()
  @IsNotEmpty()
  contactPerson!: string;

  @IsEnum(InstituteStatus)
  status?: InstituteStatus;
}

export class UpdateInstituteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsEnum(InstituteType)
  type?: InstituteType;

  @IsString()
  @IsNotEmpty()
  schemeType?: string;

  @IsString()
  @IsNotEmpty()
  address?: string;

  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsString()
  @IsNotEmpty()
  contactPerson?: string;

  @IsEnum(InstituteStatus)
  status?: InstituteStatus;
}
