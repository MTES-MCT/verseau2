import { Test, TestingModule } from '@nestjs/testing';
import { DroitsUserService } from './droitsUser.service';
import { UserGateway } from './user.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { LoggerService } from '@shared/logger/logger.service';
import { ROLE } from './user.model';

describe('DroitsUserService', () => {
  let service: DroitsUserService;

  const mockUserGateway = {
    findBySub: jest.fn(),
  };

  const mockMasaProvider = {
    findAgByEmail: jest.fn(),
    findIntervenantById: jest.fn(),
    hasRole: jest.fn(),
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
        { provide: MasaProvider, useValue: mockMasaProvider },
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
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(true);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(true);
      expect(mockMasaProvider.hasRole).toHaveBeenCalledWith(prCdn, ROLE.EXPERT_NATIONAL_VERSEAU);
    });

    it('retourne false si le rôle 305 est absent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(false);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si utilisateur non trouvé', async () => {
      mockUserGateway.findBySub.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.findAgByEmail).not.toHaveBeenCalled();
    });

    it("retourne false si l'utilisateur n'a pas d'email", async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email: null });

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si aucun AG lié', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.hasRole).not.toHaveBeenCalled();
    });

    it('retourne false si une erreur est levée par findBySub', async () => {
      mockUserGateway.findBySub.mockRejectedValue(new Error('DB error'));

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si une erreur est levée par hasRole', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockRejectedValue(new Error('provider error'));

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });
  });

  describe('isExpertBassinVerseau', () => {
    const sub = 'bassin-sub';
    const email = 'bassin@example.com';
    const prCdn = 888;

    it('retourne true si le rôle expert bassin est présent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(true);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(true);
      expect(mockMasaProvider.hasRole).toHaveBeenCalledWith(prCdn, ROLE.EXPERT_BASSIN_VERSEAU);
    });

    it('retourne false si le rôle expert bassin est absent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(false);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si utilisateur non trouvé', async () => {
      mockUserGateway.findBySub.mockResolvedValue(null);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.findAgByEmail).not.toHaveBeenCalled();
    });

    it("retourne false si l'utilisateur n'a pas d'email", async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email: null });

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si aucun AG lié', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue(null);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.hasRole).not.toHaveBeenCalled();
    });

    it('retourne false si une erreur est levée par findBySub', async () => {
      mockUserGateway.findBySub.mockRejectedValue(new Error('DB error'));

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si une erreur est levée par hasRole', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgByEmail.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantIdentifiant: 100,
      });
      mockMasaProvider.hasRole.mockRejectedValue(new Error('provider error'));

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });
  });
});
