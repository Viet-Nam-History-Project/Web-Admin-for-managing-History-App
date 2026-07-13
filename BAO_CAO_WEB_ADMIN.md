# BÁO CÁO HỆ THỐNG WEB ADMIN LỊCH SỬ VIỆT NAM

## 1. Mục tiêu và phạm vi

Web Admin là hệ thống điều hành nội dung cho app mobile Lịch Sử Việt Nam. Firestore là nguồn dữ liệu chính. Neo4j chỉ là lớp phụ để lưu quan hệ, phục vụ phân tích, gợi ý và AI; lỗi Neo4j không được làm mất dữ liệu đã lưu tại Firestore.

Đợt triển khai này tập trung hoàn thiện luồng nội dung cốt lõi:

`Thời kỳ → Giai đoạn → Sự kiện`

Cấu trúc Firestore được sử dụng:

```text
periods/{periodSlug}
periods/{periodSlug}/stages/{stageSlug}
periods/{periodSlug}/stages/{stageSlug}/events/{eventSlug}
```

## 2. Nguồn đã đối chiếu

- Schema Firestore: `firestore_structure_only.json`.
- Mobile models: `Period.ts`, `Stage.ts`, `Event.ts`.
- Mobile services: `periodService.ts`, `stageService.ts`, `eventService.ts`.
- Mobile routes: màn thời kỳ, chi tiết thời kỳ, timeline giai đoạn, chi tiết giai đoạn, chi tiết sự kiện.
- Quy ước dự án mobile trong `CLAUDE.md`.
- Web Admin độc lập trong repository `Web-Admin-for-managing-History-App`.
- Project tham khảo `WebAdminHistoryVietNam`, chủ yếu dùng để tham khảo luồng màn hình. Không tái sử dụng cách xóa cứng hoặc gọi Firebase trực tiếp từ component.

## 3. Kiến trúc triển khai

### 3.1. Data flow

```text
UI page / client form
        ↓ Firebase ID token
Next.js Admin API
        ↓ requireAdmin(role)
Validation bằng Zod
        ↓
Admin Service
        ↓
Firestore Repository → admin_audit_logs
        ↓ soft delete
admin_trash
        ↓ optional
Neo4j Graph Sync + graphSyncStatus
```

### 3.2. Nguyên tắc an toàn

- UI không gọi Firebase Firestore trực tiếp.
- API mutation yêu cầu Firebase ID token và role admin phù hợp.
- Slug bị khóa khi sửa để không làm gãy route app mobile.
- Xóa period/stage/event là xóa mềm, không xóa subcollection.
- Mọi create, update, publish, unpublish, soft delete, restore và sync graph đều ghi audit log.
- Thao tác update đánh dấu `graphSyncStatus = pending`.
- Sync thành công ghi `synced`; sync lỗi ghi `error` và `graphSyncError`.

## 4. Sidebar và điều hướng

Sidebar đã bỏ Giai đoạn và Sự kiện khỏi menu cấp một. Hai loại dữ liệu này chỉ được quản lý bên trong Thời kỳ.

| Nhóm | Chức năng |
|---|---|
| Tổng quan | Dashboard, Analytics |
| Nội dung | Thời kỳ lịch sử, Nhân vật lịch sử, Media Library, Chất lượng nội dung, Thùng rác |
| Trò chơi | Quiz, Ghép niên đại |
| Cộng đồng | Forum posts, Reports |
| Người dùng & Game hóa | Người dùng, Badges, Ranks, XP Rules, Leaderboard |
| Tri thức & AI | Graph Explorer, Graph Sync, Relationships, AI Overview, Knowledge Base, Prompts, Evaluations, Suggestions |
| Hệ thống | Settings, Audit Logs |

## 5. Báo cáo chức năng chi tiết

### 5.1. Dashboard

**Giao diện:** các thẻ thống kê theo nhóm nội dung, người dùng, game, forum và tình trạng dữ liệu.

**Thao tác và dữ liệu:**

- Đếm users, periods, stages, events, persons, quizzes, questions và sessions.
- Đếm nội dung draft, thiếu ảnh, thiếu video, chưa sync graph và số mục trong thùng rác.
- Hiển thị health summary thay cho biểu đồ placeholder cũ.

**Tác dụng:** giúp quản trị viên nhìn nhanh khối lượng dữ liệu và các vấn đề cần xử lý.

### 5.2. Analytics

**Route:** `/analytics`

