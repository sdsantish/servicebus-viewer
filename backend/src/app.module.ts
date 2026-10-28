import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ServiceBusMonitorModule } from './context/service-bus-monitor/service-bus-monitor.module.js';

@Module({
  imports: [ServiceBusMonitorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
