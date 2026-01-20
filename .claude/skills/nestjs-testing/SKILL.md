---
name: nestjs-testing
description: Creates unit and e2e tests for NestJS applications using Jest and Supertest.
---

# NestJS Testing Skill

This skill provides instructions and best practices for testing NestJS applications, including unit tests for services, controllers, guards, pipes, and interceptors, as well as e2e tests for HTTP endpoints.

## Tech Stack

- **Framework**: NestJS
- **Testing Framework**: Jest
- **HTTP Testing**: Supertest
- **Test Utilities**: `@nestjs/testing`
- **Optional**: `@suites/unit` for isolated unit testing

## Core Principles

### 1. Test Structure

- Place unit tests alongside the source file with `.spec.ts` extension (e.g., `cats.service.spec.ts`)
- Place e2e tests in `test` directory with `.e2e-spec.ts` extension (e.g., `cats.e2e-spec.ts`)
- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases

### 2. Unit Tests vs E2E Tests

- **Unit Tests**: Test individual classes (services, controllers, guards, pipes, interceptors) in isolation
- **E2E Tests**: Test the complete application flow through HTTP endpoints

### 3. Mocking Dependencies

- Use `jest.spyOn()` for mocking methods
- Use `useValue`, `useClass`, or `useFactory` in `Test.createTestingModule()` to provide mocks
- Override providers using `overrideProvider()`, `overrideGuard()`, `overrideInterceptor()`, `overrideFilter()`, and `overridePipe()`

### 4. Test Coverage

- Test success paths
- Test error handling
- Test edge cases
- Verify side effects on dependencies

### 5. Test Lifecycle

- Use `beforeAll()` for one-time setup
- Use `beforeEach()` for setup before each test
- Use `afterAll()` for cleanup
- Use `afterEach()` for cleanup after each test

## Testing Patterns

### Unit Testing Services

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { CatsRepository } from './cats.repository';

describe('CatsService', () => {
  let service: CatsService;
  let repository: jest.Mocked<CatsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatsService,
        {
          provide: CatsRepository,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
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

  it('should find a cat by id', async () => {
    const expectedCat = { id: 1, name: 'Fluffy' };
    repository.findOne.mockResolvedValue(expectedCat);

    const result = await service.findOne(1);

    expect(result).toEqual(expectedCat);
    expect(repository.findOne).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundException when cat not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow();
  });
});
```

### Unit Testing Controllers

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let controller: CatsController;
  let service: jest.Mocked<CatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [
        {
          provide: CatsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CatsController>(CatsController);
    service = module.get(CatsService);
  });

  it('should return all cats', async () => {
    const expectedCats = [{ id: 1, name: 'Fluffy' }];
    service.findAll.mockResolvedValue(expectedCats);

    const result = await controller.findAll();

    expect(result).toEqual(expectedCats);
  });

  it('should create a cat', async () => {
    const createCatDto = { name: 'Fluffy', age: 3 };
    const expectedCat = { id: 1, ...createCatDto };
    service.create.mockResolvedValue(expectedCat);

    const result = await controller.create(createCatDto);

    expect(result).toEqual(expectedCat);
    expect(service.create).toHaveBeenCalledWith(createCatDto);
  });
});
```

### Testing Guards

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get(Reflector);
  });

  it('should allow access when public route', () => {
    reflector.get.mockReturnValue(true);
    const context = createMock<ExecutionContext>();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when no token provided', () => {
    reflector.get.mockReturnValue(false);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({ headers: {} });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
```

### Testing Pipes

```typescript
import { ValidationPipe } from './validation.pipe';

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should pass valid data', () => {
    const data = { name: 'Fluffy', age: 3 };
    const result = pipe.transform(data, { type: 'body', metatype: Object });

    expect(result).toEqual(data);
  });

  it('should throw on invalid data', () => {
    const data = { name: '', age: -1 };

    expect(() => pipe.transform(data, { type: 'body', metatype: Object })).toThrow();
  });
});
```

### E2E Testing

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CatsService } from '../src/cats/cats.service';

describe('Cats (e2e)', () => {
  let app: INestApplication;
  let catsService = { findAll: () => [{ id: 1, name: 'Fluffy' }] };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/GET cats (200)', () => {
    return request(app.getHttpServer()).get('/cats').expect(200).expect(catsService.findAll());
  });

  it('/POST cats (201)', () => {
    const createCatDto = { name: 'Fluffy', age: 3 };

    return request(app.getHttpServer()).post('/cats').send(createCatDto).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Overriding Globally Registered Components

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(JwtAuthGuard)
  .useClass(MockAuthGuard)
  .overrideGuard(RolesGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

### Using Auto-Mocking with jest-mock

```typescript
import { ModuleMocker, MockMetadata } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('CatsController', () => {
  let controller: CatsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatsController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    controller = moduleRef.get(CatsController);
  });
});
```

## Workflow

1. **Discovery**: Identify what needs testing (service, controller, guard, etc.)
2. **Setup**: Create test file and import necessary dependencies
3. **Mocking**: Mock all external dependencies
4. **Implementation**: Write test cases for all scenarios
5. **Validation**: Run tests with `npm run test` or `npm run test:e2e`

## Common Utilities

### Create Mock Context

```typescript
function createMock<T>(): T {
  return {} as jest.Mocked<T>;
}
```

### Create Mock ExecutionContext

```typescript
import { ExecutionContext } from '@nestjs/common';

function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as any;
}
```

## Testing Checklist

- [ ] All public methods are tested
- [ ] Success paths are tested
- [ ] Error paths are tested
- [ ] Edge cases are covered
- [ ] Mocks are properly configured
- [ ] Tests are isolated (no shared state)
- [ ] Test files are properly named
- [ ] Tests pass locally
