import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessScopeService } from '../auth/access-scope.service';
import { AuthUser } from '../auth/auth.types';
import { Institute } from '../institutes/institute.entity';
import { Camera } from './camera.entity';
import { CreateCameraDto, UpdateCameraDto } from './camera.dto';
import { CameraStreamService } from './camera-stream.service';

export type CameraResponse = Omit<Camera, 'rtspUrl'> & { streamUrl: string | null };

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepository: Repository<Camera>,
    @InjectRepository(Institute)
    private readonly instituteRepository: Repository<Institute>,
    private readonly cameraStreamService: CameraStreamService,
    private readonly accessScope: AccessScopeService,
  ) {}

  async findAll(user: AuthUser, instituteId?: string): Promise<CameraResponse[]> {
    const query = this.cameraRepository.createQueryBuilder('camera').leftJoinAndSelect('camera.institute', 'institute');

    const accessibleInstituteIds = await this.accessScope.instituteIdsFor(user);
    if (instituteId && accessibleInstituteIds !== null && !accessibleInstituteIds.includes(instituteId)) {
      return [];
    }
    if (instituteId) {
      query.where('camera.instituteId = :instituteId', { instituteId });
    } else if (accessibleInstituteIds !== null) {
      if (accessibleInstituteIds.length === 0) return [];
      query.where('camera.instituteId IN (:...instituteIds)', { instituteIds: accessibleInstituteIds });
    }

    const cameras = await query.orderBy('camera.createdAt', 'DESC').getMany();
    return cameras.map((camera) => this.toResponse(camera));
  }

  async findOne(id: string, user: AuthUser): Promise<CameraResponse> {
    const camera = await this.getEntity(id);
    if (!(await this.accessScope.canAccessInstitute(user, camera.instituteId))) {
      throw new NotFoundException(`Camera with id ${id} not found.`);
    }
    return this.toResponse(camera);
  }

  async findOneForHealthCheck(id: string): Promise<Camera> {
    return this.getEntity(id);
  }

  async create(dto: CreateCameraDto): Promise<CameraResponse> {
    this.cameraStreamService.validateSource(dto.rtspUrl);
    const institute = await this.instituteRepository.findOneBy({ id: dto.instituteId });
    if (!institute) {
      throw new NotFoundException(`Institute with id ${dto.instituteId} not found.`);
    }

    const camera = this.cameraRepository.create({
      ...dto,
      institute,
    });

    const savedCamera = await this.cameraRepository.save(camera);
    await this.cameraStreamService.registerSource(savedCamera.id, savedCamera.rtspUrl);
    return this.toResponse(savedCamera);
  }

  async update(id: string, dto: UpdateCameraDto): Promise<CameraResponse> {
    if (dto.rtspUrl) this.cameraStreamService.validateSource(dto.rtspUrl);
    const existing = await this.getEntity(id);

    if (dto.instituteId) {
      const institute = await this.instituteRepository.findOneBy({ id: dto.instituteId });
      if (!institute) {
        throw new NotFoundException(`Institute with id ${dto.instituteId} not found.`);
      }
      existing.institute = institute;
    }

    Object.assign(existing, dto);
    await this.cameraRepository.save(existing);
    if (dto.rtspUrl) {
      await this.cameraStreamService.registerSource(existing.id, existing.rtspUrl, true);
    }
    return this.toResponse(existing);
  }

  async remove(id: string): Promise<void> {
    await this.getEntity(id);
    await this.cameraStreamService.removeSource(id);
    const result = await this.cameraRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Camera with id ${id} not found.`);
    }
  }

  toResponse(camera: Camera): CameraResponse {
    const { rtspUrl: _rtspUrl, ...safeCamera } = camera;
    return {
      ...safeCamera,
      streamUrl: this.cameraStreamService.getHlsUrl(camera.id),
    };
  }

  private async getEntity(id: string): Promise<Camera> {
    const camera = await this.cameraRepository.findOne({
      where: { id },
      relations: ['institute'],
    });
    if (!camera) {
      throw new NotFoundException(`Camera with id ${id} not found.`);
    }
    return camera;
  }
}
