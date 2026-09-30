import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Institute } from '../institutes/institute.entity';
import { StorageModule } from '../storage/storage.module';
import { Inspection } from './inspection.entity';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inspection, Institute]), StorageModule, AuthModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
