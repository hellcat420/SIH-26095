import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AssignmentStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Missed = 'Missed',
}

export enum AssignmentType {
  Random = 'Random',
  Manual = 'Manual',
  Triggered = 'Triggered',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  inspectorId!: string;

  @Column()
  instituteId!: string;

  @Column({ type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.Pending })
  status: AssignmentStatus = AssignmentStatus.Pending;

  @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.Random })
  assignmentType: AssignmentType = AssignmentType.Random;

  @Column('double precision', { default: 0 })
  riskScoreAtAssignment!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
