import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Camera } from '../cameras/camera.entity';

export enum InstituteType {
  Project = 'Project',
  Institute = 'Institute',
  NGO = 'NGO',
}

export enum InstituteStatus {
  Active = 'Active',
  Flagged = 'Flagged',
  Suspended = 'Suspended',
}

@Entity('institutes')
export class Institute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: InstituteType, default: InstituteType.Institute })
  type: InstituteType = InstituteType.Institute;

  @Column()
  schemeType!: string;

  @Column()
  address!: string;

  @Column('double precision')
  lat!: number;

  @Column('double precision')
  lng!: number;

  @Column()
  contactPerson!: string;

  @Column({ type: 'enum', enum: InstituteStatus, default: InstituteStatus.Active })
  status: InstituteStatus = InstituteStatus.Active;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Camera, (camera) => camera.institute)
  registeredCameras!: Camera[];
}
