import type {
  EntityTarget,
  EventMessage,
  ServiceBusEntity,
} from '../entities/event-message.entity.js';

export interface EventRepository {
  listEntities(): Promise<ServiceBusEntity[]>;
  peekMessages(target: EntityTarget, maxMessages: number): Promise<EventMessage[]>;
  sendMessage(target: EntityTarget, body: unknown): Promise<string>;
}
