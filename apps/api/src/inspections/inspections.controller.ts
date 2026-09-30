import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { CreateInspectionDto, MediaUploadDto } from './inspection.dto';
import { InspectionsService } from './inspections.service';
import { Roles } from '../auth/roles.decorator';
import { AuthUser, UserRole } from '../auth/auth.types';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  findAll(@Req() request: { user: AuthUser }) {
    return this.inspectionsService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.inspectionsService.findOne(id, request.user);
  }

  @Post('presign-url')
  @Roles(UserRole.Inspector, UserRole.Official, UserRole.Authority)
  createPresignedUrl(@Body() dto: MediaUploadDto) {
    return this.inspectionsService.createPresignedUploadUrl(dto);
  }

  @Post()
  @Roles(UserRole.Inspector, UserRole.Official, UserRole.Authority)
  create(@Body() dto: CreateInspectionDto, @Req() request: { user: AuthUser }) {
    return this.inspectionsService.create(dto, request.user);
  }

  @Delete(':id')
  @Roles(UserRole.Official, UserRole.Authority)
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
