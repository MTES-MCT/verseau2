import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { orGuard } from './useOrGuards';

async function buildOrGuard(guards: Type<CanActivate>[], moduleRefResolve: jest.Mock): Promise<CanActivate> {
  const OrGuard = orGuard(guards);

  const module = await Test.createTestingModule({
    providers: [OrGuard, { provide: ModuleRef, useValue: { resolve: moduleRefResolve } }],
  }).compile();

  return module.get(OrGuard);
}

// Guards de test
@Injectable()
class TrueGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
class FalseGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

@Injectable()
class ThrowingGuard implements CanActivate {
  canActivate(): never {
    throw new ForbiddenException('accès refusé');
  }
}

const mockContext = {} as ExecutionContext;

function resolveWith(guards: Type<CanActivate>[]) {
  return jest.fn().mockImplementation((G: Type<CanActivate>) => {
    const match = guards.find((g) => g === G);
    if (!match) throw new Error(`Guard ${G.name} non attendu`);
    return new match();
  });
}

describe('makeOrGuard / OrGuard', () => {
  it('retourne true si le premier guard retourne true', async () => {
    const guard = await buildOrGuard([TrueGuard, FalseGuard], resolveWith([TrueGuard, FalseGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('retourne true si seul le deuxième guard retourne true', async () => {
    const guard = await buildOrGuard([FalseGuard, TrueGuard], resolveWith([FalseGuard, TrueGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('retourne false si tous les guards retournent false', async () => {
    const guard = await buildOrGuard([FalseGuard, FalseGuard], resolveWith([FalseGuard]));

    expect(await guard.canActivate(mockContext)).toBe(false);
  });

  it("retourne true si un guard lève une exception mais qu'un guard suivant retourne true", async () => {
    const guard = await buildOrGuard([ThrowingGuard, TrueGuard], resolveWith([ThrowingGuard, TrueGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it("propage l'exception du dernier guard si tous les guards échouent", async () => {
    const guard = await buildOrGuard([ThrowingGuard, ThrowingGuard], resolveWith([ThrowingGuard]));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('accès refusé');
  });

  it('propage une exception si des guards précédents retournent false', async () => {
    const guard = await buildOrGuard([FalseGuard, ThrowingGuard], resolveWith([FalseGuard, ThrowingGuard]));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('court-circuite dès le premier guard qui retourne true', async () => {
    const resolveSpy = resolveWith([TrueGuard, FalseGuard]);
    const guard = await buildOrGuard([TrueGuard, FalseGuard], resolveSpy);

    await guard.canActivate(mockContext);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(resolveSpy).toHaveBeenCalledWith(TrueGuard, undefined, { strict: false });
  });

  it('résout chaque guard via moduleRef.resolve avec strict: false', async () => {
    const resolveSpy = resolveWith([FalseGuard, TrueGuard]);
    const guard = await buildOrGuard([FalseGuard, TrueGuard], resolveSpy);

    await guard.canActivate(mockContext);

    expect(resolveSpy).toHaveBeenCalledWith(FalseGuard, undefined, { strict: false });
    expect(resolveSpy).toHaveBeenCalledWith(TrueGuard, undefined, { strict: false });
  });
});
