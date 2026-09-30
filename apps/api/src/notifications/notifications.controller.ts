import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterDeviceTokenDto, SendAssignmentNotificationDto, SendNotificationDto, StartVcSessionDto } from './notification.dto';
import { LiveKitService } from './livekit.service';
import { NotificationsService } from './notifications.service';
import { VcSessionsService } from './vc-sessions.service';
import { AccessScopeService } from '../auth/access-scope.service';
import { Roles } from '../auth/roles.decorator';
import { AuthUser, UserRole } from '../auth/auth.types';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly liveKitService: LiveKitService,
    private readonly vcSessionsService: VcSessionsService,
    private readonly accessScope: AccessScopeService,
  ) {}

  @Post('device-token')
  register(@Body() dto: RegisterDeviceTokenDto, @Req() request: { user: { id: string } }) {
    return this.notificationsService.registerDeviceToken(request.user.id, dto);
  }

  @Post('send')
  @Roles(UserRole.Official, UserRole.Authority)
  send(@Body() dto: SendNotificationDto, @Req() request: { user: { id: string } }) {
    return this.notificationsService.sendPushNotification(request.user.id, dto);
  }

  @Post('inspection-assignment')
  @Roles(UserRole.Official, UserRole.Authority)
  sendInspectionAssignment(@Body() body: SendAssignmentNotificationDto) {
    return this.notificationsService.sendInspectionAssignmentAlert(body.assignmentId);
  }

  @Post('random-vc')
  @Roles(UserRole.Inspector, UserRole.Official, UserRole.NGOAdmin, UserRole.Authority)
  async startRandomVc(@Body() dto: StartVcSessionDto, @Req() request: { user: AuthUser }) {
    await this.accessScope.assertCanAccessInstitute(request.user, dto.instituteId);
    const roomName = `dosje-${randomUUID()}`;
    const participant = await this.liveKitService.createParticipantToken(
      roomName,
      request.user.id,
      request.user.name,
    );
    const session = await this.vcSessionsService.create(dto.instituteId, request.user.id, roomName);
    return { session, roomName, ...participant };
  }

  @Patch('sessions/:id/end')
  endSession(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.vcSessionsService.end(id, request.user);
  }
}
