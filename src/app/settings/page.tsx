import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export default function SettingsPage() {
  const firebaseReady = Boolean(
    (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_KEY)
    || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  );
  const graphReady = Boolean(process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD);
  const aiReady = Boolean(process.env.AI_PROVIDER_API_KEY && process.env.AI_PROVIDER_MODEL);

  return <AdminShell>
    <PageHeader eyebrow="Hệ thống" title="Cài đặt" description="Giao diện, tài khoản quản trị, bảo mật phiên đăng nhập và trạng thái tích hợp hệ thống." />
    <SettingsPanel connections={{ firebase: firebaseReady, graph: graphReady, ai: aiReady }} />
  </AdminShell>;
}
