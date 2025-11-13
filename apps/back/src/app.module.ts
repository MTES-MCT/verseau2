import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DepotModule } from './depot/depot.module';
import { DatabaseModule } from './infra/database/database.module';

@Module({
  imports: [DepotModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
