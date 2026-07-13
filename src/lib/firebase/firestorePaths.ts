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
  forumPosts: 'forum/posts/all',
  forumReplies: (postId: string) => `forum/posts/all/${postId}/replies`,
  auditLogs: 'admin_audit_logs',
  trash: 'admin_trash',
  mediaAssets: 'media_assets',
};

export function canonicalId(type: string, firestorePath: string) {
  return `${type}:${firestorePath}`;
}
