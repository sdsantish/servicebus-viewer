import { Inject, Injectable } from '@nestjs/common';
import type { EntityTarget } from '../../domain/entities/event-message.entity.js';
import type { EventRepository } from '../../domain/repositories/event-repository.interface.js';
import { EVENT_REPOSITORY } from '../../infrastructure/config/tokens.js';

@Injectable()
export class StreamActiveMessagesUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  execute(target: EntityTarget) {
    return this.eventRepository.peekMessages(target, 20);
  }
}
