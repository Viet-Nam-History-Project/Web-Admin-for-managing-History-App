export const ADMIN_ROLES = [
  'super_admin',
  'content_admin',
  'game_admin',
  'moderator',
  'analyst',
  'ai_admin',
  'viewer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  content_admin: 'Content Admin',
  game_admin: 'Game Admin',
  moderator: 'Moderator',
  analyst: 'Analyst',
  ai_admin: 'AI Admin',
  viewer: 'Viewer',
};

export function hasAnyRole(userRoles: string[] = [], allowedRoles: AdminRole[] = []) {
  if (userRoles.includes('super_admin')) return true;
  if (!allowedRoles.length) return true;
  return allowedRoles.some((role) => userRoles.includes(role));
}
