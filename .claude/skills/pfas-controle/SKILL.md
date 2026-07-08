---
name: pfas-controle
description: Adds a new PFAS business control (CTL20x) in controleMetierV2Pfas, shared contracts, PDF, UI grouping, and tests.
---

# PFAS Control Skill

Use this when adding a new PFAS-specific business control in the V2 control pipeline.

Reference implementation: `CTL201` in `apps/back/src/dossier/controle/metierv2/controleMetierV2Pfas.ts`.

## Rules

- Keep PFAS logic in `apps/back/src/dossier/controle/metierv2/controleMetierV2Pfas.ts` unless the file becomes too large.
- Do not create a Roseau/Lanceleau gateway or repository for PFAS controls. Use `MasaProvider` for live reference data.
- Reuse `isPfasCampaign(...)` when a control applies only to PFAS campaigns.
- Keep `MasaProvider` as pass-through only. Put business rules in `ControleMetierV2Pfas`.
- `CTL201` uses `EvenementType.AVERTISSEMENT`. `EvenementType.INFORMATION` exists for future controls only when explicitly requested.
- Add future PFAS controls as `CTL20x` and errors as `E2.20x`.

## Current PFAS Constants

These already exist in `controleMetierV2Pfas.ts` and should be reused:

```typescript
PFAS_REGLEMENTAIRES_CODES
AOF_CODE
PFAS_FINALITE_ANALYSE
PFAS_CAPACITE_MIN_EH
```

## Backend Flow

1. Add a method to `ControleMetierV2Pfas`, for example `verify<RuleName>(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess>`.
2. Return `{ name: ControleName.CTL20x, errors }` and never persist directly from the PFAS service.
3. Use `fctAssainissement.scenario.dateDebutReference` to derive the reference year when capacity/reference data is needed.
4. Extract unique STEU codes from `fctAssainissement.ouvrages` and call existing `MasaProvider` batch methods where possible.
5. Traverse only the relevant `ouvrage.pointMesure` locations and `prelevement.analyse` nodes.
6. Push `ControleError` entries with the correct `ErrorCode.E2_20x`, typed `params`, and requested `EvenementType`.
7. Wire the new method in `ControleMetierV2Service.execute()` inside the `Promise.all([...])` list.
8. If `ControleMetierV2Pfas` is not already provided, register it in `DossierModule`.

## Shared Contracts

Update `packages/dossier/src/controle/controleResult.ts`:

- Add `ControleName.CTL20x`.
- Add a clear `ControleDescription[ControleName.CTL20x]`.

Update `packages/dossier/src/controle/evenement.ts`:

- Add `ErrorCode.E2_20x = 'E2.20x'`.
- Add `ErrorParamsMap[ErrorCode.E2_20x]` with explicit tuple labels.

Update `packages/dossier/src/controle/messages.ts`:

- Add a `case ErrorCode.E2_20x`.
- Add a small `buildErrorMessage20x(...)` helper near the existing helpers.

Update `packages/dossier/src/controle/messages.spec.ts` with the exact expected message.

If the new enum values are persisted in PostgreSQL, add a TypeORM migration under `apps/back/src/infra/migrations/` to extend:

- `controle_name_enum`
- `controle_error_enum`
- `controle_evenement_type_enum` only if adding a new event type

## Frontend And PDF

Update `apps/front/src/pages/Controle.tsx`:

- Add the new `ControleName.CTL20x` to `PFAS_CONTROLE_NAMES` so it appears under `Contrôles PFAS`.

If a new event type is used, update these files too:

- `apps/front/src/types/controle.types.ts`
- `apps/front/src/helper/controleFilterHelper.ts`
- `apps/front/src/helper/controleIconHelper.ts`
- `apps/front/src/hooks/useControleStatistics.ts`
- `apps/front/src/hooks/useControleTableData.ts`
- `apps/front/src/components/ControleResultBadges.tsx`
- `apps/back/src/dossier/rapport/rapportPdfGenerator.service.ts`

Update `apps/back/src/dossier/rapport/generateDummyPdf.ts` with a representative dummy control row for the new PFAS control.

## Tests

Backend unit tests:

- Add cases to `apps/back/src/dossier/controle/metierv2/controleMetierV2Pfas.spec.ts`.
- Cover trigger, non-trigger, boundary conditions, missing reference data, and expected `EvenementType`.
- Update `controleMetierV2.service.spec.ts` expected control order and count after wiring the control into `execute()`.

Frontend tests:

- Update `apps/front/src/pages/Controle.spec.tsx` when the UI grouping or displayed severity changes.
- Add component/helper tests only when a new event type or new display behavior is introduced.

## Verification Commands

Run the most targeted checks first:

```bash
pnpm --filter back test:unit -- controleMetierV2Pfas.spec.ts controleMetierV2.service.spec.ts
pnpm --filter @lib/dossier test -- messages.spec.ts
pnpm --filter front test -- Controle.spec.tsx
pnpm --filter front check
pnpm --filter back build
```

Run targeted lint on modified files when global lint is blocked by unrelated existing issues:

```bash
pnpm --filter back exec eslint <modified-backend-files>
pnpm --filter front exec eslint <modified-frontend-files>
```

## Checklist

1. PFAS logic added to `ControleMetierV2Pfas`.
2. New control wired in `ControleMetierV2Service.execute()`.
3. `ControleName`, description, `ErrorCode`, `ErrorParamsMap`, and message added.
4. Migration added for persisted enum values.
5. `PFAS_CONTROLE_NAMES` updated for the PFAS UI group.
6. `generateDummyPdf.ts` contains a representative row.
7. Unit and frontend tests updated.
8. Targeted tests/checks pass.

## Anti-Patterns

- Do not query Roseau/Lanceleau directly from the PFAS service.
- Do not mark a PFAS control as `INFORMATION` by default. Use the severity requested by the business rule.
- Do not add backward-compatibility branches unless persisted data or external consumers require them.
- Do not duplicate PFAS constants across files.
