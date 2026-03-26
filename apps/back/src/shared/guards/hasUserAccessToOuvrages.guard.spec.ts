import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { HasUserAccessToOuvragesGuard } from './hasUserAccessToOuvrages.guard';
import type { IntervenantAuth, VSteuSclItvResult } from '@masa/masa.dto';

const makeIntervenant = (itvCdn: number, itvRfa: string): IntervenantAuth => ({
  identifiantIntervenant: itvCdn,
  siretIntervenant: itvRfa,
});

const makeVSteuSclItv = (steuCda: string, sclCda = 'SCL001'): VSteuSclItvResult => ({
  codeOuvrageDepollution: steuCda,
  codeSystemeCollecte: sclCda,
  siretMaitreOuvrage: null,
  siretPrestataireAutosurveillance: null,
  siretAgenceEau: null,
});

describe('HasUserAccessToOuvragesGuard', () => {
  let guard: HasUserAccessToOuvragesGuard;

  const mockLogger = {
    warn: jest.fn(),
    setContext: jest.fn(),
  };

  const mockMasaProvider = {
    findIntervenantById: jest.fn(),
    findVSteuSclItvByItvRfa: jest.fn(),
  };

  function buildContext(user: unknown, request: Record<string, unknown> = {}): ExecutionContext {
    request.user = user;
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new HasUserAccessToOuvragesGuard(mockLogger as never, mockMasaProvider as never);
  });

  it('lève ForbiddenException si itvCdn est null', async () => {
    const context = buildContext({ itvCdn: null });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockMasaProvider.findIntervenantById).not.toHaveBeenCalled();
  });

  it("lève ForbiddenException si l'intervenant n'est pas trouvé", async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(null);
    const context = buildContext({ itvCdn: 42 });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockMasaProvider.findVSteuSclItvByItvRfa).not.toHaveBeenCalled();
  });

  it("lève ForbiddenException si l'intervenant n'a pas d'itvRfa", async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, ''));
    const context = buildContext({ itvCdn: 42 });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockMasaProvider.findVSteuSclItvByItvRfa).not.toHaveBeenCalled();
  });

  it("lève ForbiddenException si aucun ouvrage autorisé n'est trouvé", async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
    mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([]);
    const context = buildContext({ itvCdn: 42 });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('attache les codes STEU et SCL autorisés à la requête et retourne true', async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
    mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
      makeVSteuSclItv('STEU001', 'SCL001'),
      makeVSteuSclItv('STEU002', 'SCL002'),
    ]);

    const req: Record<string, unknown> = {};
    const context = buildContext({ itvCdn: 42 }, req);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.authorizedSteuCdas).toEqual(['STEU001', 'STEU002']);
    expect(req.authorizedSclCdas).toEqual(['SCL001', 'SCL002']);
  });

  it('déduplique les codes STEU et SCL', async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
    mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
      makeVSteuSclItv('STEU001', 'SCL001'),
      makeVSteuSclItv('STEU001', 'SCL001'), // duplicate
    ]);

    const req: Record<string, unknown> = {};
    const context = buildContext({ itvCdn: 42 }, req);

    await guard.canActivate(context);

    expect(req.authorizedSteuCdas).toEqual(['STEU001']);
    expect(req.authorizedSclCdas).toEqual(['SCL001']);
  });

  it("autorise l'accès si seulement des STEU sont disponibles (sans SCL)", async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
    mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
      {
        codeOuvrageDepollution: 'STEU001',
        codeSystemeCollecte: null,
        siretMaitreOuvrage: null,
        siretPrestataireAutosurveillance: null,
        siretAgenceEau: null,
      },
    ]);

    const req: Record<string, unknown> = {};
    const context = buildContext({ itvCdn: 42 }, req);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.authorizedSteuCdas).toEqual(['STEU001']);
    expect(req.authorizedSclCdas).toEqual([]);
  });

  it('appelle findIntervenantById avec le bon itvCdn', async () => {
    mockMasaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(99, 'SIRET999'));
    mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001')]);

    const context = buildContext({ itvCdn: 99 }, {});

    await guard.canActivate(context);

    expect(mockMasaProvider.findIntervenantById).toHaveBeenCalledWith(99);
    expect(mockMasaProvider.findVSteuSclItvByItvRfa).toHaveBeenCalledWith('SIRET999');
  });
});
