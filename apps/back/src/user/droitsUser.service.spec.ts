import { Test, TestingModule } from '@nestjs/testing';
import { DroitsUserService } from './droitsUser.service';
import { UserGateway } from './user.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LoggerService } from '@shared/logger/logger.service';

describe('DroitsUserService', () => {
  let service: DroitsUserService;

  const mockUserGateway = {
    findBySub: jest.fn(),
  };

  const mockLanceleauGateway = {
    findAgByEmail: jest.fn(),
    findOrionRoleForPrincipal: jest.fn(),
    findByItvCdn: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DroitsUserService,
        { provide: UserGateway, useValue: mockUserGateway },
        { provide: LanceleauGateway, useValue: mockLanceleauGateway },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DroitsUserService>(DroitsUserService);
    jest.clearAllMocks();
  });

  describe('isExpertNationalVerseau', () => {
    const sub = 'expert-sub';
    const email = 'expert@example.com';
    const prCdn = 999;

    it('retourne true si le rôle 305 est présent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockLanceleauGateway.findAgByEmail.mockResolvedValue({ prCdn, itvCdn: 100 });
      mockLanceleauGateway.findOrionRoleForPrincipal.mockResolvedValue({ prCdn, roleCdn: 305 });

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(true);
      expect(mockLanceleauGateway.findOrionRoleForPrincipal).toHaveBeenCalledWith(prCdn, 305);
    });

    it('retourne false si le rôle 305 est absent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockLanceleauGateway.findAgByEmail.mockResolvedValue({ prCdn, itvCdn: 100 });
      mockLanceleauGateway.findOrionRoleForPrincipal.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si utilisateur non trouvé', async () => {
      mockUserGateway.findBySub.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
      expect(mockLanceleauGateway.findAgByEmail).not.toHaveBeenCalled();
    });

    it("retourne false si l'utilisateur n'a pas d'email", async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email: null });

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si aucun AG lié', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockLanceleauGateway.findAgByEmail.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
      expect(mockLanceleauGateway.findOrionRoleForPrincipal).not.toHaveBeenCalled();
    });

    it('retourne false si une erreur est levée', async () => {
      mockUserGateway.findBySub.mockRejectedValue(new Error('DB error'));

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });
  });
});
