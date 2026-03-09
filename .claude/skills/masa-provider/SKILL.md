---
name: masa-provider
description: Creates new functionalities that fetch reference data via MasaProvider instead of directly using LanceleauGateway or RoseauGateway.
---

# MasaProvider Skill

Use `MasaProvider` for **all new code** that needs reference **live data** (STEU, ITV, PMO, SCL, droits, auth...). Never inject `LanceleauGateway` or `RoseauGateway` directly in domain services.

## Why MasaProvider Exists

`MasaProvider` is an **anti-corruption layer / facade** that centralizes every call to reference data currently stored in the `lanceleau.*` and `roseau.*` PostgreSQL schemas.

Some methods of these two databases will be **replaced by a MASA REST API** in the near future. When that happens, only `MasaProvider` internals need to change -- every consumer stays untouched.

```
┌──────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  Domain Service  │─────>│   MasaProvider    │─────>│ Roseau / Lanceleau  │
│  (your code)     │      │   (facade)        │      │ (will become HTTP)  │
└──────────────────┘      └──────────────────┘      └─────────────────────┘
                               ▲
                               │  Only this layer changes
                               │  when MASA REST API ships
```

### Rules

| DO                                                                     | DON'T                                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Inject `MasaProvider` in domain services                               | Inject `RoseauGateway` or `LanceleauGateway` in domain services                  |
| Import from `@masa/masa.provider`                                      | Import from `@referentiel/roseau/*` or `@referentiel/lanceleau/*` in domain code |
| Add new methods to `MasaProvider` when you need new data               | Query roseau/lanceleau repositories directly                                     |
| Keep MasaProvider methods as **pure pass-through** (no business logic) | Add mapping, filtering, or business rules inside MasaProvider                    |
| Define return types in `@masa/masa.dto.ts`                             | Re-use entity types from `@referentiel/` in domain code                          |

## Architecture Overview

```
apps/back/src/
  masa/                              # Path alias: @masa/*
    masa.provider.ts                 # Facade service (this is what you inject)
    masa.module.ts                   # NestJS module (imports ReferentielModule)
    masa.dto.ts                      # DTOs returned by MasaProvider methods

  referentiel/                       # Path alias: @referentiel/*
    lanceleau/                       # Lanceleau schema (admin/identity data)
      lanceleau.gateway.ts           # Interface + Symbol (port)
      lanceleau.repository.ts        # TypeORM implementation (adapter)
    roseau/                          # Roseau schema (technical/infra data)
      roseau.gateway.ts              # Interface + Symbol (port)
      roseau.repository.ts           # TypeORM implementation (adapter)
    referentiel.module.ts            # Registers gateway providers
```

**Important**: `@dossier/masa/` is a separate, unrelated concept (MASA webhook integration for file processing). Do not confuse it with `@masa/` (the data facade).

## How to Use MasaProvider in a New Service

### Step 1 -- Import MasaModule in your feature module

```typescript
import { MasaModule } from '@masa/masa.module';

@Module({
  imports: [MasaModule],
  providers: [MyNewService],
})
export class MyFeatureModule {}
```

### Step 2 -- Inject MasaProvider in your service

```typescript
import { Injectable } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';

@Injectable()
export class MyNewService {
  constructor(private readonly masaProvider: MasaProvider) {}

  async doSomething(steuCodes: string[]): Promise<void> {
    const steus = await this.masaProvider.findSteuBatchBySandreCdas(steuCodes);
    // ... business logic using steus
  }
}
```

No `@Inject()` decorator is needed -- `MasaProvider` is a concrete class, not a Symbol-based gateway.

### Step 3 -- If you need new data, add a method to MasaProvider

If `MasaProvider` doesn't expose the data you need yet:

1. **Add the method to the appropriate gateway** (`LanceleauGateway` or `RoseauGateway` interface)
2. **Implement it in the corresponding repository** (`LanceleauRepository` or `RoseauRepository`)
3. **Create a DTO** in `apps/back/src/masa/masa.dto.ts` for the return type
4. **Add a pass-through method** in `MasaProvider`:

