import type { EntityTarget, EventMessage } from '../entities/event-message.entity.js';

export interface StreamHandler {
  publish(target: EntityTarget, messages: EventMessage[]): void;
}
