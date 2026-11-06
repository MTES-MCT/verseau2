import { ControleSandreDtoSchema, SandreAcceptationStatus } from '@lib/dossier';
import { DepotEntity } from '@dossier/depot/depot.entity';
import type { ReponseSandreModel } from './reponseSandre.model';
import { mapReponseSandreModelToDto } from './reponseSandre.mapper';

describe('mapReponseSandreModelToDto', () => {
  const error = {
    code: 'MISSING_XML_DECLARATION',
    message: 'La déclaration XML est absente.',
    location: '',
    ligne: '',
    colonne: '',
    severite: 'Warning',
    internal: 'not part of the DTO',
  };
  const reponse: ReponseSandreModel = {
    id: 'res_test',
    jeton: 'private-token',
    acceptationStatus: SandreAcceptationStatus.CONFORMANT,
    isConformant: true,
    codeScenario: 'FCT_ASSAIN',
    versionScenario: '4',
    errors: [error],
    raw: undefined,
    depot: new DepotEntity(),
    createdAt: new Date('2026-10-20T00:00:00Z'),
    updatedAt: new Date('2026-10-20T01:00:00Z'),
  };

  it('returns only DTO fields, including only declared diagnostic fields', () => {
    const dto = mapReponseSandreModelToDto(reponse);

    expect(dto).toStrictEqual({
      id: reponse.id,
      acceptationStatus: reponse.acceptationStatus,
      isConformant: reponse.isConformant,
      errors: [
        {
          code: error.code,
          message: error.message,
          location: error.location,
          ligne: error.ligne,
          colonne: error.colonne,
          severite: error.severite,
        },
      ],
      createdAt: reponse.createdAt,
      updatedAt: reponse.updatedAt,
    });
    expect(ControleSandreDtoSchema.parse(dto)).toStrictEqual(dto);
    expect(reponse.errors?.[0]).toHaveProperty('internal');
  });

  it.each([undefined, []])('supports absent or empty diagnostics: %j', (errors) => {
    const dto = mapReponseSandreModelToDto({ ...reponse, errors });

    expect(dto.errors).toEqual(errors);
    expect(ControleSandreDtoSchema.parse(dto)).toStrictEqual(dto);
  });
});
