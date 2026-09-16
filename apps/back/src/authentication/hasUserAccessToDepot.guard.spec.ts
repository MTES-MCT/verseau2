import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { HasUserAccessToDepotGuard } from './hasUserAccessToDepot.guard';

describe('HasUserAccessToDepotGuard', () => {
  let guard: HasUserAccessToDepotGuard;

  const mockLogger = {
    warn: jest.fn(),
    setContext: jest.fn(),
  };
  const mockDepotService = {
    findById: jest.fn(),
  };

  function buildContext(params: Partial<Record<string, string | string[]>>): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { cerbereId: 'user-sub', itvCdn: 42 },
          params,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new HasUserAccessToDepotGuard(mockLogger as never, mockDepotService as never);
    mockDepotService.findById.mockResolvedValue({ id: 'depot-123', itvCdn: '42' });
  });

  it.each(['id', 'depotId'])('autorise un dépôt accessible avec le paramètre :%s', async (param) => {
    await expect(guard.canActivate(buildContext({ [param]: 'depot-123' }))).resolves.toBe(true);

    expect(mockDepotService.findById).toHaveBeenCalledWith('depot-123');
  });

  it.each(['id', 'depotId'])('rejette un tableau dans :%s avant de rechercher le dépôt', async (param) => {
    await expect(guard.canActivate(buildContext({ [param]: ['depot-123'] }))).rejects.toThrow(ForbiddenException);

    expect(mockDepotService.findById).not.toHaveBeenCalled();
  });

  it.each([{}, { id: '' }, { depotId: '' }])('rejette un identifiant absent ou vide : %j', async (params) => {
    await expect(guard.canActivate(buildContext(params))).rejects.toThrow(ForbiddenException);

    expect(mockDepotService.findById).not.toHaveBeenCalled();
  });

  it('refuse un dépôt appartenant à un autre intervenant', async () => {
    mockDepotService.findById.mockResolvedValue({ id: 'depot-123', itvCdn: '99' });

    await expect(guard.canActivate(buildContext({ id: 'depot-123' }))).rejects.toThrow(ForbiddenException);
  });
});
