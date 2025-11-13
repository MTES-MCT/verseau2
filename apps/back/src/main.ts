import { bootstrapServer } from './mainServer';
import { bootstrapWorker } from './mainWorker';

async function bootstrap() {
  await bootstrapServer();
  await bootstrapWorker();
}
bootstrap();
