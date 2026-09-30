import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('assignment_audit_logs')
export class AssignmentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  assignmentId!: string;

  @Column()
  action!: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any> = {};

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
