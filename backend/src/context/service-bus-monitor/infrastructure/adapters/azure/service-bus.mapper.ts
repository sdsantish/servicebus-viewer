import type { ServiceBusReceivedMessage } from '@azure/service-bus';
import type { EventMessage } from '../../../domain/entities/event-message.entity.js';

export function toEventMessage(message: ServiceBusReceivedMessage): EventMessage {
  return {
    messageId: String(message.messageId ?? message.sequenceNumber ?? 'unknown'),
    body: message.body,
    contentType: message.contentType,
    subject: message.subject,
    correlationId:
      message.correlationId === undefined
        ? undefined
        : Buffer.isBuffer(message.correlationId)
          ? message.correlationId.toString('base64')
          : String(message.correlationId),
    enqueuedTimeUtc: message.enqueuedTimeUtc?.toISOString(),
    sequenceNumber:
      message.sequenceNumber === undefined ? undefined : String(message.sequenceNumber),
    deliveryCount: message.deliveryCount,
    applicationProperties: message.applicationProperties,
  };
}
