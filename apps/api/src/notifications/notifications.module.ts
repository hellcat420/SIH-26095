import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DeviceToken } from './device-token.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Institute } from '../institutes/institute.entity';
import { LiveKitService } from './livekit.service';
import { VcSession } from './vc-session.entity';
import { VcSessionsService } from './vc-sessions.service';
import { Assignment } from '../assignments/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken, Institute, VcSession, Assignment]), AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, LiveKitService, VcSessionsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
