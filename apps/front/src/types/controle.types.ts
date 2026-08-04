import type { ControleDto } from '@lib/dossier';

export type ControleView = Pick<ControleDto, 'name' | 'success' | 'evenementType'> & { message: string };

export type ControleSandreView = Pick<ControleDto, 'name' | 'success'> & { message: string };

export type ControleFilterType = 'success' | 'warning' | 'error' | 'information';

export type ControleFilterSet = Set<ControleFilterType>;
