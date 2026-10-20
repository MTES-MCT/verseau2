import { CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ulid } from 'ulid';
@Entity()
export class BaseEntity {
  @PrimaryColumn()
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  constructor() {
    this.id = ulid().toLowerCase();
  }
}
