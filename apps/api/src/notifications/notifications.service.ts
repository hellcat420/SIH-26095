import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './device-token.entity';
import { Assignment } from '../assignments/assignment.entity';
import { NotificationType, RegisterDeviceTokenDto, SendNotificationDto } from './notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
  ) {}

  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    let deviceToken = await this.deviceTokenRepository.findOneBy({ token: dto.token });
    if (!deviceToken) {
      deviceToken = this.deviceTokenRepository.create();
    }
    deviceToken.userId = userId;
    deviceToken.token = dto.token;
    deviceToken.platform = dto.platform;
    await this.deviceTokenRepository.save(deviceToken);
    return { registered: true };
  }

  async sendPushNotification(userId: string, dto: SendNotificationDto) {
    const registeredTokens = await this.deviceTokenRepository.findBy({ userId });
    if (registeredTokens.length === 0) {
      throw new NotFoundException(`No registered device tokens found for user ${userId}.`);
    }

    const messaging = this.getMessaging();
    const data = Object.fromEntries(
      Object.entries(dto.payload ?? {}).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]),
    );
    const responses = [];
    for (let offset = 0; offset < registeredTokens.length; offset += 500) {
      const batch = registeredTokens.slice(offset, offset + 500);
      const result = await messaging.sendEachForMulticast({
        tokens: batch.map((entry) => entry.token),
        notification: { title: dto.title, body: dto.body },
        data: { ...data, type: dto.type ?? 'generic' },
      });
      responses.push(...result.responses);
      const invalidTokens = result.responses.flatMap((response, index) => {
        const code = response.error?.code;
        return code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
          ? [batch[index].token]
          : [];
      });
      if (invalidTokens.length > 0) {
        await this.deviceTokenRepository.delete(invalidTokens);
      }
    }

    const failedCount = responses.filter((response) => !response.success).length;
    if (failedCount > 0) {
      this.logger.warn(`FCM delivery failed for ${failedCount} device(s) belonging to ${userId}.`);
    }

    return {
      userId,
      successCount: responses.length - failedCount,
      failureCount: failedCount,
      provider: 'FCM',
      sentAt: new Date().toISOString(),
    };
  }

  async sendInspectionAssignmentAlert(assignmentId: string) {
    const assignment = await this.assignmentRepository.findOneBy({ id: assignmentId });
    if (!assignment) throw new NotFoundException(`Assignment with id ${assignmentId} not found.`);
    return this.sendPushNotification(assignment.inspectorId, {
      title: 'Inspection assignment received',
      body: `You have a new inspection assignment: ${assignmentId}`,
      type: NotificationType.InspectionAssignment,
      payload: { assignmentId },
    });
  }

  async sendRandomVcInvite(userId: string, roomName: string) {
    return this.sendPushNotification(userId, {
      title: 'Random VC invite',
      body: 'A virtual inspection has been triggered. Join now.',
      type: NotificationType.RandomVcInvite,
      payload: { roomName },
    });
  }

  private getMessaging() {
    const existingApp = getApps().find((app) => app.name === 'dosje-monitoring');
    if (existingApp) return getMessaging(existingApp);

    const accountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FCM_PROJECT_ID;
    if (accountJson) {
      try {
        const serviceAccount = JSON.parse(accountJson);
        const app = initializeApp(
          {
            credential: cert(serviceAccount),
            projectId: projectId ?? serviceAccount.project_id,
          },
          'dosje-monitoring',
        );
        return getMessaging(app);
      } catch (error) {
        throw new ServiceUnavailableException(
          `FCM service account configuration is invalid: ${error instanceof Error ? error.message : 'invalid JSON'}`,
        );
      }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
      const app = initializeApp(
        { credential: applicationDefault(), projectId },
        'dosje-monitoring',
      );
      return getMessaging(app);
    }

    throw new ServiceUnavailableException(
      'FCM is not configured. Set FCM_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS and FCM_PROJECT_ID.',
    );
  }
}
