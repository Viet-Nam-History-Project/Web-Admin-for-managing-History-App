# Báo cáo quản trị và phát triển AI cho Lịch Sử Việt Nam

## 1. Mục tiêu và kiến trúc

Hệ thống dùng RAG thay vì fine-tune để nạp kiến thức. Firestore tiếp tục lưu nội dung ngắn gọn cho giao diện app; PDF là nguồn chuyên sâu; Neo4j lưu chỉ mục trang, chunk, embedding, thực thể và quan hệ. FastAPI truy xuất nguồn trước khi gọi model sinh câu trả lời.

| Tầng | Vai trò |
| --- | --- |
| Firebase Authentication | Xác thực người dùng mobile và admin |
| Firestore | Metadata PDF, phiên bản prompt, lịch sử kiểm thử và audit |
| Kho file local/Firebase Storage | Lưu file PDF gốc, tách khỏi collection nội dung app |
| Neo4j `KnowledgeSource` | Metadata nguồn PDF đã index |
| Neo4j `KnowledgePage` | Chỉ mục từng trang: số trang, preview, hash, số chunk |
| Neo4j `AIChunk` | Đoạn tri thức, embedding, thứ tự và trang trích dẫn |
| Neo4j `Entity` và relationships | Mạng thực thể/quan hệ lịch sử |
| Neo4j `AIQueryLog` | Chất lượng truy xuất, latency, lý do từ chối và người hỏi |
| Neo4j `AIConfig` | Prompt production hiện hành |
| OpenAI Embeddings | Vector hóa chunk và câu hỏi |
| OpenAI Chat Model | Rerank ứng viên và viết câu trả lời có căn cứ |

Luồng truy xuất production:

1. Chuẩn hóa câu hỏi, nhận diện ý định, domain, facet và phạm vi thời gian.
2. Lấy tập ứng viên bằng vector search và full-text search.
3. Gộp hai danh sách bằng Reciprocal Rank Fusion.
4. Model rerank nhóm ứng viên theo đúng câu hỏi.
5. Lọc ngưỡng liên quan, sau đó mới sinh câu trả lời Markdown.
6. Trả về toàn bộ nguồn/trang đã dùng và ghi `AIQueryLog`.

Với câu hỏi so sánh, backend dùng Comparison Planner ba tầng:

1. Xác định người dùng cần giống/khác, khác biệt chính, nguyên nhân, kết quả,
   hiệu quả, vai trò, tính tiếp nối hay nhận định.
2. Phân loại đối tượng như chính sách kinh tế, chiến lược quân sự, chiến dịch,
   hiệp định, nhân vật hoặc phong trào.
3. Ưu tiên tiêu chí người dùng nêu rõ, sau đó chỉ chọn 1–7 facet phù hợp.
4. Truy xuất riêng từng `đối tượng × facet` và tạo ma trận bằng chứng.
5. Chọn bố cục trả lời theo intent; không mặc định tạo bảng dài.

Thiết kế và luồng chi tiết nằm trong
`History-Chatbot/BAO_CAO_COMPARISON_PLANNER_V22.md`.

## 2. Chức năng AI trên web-admin

### 2.1. Tổng quan AI - `/ai/overview`

- Kiểm tra FastAPI, Neo4j, model chat và embedding.
- Xem số nguồn, trang và chunk đã index.
- Theo dõi PDF đang chờ, đang xử lý, sẵn sàng hoặc lỗi.
- Mở nhanh kho PDF, kiểm thử và gợi ý cải tiến.

### 2.2. Kho tri thức PDF - `/ai/knowledge-base`

- Upload PDF cùng tác giả, nhà xuất bản, năm, loại nguồn, độ tin cậy và thời kỳ.
- Chặn file trùng theo SHA-256; muốn nạp lại phải gỡ nguồn cũ.
- Tách Upload và Index để admin kiểm tra metadata trước khi tốn chi phí embedding.
- Xem số trang, trang có text, số chunk và lỗi trích xuất.
- Nút **Kiểm tra** mở bản đồ trang, lọc theo trang/từ khóa và đọc từng chunk.
- **Index lại** tạo cấu trúc `KnowledgePage` và embedding theo pipeline mới.

