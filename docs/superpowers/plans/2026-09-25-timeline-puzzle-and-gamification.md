# Kế hoạch Triển khai: Ghép Niên Đại & Hệ Thống Gamification (Hướng A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện module trò chơi **Ghép niên đại (Timeline Puzzle)** với đầy đủ CRUD cho Kỷ nguyên & Sự kiện niên đại; hoàn thiện **Bảng xếp hạng (Leaderboard)** thời gian thực từ dữ liệu người dùng Firestore; và xây dựng hệ thống **Tra cứu Quy tắc Game hóa & Thống kê Huy hiệu** (Huy hiệu, Cấp bậc, Quy tắc XP).

**Architecture:** 
1. **Ghép niên đại:** Firestore `games/timelinepuzzle/eras/{eraId}`, hỗ trợ cả hai cặp field (`title`/`name`, `description`/`shortDesc`, `coverMediaRef`/`thumbnailUrl`) tương thích 100% với app mobile. Service `timelineAdminService.ts`, API routes chuẩn hóa, validation bằng Zod.
2. **Bảng xếp hạng:** Truy vấn trực tiếp từ `users` collection sắp xếp theo `totalXP desc`, lọc theo rank, hiển thị bục vinh danh Top 3 và bảng chi tiết.
3. **Tra cứu & Thống kê Game hóa:** Danh mục 9 huy hiệu chuẩn và 6 rank chuẩn từ mobile app, kết nối đếm thời gian thực số lượng người dùng mở khóa từ Firestore.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Firebase Admin SDK, Zod.

## Global Constraints
- Toàn bộ code thực hiện trên nhánh `feature/game-management`, không push trực tiếp lên `main`.
- Đảm bảo tất cả Firestore Timestamp đều được chuyển đổi thành chuỗi ISO (`toIsoDate`) trước khi truyền sang Client Components.
- Mọi thao tác thêm/sửa/xóa trên Timeline Puzzle đều phải ghi Audit Log qua `writeAuditLog`.
- Luôn kiểm tra `npm run typecheck` và `npm run lint` đạt 0 lỗi.

---

### Task 1: Zod Validation Schemas cho Timeline Eras & Events
**Files:**
- Create: `src/lib/validation/timelineSchemas.ts`
- Produces: `timelineEventSchema`, `timelineEraSchema`, `timelineEraUpdateSchema`, `timelineEventsBatchSchema`

- [ ] **Step 1: Cài đặt `timelineSchemas.ts`**
Định nghĩa schema cho Sự kiện dòng thời gian (`order`, `year`, `name`, `desc`, `zone`) và Kỷ nguyên (`eraId`, `title`, `description`, `coverMediaRef`, `sortOrder`, `status`, `events`).

- [ ] **Step 2: Typecheck và commit**
`npm run typecheck`

---

### Task 2: Backend Timeline Admin Service
**Files:**
- Create: `src/services/timelineAdminService.ts`
- Produces: `timelineAdminService` (listEras, getEra, createEra, updateEra, deleteEra, addEvent, updateEvent, deleteEvent, batchImportEvents)

- [ ] **Step 1: Cài đặt `timelineAdminService.ts`**
Tương tác với `games/timelinepuzzle/eras`, xử lý đồng bộ mảng `events`, tự động lưu cả các cặp field tương thích mobile (`title`+`name`, `description`+`shortDesc`, `coverMediaRef`+`thumbnailUrl`), chuyển đổi timestamp thành ISO string, ghi Audit Log và xóa mềm qua `trashAdminService`.

- [ ] **Step 2: Typecheck và commit**
`npm run typecheck`

---

### Task 3: API Routes cho Timeline Puzzle
**Files:**
- Create: `src/app/api/admin/games/timeline-puzzle/route.ts` (GET, POST)
- Create: `src/app/api/admin/games/timeline-puzzle/[eraId]/route.ts` (GET, PATCH, DELETE)
- Create: `src/app/api/admin/games/timeline-puzzle/[eraId]/events/route.ts` (POST - add or batch import)
- Create: `src/app/api/admin/games/timeline-puzzle/[eraId]/events/[eventIndex]/route.ts` (PATCH, DELETE)

