import { CanActivate, ExecutionContext, Injectable, Type, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Crée un guard composite qui autorise l'accès si AU MOINS UN des guards fournis retourne true.
 * Usage : @UseOrGuards(GuardA, GuardB)
 */
export function orGuard(guards: Type<CanActivate>[]) {
  @Injectable()
  class OrGuard implements CanActivate {
    constructor(readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      let lastError: unknown;

      for (const GuardType of guards) {
        try {
          const guard = await this.moduleRef.resolve(GuardType, undefined, { strict: false });
          const result = await guard.canActivate(context);
          if (result) {
            return true;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (lastError) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw lastError;
      }

      return false;
    }
  }

  return OrGuard;
}

export function UseOrGuards(...guards: Type<CanActivate>[]) {
  return UseGuards(orGuard(guards));
}
