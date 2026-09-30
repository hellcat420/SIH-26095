import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { describe, expect, it, jest } from '@jest/globals';
import { Assignment } from '../src/assignments/assignment.entity';
import { AccessScopeService } from '../src/auth/access-scope.service';
import { AuthUser, UserRole } from '../src/auth/auth.types';
import { Institute } from '../src/institutes/institute.entity';
import { Inspection } from '../src/inspections/inspection.entity';

describe('AccessScopeService', () => {
  it('limits inspectors to institutes present in their assignments and inspections', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessScopeService,
        {
          provide: getRepositoryToken(Assignment),
          useValue: { find: jest.fn(async () => [{ instituteId: 'institute-assigned' }]) },
        },
        {
          provide: getRepositoryToken(Inspection),
          useValue: { find: jest.fn(async () => [{ instituteId: 'institute-inspected' }]) },
        },
        { provide: getRepositoryToken(Institute), useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(AccessScopeService);
    const inspector: AuthUser = {
      id: 'inspector-id',
      name: 'Inspector',
      phone: '9876543210',
      role: UserRole.Inspector,
    };

    expect(await service.instituteIdsFor(inspector)).toEqual([
      'institute-assigned',
      'institute-inspected',
    ]);
    await expect(service.assertCanAccessInstitute(inspector, 'institute-outside-scope'))
      .rejects.toThrow('You do not have access to this institute.');
  });

  it('returns all institute access only to Authority and Official users', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessScopeService,
        {
          provide: getRepositoryToken(Assignment),
          useValue: { find: jest.fn(), exist: jest.fn() },
        },
        { provide: getRepositoryToken(Inspection), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Institute), useValue: { findOneBy: jest.fn() } },
      ],
    }).compile();
    const service = moduleRef.get(AccessScopeService);

    for (const role of [UserRole.Authority, UserRole.Official]) {
      await expect(service.instituteIdsFor({
        id: 'staff-id',
        name: 'Staff',
        phone: '9000000000',
        role,
      })).resolves.toBeNull();
    }
  });
});
