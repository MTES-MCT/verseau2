import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IsAdminGuard } from './isAdmin.guard';

describe('IsAdminGuard', () => {
  let guard: IsAdminGuard;

  const mockDroitsUserService = {
    isExpertNationalVerseau: jest.fn<Promise<boolean>, [string]>(),
  };

  const mockLogger = {
    warn: jest.fn(),
    setContext: jest.fn(),
  };

  function buildContext(user: unknown): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new IsAdminGuard(mockLogger as never, mockDroitsUserService as never);
  });

  it("retourne true si l'utilisateur est expert national Verseau", async () => {
    mockDroitsUserService.isExpertNationalVerseau.mockResolvedValue(true);
    const context = buildContext({ cerbereId: 'expert-sub' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockDroitsUserService.isExpertNationalVerseau).toHaveBeenCalledWith('expert-sub');
  });

  it("retourne false si l'utilisateur n'est pas expert national Verseau", async () => {
    mockDroitsUserService.isExpertNationalVerseau.mockResolvedValue(false);
    const context = buildContext({ cerbereId: 'regular-sub' });

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('lève ForbiddenException si aucun utilisateur authentifié', async () => {
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockDroitsUserService.isExpertNationalVerseau).not.toHaveBeenCalled();
  });
});
