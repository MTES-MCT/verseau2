import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DepotModule } from './depot/depot.module';
import { DatabaseModule } from './infra/database/database.module';
import { QueueModule } from './infra/queue/queue.module';
import { WorkerModule } from './worker/worker.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [DepotModule, DatabaseModule, QueueModule, WorkerModule, SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