**Giao diện:** bộ lọc tùy chỉnh từ ngày đến ngày (tối đa 366 ngày), KPI, biểu đồ hoạt động, loại trò chơi, phân bố điểm, streak, trạng thái nội dung và bảng xếp hạng.

**Dữ liệu và thao tác:**

- Đếm người dùng mới, người hoạt động và số phiên trong khoảng chọn.
- Tính điểm trung bình, độ chính xác, XP, thời gian trung bình và retention so với kỳ trước.
- Theo dõi quiz và ghép niên đại, top nội dung được chơi và top người học theo XP.
- Thống kê published/draft/deleted cho thời kỳ, giai đoạn, sự kiện.
- Tổng hợp inventory và tương tác forum.
- Xuất báo cáo CSV có BOM UTF-8 để đọc tiếng Việt đúng trong Excel.

**Tác dụng:** giúp admin đánh giá mức độ sử dụng app, hiệu quả học tập, chất lượng kho nội dung và gamification.

### 5.3. Quản lý Thời kỳ

**Route:** `/content/periods`

**Giao diện:** bảng có ảnh bìa, tên/slug, niên đại, status, số stage, số event, graph status, thời gian cập nhật và nhóm thao tác.

**Thao tác:**

- Tạo thời kỳ.
- Mở trung tâm quản lý thời kỳ.
- Sửa nội dung; slug bị khóa khi sửa.
- Publish / unpublish có kiểm tra dữ liệu bắt buộc.
- Export JSON danh sách đang hiển thị.
- Sync graph.
- Xóa mềm và chuyển vào thùng rác.

**Tác dụng:** quản lý cấp nội dung lớn nhất của app và là điểm vào duy nhất để quản lý stage/event.

### 5.4. Trung tâm quản lý một Thời kỳ

**Route:** `/content/periods/{periodSlug}`

**Giao diện:** breadcrumb, thông tin trạng thái, ảnh preview, action bar và tám tab.

**Các tab:**

- Tổng quan: ảnh, summary, description, niên đại, thứ tự và graph status.
- Giai đoạn: danh sách stage thuộc đúng period, số event và nút tạo/mở/sửa.
- Sự kiện: danh sách tổng hợp event của mọi stage trong period.
- Nhân vật liên quan: vị trí dành cho dữ liệu relation.
- Quiz liên quan: vị trí dành cho quiz target.
- Chất lượng: kiểm tra nhanh title, ảnh, summary và stage.
- Graph relations: trạng thái và thao tác sync.
- Audit logs: lịch sử thao tác theo prefix đường dẫn period.

**Tác dụng:** giữ quản trị viên trong đúng ngữ cảnh, tránh tạo stage/event nhầm cha.

### 5.5. Quản lý Giai đoạn

**Routes:**

```text
/content/periods/{periodSlug}/stages/new
/content/periods/{periodSlug}/stages/{stageSlug}
/content/periods/{periodSlug}/stages/{stageSlug}/edit
```

**Giao diện:** breadcrumb Thời kỳ → Giai đoạn, ảnh, nội dung học, danh sách sự kiện và các tab quan hệ/chất lượng.

**Thao tác:**

- Tạo/sửa stage trong đúng period.
- Quản lý overview, description, details, result, impact và relation slug.
- Publish / unpublish.
- Sync graph.
- Xóa mềm, vẫn giữ events con.
- Mở hoặc tạo event trong stage.
- Tại danh sách trong thời kỳ, tên stage mở chi tiết; action riêng gồm Sửa và Xóa mềm.

**Tác dụng:** quản lý các chặng trong timeline của một thời kỳ và gom sự kiện theo đúng bối cảnh lịch sử.

### 5.6. Quản lý Sự kiện

**Routes:**

```text
/content/periods/{periodSlug}/stages/{stageSlug}/events/new
/content/periods/{periodSlug}/stages/{stageSlug}/events/{eventSlug}
/content/periods/{periodSlug}/stages/{stageSlug}/events/{eventSlug}/edit
```

**Giao diện:** breadcrumb đầy đủ, preview ảnh, status/action bar và các card nội dung theo đúng bố cục app mobile.

**Nội dung quản lý:**

- Lí do → `warCause`.
- Mục tiêu/chi tiết → `details`.
- Lực lượng → `content.forces.vn/usAllies`.
- Diễn biến → `content.warSummary`.
- Kết quả → `content.result.vn/usAllies`.
- Ý nghĩa → `meaning`.
- Đối tượng hai phía → `object.vn/usAllies`.
- Ảnh → `images`.
- Video → `videos`, `youtubeId`.
- Tác động và các relation liên quan.

