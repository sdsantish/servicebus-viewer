import { Inject, Injectable } from '@nestjs/common';
import type { EventRepository } from '../../domain/repositories/event-repository.interface.js';
import { EVENT_REPOSITORY } from '../../infrastructure/config/tokens.js';
import type { EntityTarget } from '../../domain/entities/event-message.entity.js';

@Injectable()
export class ProcessIncomingMessageUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  execute(target: EntityTarget, body: unknown): Promise<string> {
    return this.eventRepository.sendMessage(target, body);
  }
}
