import { Module } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from './application/use-cases/process-incoming-message.use-case.js';
import { StreamActiveMessagesUseCase } from './application/use-cases/stream-active-messages.use-case.js';
import { ServiceBusConsumer } from './infrastructure/adapters/azure/service-bus.consumer.js';
import { EVENT_REPOSITORY } from './infrastructure/config/tokens.js';
import { RealtimeGateway } from './infrastructure/adapters/websocket/realtime.gateway.js';
import { ServiceBusMonitorController } from './service-bus-monitor.controller.js';

@Module({
  controllers: [ServiceBusMonitorController],
  providers: [
    ServiceBusConsumer,
    { provide: EVENT_REPOSITORY, useExisting: ServiceBusConsumer },
    ProcessIncomingMessageUseCase,
    StreamActiveMessagesUseCase,
    RealtimeGateway,
  ],
})
export class ServiceBusMonitorModule {}
