import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { environment } from './context/service-bus-monitor/infrastructure/config/environment.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  await app.listen(environment.port);
}
await bootstrap();
