import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CameraHealthService } from './camera-health.service';
import { CreateCameraDto, UpdateCameraDto } from './camera.dto';
import { CamerasService } from './cameras.service';
import { Roles } from '../auth/roles.decorator';
import { AuthUser, UserRole } from '../auth/auth.types';

@Controller('cameras')
export class CamerasController {
  constructor(
    private readonly camerasService: CamerasService,
    private readonly cameraHealthService: CameraHealthService,
  ) {}

  @Get()
  findAll(@Query('instituteId') instituteId: string | undefined, @Req() request: { user: AuthUser }) {
    return this.camerasService.findAll(request.user, instituteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.camerasService.findOne(id, request.user);
  }

  @Post('health-check')
  @Roles(UserRole.Official, UserRole.Authority)
  async checkAllCameras() {
    const cameras = await this.cameraHealthService.checkAllCameras();
    return cameras.map((camera) => this.camerasService.toResponse(camera));
  }

  @Post(':id/health-check')
  @Roles(UserRole.Official, UserRole.Authority)
  async checkCamera(@Param('id') id: string) {
    const camera = await this.camerasService.findOneForHealthCheck(id);
    return this.camerasService.toResponse(await this.cameraHealthService.checkCamera(camera));
  }

  @Post()
  @Roles(UserRole.Official, UserRole.Authority)
  create(@Body() dto: CreateCameraDto) {
    return this.camerasService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Official, UserRole.Authority)
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.camerasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Official, UserRole.Authority)
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }
}
