import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './authentication';
import { REQUEST_USER_KEY } from './authentication.guard';

export const AuthenticatedUserDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request[REQUEST_USER_KEY] as AuthenticatedUser;
  },
);
