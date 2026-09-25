# Thiết kế Hệ thống Quản lý Quiz Lịch Sử (Quiz Game Management)

**Ngày:** 25/09/2026  
**Nhánh Git:** `feature/game-management`  
**Repository:** `Web-Admin-for-managing-History-App`  
**Tương thích:** Firestore schema hiện hữu & `VietNamHistoryNativeReactApp`

---

## 1. Mục tiêu và Phạm vi

Xây dựng module quản trị trò chơi **Quiz Lịch Sử** trên Web Admin, cung cấp đầy đủ chức năng Thêm - Sửa - Xóa (CRUD) cho cả bộ câu hỏi (Quiz) và danh sách câu hỏi trắc nghiệm chi tiết (Questions), đồng bộ hoàn toàn với dữ liệu thực tế trên Firebase Firestore của app người dùng di động.

### Phạm vi chức năng:
1. **Quản lý bộ Quiz (`quizzes`):**
   - Xem danh sách bộ câu hỏi kèm các thông số: Cấp độ, số câu hỏi, thời gian giới hạn, sự kiện lịch sử liên kết, trạng thái xuất bản.
   - Thêm mới bộ Quiz và chỉnh sửa thông tin.
   - Chọn liên kết Sự kiện lịch sử phân tầng (*Thời kỳ* $\rightarrow$ *Giai đoạn* $\rightarrow$ *Sự kiện*).
   - Xóa mềm (đưa vào Thùng rác `admin_trash`) và hỗ trợ khôi phục.
2. **Quản lý câu hỏi chi tiết (`questions`):**
   - Xem danh sách câu hỏi trong từng Quiz theo thứ tự `orderQuestion`.
   - Thêm mới và chỉnh sửa câu hỏi qua Dialog / Modal với giao diện chọn đáp án đúng (0-3) trực quan.
   - Xóa câu hỏi khỏi Quiz.
   - Tự động đồng bộ `questionCount` của Quiz cha khi có sự thay đổi về số lượng câu hỏi.
   - Hỗ trợ công cụ **Import / Export JSON** bộ câu hỏi hàng loạt.

---

## 2. Kiến trúc Dữ liệu Firestore

### 2.1. Đường dẫn lưu trữ (Firestore Paths)
- Document trò chơi cha: `games/quiz-lich-su-viet-nam`
- Subcollection Quiz: `games/quiz-lich-su-viet-nam/quizzes/{quizSlug}`
- Subcollection Câu hỏi: `games/quiz-lich-su-viet-nam/quizzes/{quizSlug}/questions/{questionId}`

