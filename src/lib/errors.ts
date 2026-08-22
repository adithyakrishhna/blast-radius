import neo4j from 'neo4j-driver';

export class DbUnreachableError extends Error {
  constructor(message = 'Database is unreachable') {
    super(message);
    this.name = 'DbUnreachableError';
  }
}

export class QueryFailedError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'QueryFailedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Maps raw Neo4j errors to typed domain errors
export function mapNeo4jError(err: unknown): DbUnreachableError | QueryFailedError {
  if (err instanceof neo4j.Neo4jError) {
    // Service unavailable, connection refused, auth failure at connection time
    if (
      err.code === 'ServiceUnavailable' ||
      err.code === 'Neo.TransientError.General.DatabaseUnavailable' ||
      err.message.includes('Could not connect') ||
      err.message.includes('Connection refused')
    ) {
      return new DbUnreachableError(err.message);
    }
    return new QueryFailedError(err.message, err.code);
  }
  if (err instanceof Error && err.message.includes('WebSocket')) {
    return new DbUnreachableError(err.message);
  }
  return new QueryFailedError(String(err));
}

export type ApiErrorCode = 'DB_UNREACHABLE' | 'NOT_FOUND' | 'BAD_INPUT' | 'QUERY_FAILED';

export function toApiError(err: unknown): { code: ApiErrorCode; message: string } {
  const mapped = mapNeo4jError(err);
  if (mapped instanceof DbUnreachableError) {
    return { code: 'DB_UNREACHABLE', message: 'Database is currently unreachable. Please try again shortly.' };
  }
  if (err instanceof NotFoundError) {
    return { code: 'NOT_FOUND', message: err.message };
  }
  return { code: 'QUERY_FAILED', message: mapped.message };
}