```typescript
// 1. Gateway interface (e.g., roseau.gateway.ts)
export interface RoseauGateway {
  // ... existing methods
  findMyNewData(param: string): Promise<MyNewDto[]>;
}

// 2. Repository implementation (e.g., roseau.repository.ts)
@Injectable()
export class RoseauRepository implements RoseauGateway {
  async findMyNewData(param: string): Promise<MyNewDto[]> {
    // TypeORM query
  }
}

// 3. DTO (masa.dto.ts)
export interface MyNewDto {
  code: string;
  value: number;
}

// 4. MasaProvider pass-through (masa.provider.ts)
// Add a comment block following the existing pattern:
// ---------------------------------------------------------------------------
// CTL0XX — Description of the data purpose
// TODO: Remplacer par appel batch a l'API MASA quand disponible
// ---------------------------------------------------------------------------
async findMyNewData(param: string): Promise<MyNewDto[]> {
  return this.roseauGateway.findMyNewData(param);
}
```

## Real-World Example

From `controleV1DataFetcher.service.ts` -- batch-loads all reference data needed for file validation:

```typescript
import { MasaProvider } from '@masa/masa.provider';

@Injectable()
export class ControleV1DataFetcherService {
  constructor(private readonly masaProvider: MasaProvider) {}

  async load(fctAssainissement: FctAssainissement): Promise<ControleV1MasaData> {
    const steuCdas = this.extractSteuCdas(fctAssainissement);
    const exploitantRfas = this.extractExploitantRfas(fctAssainissement);

    // Batch fetch in parallel
    const [steus, itvs] = await Promise.all([
      this.masaProvider.findSteuBatchBySandreCdas(steuCdas),
      this.masaProvider.findItvBatchByRfas(exploitantRfas),
    ]);

    // Second wave depends on first results
    const expLinks = this.extractExpLinks(fctAssainissement, steus, itvs);
    const [existingPmos, validSclAgaLinks, validExpSteuLinks] = await Promise.all([
      this.masaProvider.checkPmoExistenceBatch(pmoQueries),
      this.masaProvider.checkSclAgglomerationLinksBatch(sclLinks),
      this.masaProvider.checkExpSteuLinksBatch(expLinks),
    ]);

    return { steus, itvs, validExpSteuLinks, existingPmos, validSclAgaLinks };
  }
}
```

## Testing

In tests, mock `MasaProvider` directly -- it's a concrete class:

```typescript
const mockMasaProvider = {
  findSteuBatchBySandreCdas: jest.fn().mockResolvedValue([]),
  findItvBatchByRfas: jest.fn().mockResolvedValue([]),
  // ... mock only the methods your test needs
};

const module = await Test.createTestingModule({
  providers: [MyService, { provide: MasaProvider, useValue: mockMasaProvider }],
}).compile();
```

## Checklist

1. Import `MasaModule` in your feature module
2. Inject `MasaProvider` (not gateways) in your service constructor
3. Use existing methods from the table above, or add new pass-through methods
4. New DTOs go in `@masa/masa.dto.ts`
5. New pass-through methods include the `TODO: Remplacer par appel ... API MASA` comment
6. No business logic in `MasaProvider` -- only in your domain service
7. Run `npm run lint --workspace=apps/back`

## Anti-Patterns

- **Injecting `RoseauGateway` or `LanceleauGateway` in domain services** -- breaks the migration strategy. When MASA API ships, you'd have to update every consumer instead of just `MasaProvider`.
- **Adding business logic to `MasaProvider`** -- it must remain a pure data-access facade. Put logic in your domain service.
- **Using entity types from `@referentiel/` in domain code** -- use DTOs from `@masa/masa.dto.ts` instead. Entities are implementation details that will disappear.
- **Creating new gateways for MASA data** -- funnel everything through `MasaProvider`.
