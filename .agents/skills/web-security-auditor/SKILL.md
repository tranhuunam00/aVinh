---
name: web-security-auditor
description: >-
  Chuyên gia rà soát, kiểm thử và khắc phục toàn diện các lỗ hổng bảo mật cho ứng dụng Web Fullstack (Node.js/Express, SQLite, REST API, SPA) đạt chuẩn OWASP Top 10, bảo mật dữ liệu y tế (Nghị định 13/2023/NĐ-CP) và yêu cầu thẩm định an ninh mạng doanh nghiệp (Vin IT / Vingroup InfoSec).
domain: cybersecurity
subdomain: web-application-security
tags: [security-audit, owasp-top-10, nodejs-security, express-hardening, jwt-security, rate-limiting, secure-cookie, sqlite-security]
version: "1.0.0"
author: Antigravity
license: Apache-2.0
---

# Kỹ Năng Rà Soát & Khắc Phục Bảo Mật Web Doanh Nghiệp (Web Security Auditor)

## 📌 Khi Nào Kích Hoạt Kỹ Năng Này (When to Use)
Kích hoạt skill này khi:
1. Chuẩn bị đưa ứng dụng Web/API từ môi trường cục bộ (Localhost) lên Server nội bộ hoặc Mạng diện rộng (Internet/LAN).
2. Chuẩn bị bàn giao mã nguồn hoặc gửi hệ thống sang **Ban Công nghệ Thông tin / An ninh Mạng (InfoSec / IT Audit)** để thẩm định, nghiệm thu.
3. Cần rà soát và khắc phục các lỗ hổng theo tiêu chuẩn **OWASP Top 10**, bảo vệ dữ liệu nhạy cảm, chống tấn công dò mật khẩu (Brute-force), XSS, CSRF, Injection, và rò rỉ khóa bí mật (Secrets Leak).

---

## 🛠️ Yêu Cầu Tiên Quyết (Prerequisites)
- Ứng dụng chạy trên nền tảng **Node.js / Express** hoặc tương đương.
- Các thư viện bảo mật tiêu chuẩn cần tích hợp:
  - `helmet`: Thiết lập các HTTP Security Headers.
  - `express-rate-limit`: Chống tấn công Brute-force và DoS.
  - `dotenv`: Quản lý biến môi trường cách ly khỏi mã nguồn.
  - `bcryptjs` / `argon2`: Băm mật khẩu an toàn.
  - `jsonwebtoken`: Xác thực phân quyền Token-based.

---

## 📋 Quy Trình Rà Soát & Gia Cố Bảo Mật 6 Bước (Workflow)

```
  [1. Quản lý Bí mật] ➔ [2. Xác thực & JWT] ➔ [3. HTTP & Headers]
           │                       │                     │
           ▼                       ▼                     ▼
  [4. Chống Brute-force] ➔ [5. Phân quyền API] ➔ [6. Log & Error Handling]
```

### Bước 1: Loại Bỏ Hoàn Toàn Hardcoded Secrets & Cấu Hình `.env`
* **Nguyên tắc:** Tuyệt đối không lưu mật khẩu, secret key, chuỗi kết nối trực tiếp trong file code JavaScript.
* **Hành động:**
  1. Tạo file `.env` chứa:
     ```env
     NODE_ENV=production
     PORT=4001
     JWT_SECRET=c2VjdXJlX2tleV8yNTZiaXRfdmlubWVjX29jcDJfc2VjcmV0XzIwMjY=
     COOKIE_SECRET=dm1vY3AyX2Nvb2tpZV9zZWNyZXRfa2V5X0AyMDI2
     ```
  2. Tạo file `.env.example` làm mẫu cấu hình không chứa giá trị nhạy cảm.
  3. Kiểm tra file `.gitignore` đảm bảo đã chặn triệt để `.env`, `google-service-account.json`, `*.pem`, `*.key`, `data/*.sqlite`.

