import type { IncomingMessage, ServerResponse } from 'node:http';
export function bridge(
  req: IncomingMessage,
  res: ServerResponse,
  options?: Record<string, string | undefined>,
): Promise<void>;
