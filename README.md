# Admin Web - Lịch Sử Việt Nam

Web admin riêng cho hệ thống app học **Lịch Sử Việt Nam**. Project là repository độc lập, không nằm trong source app mobile React Native Expo.

## Công nghệ

- Next.js + TypeScript
- Tailwind CSS
- Firebase Client SDK cho đăng nhập admin
- Firebase Admin SDK cho server-side repository/API
- FastAPI History-Chatbot cho OpenAI, PDF và Neo4j
- Zod cho validation schema

## Cài đặt

```bash
cd Web-Admin-for-managing-History-App
npm install
cp .env.example .env
npm run dev
```

Admin chạy ở:

```bash
http://localhost:3000
```

## Python venv

Môi trường Python đã được tạo ở:

```bash
Web-Admin-for-managing-History-App/.venv
```

Kích hoạt nếu cần chạy tooling Python sau này:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Biến môi trường

Client login:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

Server admin:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Hoặc dán nguyên JSON service account vào một trong hai biến sau:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
FIREBASE_KEY='{"type":"service_account",...}'
```

`FIREBASE_KEY` / `FIREBASE_SERVICE_ACCOUNT_KEY` có thể là JSON nguyên bản hoặc base64 của JSON.
Firebase Web API key (`NEXT_PUBLIC_FIREBASE_API_KEY`) chỉ dùng cho client login, không đủ quyền cho Firebase Admin SDK.

AI/PDF backend:

```env
AI_BACKEND_URL=http://127.0.0.1:8000
AI_ADMIN_API_KEY=replace-with-the-same-secret-as-history-chatbot
AI_MAX_PDF_SIZE_MB=200
AI_PDF_STORAGE_DRIVER=local
AI_PDF_LOCAL_DIR=.data
ADMIN_APP_URL=http://localhost:3000
```

## Tạo admin đầu tiên

1. Tạo user bằng Firebase Auth.
2. Chạy:

```bash
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='mat-khau-an-toan' npm run seed:admin
```

Nếu tài khoản chưa có trong Firebase Authentication, script sẽ tạo mới. Nếu đã có và truyền
`SEED_ADMIN_PASSWORD`, script sẽ cập nhật mật khẩu. Script sau đó sẽ:

- Tạo/cập nhật document `admin_users/{uid}`.
- Gán role `super_admin`.
- Set Firebase custom claim `{ admin: true, roles: ["super_admin"] }`.

## Role system

- `super_admin`: toàn quyền.
- `content_admin`: quản lý nội dung lịch sử, nhân vật, bài báo, bảo tàng.
- `game_admin`: quản lý quiz và game.
- `moderator`: quản lý forum, comment, report.
- `analyst`: chỉ xem dashboard/thống kê.
- `ai_admin`: quản lý AI, prompt, knowledge base, evaluation.
- `viewer`: chỉ xem.

Mọi API mutation phải gọi `requireAdmin()` trước khi ghi dữ liệu.

## Audit log

Mọi thao tác quan trọng ghi vào:

```txt
admin_audit_logs/{logId}
```

Schema:

```ts
{
  actorUid,
  actorEmail,
  action,
  entityType,
  entityPath,
  before,
  after,
  createdAt,
  ip,
  userAgent
}
```

## Phân chia trách nhiệm dữ liệu

Firestore là nguồn dữ liệu chính cho nội dung app và metadata/trạng thái PDF.
Web-admin không kết nối trực tiếp Neo4j. Nút **Index** gửi PDF sang FastAPI;
backend duy nhất chịu trách nhiệm OCR, chunk, OpenAI embedding, trích
entity/relationship, ghi Neo4j và thống kê token.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run seed:admin
npm run firestore:export-schema
```

## Phần đã hoạt động

- Dashboard thống kê Firestore.
- CRUD create/update cho Period → Stage → Event.
- Publish/unpublish có validation.
- Soft delete và khôi phục qua `admin_trash`.
- Xóa vĩnh viễn có xác nhận và recursive delete cho `super_admin`.
- Audit logs cho toàn bộ mutation nội dung cốt lõi.
- Content quality scanner.
- Kho tri thức PDF có Index nền, kiểm tra chunk/entity/relationship và token.
- Quản lý Graph chỉ hiển thị pipeline PDF mới; có công cụ xóa dữ liệu legacy.
- Quản lý người dùng: tìm/lọc, xem hồ sơ, lịch sử chơi, khóa tài khoản, chỉnh XP, reset streak và thu hồi phiên.
- Persons, quiz, timeline puzzle, forum, media và AI hiện có route khung để tiếp tục triển khai.

Xem báo cáo đầy đủ tại [BAO_CAO_WEB_ADMIN.md](./BAO_CAO_WEB_ADMIN.md).

## TODO

- CRUD chi tiết cho persons/quiz/forum/media.
- Bổ sung chart thật bằng Recharts.
- Bổ sung table/filter/search/pagination từng module.
- Bổ sung graph visualization cho dữ liệu PDF khi cần.
- Bổ sung rate limit cho các endpoint AI.
- Cập nhật Firestore rules/custom claims theo mô hình admin.
