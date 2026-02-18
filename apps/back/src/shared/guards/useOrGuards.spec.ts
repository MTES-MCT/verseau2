import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { orGuard } from './useOrGuards';

async function buildOrGuard(guards: Type<CanActivate>[], moduleRefGet: jest.Mock): Promise<CanActivate> {
  const OrGuard = orGuard(guards);

  const module = await Test.createTestingModule({
    providers: [OrGuard, { provide: ModuleRef, useValue: { get: moduleRefGet } }],
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

function getWith(guards: Type<CanActivate>[]) {
  return jest.fn().mockImplementation((G: Type<CanActivate>) => {
    const match = guards.find((g) => g === G);
    if (!match) throw new Error(`Guard ${G.name} non attendu`);
    return new match();
  });
}

describe('orGuard / OrGuard', () => {
  it('retourne true si le premier guard retourne true', async () => {
    const guard = await buildOrGuard([TrueGuard, FalseGuard], getWith([TrueGuard, FalseGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('retourne true si seul le deuxième guard retourne true', async () => {
    const guard = await buildOrGuard([FalseGuard, TrueGuard], getWith([FalseGuard, TrueGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('retourne false si tous les guards retournent false', async () => {
    const guard = await buildOrGuard([FalseGuard, FalseGuard], getWith([FalseGuard]));

    expect(await guard.canActivate(mockContext)).toBe(false);
  });

  it("retourne true si un guard lève une exception mais qu'un guard suivant retourne true", async () => {
    const guard = await buildOrGuard([ThrowingGuard, TrueGuard], getWith([ThrowingGuard, TrueGuard]));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it("propage l'exception du dernier guard si tous les guards échouent", async () => {
    const guard = await buildOrGuard([ThrowingGuard, ThrowingGuard], getWith([ThrowingGuard]));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('accès refusé');
  });

  it('propage une exception si des guards précédents retournent false', async () => {
    const guard = await buildOrGuard([FalseGuard, ThrowingGuard], getWith([FalseGuard, ThrowingGuard]));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('court-circuite dès le premier guard qui retourne true', async () => {
    const getSpy = getWith([TrueGuard, FalseGuard]);
    const guard = await buildOrGuard([TrueGuard, FalseGuard], getSpy);

    await guard.canActivate(mockContext);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(TrueGuard, { strict: false });
  });

  it('récupère chaque guard via moduleRef.get avec strict: false', async () => {
    const getSpy = getWith([FalseGuard, TrueGuard]);
    const guard = await buildOrGuard([FalseGuard, TrueGuard], getSpy);

    await guard.canActivate(mockContext);

    expect(getSpy).toHaveBeenCalledWith(FalseGuard, { strict: false });
    expect(getSpy).toHaveBeenCalledWith(TrueGuard, { strict: false });
  });
});
