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
    findAgentByOrionLogin: jest.fn(),
    findRolesByPrCdn: jest.fn(),
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

  describe('resolveVerseauAccess', () => {
    const email = 'user@example.com';
    const principalIdentifiant = 999;
    const intervenantId = 100;

    beforeEach(() => {
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant,
        intervenantId,
        mail: 'contact-ag@example.com',
        nom: null,
        prenom: null,
      });
    });

    it.each([301, 303, 305, 306, 307, 308])('autorise le rôle Orion %i', async (roleOrionId) => {
      mockMasaProvider.findRolesByPrCdn.mockResolvedValue([{ principalIdentifiant, roleOrionId }]);

      await expect(service.resolveVerseauAccess(email)).resolves.toEqual({
        itvCdn: intervenantId,
        isExpertNational: roleOrionId === Number(ROLE.EXPERT_NATIONAL_VERSEAU),
      });
    });

    it('autorise plusieurs rôles dès que l’un est un rôle Verseau', async () => {
      mockMasaProvider.findRolesByPrCdn.mockResolvedValue([
        { principalIdentifiant, roleOrionId: 100 },
        { principalIdentifiant, roleOrionId: ROLE.EXPERT_SERVICE_VERSEAU },
      ]);

      await expect(service.resolveVerseauAccess(email)).resolves.toEqual({
        itvCdn: intervenantId,
        isExpertNational: false,
      });
    });

    it('refuse un utilisateur sans rôle Verseau', async () => {
      mockMasaProvider.findRolesByPrCdn.mockResolvedValue([{ principalIdentifiant, roleOrionId: 100 }]);

      await expect(service.resolveVerseauAccess(email)).rejects.toMatchObject({ status: 403 });
    });

    it('refuse un email absent sans interroger le référentiel', async () => {
      await expect(service.resolveVerseauAccess('')).rejects.toMatchObject({ status: 403 });

      expect(mockMasaProvider.findAgentByOrionLogin).not.toHaveBeenCalled();
    });

    it('refuse un utilisateur sans agent', async () => {
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue(null);

      await expect(service.resolveVerseauAccess(email)).rejects.toMatchObject({ status: 403 });
      expect(mockMasaProvider.findRolesByPrCdn).not.toHaveBeenCalled();
    });

    it.each([null, '', '  \t  '])('refuse un utilisateur avec rôle autorisé mais mail AG égal à %j', async (mail) => {
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({ principalIdentifiant, intervenantId, mail });
      mockMasaProvider.findRolesByPrCdn.mockResolvedValue([{ principalIdentifiant, roleOrionId: ROLE.DEPOSANT }]);

      await expect(service.resolveVerseauAccess(email)).rejects.toMatchObject({ status: 403 });
      expect(mockMasaProvider.findRolesByPrCdn).not.toHaveBeenCalled();
    });

    it('accepte un mail AG différent du login Cerbère sans exiger le nom et le prénom', async () => {
      mockMasaProvider.findRolesByPrCdn.mockResolvedValue([{ principalIdentifiant, roleOrionId: ROLE.DEPOSANT }]);

      await expect(service.resolveVerseauAccess(email)).resolves.toEqual({
        itvCdn: intervenantId,
        isExpertNational: false,
      });
      expect(mockMasaProvider.findAgentByOrionLogin).toHaveBeenCalledWith(email);
    });

    it('laisse remonter une indisponibilité du référentiel sans la transformer en refus', async () => {
      mockMasaProvider.findAgentByOrionLogin.mockRejectedValue(new Error('database unavailable'));

      await expect(service.resolveVerseauAccess(email)).rejects.toThrow('database unavailable');
    });
  });

  describe('isExpertNationalVerseau', () => {
    const sub = 'expert-sub';
    const email = 'expert@example.com';
    const prCdn = 999;

    it('retourne true si le rôle 305 est présent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(true);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(true);
      expect(mockMasaProvider.hasRole).toHaveBeenCalledWith(prCdn, ROLE.EXPERT_NATIONAL_VERSEAU);
    });

    it('retourne false si le rôle 305 est absent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(false);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si utilisateur non trouvé', async () => {
      mockUserGateway.findBySub.mockResolvedValue(null);

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.findAgentByOrionLogin).not.toHaveBeenCalled();
    });

    it("retourne false si l'utilisateur n'a pas d'email", async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email: null });

      const result = await service.isExpertNationalVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si aucun AG lié', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue(null);

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
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
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
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(true);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(true);
      expect(mockMasaProvider.hasRole).toHaveBeenCalledWith(prCdn, ROLE.EXPERT_BASSIN_VERSEAU);
    });

    it('retourne false si le rôle expert bassin est absent', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
      });
      mockMasaProvider.hasRole.mockResolvedValue(false);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si utilisateur non trouvé', async () => {
      mockUserGateway.findBySub.mockResolvedValue(null);

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
      expect(mockMasaProvider.findAgentByOrionLogin).not.toHaveBeenCalled();
    });

    it("retourne false si l'utilisateur n'a pas d'email", async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email: null });

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });

    it('retourne false si aucun AG lié', async () => {
      mockUserGateway.findBySub.mockResolvedValue({ email });
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue(null);

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
      mockMasaProvider.findAgentByOrionLogin.mockResolvedValue({
        principalIdentifiant: prCdn,
        intervenantId: 100,
      });
      mockMasaProvider.hasRole.mockRejectedValue(new Error('provider error'));

      const result = await service.isExpertBassinVerseau(sub);

      expect(result).toBe(false);
    });
  });
});