- [ ] **Step 1: Cài đặt các API routes cho Timeline Puzzle**
- [ ] **Step 2: Typecheck và commit**

---

### Task 4: UI Form Kỷ nguyên & Trang Tạo/Sửa Era
**Files:**
- Create: `src/components/admin/TimelineEraForm.tsx`
- Create: `src/app/games/timeline-puzzle/new/page.tsx`
- Create: `src/app/games/timeline-puzzle/[eraId]/edit/page.tsx`

- [ ] **Step 1: Cài đặt `TimelineEraForm.tsx`**
- [ ] **Step 2: Cài đặt các trang `new` và `[eraId]/edit`**
- [ ] **Step 3: Typecheck và commit**

---

### Task 5: Trang Danh sách Kỷ nguyên Ghép Niên Đại
**Files:**
- Create: `src/components/admin/TimelineEraTableClient.tsx`
- Modify: `src/app/games/timeline-puzzle/page.tsx`

- [ ] **Step 1: Cài đặt `TimelineEraTableClient.tsx`**
Hiển thị DataTable danh sách Kỷ nguyên: Ảnh thumbnail, Tên kỷ nguyên, Mô tả, Số sự kiện mốc thời gian, Thứ tự, Thao tác (Chi tiết, Sửa, Xóa).
- [ ] **Step 2: Cập nhật `src/app/games/timeline-puzzle/page.tsx`**
- [ ] **Step 3: Typecheck và commit**

---

### Task 6: Trang Chi tiết Kỷ nguyên & Quản lý Sự kiện Dòng thời gian
**Files:**
- Create: `src/components/admin/TimelineEventModal.tsx`
- Create: `src/components/admin/TimelineBatchImportModal.tsx`
- Create: `src/components/admin/TimelineDetailClient.tsx`
- Create: `src/app/games/timeline-puzzle/[eraId]/page.tsx`

- [ ] **Step 1: Cài đặt `TimelineEventModal.tsx`** (Modal thêm/sửa sự kiện: Năm lịch sử, Tên sự kiện, Khu vực/Chiến trường zone, Mô tả ngắn, Thứ tự)
- [ ] **Step 2: Cài đặt `TimelineBatchImportModal.tsx`** (Import JSON các mốc sự kiện)
- [ ] **Step 3: Cài đặt `TimelineDetailClient.tsx` và `[eraId]/page.tsx`** (Hiển thị timeline dòng thời gian với các mốc năm theo thứ tự trực quan)
- [ ] **Step 4: Typecheck và commit**

---

### Task 7: Bảng Xếp Hạng (Leaderboard) Thời Gian Thực
**Files:**
- Create: `src/components/admin/LeaderboardTableClient.tsx`
- Modify: `src/app/gamification/leaderboard/page.tsx`

- [ ] **Step 1: Cài đặt `LeaderboardTableClient.tsx`**
Top 3 vinh danh (Huy chương Vàng, Bạc, Đồng), bảng xếp hạng toàn bộ người học lọc theo Rank, tìm kiếm, hiển thị XP, Streak, tổng số lượt chơi và link tới hồ sơ user.
- [ ] **Step 2: Cập nhật `src/app/gamification/leaderboard/page.tsx`**
- [ ] **Step 3: Typecheck và commit**

---

### Task 8: Tra cứu Quy tắc Game hóa & Thống kê Huy hiệu
**Files:**
- Modify: `src/app/gamification/badges/page.tsx`
- Modify: `src/app/gamification/ranks/page.tsx`
- Modify: `src/app/gamification/xp-rules/page.tsx`

- [ ] **Step 1: Cài đặt `badges/page.tsx`** (Bảng 9 huy hiệu chuẩn, thống kê số user và tỷ lệ mở khóa từ Firestore)
- [ ] **Step 2: Cài đặt `ranks/page.tsx`** (Bảng 6 rank chuẩn, ngưỡng XP, thống kê phân bổ người học theo từng rank)
- [ ] **Step 3: Cài đặt `xp-rules/page.tsx`** (Bảng quy tắc tính điểm và máy tính mô phỏng tính XP tương tác)
- [ ] **Step 4: Typecheck, Lint và commit toàn bộ**
