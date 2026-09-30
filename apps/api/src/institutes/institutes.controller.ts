import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { CreateInstituteDto, UpdateInstituteDto } from './institute.dto';
import { InstitutesService } from './institutes.service';
import { Roles } from '../auth/roles.decorator';
import { AuthUser, UserRole } from '../auth/auth.types';

@Controller('institutes')
export class InstitutesController {
  constructor(private readonly institutesService: InstitutesService) {}

  @Get()
  findAll(@Req() request: { user: AuthUser }) {
    return this.institutesService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.institutesService.findOne(id, request.user);
  }

  @Post()
  @Roles(UserRole.Official, UserRole.Authority)
  create(@Body() dto: CreateInstituteDto) {
    return this.institutesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Official, UserRole.Authority)
  update(@Param('id') id: string, @Body() dto: UpdateInstituteDto) {
    return this.institutesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Official, UserRole.Authority)
  remove(@Param('id') id: string) {
    return this.institutesService.remove(id);
  }
}
