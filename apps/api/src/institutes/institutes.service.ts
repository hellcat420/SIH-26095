import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccessScopeService } from '../auth/access-scope.service';
import { AuthUser } from '../auth/auth.types';
import { CreateInstituteDto, UpdateInstituteDto } from './institute.dto';
import { Institute } from './institute.entity';
import { CameraStreamService } from '../cameras/camera-stream.service';

@Injectable()
export class InstitutesService {
  constructor(
    @InjectRepository(Institute)
    private readonly instituteRepository: Repository<Institute>,
    private readonly cameraStreamService: CameraStreamService,
    private readonly accessScope: AccessScopeService,
  ) {}

  async findAll(user: AuthUser) {
    const instituteIds = await this.accessScope.instituteIdsFor(user);
    const institutes = await this.instituteRepository.find({
      ...(instituteIds === null ? {} : { where: instituteIds.length ? { id: In(instituteIds) } : { id: In([]) } }),
      relations: ['registeredCameras'],
      order: { createdAt: 'DESC' },
    });
    return institutes.map((institute) => this.withSafeCameraData(institute));
  }

  async findOne(id: string, user: AuthUser) {
    const institute = await this.instituteRepository.findOne({
      where: { id },
      relations: ['registeredCameras'],
    });

    if (!institute) {
      throw new NotFoundException(`Institute with id ${id} not found.`);
    }
    if (!(await this.accessScope.canAccessInstitute(user, institute.id))) {
      throw new NotFoundException(`Institute with id ${id} not found.`);
    }

    return this.withSafeCameraData(institute);
  }

  create(dto: CreateInstituteDto): Promise<Institute> {
    const institute = this.instituteRepository.create(dto);
    return this.instituteRepository.save(institute);
  }

  async update(id: string, dto: UpdateInstituteDto) {
    const institute = await this.instituteRepository.findOneBy({ id });
    if (!institute) throw new NotFoundException(`Institute with id ${id} not found.`);
    await this.instituteRepository.update(id, dto);
    return this.instituteRepository.findOneByOrFail({ id });
  }

  async remove(id: string): Promise<void> {
    const result = await this.instituteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Institute with id ${id} not found.`);
    }
  }

  private withSafeCameraData(institute: Institute) {
    return {
      ...institute,
      registeredCameras: (institute.registeredCameras ?? []).map((camera) => {
        const { rtspUrl: _rtspUrl, ...safeCamera } = camera;
        return {
          ...safeCamera,
          streamUrl: this.cameraStreamService.getHlsUrl(camera.id),
        };
      }),
    };
  }
}
