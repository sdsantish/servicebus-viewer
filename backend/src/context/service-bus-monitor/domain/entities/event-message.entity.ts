export type ServiceBusEntityType = 'queue' | 'topic';

export interface ServiceBusEntity {
  name: string;
  type: ServiceBusEntityType;
  subscriptions: string[];
}

export interface EventMessage {
  messageId: string;
  body: unknown;
  contentType?: string;
  subject?: string;
  correlationId?: string;
  enqueuedTimeUtc?: string;
  sequenceNumber?: string;
  deliveryCount?: number;
  applicationProperties?: Record<string, unknown>;
}

export interface EntityTarget {
  entityType: ServiceBusEntityType;
  entityName: string;
  subscriptionName?: string;
}
