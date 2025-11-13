import { Entity, PrimaryColumn } from 'typeorm';
import { ulid } from 'ulid';
@Entity()
export class BaseEntity {
  @PrimaryColumn()
  id: string;

  constructor() {
    this.id = ulid().toLowerCase();
  }
}
