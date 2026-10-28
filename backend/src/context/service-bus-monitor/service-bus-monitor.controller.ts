import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from './application/use-cases/process-incoming-message.use-case.js';
import type { EntityTargetDto, PeekMessagesDto, SendMessageDto } from './application/dto/message.dto.js';
import type { EntityTarget } from './domain/entities/event-message.entity.js';
import { ServiceBusConsumer } from './infrastructure/adapters/azure/service-bus.consumer.js';

@Controller('api')
export class ServiceBusMonitorController {
  constructor(
    private readonly serviceBus: ServiceBusConsumer,
    private readonly processMessage: ProcessIncomingMessageUseCase,
  ) {}

  @Get('entities')
  listEntities() {
    return this.serviceBus.listEntities();
  }

  @Post('messages/peek')
  peekMessages(@Body() request: PeekMessagesDto) {
    return this.serviceBus.peekMessages(this.target(request), request.maxMessages ?? 20);
  }

  @Post('messages/send')
  async sendMessage(@Body() request: SendMessageDto) {
    const messageId = await this.processMessage.execute(this.target(request), request.body);
    return { messageId };
  }

  private target(request: EntityTargetDto): EntityTarget {
    return {
      entityType: request.entityType,
      entityName: request.entityName,
      subscriptionName: request.subscriptionName,
    };
  }
}
