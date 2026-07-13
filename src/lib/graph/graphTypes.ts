export type GraphNodeType =
  | 'Period'
  | 'Stage'
  | 'Event'
  | 'Person'
  | 'Location'
  | 'Organization'
  | 'Concept'
  | 'Media'
  | 'Quiz'
  | 'Question';

export type GraphRelationshipType =
  | 'HAS_STAGE'
  | 'HAS_EVENT'
  | 'BELONGS_TO_PERIOD'
  | 'PARTICIPATED_IN'
  | 'LED_BY'
  | 'OCCURRED_AT'
  | 'RELATED_TO'
  | 'MENTIONS'
  | 'HAS_MEDIA'
  | 'QUIZ_ABOUT'
  | 'QUESTION_ABOUT';

export interface GraphNodeInput {
  canonicalId: string;
  firestorePath: string;
  slug: string;
  title: string;
  type: GraphNodeType;
  status?: string;
  updatedAt?: string;
  source: 'firestore';
  metadata?: Record<string, unknown>;
}
