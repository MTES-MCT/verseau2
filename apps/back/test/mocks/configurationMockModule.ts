import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvVars: true,
      envFilePath: [path.join(__dirname, 'test.envfile')],
    }),
  ],
})
export class ConfigurationMockModule {
  constructor(private readonly configService: ConfigService) {
    console.log('????????????????????????????ConfigurationMockModule');
    console.log('Loading env from:', path.join(__dirname, 'test.envfile'));
    console.log('DB URL:', this.configService.get('DATABASE_URL'));
    console.log('MASA KEY:', this.configService.get('MASA_API_KEY'));
  }
}
