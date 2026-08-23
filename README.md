# Hệ Thống Báo Cáo Giao Ban Hoạt Động Ngày - Bệnh Viện ĐKQT Vinmec Ocean Park 2

Hệ thống nhập liệu và tổng hợp số liệu giao ban buổi sáng hàng ngày chuẩn hóa theo mẫu `Form VINMEC.xlsx`, được xây dựng trên nền tảng **Node.js (Fullstack 1 Repo)**, **SQLite Database** và cơ chế **1 Admin Duy Nhất** cấp phát tài khoản.

---

## 🚀 1. Hướng Dẫn Khởi Động (Chỉ 1 Bước)

### Cách 1: Chạy bằng lệnh Terminal
```bash
npm start
```

### Cách 2: Bấm đúp chuột vào file
Bấm đúp vào file `run_app.bat` trên Windows.

---

## 🌐 2. Truy Cập Ứng Dụng

- **Trên máy chủ**: [http://localhost:8080](http://localhost:8080)
- **Trong toàn bộ mạng nội bộ Bệnh viện (LAN)**: `http://<IP_MÁY_BẠN>:8080` (Ví dụ: `http://192.168.1.50:8080`)

---

## 👑 3. Thông Tin Tài Khoản

### 3.1 Tài Khoản SUPER ADMIN Tối Cao (Duy nhất có quyền tạo tài khoản):
* **Tên đăng nhập**: `admin`
* **Mật khẩu**: `Vinmec@2026`
*(Admin có thể đổi mật khẩu bất kỳ lúc nào trong menu góc phải).*

### 3.2 Tài Khoản Mẫu Cho Các Khoa:
Hệ thống đã khởi tạo sẵn tài khoản cho các khoa (Mật khẩu mặc định: `123456`):
- `khoa_capcuu` (Khoa Cấp Cứu - Bệnh viện)
- `khoa_san` (Khoa Phụ Sản - Bệnh viện)
- `khoa_ngoai` (Khoa Ngoại Tổng Hợp - Bệnh viện)
- `khoa_khambenh` (Khoa Khám Bệnh - Bệnh viện)
- `khoa_noi` (Khoa Nội Tổng Hợp - Bệnh viện)
- `khoa_nhisongsinh` (Khoa Nhi Sơ Sinh - Bệnh viện)
- `khoa_cdha` (Khoa Chẩn Đoán Hình Ảnh - Bệnh viện)
- `khoa_xetnghiem` (Khoa Xét Nghiệm - Bệnh viện)
- `khoa_dqct` (Khoa Điện Quang Can Thiệp - Bệnh viện)

---

## 🔒 4. Tính Năng & Cơ Chế Phân Quyền Nghiêm Ngặt

1. **Khóa Đăng Ký Tự Do**: Ngăn chặn tuyệt đối việc nhân viên tự ý tạo tài khoản.
2. **Quản Trị Người Dùng (Chỉ Admin thấy)**:
   - Admin tạo mới tài khoản cho 17 chuyên khoa và gán cơ sở (Bệnh viện / OCP1 / OCP2).
   - Đặt lại mật khẩu (Reset Password) khi khoa quên mật khẩu.
   - Khóa/Mở tài khoản khi có thay đổi nhân sự.
3. **Trải Nghiệm Khoa / Phòng**:
   - Tài khoản khoa đăng nhập sẽ **tự động khóa đúng Chuyên khoa được gán**, không thể chọn nhầm hoặc sửa số liệu khoa khác.
   - **Form động thông minh**:
     - *Khoa Xét nghiệm*: Hiện 7 nhóm xét nghiệm (Sinh hóa, Huyết học, Vi sinh...).
     - *Khoa CĐHA*: Hiện 10 kỹ thuật CĐHA (Siêu âm, XQ, CT, MRI...).
     - *Khoa ĐQCT*: Hiện 3 kỹ thuật can thiệp.
     - *Khoa Phụ sản*: Hiện thêm Chăm sóc sau sinh, Hỗ trợ sinh đẻ, Mổ lấy thai.
     - *Khoa Cấp cứu / Khám bệnh / Nội*: Tự động ẩn Phẫu thuật theo quy định.
4. **Dashboard Giao Ban Buổi Sáng**:
   - 6 thẻ KPI tổng quan (Lượt khám, Cấp cứu, Vào viện, Mổ & Thủ thuật, Cận lâm sàng, Ra/Chuyển viện).
   - 5 biểu đồ trực quan (Power-BI style).
   - Thanh tiến độ & Checklist 17 khoa đã nộp / chưa nộp.
   - Chế độ **Toàn Màn Hình (Kiosk Mode)** cho máy chiếu phòng họp giao ban.
5. **Xuất File Excel Chuẩn Hóa**:
   - Xuất file `.xlsx` khớp 100% định dạng Sheet `Output` của file gốc `Form VINMEC.xlsx`.

---

## 🗄️ 5. Cơ Sở Dữ Liệu SQLite (An Toàn & Bền Vững)

- Dữ liệu nằm trong file `data/vinmec.sqlite`.
- Được ghi trực tiếp xuống ổ cứng (SSD/HDD), **không bị mất khi restart máy tính hay sập nguồn**.
- Muốn sao lưu: Chỉ cần copy file `data/vinmec.sqlite`.
