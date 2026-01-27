import { CACHE_KEY_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import type { CustomRequest } from '@shared/constants/customRequest';

@Injectable()
export class CerbereIdCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const cerbereId = request.user?.cerbereId;

    if (!cerbereId) {
      return undefined;
    }

    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());

    if (!isHttpApp || cacheMetadata) {
      return cacheMetadata;
    }

    const url = httpAdapter.getRequestUrl(request) as string;
    return `${url}:${cerbereId}`;
  }
}
