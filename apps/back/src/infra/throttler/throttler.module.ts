import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => [
        {
          name: 'default',
          ttl: 60000, // 1 minute
          limit: 100,
        },
      ],
    }),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
