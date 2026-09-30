import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Institute } from '../institutes/institute.entity';
import { User } from '../auth/user.entity';
import { Assignment } from './assignment.entity';
import { AssignmentAuditLog } from './assignment-audit-log.entity';
import { AssignmentProcessor } from './assignment-processor';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, AssignmentAuditLog, Institute, User]),
    AuthModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({ name: 'assignment-queue' }),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentProcessor],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
