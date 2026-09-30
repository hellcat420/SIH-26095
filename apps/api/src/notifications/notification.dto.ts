import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum NotificationType {
  InspectionAssignment = 'InspectionAssignment',
  RandomVcInvite = 'RandomVcInvite',
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  payload?: Record<string, any>;
}

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';
}

export class SendAssignmentNotificationDto {
  @IsUUID()
  assignmentId!: string;
}

export class StartVcSessionDto {
  @IsUUID()
  instituteId!: string;
}
