import { ValueTransformer } from 'typeorm';

export const trimTransformer: ValueTransformer = {
  to: (value: string | null): string | null => value,
  from: (value: string | null): string | null => (typeof value === 'string' ? value.trim() : value),
};
