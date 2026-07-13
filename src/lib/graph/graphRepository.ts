import { canonicalId } from '@/lib/firebase/firestorePaths';
import { getNeo4jDriver } from '@/lib/graph/neo4j';
import { GraphNodeInput, GraphRelationshipType } from '@/lib/graph/graphTypes';

async function upsertNode(label: string, input: GraphNodeInput) {
  const session = getNeo4jDriver().session();
  try {
    await session.run(
      `
      MERGE (n:${label} {canonicalId: $canonicalId})
      SET n.firestorePath = $firestorePath,
          n.slug = $slug,
          n.title = $title,
          n.type = $type,
          n.status = $status,
          n.source = $source,
          n.metadata = $metadata,
          n.updatedAt = datetime()
      RETURN n
      `,
      {
        ...input,
        status: input.status ?? 'draft',
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    );
  } finally {
    await session.close();
  }
}

export const graphRepository = {
  upsertPeriod(input: Omit<GraphNodeInput, 'type' | 'source'>) {
    return upsertNode('Period', { ...input, type: 'Period', source: 'firestore' });
  },
  upsertStage(input: Omit<GraphNodeInput, 'type' | 'source'>) {
    return upsertNode('Stage', { ...input, type: 'Stage', source: 'firestore' });
  },
  upsertEvent(input: Omit<GraphNodeInput, 'type' | 'source'>) {
    return upsertNode('Event', { ...input, type: 'Event', source: 'firestore' });
  },
  upsertPerson(input: Omit<GraphNodeInput, 'type' | 'source'>) {
    return upsertNode('Person', { ...input, type: 'Person', source: 'firestore' });
  },
  async createRelationship(fromCanonicalId: string, toCanonicalId: string, type: GraphRelationshipType) {
    const session = getNeo4jDriver().session();
    try {
      await session.run(
        `
        MATCH (a {canonicalId: $fromCanonicalId})
        MATCH (b {canonicalId: $toCanonicalId})
        MERGE (a)-[r:${type}]->(b)
        SET r.updatedAt = datetime(), r.source = "admin"
        RETURN r
        `,
        { fromCanonicalId, toCanonicalId },
      );
    } finally {
      await session.close();
    }
  },
  async deleteRelationship(fromCanonicalId: string, toCanonicalId: string, type: GraphRelationshipType) {
    const session = getNeo4jDriver().session();
    try {
      await session.run(
        `
        MATCH (a {canonicalId: $fromCanonicalId})-[r:${type}]->(b {canonicalId: $toCanonicalId})
        DELETE r
        `,
        { fromCanonicalId, toCanonicalId },
      );
    } finally {
      await session.close();
    }
  },
  async findRelatedNodes(nodeId: string) {
    const session = getNeo4jDriver().session();
    try {
      const result = await session.run(
        'MATCH (n {canonicalId: $nodeId})-[r]-(m) RETURN n, r, m LIMIT 80',
        { nodeId },
      );
      return result.records.map((record) => ({
        relation: record.get('r').type,
        node: record.get('m').properties,
      }));
    } finally {
      await session.close();
    }
  },
  async getNodeNetwork(nodeId: string) {
    return this.findRelatedNodes(nodeId);
  },
  async getUnsyncedContent() {
    return [];
  },
  canonicalId,
};
