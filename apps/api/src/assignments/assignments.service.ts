import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import { Institute } from '../institutes/institute.entity';
import { User } from '../auth/user.entity';
import { AccessScopeService } from '../auth/access-scope.service';
import { AuthUser, UserRole } from '../auth/auth.types';
import { Assignment, AssignmentStatus, AssignmentType } from './assignment.entity';
import { AssignmentAuditLog } from './assignment-audit-log.entity';
import { CreateAssignmentDto, GenerateAssignmentsDto } from './assignment.dto';

@Injectable()
export class AssignmentsService implements OnModuleInit {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentAuditLog)
    private readonly auditLogRepository: Repository<AssignmentAuditLog>,
    @InjectRepository(Institute)
    private readonly instituteRepository: Repository<Institute>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accessScope: AccessScopeService,
    @InjectQueue('assignment-queue')
    private readonly assignmentQueue: Queue,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.runWeightedAssignmentCycle().catch((error) => {
        this.logger.error('Weighted assignment cycle failed', error.stack);
      });
    }, 60 * 60 * 1000);
  }

  async findAll(user: AuthUser) {
    const instituteIds = await this.accessScope.instituteIdsFor(user);
    const where = user.role === UserRole.Inspector
      ? { inspectorId: user.id }
      : instituteIds === null
        ? undefined
        : instituteIds.length
          ? { instituteId: In(instituteIds) }
          : { id: In([]) };
    const assignments = await this.assignmentRepository.find({
      ...(where ? { where } : {}),
      order: { scheduledAt: 'DESC' },
    });
    return assignments.map((assignment) => this.forViewer(assignment, user));
  }

  async findOne(id: string, user: AuthUser) {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) {
      throw new NotFoundException(`Assignment with id ${id} not found.`);
    }
    const canView = user.role === UserRole.Inspector
      ? assignment.inspectorId === user.id
      : await this.accessScope.canAccessInstitute(user, assignment.instituteId);
    if (!canView) throw new NotFoundException(`Assignment with id ${id} not found.`);
    return this.forViewer(assignment, user);
  }

  async create(dto: CreateAssignmentDto) {
    const assignment = await this.assignmentRepository.save(
      this.assignmentRepository.create({
        ...dto,
        status: dto.status ?? AssignmentStatus.Pending,
        assignmentType: dto.assignmentType ?? AssignmentType.Manual,
      }),
    );

    await this.writeAuditLog(assignment.id, 'created', {
      inspectorId: assignment.inspectorId,
      instituteId: assignment.instituteId,
      scheduledAt: assignment.scheduledAt,
      riskScoreAtAssignment: assignment.riskScoreAtAssignment,
    });

    return assignment;
  }

  async runWeightedAssignmentCycle(dto?: GenerateAssignmentsDto): Promise<Assignment[]> {
    const institutes = await this.instituteRepository.find({ order: { createdAt: 'DESC' } });
    if (institutes.length === 0) {
      return [];
    }
    const inspectors = await this.userRepository.find({
      where: { role: UserRole.Inspector, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (inspectors.length === 0) {
      throw new ConflictException('Cannot generate assignments because no active inspectors are registered.');
    }

    const limit = dto?.count ?? institutes.length;
    const selectedInstitutes = institutes.slice(0, Math.max(1, Math.min(limit, institutes.length)));
    const created: Assignment[] = [];

    for (const institute of selectedInstitutes) {
      const inspectorId = this.pickInspector(institute, inspectors);
      const riskScore = this.calculateRiskScore(institute, new Date());

      const assignment = await this.assignmentRepository.save(
        this.assignmentRepository.create({
          inspectorId,
          instituteId: institute.id,
          scheduledAt: new Date(),
          status: AssignmentStatus.Pending,
          assignmentType: AssignmentType.Random,
          riskScoreAtAssignment: Number(riskScore.toFixed(3)),
        }),
      );

      await this.writeAuditLog(assignment.id, 'generated_random_assignment', {
        instituteId: institute.id,
        inspectorId,
        riskScore,
        scheduledAt: assignment.scheduledAt,
      });

      created.push(assignment);
    }

    return created;
  }

  async enqueueAssignmentRun() {
    return this.assignmentQueue.add('generate', { createdAt: new Date().toISOString() }, { jobId: `assignment-${Date.now()}` });
  }

  private pickInspector(institute: Institute, inspectors: User[]): string {
    const ageDays = this.daysSinceLastInspection(institute.updatedAt);
    const weightByRisk = Math.max(0.15, institute.status === 'Flagged' ? 0.9 : 0.5);
    const adjustedWeight = Math.max(0.2, 1 - Math.min(ageDays / 60, 1) * 0.5 + weightByRisk * 0.7);

    const weightedPool = inspectors.map((inspector, index) => ({
      inspectorId: inspector.id,
      weight: adjustedWeight + index * 0.1,
    }));

    const total = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * total;

    for (const item of weightedPool) {
      threshold -= item.weight;
      if (threshold <= 0) {
        return item.inspectorId;
      }
    }

    return weightedPool[0].inspectorId;
  }

  private calculateRiskScore(institute: Institute, now: Date): number {
    const daysSinceUpdate = this.daysSinceLastInspection(institute.updatedAt);
    const statusScore = institute.status === 'Flagged' ? 0.8 : institute.status === 'Suspended' ? 0.95 : 0.4;
    const recencyFactor = Math.min(daysSinceUpdate / 30, 1);

    return Number(Math.min(1, statusScore + recencyFactor * 0.4).toFixed(3));
  }

  private forViewer(assignment: Assignment, user: AuthUser): Omit<Assignment, 'inspectorId'> & { inspectorId: string | null } {
    const mayViewInspector = user.role === UserRole.Authority ||
      user.role === UserRole.Official ||
      (user.role === UserRole.Inspector && assignment.inspectorId === user.id);
    return {
      ...assignment,
      inspectorId: mayViewInspector ? assignment.inspectorId : null,
    };
  }

  private daysSinceLastInspection(date: Date): number {
    const ms = new Date().getTime() - new Date(date).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  private async writeAuditLog(assignmentId: string, action: string, payload: Record<string, any>) {
    const log = this.auditLogRepository.create({
      assignmentId,
      action,
      payload,
    });

    await this.auditLogRepository.save(log);
  }
}
