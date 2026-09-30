import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../assignments/assignment.entity';
import { Institute } from '../institutes/institute.entity';
import { Inspection } from '../inspections/inspection.entity';
import { AuthUser, UserRole } from './auth.types';

@Injectable()
export class AccessScopeService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Inspection) private readonly inspectionRepository: Repository<Inspection>,
    @InjectRepository(Institute) private readonly instituteRepository: Repository<Institute>,
  ) {}

  async instituteIdsFor(user: AuthUser): Promise<string[] | null> {
    if (user.role === UserRole.Authority || user.role === UserRole.Official) return null;

    if (user.role === UserRole.Inspector) {
      const [assignments, inspections] = await Promise.all([
        this.assignmentRepository.find({
          where: { inspectorId: user.id },
          select: ['instituteId'],
        }),
        this.inspectionRepository.find({
          where: { inspectorId: user.id },
          select: ['instituteId'],
        }),
      ]);
      return [...new Set([
        ...assignments.map((assignment) => assignment.instituteId),
        ...inspections.map((inspection) => inspection.instituteId).filter((id): id is string => Boolean(id)),
      ])];
    }

    if (!user.instituteId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.instituteId)) {
      return [];
    }
    const institute = await this.instituteRepository.findOneBy({ id: user.instituteId });
    return institute ? [institute.id] : [];
  }

  async assertCanAccessInstitute(user: AuthUser, instituteId: string): Promise<void> {
    const instituteIds = await this.instituteIdsFor(user);
    if (instituteIds !== null && !instituteIds.includes(instituteId)) {
      throw new ForbiddenException('You do not have access to this institute.');
    }
  }

  async canAccessInstitute(user: AuthUser, instituteId: string): Promise<boolean> {
    const instituteIds = await this.instituteIdsFor(user);
    return instituteIds === null || instituteIds.includes(instituteId);
  }

  hasInspectorAssignment(inspectorId: string, instituteId: string): Promise<boolean> {
    return this.assignmentRepository.exist({ where: { inspectorId, instituteId } });
  }
}
