import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MeGuard } from './me.guard';

describe('MeGuard', () => {
  let guard: MeGuard;

  beforeEach(() => {
    guard = new MeGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when user is authenticated and no ID is requested', () => {
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { cerbereId: 'user-123' },
          params: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should return true when user is authenticated and requests their own ID', () => {
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { cerbereId: 'user-123' },
          params: { id: 'user-123' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw UnauthorizedException when user is not authenticated', () => {
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockContext)).toThrow('User not authenticated');
  });
});
