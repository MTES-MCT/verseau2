/* eslint-disable @typescript-eslint/unbound-method */
import { SandreAcceptationStatus } from '@lib/dossier';
import { ControleController } from './controle.controller';
import type { ControleGateway } from './controle.gateway';
import type { MasaGateway } from '../masa/masa.gateway';
import type { ReponseSandreGateway } from './technique/sandre/reponseSandre.gateway';

describe('ControleController Sandre response', () => {
  const reponseSandreGateway: jest.Mocked<ReponseSandreGateway> = {
    findByDepotId: jest.fn(),
    createReponseSandre: jest.fn(),
    updateReponseSandre: jest.fn(),
  };
  const controleGateway: jest.Mocked<ControleGateway> = {
    findByDepotId: jest.fn(),
    createControle: jest.fn(),
    createControles: jest.fn(),
  };
  const masaGateway: jest.Mocked<MasaGateway> = {
    findById: jest.fn(),
    findByDepotId: jest.fn(),
    saveMasaRetour: jest.fn(),
  };
  const controller = new ControleController(controleGateway, reponseSandreGateway, masaGateway);

  beforeEach(() => jest.clearAllMocks());

  it('maps repository results to the public DTO', async () => {
    const dates = { createdAt: new Date(), updatedAt: new Date() };
    reponseSandreGateway.findByDepotId.mockResolvedValue([
      {
        id: 'res_test',
        jeton: 'private-token',
        codeScenario: 'FCT_ASSAIN',
        versionScenario: '4',
        acceptationStatus: SandreAcceptationStatus.CONFORMANT,
        isConformant: true,
        errors: [],
        ...dates,
      },
    ]);

    await expect(controller.getControleSandre({ depotId: 'dep_test' })).resolves.toStrictEqual([
      {
        id: 'res_test',
        acceptationStatus: SandreAcceptationStatus.CONFORMANT,
        isConformant: true,
        errors: [],
        ...dates,
      },
    ]);
    expect(reponseSandreGateway.findByDepotId).toHaveBeenCalledWith('dep_test');
  });

  it('returns an empty list when no Sandre result exists', async () => {
    reponseSandreGateway.findByDepotId.mockResolvedValue([]);

    await expect(controller.getControleSandre({ depotId: 'dep_test' })).resolves.toStrictEqual([]);
  });
});
