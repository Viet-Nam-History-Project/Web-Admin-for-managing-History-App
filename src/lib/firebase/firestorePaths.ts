export const paths = {
  users: 'users',
  adminUsers: 'admin_users',
  periods: 'periods',
  period: (periodSlug: string) => `periods/${periodSlug}`,
  stages: (periodSlug: string) => `periods/${periodSlug}/stages`,
  stage: (periodSlug: string, stageSlug: string) =>
    `periods/${periodSlug}/stages/${stageSlug}`,
  events: (periodSlug: string, stageSlug: string) =>
    `periods/${periodSlug}/stages/${stageSlug}/events`,
  event: (periodSlug: string, stageSlug: string, eventSlug: string) =>
    `periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}`,
  personPeriods: 'periods_person',
  persons: (periodSlug: string) => `periods_person/${periodSlug}/persons`,
  person: (periodSlug: string, personSlug: string) =>
    `periods_person/${periodSlug}/persons/${personSlug}`,
  quizzes: (gameId: string) => `games/${gameId}/quizzes`,
  questions: (gameId: string, quizId: string) => `games/${gameId}/quizzes/${quizId}/questions`,
  timelineEras: 'games/timelinepuzzle/eras',
  historySessions: (userId: string) => `history/${userId}/sessions`,
  forumPosts: 'forum',
  forumReplies: (postId: string) => `forum/${postId}/replies`,
  forumReports: (postId: string) => `forum/${postId}/reports`,
  forumReport: (postId: string, reportId: string) => `forum/${postId}/reports/${reportId}`,
  auditLogs: 'admin_audit_logs',
  trash: 'admin_trash',
  mediaAssets: 'media_assets',
  aiKnowledgeSources: 'ai_knowledge_sources',
  aiEvaluationRuns: 'ai_evaluation_runs',
  aiPromptVersions: 'ai_prompt_versions',
};

export function canonicalId(type: string, firestorePath: string) {
  return `${type}:${firestorePath}`;
}
