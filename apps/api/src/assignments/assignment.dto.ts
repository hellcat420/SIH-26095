import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AssignmentStatus, AssignmentType } from './assignment.entity';

export class CreateAssignmentDto {
  @IsUUID()
  inspectorId!: string;

  @IsUUID()
  instituteId!: string;

  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  riskScoreAtAssignment!: number;
}

export class GenerateAssignmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count?: number;
}
