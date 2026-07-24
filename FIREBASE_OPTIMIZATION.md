# Vận hành Firebase tối ưu

## Cập nhật nội dung tĩnh

Firestore vẫn là nơi biên tập gốc. Sau khi admin thay đổi period, stage, event,
person, article, museum, explore hoặc game:

```bash
npm run content:publish
npm run content:deploy -- --project historyapplication-de20b
```

Lệnh thứ nhất xuất JSON bất biến và cập nhật `public/content/manifest.json`
theo cơ chế atomic. Lệnh thứ hai đẩy file lên Firebase Hosting CDN. App kiểm tra
manifest tối đa mỗi 6 giờ, dùng cache trên máy nếu version không đổi và chỉ tải
lại file có SHA-256 thay đổi. Firestore là fallback khi CDN chưa được cấu hình.

## Read-model counter/analytics

```bash
npm run firebase:rebuild-read-models
```

Chạy sau migration hoặc khi cần đối soát lại counter. Web Admin đọc
`admin_stats/*` và `analytics_daily/*` thay vì quét toàn bộ collection.

## Custom Claims

```bash
npm run admin:sync-claims
```

Lệnh đồng bộ `admin_users/{uid}.roles` sang Firebase Auth Custom Claims. Sau khi
thay quyền, admin phải đăng xuất/đăng nhập lại hoặc refresh ID token.

## Composite indexes

```bash
npm run firebase:deploy-indexes -- --project historyapplication-de20b
```

Tài khoản chạy lệnh cần `roles/datastore.indexAdmin`. Chờ tất cả index chuyển
sang trạng thái `Enabled` trước khi dùng bộ lọc users/reports.

## App Check

Web Admin đã khởi tạo App Check khi có
`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`. Tạo reCAPTCHA Enterprise site key, khai báo
domain localhost/staging/production và đặt biến này trên từng môi trường.

Mobile hiện dùng Firebase JS SDK trong Expo Go. Expo Go không chứa native module cho
Play Integrity/App Attest, vì vậy **không bật enforcement Firestore ngay lúc này**.
Trước khi bật enforcement:

1. Đặt `ios.bundleIdentifier` và `android.package` cố định trong `app.json`.
2. Đăng ký hai app native trong Firebase, tải `GoogleService-Info.plist` và
   `google-services.json`.
3. Chuyển sang Expo development build/EAS build và tích hợp React Native Firebase
   App Check (App Attest/DeviceCheck trên iOS, Play Integrity trên Android).
4. Dùng debug token cho simulator/development build, kiểm tra request hợp lệ trong
   App Check metrics, sau đó mới bật enforcement cho Firestore.

Firebase Admin SDK phía server không bị App Check enforcement; các route Admin được
bảo vệ riêng bằng Custom Claims và cookie HttpOnly có chữ ký.
