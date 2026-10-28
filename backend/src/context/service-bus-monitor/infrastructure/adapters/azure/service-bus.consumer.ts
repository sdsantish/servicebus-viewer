import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { ServiceBusClient } from '@azure/service-bus';
import type {
  EntityTarget,
  EventMessage,
  ServiceBusEntity,
} from '../../../domain/entities/event-message.entity.js';
import type { EventRepository } from '../../../domain/repositories/event-repository.interface.js';
import { environment, getServiceBusConnectionString } from '../../config/environment.js';
import { toEventMessage } from './service-bus.mapper.js';

interface ConfiguredEntity {
  Name?: unknown;
  Subscriptions?: unknown;
}

@Injectable()
export class ServiceBusConsumer implements EventRepository {
  async listEntities(): Promise<ServiceBusEntity[]> {
    const config = await this.readConfig();
    const namespaces = config.UserConfig?.Namespaces;
    if (!Array.isArray(namespaces)) {
      throw new Error('Service Bus config must contain a UserConfig.Namespaces array');
    }

    return namespaces.flatMap((namespace: Record<string, unknown>) => {
      const queues = Array.isArray(namespace.Queues) ? namespace.Queues : [];
      const topics = Array.isArray(namespace.Topics) ? namespace.Topics : [];
      return [
        ...queues.map((entity) => this.mapEntity(entity, 'queue')),
        ...topics.map((entity) => this.mapEntity(entity, 'topic')),
      ];
    });
  }

  async peekMessages(target: EntityTarget, maxMessages: number): Promise<EventMessage[]> {
    await this.findEntity(target, true);
    if (maxMessages < 1 || maxMessages > 100) {
      throw new BadRequestException('maxMessages must be between 1 and 100');
    }

    const client = new ServiceBusClient(getServiceBusConnectionString());
    try {
      const receiver =
        target.entityType === 'topic'
          ? client.createReceiver(target.entityName, target.subscriptionName!, {
              receiveMode: 'peekLock',
            })
          : client.createReceiver(target.entityName, { receiveMode: 'peekLock' });
      try {
        return (await receiver.peekMessages(maxMessages)).map(toEventMessage);
      } finally {
        await receiver.close();
      }
    } finally {
      await client.close();
    }
  }

  async sendMessage(target: EntityTarget, body: unknown): Promise<string> {
    await this.findEntity(target);
    const client = new ServiceBusClient(getServiceBusConnectionString());
    try {
      const sender = client.createSender(target.entityName);
      try {
        const messageId = crypto.randomUUID();
        await sender.sendMessages({
          body,
          contentType: 'application/json',
          messageId,
        });
        return messageId;
      } finally {
        await sender.close();
      }
    } finally {
      await client.close();
    }
  }

  private async findEntity(
    target: EntityTarget,
    requireSubscription = false,
  ): Promise<ServiceBusEntity> {
    const entity = (await this.listEntities()).find(
      (candidate) =>
        candidate.name === target.entityName && candidate.type === target.entityType,
    );
    if (!entity) {
      throw new NotFoundException(`Service Bus ${target.entityType} was not found`);
    }
    if (
      requireSubscription &&
      target.entityType === 'topic' &&
      !entity.subscriptions.includes(target.subscriptionName ?? '')
    ) {
      throw new BadRequestException('A configured subscription is required for this topic');
    }
    return entity;
  }

  private mapEntity(value: unknown, type: 'queue' | 'topic'): ServiceBusEntity {
    const entity = value as ConfiguredEntity;
    if (typeof entity?.Name !== 'string' || entity.Name.length === 0) {
      throw new Error(`Invalid ${type} entry in Service Bus config`);
    }
    const subscriptions = Array.isArray(entity.Subscriptions)
      ? entity.Subscriptions.map((subscription) => {
          const name = (subscription as ConfiguredEntity).Name;
          if (typeof name !== 'string' || name.length === 0) {
            throw new Error(`Invalid subscription for topic ${String(entity.Name)}`);
          }
          return name;
        })
      : [];
    return { name: entity.Name, type, subscriptions };
  }

  private async readConfig(): Promise<{
    UserConfig?: { Namespaces?: Record<string, unknown>[] };
  }> {
    const contents = await readFile(environment.configPath, 'utf8');
    return JSON.parse(contents);
  }
}
