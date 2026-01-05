import type { ControleDto } from '@lib/dossier';

export type ControleView = Pick<ControleDto, 'name' | 'success' | 'evenementType'> & { message: string };
