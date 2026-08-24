# Dữ liệu lịch sử đi từ Web Admin đến điện thoại như thế nào?

Tài liệu này giải thích theo cách thực tế nhất: quản trị viên sửa một nhân vật hoặc sự kiện, sau đó người dùng mở app sẽ nhận được nội dung mới bằng cách nào.

## 1. Ba nơi cần phân biệt

| Nơi | Hình dung đơn giản | Dùng để làm gì? |
| --- | --- | --- |
| **Cloud Firestore** | Kho dữ liệu gốc có thể sửa. | Web Admin thêm/sửa/xóa/xuất bản thời kỳ, sự kiện, nhân vật, quiz; app lưu người dùng, diễn đàn, điểm và lịch sử học. |
| **Firebase Hosting** | Một tủ phát tài liệu công khai, rất nhanh, có CDN. | Phát các file JSON lịch sử đã xuất bản cho rất nhiều điện thoại cùng lúc. |
| **AsyncStorage trong app** | Ngăn cache của từng điện thoại. | Lưu JSON đã tải để lần mở sau không phải tải lại nếu nội dung chưa đổi. |

Điểm quan trọng: **Hosting không thay Firestore**. Firestore vẫn là nơi dữ liệu gốc được quản trị. Hosting chỉ giữ một “bản photocopy chỉ đọc” của nội dung lịch sử đã xuất bản.

## 2. Firebase Hosting là gì trong hệ thống này?

Firebase Hosting cung cấp địa chỉ web công khai:

```text
https://historyapplication-de20b.web.app
```

Trong dự án này, Hosting đang phát thư mục `/content`, ví dụ:

```text
https://historyapplication-de20b.web.app/content/manifest.json
https://historyapplication-de20b.web.app/content/v-cb64568d3121aa1c/persons/chong-thuc-dan-phap/index.json
```

Khi 10.000 người cùng mở danh sách nhân vật, điện thoại của họ tải JSON từ Hosting/CDN thay vì 10.000 lần đọc cùng các document Firestore. Đây là lý do Hosting phù hợp cho **nội dung lịch sử ít thay đổi nhưng có thể có nhiều người xem**.

Hosting trong dự án hiện chỉ phát **JSON**. Nó chưa phải nơi chứa ảnh. Ảnh vẫn là đường dẫn trong dữ liệu, ví dụ Google Drive hoặc một website khác.

## 3. Ví dụ thực tế: sửa nhân vật Võ Nguyên Giáp

Giả sử quản trị viên muốn sửa phần giới thiệu hoặc ảnh của Võ Nguyên Giáp.

### Bước 1 — Sửa trong Web Admin

Web Admin ghi thay đổi vào Firestore:

```text
periods_person/xay-dung-va-bao-ve-dat-nuoc/persons/vo-nguyen-giap
```

Tại thời điểm này **Firestore đã mới**, nhưng app của người dùng vẫn có thể đang thấy bản JSON cũ trên Hosting. Đây là đúng thiết kế: sửa nháp không nên tự động phát ngay cho toàn bộ người dùng.

### Bước 2 — Xuất bản và tạo JSON mới

Khi nội dung đã sẵn sàng, chạy:

```bash
npm run content:publish
```

Script đọc các document `published` trong Firestore, rồi tạo một thư mục mới có mã phiên bản, ví dụ:

```text
public/content/v-cb64568d3121aa1c/
```

Trong thư mục đó sẽ có JSON danh sách nhân vật và JSON chi tiết của Võ Nguyên Giáp. Mỗi lần dữ liệu thay đổi, hash khác nhau và sẽ có thư mục phiên bản mới, ví dụ `v-abc123...`.

### Bước 3 — Đưa JSON lên Hosting

Chạy:

```bash
npm run content:deploy -- --project historyapplication-de20b
```

Lệnh này tải các file trong `public/content` lên Firebase Hosting. Từ lúc deploy xong, Hosting đã có bản JSON mới nhưng app cần biết phải đọc phiên bản nào. Công việc đó do **manifest** đảm nhiệm.

## 4. Manifest là gì?

Manifest là file chỉ dẫn nhỏ tại địa chỉ cố định:

```text
/content/manifest.json
```

Nó giống như “mục lục có số phiên bản” của toàn bộ kho nội dung. App không cần đoán file nào là mới; app chỉ đọc manifest trước.

Ví dụ rút gọn:

```json
{
  "contentVersion": "v-cb64568d3121aa1c",
  "files": {
    "persons/chong-thuc-dan-phap/index.json": {
      "url": "v-cb64568d3121aa1c/persons/chong-thuc-dan-phap/index.json",
      "sha256": "...",
      "size": 25301
    }
  }
}
```

Ý nghĩa từng phần:

- `contentVersion`: mã của cả đợt xuất bản. Khi giá trị này đổi, app biết kho nội dung đã có bản mới.
- `files`: danh sách file logic app cần dùng.
- `url`: địa chỉ file thật của phiên bản hiện tại trên Hosting.
- `sha256`: mã nhận diện nội dung từng file. Nếu hash đổi, app biết file đó phải tải lại.
- `size`: kích thước file để kiểm tra/quản lý, không phải dữ liệu lịch sử.