**Thao tác:** tạo, sửa, publish, unpublish, sync graph và xóa mềm.

Tại tab Sự kiện của thời kỳ, admin chọn giai đoạn cha trước khi tạo sự kiện. Mỗi dòng có Sửa và Xóa mềm; tiêu đề là đường dẫn mở chi tiết.

**Tác dụng:** đảm bảo nội dung chi tiết sự kiện được ghi đúng field mà app mobile đọc, không dùng schema giả định tách rời dữ liệu thật.

### 5.7. Thùng rác

**Route:** `/content/trash`

**Firestore collection:** `admin_trash`

**Giao diện:** bảng loại entity, tiêu đề, path, thời gian xóa, khả năng khôi phục, nút Khôi phục và nút Xóa vĩnh viễn.

**Luồng xóa mềm:**

1. Document gốc được đổi `status = deleted`.
2. Lưu `previousStatus`, `deletedAt`, `deletedBy`.
3. Tạo index trong `admin_trash` chứa entity path và snapshot preview.
4. Ghi audit log.

**Luồng khôi phục:**

1. Đọc document theo `entityPath`.
2. Trả status về `previousStatus` hoặc `draft`.
3. Gỡ deleted fields.
4. Đánh dấu trash item đã restore.
5. Ghi audit log.

**Luồng xóa vĩnh viễn:**

1. Chỉ tài khoản có role `super_admin` được thao tác.
2. Admin phải nhập chính xác `DELETE` trong hộp thoại xác nhận.
3. Server kiểm tra document gốc vẫn ở trạng thái `deleted`.
4. Firestore Admin SDK xóa đệ quy document và toàn bộ subcollection bên dưới.
5. Xóa chỉ mục tương ứng trong `admin_trash` sau khi xóa dữ liệu thành công.
6. Ghi audit action `permanent_delete`.

**Tác dụng:** tránh mất dữ liệu do xóa nhầm và giải quyết hạn chế query subcollection sâu của Firestore.

**An toàn:** giao diện không cho xóa nhanh một chạm; mutation phải qua API có role guard và xác nhận bằng chữ.

### 5.8. Audit Logs

**Route:** `/audit-logs`

**Firestore collection:** `admin_audit_logs`

**Giao diện:** thời gian, admin, action, entity type, title và Firestore path.

**Action đã ghi:** create, update, publish, unpublish, soft_delete, restore, permanent_delete, sync_graph, user_ban, user_unban, manual_xp_update, streak_reset và session_revoke.

**Tác dụng:** truy vết ai đã thay đổi dữ liệu nào và hỗ trợ kiểm tra sự cố.

### 5.9. Chất lượng nội dung

**Route:** `/content/quality`

**Giao diện:** danh sách ưu tiên từ điểm thấp đến cao, badge lỗi và nút mở đúng màn quản trị.

**Cách chấm điểm:**

- Có title: 10.
- Có slug: 10.
- Có ảnh: 20.
- Có summary/overview/description: 15.
- Có nội dung chi tiết: 20.
- Graph đã sync: 15.
- Có nội dung con hoặc relation: 10.

Event còn được cảnh báo riêng nếu thiếu video.

**Tác dụng:** phát hiện dữ liệu chưa đủ trước khi publish và hỗ trợ nhóm nội dung ưu tiên công việc.

### 5.10. Graph Sync

**Trạng thái:** đã nối thật với Neo4j khi có đủ `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`.

**Node/relations cốt lõi:**

- Period.
- Stage và quan hệ `Period HAS_STAGE Stage`.
- Event và quan hệ `Stage HAS_EVENT Event`, `Event BELONGS_TO_PERIOD Period`.

Nếu Neo4j chưa cấu hình hoặc sync lỗi, dữ liệu Firestore vẫn được giữ; document ghi trạng thái `error` và nội dung lỗi.

### 5.11. Settings và tài khoản quản trị

**Route:** `/settings`

**Giao diện và thao tác:**

- Chuyển theme sáng hoặc tối cho toàn bộ Web Admin; lựa chọn được lưu trên trình duyệt.
- Bật giảm chuyển động cho người dùng nhạy cảm với animation.
- Xem email, UID, role và thay đổi tên hiển thị.
- Đổi mật khẩu sau khi xác thực lại mật khẩu hiện tại.
- Xem trạng thái cấu hình Firebase Admin, Neo4j và AI Provider mà không lộ secret.
- Đăng xuất; nút logout chỉ nằm trong Settings.

