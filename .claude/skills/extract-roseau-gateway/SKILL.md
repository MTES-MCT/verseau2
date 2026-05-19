---
name: extract-roseau-gateway
description: Extracts methods from the monolithic RoseauGateway/RoseauRepository into a dedicated gateway/repository pair within the same folder. Use this when moving domain-specific methods out of roseau.gateway into their own gateway.
---

# Extract Roseau Gateway Skill

Refactors the monolithic `RoseauGateway` / `RoseauRepository` by moving a group of related methods into a new, dedicated gateway + repository pair. The new files stay in the same `referentiel/roseau/` folder.

## When to Use

- `roseau.gateway.ts` and `roseau.repository.ts` contain methods that belong to a specific domain (e.g. transmission, conformite, bilan)
- You want to reduce the size of the monolithic gateway and improve separation of concerns
- The methods being extracted share a common domain concept

## Architecture

```
apps/back/src/referentiel/roseau/
  roseau.gateway.ts                  # Monolithic interface (shrinks)
  roseau.repository.ts               # Monolithic implementation (shrinks)
  roseau<Domain>.gateway.ts          # NEW: extracted interface + Symbol
  roseau<Domain>.repository.ts       # NEW: extracted implementation
```

The `MasaProvider` facade is updated to inject the new gateway alongside the existing `RoseauGateway`.

```
Domain Service --> MasaProvider --> roseau<Domain>Gateway (new)
                               \-> RoseauGateway (existing, smaller)
```

## Step-by-Step

### Step 1 -- Create the new gateway interface

File: `apps/back/src/referentiel/roseau/roseau<Domain>.gateway.ts`

```typescript
import { <FiltersType>, <RowType> } from '@masa/masa.dto';

export interface Roseau<Domain>Gateway {
  findSomething(filters: <FiltersType>): Promise<{ data: <RowType>[]; total: number }>;
  findSomethingElse(filters: <OtherFiltersType>): Promise<{ data: <OtherRowType>[]; total: number }>;
}

export const Roseau<Domain>Gateway = Symbol('Roseau<Domain>Gateway');
```

Key points:

- Same pattern as `RoseauGateway`: interface + Symbol export with the same name
- Import DTOs from `@masa/masa.dto` (not from entity files)

### Step 2 -- Create the new repository implementation

File: `apps/back/src/referentiel/roseau/roseau<Domain>.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Roseau<Domain>Gateway } from './roseau<Domain>.gateway';
import { <FiltersType>, <RowType> } from '@masa/masa.dto';

// Move raw row interfaces here (they were private to roseau.repository.ts)
interface SomeRawRow {
  // ...
}

@Injectable()
export class Roseau<Domain>Repository implements Roseau<Domain>Gateway {
  constructor(private readonly dataSource: DataSource) {}

  async findSomething(filters: <FiltersType>): Promise<{ data: <RowType>[]; total: number }> {
    // Move the full method body from RoseauRepository
  }
}
```

Key points:

- Inject `DataSource` directly (same as the original methods used)
- Move associated private raw row interfaces/types along with the methods
- The implementation is a straight cut-paste from `roseau.repository.ts`

### Step 3 -- Remove methods from roseau.gateway.ts and roseau.repository.ts

1. In `roseau.gateway.ts`: remove the method signatures and any DTO imports that are no longer used
2. In `roseau.repository.ts`: remove the method implementations and any raw row interfaces/imports that are no longer used

### Step 4 -- Update MasaProvider

In `apps/back/src/masa/masa.provider.ts`:

1. Add import:

```typescript
import { Roseau<Domain>Gateway } from '@referentiel/roseau/roseau<Domain>.gateway';
```

2. Add constructor injection:

```typescript
constructor(
  @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
  @Inject(Roseau<Domain>Gateway) private readonly roseau<Domain>Gateway: Roseau<Domain>Gateway,
  // ... existing injections
) {}
```

3. Update pass-through methods to delegate to the new gateway:

```typescript
async findSomething(filters: FiltersType): Promise<{ data: RowType[]; total: number }> {
  return this.roseau<Domain>Gateway.findSomething(filters);
}
```

### Step 5 -- Wire up in referentiel.module.ts

In `apps/back/src/referentiel/referentiel.module.ts`:

```typescript
import { Roseau<Domain>Gateway } from './roseau/roseau<Domain>.gateway';
import { Roseau<Domain>Repository } from './roseau/roseau<Domain>.repository';

@Module({
  providers: [
    { provide: RoseauGateway, useClass: RoseauRepository },
    { provide: Roseau<Domain>Gateway, useClass: Roseau<Domain>Repository },  // ADD
    // ...
  ],
  exports: [RoseauGateway, Roseau<Domain>Gateway, LanceleauGateway],         // ADD to exports
})
```

### Step 6 -- Update e2e tests

E2e tests that manually build a `TestingModule` with `MasaProvider` need the new gateway provider. Search for tests that provide `RoseauGateway` alongside `MasaProvider`:

```bash
grep -rn "RoseauGateway" apps/back/test/ --include="*.e2e-spec.ts"
```

For tests using `useExisting: RoseauRepository` pattern:

```typescript
import { Roseau<Domain>Gateway } from '@referentiel/roseau/roseau<Domain>.gateway';
import { Roseau<Domain>Repository } from '@referentiel/roseau/roseau<Domain>.repository';

// Add to providers:
Roseau<Domain>Repository,
{ provide: Roseau<Domain>Gateway, useExisting: Roseau<Domain>Repository },
```

For tests using `useClass: RoseauGatewayTestMock` pattern -- only update if `MasaProvider` is also in that test module's providers. If `MasaProvider` is not present, no change needed.

**Unit tests** that mock `MasaProvider` directly (with `useValue`) need no changes -- the public API of `MasaProvider` is unchanged.

## Checklist

1. [ ] Create `roseau<Domain>.gateway.ts` (interface + Symbol)
2. [ ] Create `roseau<Domain>.repository.ts` (implementation + raw row types)
3. [ ] Remove methods and unused imports from `roseau.gateway.ts`
4. [ ] Remove methods, raw row types, and unused imports from `roseau.repository.ts`
5. [ ] Update `masa.provider.ts` (import, inject, delegate)
6. [ ] Register + export in `referentiel.module.ts`
7. [ ] Update e2e tests that build `MasaProvider` manually
8. [ ] Run `pnpm test` -- all suites must pass

## Naming Convention

Use camelCase domain name appended to `roseau`:

- `roseauTransmission.gateway.ts` / `RoseauTransmissionGateway`
- `roseauConformite.gateway.ts` / `RoseauConformiteGateway`
- `roseauBilan.gateway.ts` / `RoseauBilanGateway`
- `roseauEvenement.gateway.ts` / `RoseauEvenementGateway`

## Anti-Patterns

- **Putting the new gateway outside `referentiel/roseau/`** -- these are still roseau data access concerns, keep them co-located
- **Changing the MasaProvider public API** -- this is a pure internal refactor; consumers must not be affected
- **Forgetting to export from referentiel.module.ts** -- MasaModule imports ReferentielModule and needs visibility on the new Symbol
- **Forgetting e2e tests** -- any test that manually constructs `MasaProvider` in a `TestingModule` will fail with a DI error if the new gateway is missing
