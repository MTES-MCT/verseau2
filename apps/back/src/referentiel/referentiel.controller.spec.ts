/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MeGuard } from '@authentication/me.guard';
import { MasaProvider } from '@masa/masa.provider';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ParametreGateway } from './parametre/parametre.gateway';
import { ReferentielController } from './referentiel.controller';

describe('ReferentielController', () => {
  let controller: ReferentielController;
  let masaProvider: jest.Mocked<MasaProvider>;

  beforeEach(async () => {
    const masaProviderMock: jest.Mocked<Partial<MasaProvider>> = {
      findParametresByCodes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferentielController],
      providers: [
        {
          provide: MasaProvider,
          useValue: masaProviderMock,
        },
        {
          provide: ParametreGateway,
          useValue: { findParametresByCodes: jest.fn() },
        },
      ],
    })
      .overrideGuard(MeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HasUserAccessToOuvragesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ReferentielController);
    masaProvider = module.get(MasaProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listParametresReferentiel', () => {
    it('delegates to masa provider with posted codes', async () => {
      masaProvider.findParametresByCodes.mockResolvedValue([
        {
          parametreAnalyseCode: '1313',
          parametreNomCourt: 'DBO5',
        },
      ]);

      const result = await controller.listParametresReferentiel({ codes: ['1313'] });

      expect(masaProvider.findParametresByCodes).toHaveBeenCalledWith(['1313']);
      expect(result).toEqual([
        {
          parametreAnalyseCode: '1313',
          parametreNomCourt: 'DBO5',
        },
      ]);
    });
  });
});
