import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { CreateAssignmentDto, GenerateAssignmentsDto } from './assignment.dto';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../auth/roles.decorator';
import { AuthUser, UserRole } from '../auth/auth.types';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@Req() request: { user: AuthUser }) {
    return this.assignmentsService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.assignmentsService.findOne(id, request.user);
  }

  @Post('generate')
  @Roles(UserRole.Official, UserRole.Authority)
  generate(@Body() dto?: GenerateAssignmentsDto) {
    return this.assignmentsService.runWeightedAssignmentCycle(dto);
  }

  @Post('enqueue')
  @Roles(UserRole.Official, UserRole.Authority)
  enqueue(@Query('count') count?: string) {
    return this.assignmentsService.enqueueAssignmentRun();
  }

  @Post()
  @Roles(UserRole.Official, UserRole.Authority)
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }
}
