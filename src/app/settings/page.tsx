import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { getAiBackendHealth } from '@/lib/ai/backend';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const firebaseReady = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_KEY)
    || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  );
  const backendReady = await getAiBackendHealth()
    .then((health) => health.status === 'ready' && health.neo4j === 'connected')
    .catch(() => false);

  return <AdminShell>
    <PageHeader eyebrow="Hệ thống" title="Cài đặt" description="Giao diện, tài khoản quản trị, bảo mật phiên đăng nhập và trạng thái tích hợp hệ thống." />
    <SettingsPanel connections={{ firebase: firebaseReady, graph: backendReady, ai: backendReady }} />
  </AdminShell>;
}
