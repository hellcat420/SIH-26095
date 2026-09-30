import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { InstitutesModule } from './institutes/institutes.module';
import { CamerasModule } from './cameras/cameras.module';
import { InspectionsModule } from './inspections/inspections.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { InitialDosjeSchema1740000000000 } from './migrations/1740000000000-InitialDosjeSchema';
import { getDatabaseSettings } from './app.config';

const database = getDatabaseSettings();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: database.host,
      port: database.port,
      username: database.username,
      password: database.password,
      database: database.database,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [InitialDosjeSchema1740000000000],
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    AuthModule,
    InstitutesModule,
    CamerasModule,
    InspectionsModule,
    AssignmentsModule,
    NotificationsModule,
    AiModule,
  ],
})
export class AppModule {}
