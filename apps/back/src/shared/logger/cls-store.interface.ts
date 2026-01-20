import { ClsStore } from 'nestjs-cls';

export interface CustomClsStore extends ClsStore {
  correlationId?: string;
}
