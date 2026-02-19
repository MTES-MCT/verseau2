---
name: nestjs-testing
description: Creates unit and e2e tests for NestJS applications using Jest and Supertest. Includes patterns for testing services, controllers, guards, and e2e tests with testcontainers.
---

# NestJS Testing Skill

## Tech Stack

- **Framework**: NestJS with `@nestjs/testing`
- **Testing Framework**: Jest with `ts-jest`
- **HTTP Testing**: Supertest
- **Mocking**: `@golevelup/ts-jest` for deep mocking with `createMock<T>()`
- **E2E Database**: `@testcontainers/postgresql` for isolated database tests

## Conventions

- Unit tests alongside source files: `*.spec.ts`
- E2E tests in `test/` directory: `*.e2e-spec.ts`
- Use `createMock<T>()` from `@golevelup/ts-jest` for all mocking (type-safe deep mocks)
- Use `beforeEach()` for per-test setup, `beforeAll()`/`afterAll()` for e2e app lifecycle

## Running Tests

All commands must be run from `apps/back/`.

```bash
# All unit tests
npx jest

# All e2e tests
npx jest --config ./test/jest-e2e.json

# Specific unit test file
npx jest -- src/cats/cats.service.spec.ts

# Specific e2e test file
npx jest --config ./test/jest-e2e.json -- test/shared/logger.service.e2e-spec.ts

# Specific test case by name
npx jest -t "should return all cats" -- src/cats/cats.service.spec.ts
```

## Unit Test Pattern (Service / Controller)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CatsService } from './cats.service';
import { CatsRepository } from './cats.repository';

describe('CatsService', () => {
  let service: CatsService;
  let repository: DeepMocked<CatsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatsService,
        {
          provide: CatsRepository,
          useValue: createMock<CatsRepository>(),
        },
      ],
    }).compile();

    service = module.get<CatsService>(CatsService);
    repository = module.get(CatsRepository);
  });

  it('should return all cats', async () => {
    const expectedCats = [{ id: 1, name: 'Fluffy' }];
    repository.findAll.mockResolvedValue(expectedCats);

    const result = await service.findAll();

    expect(result).toEqual(expectedCats);
    expect(repository.findAll).toHaveBeenCalled();
  });

  it('should throw NotFoundException when cat not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow();
  });
});
```

## Guard Test Pattern

```typescript
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
  });

  it('should return true when user is authenticated', () => {
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123' },
          params: {},
        }),
      }),
    });

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw UnauthorizedException when user is not authenticated', () => {
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    });

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
```

## SQL Queries in E2E Tests

Never use raw `dataSource.query()` for INSERTs. Use typed seed helpers from `test/createReferentielDataset.ts`: `seedSteu`, `seedResa`, `seedCpy`, `seedStchan`, `seedTltobl`, `seedAga`, etc.

```typescript
// Correct
await seedSteu(dataSource, 1, 'STEU001');
await seedResa(dataSource, 1, 1, 2023, '1313', 100);
```

Raw `dataSource.query()` is only acceptable for `DELETE` cleanup in `beforeEach`. If a helper is missing columns, extend it with an optional `options` object (see `seedSteu` for example).

## E2E Test Pattern (Testcontainers)

```typescript
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, 'test.envfile'),
  override: true,
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ApiModule } from '../src/api/api.module';
import { startPostgresContainer, getPostgresConnectionUri } from './testcontainer.config';
import { initTestContainerImports } from './init/initTestContainer';

describe('Cats (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule],
    })
      .overrideProvider(PGBOSS)
      .useValue(null)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/GET cats (200)', () => {
    return request(app.getHttpServer()).get('/cats').expect(200);
  });
});
```

## Overrides (E2E)

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(CatsService)
  .useValue(createMock<CatsService>())
  .overrideGuard(AuthGuard)
  .useValue({ canActivate: () => true })
  .overrideModule(InfraModule)
  .useModule(MockInfraModule)
  .compile();
```

## Scoped Providers

Request/transient-scoped providers cannot use `app.get()`. Use `app.resolve()` instead:

```typescript
// Will throw: "Request and transient-scoped providers can't be used with get()"
const logger = app.get(LoggerService); // WRONG

// Correct: resolve() returns a promise and creates a new instance
const logger = await app.resolve(LoggerService);
```

## Workflow

1. **Identify**: Determine what needs testing (service, controller, guard, etc.)
2. **Setup**: Create test file with correct extension (`.spec.ts` or `.e2e-spec.ts`)
3. **Mock**: Use `createMock<T>()` for dependencies
4. **Implement**: Cover success paths, error handling, and edge cases
5. **Validate**: Run the specific test file with `npx jest -- path/to/file.spec.ts` from `apps/back/`