Nhờ cơ chế này, app có thể cache file của phiên bản cũ rất lâu mà không sợ nhầm: khi manifest trỏ sang `v-mới/...`, app sẽ tải file mới. File cũ vẫn có thể nằm trong cache nhưng không còn được dùng.

## 5. Một lần người dùng mở app diễn ra như thế nào?

Ví dụ người dùng mở màn **Nhân vật lịch sử**:

```text
1. App kiểm tra manifest trên Hosting.
2. Nếu contentVersion không đổi:
   → dùng danh sách nhân vật đã cache trên điện thoại.
3. Nếu contentVersion đổi:
   → đọc URL mới trong manifest,
   → tải JSON mới từ Hosting,
   → thay cache cũ trên điện thoại,
   → hiển thị dữ liệu mới.
```

App kiểm tra manifest tối đa khoảng 5 phút một lần trong một phiên. Vì vậy nội dung mới không nhất thiết xuất hiện đúng từng giây sau deploy, nhưng người dùng cũng không cần xóa app hay chờ hết cache 6–12 giờ. Khi phát triển, có thể dùng `npx expo start -c` và mở lại app để kiểm tra ngay.

Nếu Hosting tạm lỗi hoặc JSON không có dữ liệu, service có fallback sang Firestore. Fallback giúp app không trống hoàn toàn, nhưng không nên là đường chính vì sẽ làm tăng Firestore reads.

## 6. Web Admin và App đọc từ đâu?

| Chức năng | Nguồn đọc chính | Lý do |
| --- | --- | --- |
| Danh sách thời kỳ, giai đoạn, sự kiện, nhân vật, quiz, timeline game trong app | JSON trên Hosting → cache điện thoại | Nội dung đọc nhiều, ít đổi, cần tiết kiệm Firestore reads. |
| Tạo/sửa/xuất bản nội dung trong Web Admin | Firestore trực tiếp qua Firebase Admin SDK ở server | Admin cần thấy cả draft, thùng rác và dữ liệu mới nhất. |
| Dashboard Web Admin | `admin_stats/dashboard` trong Firestore | Là counter tổng hợp, tránh quét toàn bộ Firestore mỗi lần mở Dashboard. |
| Đăng nhập, profile, điểm, lịch sử chơi | Firestore/Auth | Riêng theo từng người dùng, phải cập nhật ngay. |
| Diễn đàn, bình luận, báo cáo | Firestore | Nội dung do người dùng tạo và có thay đổi gần thời gian thực. |
| Chatbot | API FastAPI + Neo4j/OpenAI; Firestore chỉ lưu phần cấu hình/lịch sử phù hợp | Không thuộc kho JSON lịch sử tĩnh. |

## 7. Ảnh và video hiện hoạt động thế nào?

JSON chỉ lưu **tham chiếu**, không nhúng file ảnh:

```json
{
  "coverMediaRef": "https://drive.google.com/file/d/.../view"
}
```

App đổi link Google Drive sang link ảnh trực tiếp rồi hiển thị qua `HistoryImage`. Nếu `coverMediaRef` trống và `images[]` cũng không có link ảnh, app hiển thị khung placeholder như ảnh chụp timeline.

Dashboard hiện kiểm tra **thiếu tham chiếu media**; nó không gửi request đến từng Google Drive/website ngoài để xác minh link còn sống. Làm kiểm tra HTTP cho mọi ảnh ngay mỗi lần mở Dashboard sẽ chậm và phụ thuộc server bên ngoài. Nếu cần, có thể chạy một audit riêng theo đợt để kiểm tra link hỏng.

Tại lần kiểm tra 2026-07-26, dữ liệu đang có:

- 92 nội dung thiếu tham chiếu ảnh: 15 giai đoạn, 30 sự kiện chính, 47 sự kiện nhân vật.
- 36 sự kiện chính chưa có video.
- Vì vậy Dashboard trước đó báo `Thiếu ảnh: 0` là sai; counter đã được sửa và cập nhật.

## 8. Quy trình nên dùng sau này

Sau một đợt nhập hoặc sửa dữ liệu lịch sử:

```bash
# 1. Kiểm tra số lượng, status và dữ liệu publish
npm run firebase:audit-publication

# 2. Tạo bộ JSON mới từ Firestore
npm run content:publish

# 3. Đưa JSON mới lên Firebase Hosting
npm run content:deploy -- --project historyapplication-de20b

# 4. Cập nhật counter cho Dashboard
npm run firebase:rebuild-read-models
```

Nếu chỉ sửa diễn đàn, profile hoặc báo cáo người dùng, không cần chạy `content:publish`/`content:deploy` vì các phần đó không nằm trong kho JSON lịch sử tĩnh.

## 9. Những collection hiện chưa có nội dung nguồn

Các collection kiểu cũ `articles`, `museums`, `events` và `timelines` hiện trống. Vì thế màn hình nào sử dụng trực tiếp chúng sẽ không có dữ liệu; đây không phải lỗi Firebase Rules. Nội dung lịch sử chính hiện nằm trong cấu trúc `periods → stages → events` và `periods_person → persons → events`.
