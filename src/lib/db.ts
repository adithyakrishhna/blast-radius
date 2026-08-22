import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';
import { DbUnreachableError, mapNeo4jError } from './errors';

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;

  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    throw new DbUnreachableError(
      'Missing database credentials. Set COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD in your environment.',
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 5000,
  });

  return driver;
}

export async function verifyConnectivity(): Promise<{ latencyMs: number }> {
  const start = Date.now();
  try {
    await getDriver().verifyConnectivity();
    return { latencyMs: Date.now() - start };
  } catch (err) {
    throw mapNeo4jError(err);
  }
}

export async function runRead<T = QueryResult>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<QueryResult> {
  const database = process.env.COGNODB_DATABASE ?? 'neo4j';
  let session: Session | null = null;
  try {
    session = getDriver().session({ database, defaultAccessMode: neo4j.session.READ });
    return await session.run(cypher, params);
  } catch (err) {
    throw mapNeo4jError(err);
  } finally {
    await session?.close();
  }
}

export async function runWrite(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<QueryResult> {
  const database = process.env.COGNODB_DATABASE ?? 'neo4j';
  let session: Session | null = null;
  try {
    session = getDriver().session({ database, defaultAccessMode: neo4j.session.WRITE });
    return await session.run(cypher, params);
  } catch (err) {
    throw mapNeo4jError(err);
  } finally {
    await session?.close();
  }
}

// Called on server shutdown to cleanly release all connections
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
