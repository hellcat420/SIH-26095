import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('inspections')
@Unique(['clientSubmissionId'])
export class Inspection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  clientSubmissionId?: string;

  @Column({ type: 'uuid', nullable: true })
  instituteId?: string;

  @Column({ nullable: true })
  inspectorId?: string;

  @Column({ nullable: true })
  assignmentId?: string;

  @Column({ type: 'jsonb', nullable: true })
  checklistResponses?: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  photos: Array<{
    s3Key?: string;
    fileName: string;
    capturedAt: string;
    sha256?: string;
    contentType?: string;
    contentBase64?: string;
  }> = [];

  @Column({ type: 'jsonb', default: [] })
  videos: Array<{ s3Key: string; fileName: string; capturedAt: string }> = [];

  @Column('double precision', { nullable: true })
  gpsLat?: number;

  @Column('double precision', { nullable: true })
  gpsLng?: number;

  @Column('double precision', { nullable: true })
  gpsAccuracyMeters?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