PDF đã index bằng phiên bản cũ vẫn có thể trả lời, nhưng số trang trong dashboard có thể là 0. Hãy bấm **Index lại** một lần để có trang, chunk mới và full-text index.

### 2.3. Prompts - `/ai/prompts`

- Soạn system prompt có tên và ghi chú phiên bản.
- Lưu bản nháp trong `ai_prompt_versions`.
- Nhân bản prompt cũ để thử nghiệm an toàn.
- Kích hoạt một phiên bản lên `AIConfig` của backend; phiên bản production trước đó được lưu lại.

Không nên sửa prompt production trực tiếp. Hãy clone, chạy bộ test chuẩn, sau đó mới kích hoạt.

### 2.4. Kiểm thử AI - `/ai/evaluations`

- Hỏi bằng ngôn ngữ tự nhiên; hệ thống tự hiểu yêu cầu ngắn gọn, chi tiết, so sánh hoặc kể chuyện.
- Hiển thị câu trả lời bằng renderer Markdown GFM dùng cùng cách trình bày với
  App: tiêu đề phân cấp, danh sách, chữ đậm và bảng có header, đường viền,
  khoảng cách rõ ràng. Bảng rộng cuộn ngang trong khung thay vì biến thành
  chuỗi ký tự `| ... |`.
- Câu trả lời được đặt trong khung đọc riêng; nguồn/trang và chỉ số retrieval
  nằm ở khu vực quản trị bên dưới, không trộn vào nội dung người học nhìn thấy.
- Xem candidate count, số chunk sau ngưỡng/rerank, điểm cao nhất và latency.
- Với câu so sánh, xem comparison intent, domain, explicit facets, bố cục và
  ma trận bằng chứng của từng đối tượng × facet.
- `AIQueryLog` lưu thêm intent/domain, hai đối tượng, tiêu chí tường minh,
  facet cân bằng, ô ma trận còn thiếu và yêu cầu bố cục. Nhờ đó có thể xác định
  lỗi nằm ở planning, retrieval hay bước sinh câu trả lời.
- Lưu lịch sử và chấm `Đạt`, `Một phần`, `Không đạt` kèm ghi chú.

### 2.5. Gợi ý cải tiến - `/ai/suggestions`

- Tổng hợp câu bị từ chối, điểm thấp hoặc phản hồi chậm từ `AIQueryLog`.
- Chỉ ra câu hỏi lặp lại để admin biết nên bổ sung PDF, sửa metadata hay tinh chỉnh prompt.
- Liên kết nhanh sang Kho PDF và Kiểm thử AI.

### 2.6. Graph PDF và Relationships

- **Graph PDF**: xem thống kê node/relationship, tìm node theo tên, đọc properties và quan hệ lân cận.
- **Index PDF** là luồng duy nhất được phép ghi knowledge graph; web-admin không còn đồng bộ Period/Stage/Event trực tiếp.
- **Relationships**: kiểm tra thực thể trích từ PDF đang liên kết với ai, loại quan hệ, bằng chứng và properties.

## 3. Cách vận hành chuẩn

1. Chạy FastAPI, vào **Tổng quan AI**, xác nhận `ready` và Neo4j `connected`.
2. Upload PDF có nguồn rõ ràng, metadata đúng và gắn thời kỳ phù hợp.
3. Bấm **Index**, sau đó mở **Kiểm tra** để đọc ngẫu nhiên 5-10 trang/chunk.
4. Vào **Kiểm thử AI**, chạy câu hỏi trực tiếp, tổng hợp nhiều trang, so sánh, kể chuyện và ngoài phạm vi.
5. Kiểm tra từng nhận định có khớp trang trích dẫn; ghi verdict và nhận xét.
6. Chỉ kích hoạt prompt mới khi bộ test chuẩn không giảm chất lượng.
7. Hàng tuần xem **Gợi ý cải tiến** để xử lý khoảng trống tri thức.

