import type { ServiceBusEntityType } from '../../domain/entities/event-message.entity.js';

export interface EntityTargetDto {
  entityType: ServiceBusEntityType;
  entityName: string;
  subscriptionName?: string;
}

export interface PeekMessagesDto extends EntityTargetDto {
  maxMessages?: number;
}

export interface SendMessageDto extends EntityTargetDto {
  body: unknown;
}
