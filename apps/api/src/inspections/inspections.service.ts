import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { AccessScopeService } from '../auth/access-scope.service';
import { AuthUser, UserRole } from '../auth/auth.types';
import { Institute } from '../institutes/institute.entity';
import { ObjectStorageService } from '../storage/storage.service';
import { CreateInspectionDto, MediaUploadDto } from './inspection.dto';
import { Inspection } from './inspection.entity';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
    @InjectRepository(Institute)
    private readonly instituteRepository: Repository<Institute>,
    private readonly objectStorage: ObjectStorageService,
    private readonly accessScope: AccessScopeService,
  ) {}

  async findAll(user: AuthUser) {
    const instituteIds = await this.accessScope.instituteIdsFor(user);
    const where = user.role === UserRole.Inspector
      ? { inspectorId: user.id }
      : instituteIds === null
        ? undefined
        : instituteIds.length
          ? { instituteId: In(instituteIds) }
          : { id: In([]) };
    return this.inspectionRepository
      .find({ ...(where ? { where } : {}), order: { createdAt: 'DESC' } })
      .then((inspections) => inspections.map((inspection) => this.withoutInlineMedia(inspection)));
  }

  async findOne(id: string, user: AuthUser) {
    const inspection = await this.inspectionRepository.findOneBy({ id });
    if (!inspection) {
      throw new NotFoundException(`Inspection with id ${id} not found.`);
    }
    const isInspector = user.role === UserRole.Inspector;
    const isInspectorOwner = isInspector && inspection.inspectorId === user.id;
    const hasInstituteAccess = !isInspector &&
      await this.accessScope.canAccessInstitute(user, inspection.instituteId ?? '');
    if (!isInspectorOwner && !hasInstituteAccess) {
      throw new NotFoundException(`Inspection with id ${id} not found.`);
    }
    return this.withoutInlineMedia(inspection);
  }

  async create(dto: CreateInspectionDto, user: AuthUser) {
    if (user.role === UserRole.Inspector && (
      !dto.instituteId || !(await this.accessScope.hasInspectorAssignment(user.id, dto.instituteId))
    )) {
      throw new ForbiddenException('Inspectors may submit inspections only for assigned institutes.');
    }

    if (dto.clientSubmissionId) {
      const existing = await this.inspectionRepository.findOneBy({
        clientSubmissionId: dto.clientSubmissionId,
      });
      if (existing) {
        if (existing.inspectorId && existing.inspectorId !== user.id && user.role !== UserRole.Official && user.role !== UserRole.Authority) {
          throw new ForbiddenException('This submission identifier belongs to another inspector.');
        }
        return existing;
      }
    }

    if (dto.instituteId) {
      const institute = await this.instituteRepository.findOneBy({ id: dto.instituteId });
      if (!institute) {
        throw new NotFoundException(`Institute with id ${dto.instituteId} not found.`);
      }

      if (dto.gpsLat === undefined || dto.gpsLng === undefined) {
        throw new BadRequestException('GPS coordinates are required for institute inspections.');
      }

      if (dto.gpsAccuracyMeters !== undefined && dto.gpsAccuracyMeters > 100) {
        throw new BadRequestException('GPS accuracy must be 100 meters or better.');
      }

      if (this.distanceInMeters(dto.gpsLat, dto.gpsLng, institute.lat, institute.lng) > 100) {
        throw new BadRequestException('Inspection location must be within 100 meters of the institute.');
      }
    }

    const photos = await Promise.all((dto.photos ?? []).map(async (photo) => {
      if (!photo.contentBase64) {
        return photo;
      }

      const content = Buffer.from(photo.contentBase64, 'base64');
      const actualHash = createHash('sha256').update(content).digest('hex');
      if (photo.sha256 && photo.sha256.toLowerCase() !== actualHash) {
        throw new BadRequestException(`Photo integrity check failed for ${photo.fileName}.`);
      }

      const safeName = photo.fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-160) || 'evidence.jpg';
      const s3Key = `inspections/${dto.clientSubmissionId ?? randomUUID()}/${safeName}`;
      await this.objectStorage.upload(
        s3Key,
        content,
        photo.contentType ?? 'application/octet-stream',
      );
      const { contentBase64: _contentBase64, ...metadata } = photo;
      return { ...metadata, s3Key, sha256: actualHash };
    }));

    const inspection = this.inspectionRepository.create({
      ...dto,
      inspectorId: user.id,
      checklistResponses: dto.checklistResponses ?? {},
      photos,
      videos: dto.videos ?? [],
    });

    return this.inspectionRepository.save(inspection);
  }

  async remove(id: string) {
    const result = await this.inspectionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Inspection with id ${id} not found.`);
    }
  }

  createPresignedUploadUrl(dto: MediaUploadDto) {
    return this.objectStorage.createPresignedUploadUrl(
      dto.fileName,
      dto.contentType,
      dto.folder,
    );
  }

  private distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6_371_000;
    const latitudeDelta = radians(lat2 - lat1);
    const longitudeDelta = radians(lng2 - lng1);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private withoutInlineMedia(inspection: Inspection): Inspection {
    return {
      ...inspection,
      photos: inspection.photos.map(({ contentBase64: _contentBase64, ...metadata }) => metadata),
    };
  }
}