**An toàn:** mật khẩu được Firebase Authentication quản lý, không ghi vào Firestore hoặc audit log. Thay đổi hồ sơ, đổi mật khẩu và đăng xuất được ghi audit theo dạng không chứa dữ liệu bí mật.

Topbar chỉ hiển thị danh tính admin đang đăng nhập. Ô tìm kiếm toàn cục và nút Settings đã được bỏ khỏi Topbar; Settings được truy cập từ sidebar để tránh trùng lặp điều hướng.

### 5.12. Quản lý người dùng

**Routes:** `/users`, `/users/{uid}`

**Giao diện danh sách:**

- KPI tổng người dùng, đang hoạt động, đã khóa, có streak và tổng XP.
- Tìm theo tên, email, username hoặc UID.
- Lọc theo trạng thái tài khoản và rank.
- Bảng hiển thị avatar, rank, XP, streak, số phiên, lần chơi gần nhất và ngày tạo.
- Xuất danh sách đang hiển thị ra CSV UTF-8.

**Hồ sơ chi tiết:**

- Đối chiếu profile Firestore với trạng thái Firebase Authentication.
- Hiển thị XP, rank, streak hiện tại/dài nhất, phiên chơi và điểm cao nhất.
- Hiển thị email verification, lần đăng nhập cuối, huy hiệu và lịch sử chơi gần đây.

**Thao tác quản trị:**

- Khóa/mở khóa tài khoản, bắt buộc nhập lý do; trạng thái được đồng bộ sang Firebase Auth và Firestore.
- Khóa tài khoản đồng thời thu hồi refresh token; admin không thể tự khóa chính mình.
- Cộng/trừ XP có lý do, chặn giá trị bất thường, không cho XP âm và tính lại rank tự động.
- Reset streak về 0 khi dữ liệu chuỗi học bị sai.
- Thu hồi toàn bộ phiên đăng nhập của người dùng.
- Mọi mutation ghi audit log; các thao tác nhạy cảm chỉ dành cho `super_admin`.

**Tác dụng:** hỗ trợ vận hành người học, xử lý vi phạm, sửa dữ liệu game hóa và kiểm tra lịch sử học tập mà không cần thao tác thẳng trên Firebase Console.

## 6. Validation trước khi publish

| Entity | Điều kiện |
|---|---|
| Period | Có title, slug, ảnh; có summary hoặc description |
| Stage | Có title, slug, ảnh và overview |
| Event | Có title, slug, summary, ảnh và ít nhất một section nội dung |

Draft cho phép thiếu dữ liệu để nhóm có thể nhập dần.

## 7. Phân quyền

- Đọc: `super_admin`, `content_admin`, `viewer`.
- Mutation nội dung: `super_admin`, `content_admin`.
- Xóa vĩnh viễn: chỉ `super_admin`, bắt buộc xác nhận `DELETE`.
- API lấy token từ header `Authorization: Bearer <Firebase ID token>`.

## 8. Các chức năng còn TODO

Các route ngoài luồng Period/Stage/Event vẫn còn một phần là khung và cần làm tiếp:

- CRUD thật cho Nhân vật và Media Library.
- CRUD Quiz, câu hỏi và Timeline Puzzle.
- Forum moderation, reports, khóa thread và soft delete post.
- CRUD Badges, Ranks, XP Rules và Leaderboard thật.
- Import JSON, reorder kéo thả và duplicate period/stage/event.
- Sync all graph, retry queue và graph visualization.
- Relationship manager ghi source relation vào Firestore.
- AI provider server-side, Suggestions, Prompt Manager, Knowledge Base và Evaluations.
- Bộ lọc, phân trang và tìm kiếm server-side cho dữ liệu lớn.
- Middleware bảo vệ toàn bộ page route; hiện mutation API đã có role guard.

## 9. Cách chạy

```bash
cd "/home/tussy/Documents/Đồ Án/Code/Web-Admin-for-managing-History-App"
npm install
npm run typecheck
npm run dev
```

Mở `http://localhost:3000`.

Production check:

```bash
npm run build
npm run start
```

## 10. Kết quả kiểm thử

- `npm run typecheck`: đạt.
- `npm run build`: đạt.
- Next.js nhận đầy đủ route API và route UI mới.
- Chưa thực hiện mutation phá dữ liệu thật trong Firestore; cần đăng nhập bằng tài khoản có document `admin_users/{uid}` để kiểm thử CRUD trên dữ liệu thật.
