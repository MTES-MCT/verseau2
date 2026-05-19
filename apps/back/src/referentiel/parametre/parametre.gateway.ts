import { Injectable } from '@nestjs/common';
import { CodeParametre } from '@lib/dossier';

// Pour l'instant, cette gateway fait un mapping en dur avec les valeurs de code Sandre
// Plus tard, elle sera implémentée par un repository
@Injectable()
export class ParametreGateway {
  constructor() {}

  findCodeParametreById(id: keyof typeof CodeParametre): number | null {
    switch (id) {
      case 'DCO':
        return CodeParametre.DCO;
      case 'DBO5':
        return CodeParametre.DBO5;
      case 'MES':
        return CodeParametre.MES;
      case 'NTK':
        return CodeParametre.NTK;
      case 'Ptot':
        return CodeParametre.Ptot;
      case 'N_NH4':
        return CodeParametre.N_NH4;
      case 'NGL':
        return CodeParametre.NGL;
      case 'pH':
        return CodeParametre.pH;
      default:
        return null;
    }
  }

  findParametresByCodes(codes: string[] | string): (string | null)[] {
    const codeList = Array.isArray(codes) ? codes : [codes];
    // Convert strings to numbers
    const numericCodes = codeList.map((c) => Number(c));
    const reverseMapping = Object.entries(CodeParametre).reduce(
      (acc, [key, value]) => {
        if (typeof value === 'number') {
          acc[value] = key;
        }
        return acc;
      },
      {} as Record<number, string>,
    );

    return numericCodes.map((code) => reverseMapping[Number(code)] || null);
  }
}
