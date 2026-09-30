import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SessionTriggerType {
  Random = 'Random',
  Manual = 'Manual',
}

export enum VcSessionStatus {
  InProgress = 'InProgress',
  Completed = 'Completed',
}

@Entity('vc_sessions')
export class VcSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  instituteId!: string;

  @Column()
  initiatedBy!: string;

  @Column({ unique: true })
  roomName!: string;

  @Column({ type: 'jsonb', default: [] })
  participants: string[] = [];

  @Column({ type: 'enum', enum: SessionTriggerType })
  triggerType!: SessionTriggerType;

  @Column({ type: 'enum', enum: VcSessionStatus, default: VcSessionStatus.InProgress })
  status: VcSessionStatus = VcSessionStatus.InProgress;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  recordingUrl?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
