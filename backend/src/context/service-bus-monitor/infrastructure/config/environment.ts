import { resolve } from 'node:path';

export const environment = {
  port: Number(process.env.PORT ?? 3000),
  configPath: resolve(process.env.SERVICEBUS_CONFIG_PATH ?? '../config.json'),
};

export function getServiceBusConnectionString(): string {
  const connectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('SERVICEBUS_CONNECTION_STRING must be configured');
  }
  return connectionString;
}