## 4. Theo dõi trực tiếp trên Neo4j

```cypher
// Nguồn -> trang -> chunk
MATCH (s:KnowledgeSource)-[:HAS_PAGE]->(p:KnowledgePage)-[:HAS_CHUNK]->(c:AIChunk)
RETURN s.title, p.pageNumber, count(c) AS chunks
ORDER BY s.title, p.pageNumber;
```

```cypher
// Xem text chunk của một trang
MATCH (s:KnowledgeSource {id: $sourceId})-[:HAS_PAGE]->(p:KnowledgePage)-[:HAS_CHUNK]->(c:AIChunk)
WHERE p.pageNumber = $pageNumber
RETURN c.sequence, c.text, c.pageStart, c.pageEnd
ORDER BY c.sequence;
```

```cypher
// Câu hỏi bị từ chối hoặc retrieval yếu
MATCH (q:AIQueryLog)
WHERE q.refused = true OR q.topScore < 0.45
RETURN q.question, q.topScore, q.latencyMs, q.createdAt
ORDER BY q.createdAt DESC LIMIT 50;
```

```cypher
// Phân bố node và relationship
CALL db.labels() YIELD label
CALL { WITH label MATCH (n) WHERE label IN labels(n) RETURN count(n) AS total }
RETURN label, total ORDER BY total DESC;
```

`KnowledgePage` không lưu thêm một bản PDF. Nó chỉ là node chỉ mục nhỏ, giúp lọc theo trang và quan sát dữ liệu. Phần tốn dung lượng chính vẫn là text/embedding trong `AIChunk`.

## 5. Chỉ số đánh giá

- **Retrieval hit rate**: nguồn đúng có nằm trong kết quả truy xuất.
- **Citation correctness**: trang được dẫn có thực sự chứa nhận định.
- **Faithfulness**: câu trả lời không thêm chi tiết ngoài nguồn.
- **Completeness**: bao phủ đủ các ý cần thiết.
- **Comparison cell coverage**: tỷ lệ ô `đối tượng × facet` có bằng chứng.
- **Intent adherence**: câu trả lời đúng kiểu so sánh, không tự mở rộng phạm vi.
- **Refusal accuracy**: từ chối đúng khi kho không đủ căn cứ.
- **P95 latency**: 95% câu hỏi hoàn thành dưới ngưỡng mục tiêu.
- **Regression pass rate**: tỷ lệ test chuẩn còn đạt sau khi đổi prompt/model/chunking.

## 6. Cấu hình và cách chạy

```bash
cd "/home/tussy/Documents/Đồ Án/Code/History-Chatbot"
source .venv/bin/activate
cd SourceCode
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

- Health và revision: `http://127.0.0.1:8000/health/revision`
- Swagger: `http://127.0.0.1:8000/docs`

```bash
cd "/home/tussy/Documents/Đồ Án/Code/Web-Admin-for-managing-History-App"
npm run dev
```

```bash
cd "/home/tussy/Documents/Đồ Án/Code/VietNamHistoryApplicationReact"
npx expo start --android
```

Android Emulator dùng `EXPO_PUBLIC_AI_API_URL=http://10.0.2.2:8000`; iOS Simulator dùng `http://localhost:8000`; điện thoại thật dùng IP LAN của máy chạy FastAPI.

## 7. Phiên đăng nhập Web Admin

Web Admin dùng hai lớp phiên phối hợp:

1. Firebase Auth dùng `browserLocalPersistence`, lưu trạng thái đăng nhập trên
   chính trình duyệt.
2. Server phát cookie HttpOnly có chữ ký, thời hạn 30 ngày để middleware xác
   thực trước khi bất kỳ trang/API quản trị nào đọc Firestore.
3. Khi cookie còn hạn, đóng trình duyệt, tắt máy hoặc khởi động lại Web Admin
   không yêu cầu đăng nhập.
4. Khi cookie hết hạn nhưng Firebase local session vẫn tồn tại, trang Login tự
   lấy ID token mới, kiểm tra lại Custom Claims và cấp cookie mới; quản trị viên
   không cần nhập lại mật khẩu.
