import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Institute } from '../institutes/institute.entity';

export enum CameraStatus {
  Online = 'Online',
  Offline = 'Offline',
  Tampered = 'Tampered',
}

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  instituteId!: string;

  @Column()
  rtspUrl!: string;

  @Column()
  label!: string;

  @Column({ type: 'enum', enum: CameraStatus, default: CameraStatus.Offline })
  status: CameraStatus = CameraStatus.Offline;

  @Column({ type: 'timestamptz', nullable: true })
  lastPingAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Institute, (institute) => institute.registeredCameras, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  institute!: Institute;
}