### 2.2. Schema Quiz Document (`.../quizzes/{quizSlug}`)
```typescript
interface QuizDocument {
  quizzslug: string;          // e.g. "xuan-loc-1975-1"
  description: string;        // Tiêu đề hoặc mô tả bộ câu hỏi
  level: string;              // "Dễ" | "Trung bình" | "Khó" (hoặc "Bộ 1", "Bộ 2")
  questionCount: number;      // Số lượng câu hỏi hiện tại
  settings: {
    timeLimit: number;        // Giới hạn thời gian làm bài (giây, mặc định 60)
    maxPlayers: number;       // Số người chơi tối đa (mặc định 1)
  };
  eventID?: {
    periodID: string;         // Slug thời kỳ lịch sử
    stageID: string;          // Slug giai đoạn
    eventid: string;          // Slug sự kiện
    title: string;            // Tiêu đề sự kiện
  };
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
  updated_at: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2.3. Schema Question Document (`.../questions/{questionId}`)
```typescript
interface QuestionDocument {
  orderQuestion: number;      // Thứ tự câu hỏi (1, 2, 3...)
  question: string;           // Nội dung câu hỏi
  options: string[];          // Mảng chính xác 4 lựa chọn [A, B, C, D]
  correctAnswer: number;      // Vị trí đáp án đúng: 0, 1, 2 hoặc 3
  explanation?: string;       // Lời giải thích lịch sử
  imageUrl?: string | null;   // Đường dẫn ảnh tư liệu minh họa (tùy chọn)
  updated_at: Timestamp;
}
```

---

## 3. Zod Schemas & Validation (`src/lib/validation/quizSchemas.ts`)

- `quizSchema`: Validate tạo mới bộ Quiz (kiểm tra `quizzslug`, `description`, `level`, `settings.timeLimit`, `eventID`).
- `quizUpdateSchema`: Validate cập nhật bộ Quiz.
- `questionSchema`: Validate câu hỏi (kiểm tra `question` không rỗng, `options` có ít nhất 2 đến 4 phần tử, `correctAnswer` là số nguyên trong khoảng index của `options`).
- `questionBatchImportSchema`: Validate mảng câu hỏi khi import JSON.

---

## 4. Backend Service Layer (`src/services/quizAdminService.ts`)

Triển khai các phương thức quản trị:
- `listQuizzes(includeDeleted?: boolean)`: Liệt kê danh sách quizzes, tính toán lại `questionCount` thực tế từ subcollection.
- `getQuiz(quizSlug: string)`: Lấy thông tin chi tiết một Quiz.
- `createQuiz(actor: AdminActor, payload: QuizPayload)`: Tạo quiz mới với slug duy nhất, ghi `writeAuditLog`.
- `updateQuiz(actor: AdminActor, quizSlug: string, payload: QuizUpdatePayload)`: Cập nhật thông tin, ghi `writeAuditLog`.
- `deleteQuiz(actor: AdminActor, quizSlug: string)`: Đánh dấu `status = 'deleted'`, đẩy snapshot vào `trashAdminService` với `entityType: 'quiz'`, ghi `writeAuditLog`.
- `listQuestions(quizSlug: string)`: Lấy toàn bộ câu hỏi sắp xếp theo `orderQuestion ASC`.
- `getQuestion(quizSlug: string, questionId: string)`: Lấy một câu hỏi theo ID.
- `createQuestion(actor: AdminActor, quizSlug: string, payload: QuestionPayload)`: Tạo câu hỏi mới, tự động tăng `questionCount` của Quiz, ghi `writeAuditLog`.
- `updateQuestion(actor: AdminActor, quizSlug: string, questionId: string, payload: QuestionUpdatePayload)`: Cập nhật câu hỏi, ghi `writeAuditLog`.
- `deleteQuestion(actor: AdminActor, quizSlug: string, questionId: string)`: Xóa câu hỏi, giảm `questionCount` của Quiz, ghi `writeAuditLog`.
- `batchImportQuestions(actor: AdminActor, quizSlug: string, questions: QuestionPayload[])`: Ghi hàng loạt bằng Batch write của Firestore, cập nhật `questionCount`.

---

## 5. REST API Endpoints

| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `GET` | `/api/admin/games/quizzes` | viewer, content_admin, super_admin | Lấy danh sách quizzes |
| `POST` | `/api/admin/games/quizzes` | content_admin, super_admin | Tạo mới bộ quiz |
| `GET` | `/api/admin/games/quizzes/[quizSlug]` | viewer, content_admin, super_admin | Xem chi tiết quiz |
| `PATCH` | `/api/admin/games/quizzes/[quizSlug]` | content_admin, super_admin | Sửa quiz hoặc đổi trạng thái |
| `DELETE` | `/api/admin/games/quizzes/[quizSlug]` | content_admin, super_admin | Xóa mềm quiz vào thùng rác |
| `GET` | `/api/admin/games/quizzes/[quizSlug]/questions` | viewer, content_admin, super_admin | Lấy danh sách câu hỏi |
| `POST` | `/api/admin/games/quizzes/[quizSlug]/questions` | content_admin, super_admin | Thêm câu hỏi hoặc batch import |
| `GET` | `/api/admin/games/quizzes/[quizSlug]/questions/[questionId]` | viewer, content_admin, super_admin | Lấy chi tiết câu hỏi |
| `PATCH` | `/api/admin/games/quizzes/[quizSlug]/questions/[questionId]` | content_admin, super_admin | Cập nhật câu hỏi |
| `DELETE` | `/api/admin/games/quizzes/[quizSlug]/questions/[questionId]` | content_admin, super_admin | Xóa câu hỏi |

---

## 6. Giao diện Người dùng (UI/UX)

1. **Trang Danh sách Quiz (`/games/quizzes`):**
   - Tích hợp `AdminShell`, `PageHeader`, `DataTable`, `Badge`, `EmptyState`.
   - Tìm kiếm theo từ khóa mô tả/slug, lọc theo độ khó.
   - Nút hành động nhanh: Mở chi tiết, Chỉnh sửa, Xuất bản / Gỡ xuất bản, Xóa mềm.
2. **Trang Tạo mới / Chỉnh sửa Quiz (`/games/quizzes/new` & `[quizSlug]/edit`):**
   - Biểu mẫu nhập liệu chuẩn `Card`, `Field`, `Input`.
   - Bộ chọn sự kiện lịch sử đính kèm: Fetch danh sách sự kiện từ `periodAdminService` / `eventAdminService`, cho phép người dùng chọn nhanh sự kiện để liên kết `eventID`.
3. **Trang Chi tiết Quiz & Quản lý Câu hỏi (`/games/quizzes/[quizSlug]`):**
   - Card thông tin tổng quát Quiz (slug, sự kiện gắn kèm, level, thời gian, số câu hỏi).
   - Thanh công cụ câu hỏi: Nút `+ Thêm câu hỏi`, `Nhập JSON`, `Xuất JSON`.
   - Bảng danh sách câu hỏi: Hiển thị `orderQuestion`, câu hỏi, 4 đáp án (đáp án đúng có icon checkmark và highlight xanh lá), giải thích, link ảnh.
   - **QuestionEditorModal:** Hộp thoại form thêm/sửa câu hỏi, click chọn đáp án đúng 0-3 cực kỳ trực quan.
   - **BatchImportModal:** Hộp thoại import danh sách câu hỏi từ JSON text hoặc file `.json`.

---

## 7. Kế hoạch Kiểm thử & Xác nhận chất lượng
1. Kiểm tra build và TypeScript: `npm run typecheck` và `npm run lint`.
2. Kiểm tra API CRUD Quiz và Question với các kịch bản thành công và lỗi (slug trùng, dữ liệu không hợp lệ).
3. Kiểm tra tính năng đồng bộ `questionCount` khi thêm/xóa câu hỏi.
4. Kiểm tra tính năng Xóa mềm & Thùng rác `admin_trash`.
5. Kiểm tra khả năng tương thích của dữ liệu với app mobile `VietNamHistoryNativeReactApp`.