5. Nút **Đăng xuất** xóa cookie server, Firebase local session và ID token cục
   bộ. Sau hành động này người dùng phải đăng nhập lại.

Endpoint `GET /api/auth/session` chỉ trả trạng thái và thông tin actor tối thiểu,
không trả cookie hoặc Firebase token. API quản trị có thể dùng Firebase Bearer
token; nếu Firebase client đang tạm thời chưa sẵn sàng thì cookie server vẫn là
phương án xác thực dự phòng.

Riêng luồng **Kiểm thử AI**, trình duyệt gọi API Web Admin bằng Bearer token
hoặc cookie. Route Web Admin chạy `requireAdmin()` trước, sau đó mới gọi
`/v1/admin/retrieval/debug` của FastAPI bằng `AI_ADMIN_API_KEY` chỉ tồn tại ở
server. Không chuyển header Firebase rỗng sang `/v1/chat`; vì vậy phiên cookie
bền vững vẫn chạy được đánh giá AI mà không báo “Thiếu Firebase ID token”.

## 8. Dynamic Evolution Planner F9 v24

Nhóm câu hỏi về tiếp nối và thay đổi có planner riêng:

1. Nhận diện subtype như phát triển theo thời gian, tiếp nối–thay đổi, bước
   ngoặt, mức độ, nguyên nhân, trước–sau, đảo chiều hoặc phân kỳ.
2. Nhận diện domain để chỉ chọn facet phù hợp với chính trị, kinh tế, quân sự,
   phong trào hoặc nhà nước; taxonomy không được dùng như checklist.
3. Truy xuất ứng viên bước ngoặt theo subject, domain và khoảng hỏi; không lưu
   sẵn một bộ giai đoạn cho 1897–1945, 1965–1976 hoặc câu hỏi cụ thể nào.
4. Từ evidence ID trong Graph/chunks, tạo 2–7 giai đoạn động rồi mở rộng
   retrieval theo từng chặng. Ranh giới PDF không phải ranh giới lịch sử.
5. Kiểm tra vòng đời subject; nếu khoảng hỏi vượt quá vòng đời, giải thích
   quá trình kế tiếp thay vì kéo dài subject để lấp khoảng.
6. Trả period label, nguyên nhân bước ngoặt, vòng đời và range mismatch cho
   Web Admin; app người dùng chỉ nhận câu trả lời, không nhận giao diện
   nguồn/số trang.

Trang **Kết quả & bằng chứng** hiển thị dạng F9, miền tiến trình, period plan
động, nguyên nhân bước ngoặt, vòng đời subject và độ phủ facet. Prompt runtime
luôn ghép chỉ dẫn bắt buộc `DYNAMIC_EVOLUTION_PLANNING_F9_V24`, nên màn hình
Phiên bản prompt phản ánh đúng logic đang chạy trong `rag_service.py`.

Khi lưu lịch sử đánh giá vào Firestore, `evolution_periods` được chuyển từ
array lồng nhau sang mảng map `{start, end}` vì Firestore không hỗ trợ array
chứa trực tiếp array. API chuyển ngược về `number[][]` khi đọc để giao diện và
response FastAPI không phải thay đổi hợp đồng dữ liệu.

Thiết kế, dữ liệu kiểm tra và bộ regression test được mô tả tại
`History-Chatbot/BAO_CAO_DYNAMIC_EVOLUTION_PLANNER_F9_V24.md`.

## 9. Giới hạn và hướng phát triển

- PDF scan chỉ có ảnh cần OCR trước hoặc bổ sung worker OCR.
- Index file rất lớn hiện chạy trong request; production nên dùng queue/worker.
- Reranker hiện dùng chat model; khi kho rất lớn có thể dùng reranker chuyên dụng.
- Cần xây bộ 50-100 câu hỏi chuẩn và chạy regression tự động trước mỗi lần kích hoạt prompt/model.
- Không fine-tune để ghi nhớ PDF; chỉ cân nhắc fine-tune khi cần cố định văn phong/format sau khi RAG đã ổn định.
