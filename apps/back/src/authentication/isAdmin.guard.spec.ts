import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IsAdminGuard } from './isAdmin.guard';

describe('IsAdminGuard', () => {
  let guard: IsAdminGuard;

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
    guard = new IsAdminGuard(mockLogger as never);
  });

  it("retourne true si l'utilisateur est expert national Verseau", () => {
    const context = buildContext({ cerbereId: 'expert-sub', isExpertNational: true, itvCdn: 42 });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("retourne false si l'utilisateur n'est pas expert national Verseau", () => {
    const context = buildContext({ cerbereId: 'regular-sub', isExpertNational: false, itvCdn: 42 });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('lève ForbiddenException si aucun utilisateur authentifié', () => {
    const context = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
