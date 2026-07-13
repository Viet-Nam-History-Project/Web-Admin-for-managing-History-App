import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getNeo4jDriver() {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error('Thiếu Neo4j env. Cần NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD.');
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driver;
}