### Bước 2: Chuẩn Hóa Xác Thực (Authentication) & Token JWT
* **Thời hạn Token:** Đặt thời hạn JWT tối đa 8 - 12 tiếng (1 ca làm việc y tế), không để `30d`.
* **Cookie an toàn:** Thiết lập cờ bảo vệ cho Cookie chứa Token:
  ```javascript
  res.cookie('vinmec_token', token, {
      httpOnly: true, // Chống XSS đọc trộm token
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS khi lên production
      sameSite: 'lax', // Chống CSRF
      maxAge: 12 * 60 * 60 * 1000 // 12 tiếng
  });
  ```
* **Chính sách mật khẩu:** Bắt buộc độ dài tối thiểu 8 ký tự, khuyến khích đổi mật khẩu mặc định ngay lần đầu đăng nhập.

### Bước 3: Thiết Lập HTTP Security Headers với `helmet` & Giới Hạn CORS
* **Bật Helmet:**
  ```javascript
  const helmet = require('helmet');
  app.use(helmet({
      contentSecurityPolicy: false, // Điều chỉnh phù hợp nếu dùng inline scripts trong SPA
      crossOriginEmbedderPolicy: false
  }));
  ```
* **CORS Chặt Chẽ:** Không dùng `cors()` mở cho tất cả (`*`) trên môi trường Production. Giới hạn danh sách Origin được phép gọi API.

### Bước 4: Chống Tấn Công Dò Mật Khẩu (Brute-force & Rate Limiting)
* **Giới hạn lượt gọi API:**
  ```javascript
  const rateLimit = require('express-rate-limit');

  // Giới hạn chung cho toàn bộ API (100 request/phút)
  const apiLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      message: { error: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 1 phút.' }
  });
  app.use('/api/', apiLimiter);

  // Giới hạn nghiêm ngặt cho endpoint Đăng nhập (tối đa 5 lần sai trong 15 phút)
  const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút để thử lại.' }
  });
  app.use('/api/auth/login', loginLimiter);
  ```

### Bước 5: Kiểm Soát Phân Quyền (RBAC / IDOR Protection)
* Xác thực quyền truy cập tại từng tầng Controller/Route:
  * Người dùng chuyên khoa (`department`) **chỉ được xem và nộp báo cáo của đúng khoa/cơ sở** được phân công.
  * Chỉ `admin` mới có quyền xóa báo cáo, xem toàn viện hoặc quản lý tài khoản người dùng.
* Sử dụng Prepared Statements (`?` placeholder) trong SQLite để triệt tiêu hoàn toàn nguy cơ **SQL Injection**.

### Bước 6: Xóa Bỏ Dấu Vết Nhạy Cảm Trong Logs & Ẩn Error Stack Traces
* **Làm sạch Log:** Xóa toàn bộ lệnh `console.log` in mật khẩu dạng rõ (plaintext) khi khởi động Server.
* **Xử lý Lỗi 500:** Bắt lỗi và chỉ trả về thông báo lỗi tổng quát cho Client, không trả về chi tiết Stack Trace hay cấu trúc câu lệnh SQLite ra ngoài.

---

## 🔍 Danh Sách Kiểm Tra Nghiệm Thu (Audit Checklist)

- [ ] `JWT_SECRET` được load từ `.env`, không còn hardcode trong mã nguồn.
- [ ] Cookie đăng nhập đã bật cờ `httpOnly: true`.
- [ ] Thời hạn phiên JWT rút ngắn xuống ≤ 12 tiếng.
- [ ] Endpoint `/api/auth/login` đã được bảo vệ bằng Rate Limiting.
- [ ] Đã tích hợp `helmet` trên ứng dụng Express.
- [ ] Mật khẩu mặc định và thông tin nhạy cảm đã được xóa khỏi `console.log` và `README.md`.
- [ ] File `.gitignore` đã chặn toàn bộ file `.env`, file chứng chỉ, và file cơ sở dữ liệu.
- [ ] Toàn bộ 13 bài kiểm thử nghiệp vụ (`npm test`) tiếp tục PASS 100%.

---

## 🚀 Lệnh Kiểm Tra & Vận Hành
```bash
# 1. Cài đặt các gói bảo mật bổ sung
npm install helmet express-rate-limit dotenv

# 2. Chạy kiểm tra hồi quy toàn bộ hệ thống
npm test

# 3. Khởi động kiểm thử bảo mật
npm start
```
