import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institute } from '../institutes/institute.entity';
import { SessionTriggerType, VcSession, VcSessionStatus } from './vc-session.entity';
import { AuthUser, UserRole } from '../auth/auth.types';

@Injectable()
export class VcSessionsService {
  constructor(
    @InjectRepository(VcSession)
    private readonly sessionRepository: Repository<VcSession>,
    @InjectRepository(Institute)
    private readonly instituteRepository: Repository<Institute>,
  ) {}

  async create(instituteId: string, initiatedBy: string, roomName: string) {
    const institute = await this.instituteRepository.findOneBy({ id: instituteId });
    if (!institute) {
      throw new NotFoundException(`Institute with id ${instituteId} not found.`);
    }

    return this.sessionRepository.save(
      this.sessionRepository.create({
        instituteId,
        initiatedBy,
        roomName,
        participants: [initiatedBy],
        triggerType: SessionTriggerType.Random,
        status: VcSessionStatus.InProgress,
      }),
    );
  }

  async end(id: string, user: AuthUser) {
    const session = await this.sessionRepository.findOneBy({ id });
    if (!session) throw new NotFoundException(`VC session with id ${id} not found.`);
    const isAdministrator = user.role === UserRole.Official || user.role === UserRole.Authority;
    if (!isAdministrator && session.initiatedBy !== user.id) {
      throw new ForbiddenException('Only the session initiator can end this session.');
    }
    if (session.status !== VcSessionStatus.Completed) {
      session.status = VcSessionStatus.Completed;
      session.endedAt = new Date();
      await this.sessionRepository.save(session);
    }
    return session;
  }
}
