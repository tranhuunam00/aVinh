# Hệ Thống Báo Cáo Giao Ban Hoạt Động Ngày - Bệnh Viện ĐKQT Vinmec Ocean Park 2

Hệ thống nhập liệu và tổng hợp số liệu giao ban buổi sáng hàng ngày chuẩn hóa theo mẫu `Form VINMEC.xlsx`, được xây dựng trên nền tảng **Node.js (Fullstack 1 Repo)**, **SQLite Database** và cơ chế **1 Admin Duy Nhất** cấp phát tài khoản.

---

## 🚀 1. Hướng Dẫn Khởi Động

### Cách 1: Chạy bằng file .exe Portable (Không cần Node.js)
Bấm đúp vào file `dist/Chay_Server.bat` hoặc `dist/vinmec-server.exe`.

### Cách 2: Chạy bằng lệnh Node.js
```bash
npm start
```
*(Hoặc click đúp file `run_app.bat` trên Windows).*

---

## 🔨 2. Đóng Gói Lại File .EXE Khi Cập Nhật Code

Khi chỉnh sửa code Frontend / Backend và muốn gen lại file `.exe` mới vào thư mục `dist/`:

* **Cách 1 (Nhanh nhất)**: Bấm đúp vào file **`build_exe.bat`** ở thư mục gốc.
* **Cách 2 (Terminal)**:
  ```bash
  npm run build:exe
  ```

---

## 🌐 3. Truy Cập Ứng Dụng

- **Trên máy chủ**: [http://localhost:4001](http://localhost:4001)
- **Trong toàn bộ mạng nội bộ Bệnh viện (LAN)**: `http://<IP_MÁY_CHỦ>:4001` (Ví dụ: `http://192.168.1.150:4001`)

---

## 👑 4. Thông Tin Tài Khoản & Khuyến Cáo Bảo Mật (Vin IT Standard)

> [!WARNING]
> **Khuyến Cáo An Ninh Bệnh Viện**: Sau khi khởi tạo hệ thống lần đầu trên máy chủ Production, Quản trị viên và người dùng các khoa bắt buộc phải tiến hành đổi mật khẩu mặc định ngay tại menu hồ sơ người dùng.

### 4.1 Tài Khoản SUPER ADMIN:
* **Tên đăng nhập**: `admin`
* **Mật khẩu khởi tạo ban đầu**: `Vinmec@2026` *(Bắt buộc đổi sau khi nhận bàn giao)*

### 4.2 17 Tài Khoản Khoa Chuyên Môn (Mật khẩu khởi tạo ban đầu: `123456`):
- `baocao_capcuu` (Khoa Cấp Cứu)
- `baocao_khambenh` (Khoa Khám Bệnh)
- `baocao_ranghammat` (Khoa Răng Hàm Mặt)
- `baocao_taimuihong` (Khoa Tai Mũi Họng)
- `baocao_nhankhoa` (Khoa Nhãn Khoa)
- `baocao_dalieu` (Khoa Da Liễu)
- `baocao_vaccine` (Khoa Vaccine)
- `baocao_noi` (Khoa Nội Tổng Hợp)
- `baocao_ngoai` (Khoa Ngoại Tổng Hợp)
- `baocao_ctch` (Khoa Chấn Thương Chỉnh Hình)
- `baocao_tkcs` (Khoa Thần Kinh Cột Sống)
- `baocao_phcn` (Khoa Phục Hồi Chức Năng)
- `baocao_san` (Khoa Phụ Sản)
- `baocao_nhi` (Khoa Nhi Sơ Sinh)
- `baocao_xetnghiem` (Khoa Xét Nghiệm)
- `baocao_cdha` (Khoa Chẩn Đoán Hình Ảnh)
- `baocao_dqct` (Khoa Điện Quang Can Thiệp)

---

## 🗄️ 5. Quản Lý Migration Database

- **Chạy cập nhật Database**: `npm run migrate` (hoặc `node migrate.js`)
- **Kiểm tra lịch sử Migration**: `npm run migrate:status` (hoặc `node migrate.js --status`)

---

## 🔒 6. Tính Năng Nổi Bật

1. **Khóa Đăng Ký Tự Do**: Ngăn chặn tuyệt đối việc nhân viên tự ý tạo tài khoản.
2. **Form Động Thông Minh**: Tự động hiển thị các chỉ số đặc thù cho từng chuyên khoa.
3. **Dashboard Giao Ban Buổi Sáng**: 6 thẻ KPI tổng quan, 5 biểu đồ Power-BI, chế độ toàn màn hình cho máy chiếu.
4. **Xuất Excel Chuẩn Hóa**: Khớp 100% mẫu `Form VINMEC.xlsx`.
5. **Cơ Sở Dữ Liệu SQLite**: Lưu bền vững trên ổ cứng, tự động sao lưu khi migration.
