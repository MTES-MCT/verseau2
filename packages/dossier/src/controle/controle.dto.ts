import { BaseEntity } from '../baseEntity';
import { ControleName } from './controleResult';
import { ErrorCode } from './error';

export interface ControleDto extends BaseEntity {
  id: string;
  name: ControleName;
  success: boolean;
  error?: ErrorCode;
  errorParams?: string[];
}
