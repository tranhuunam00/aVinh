const MASTER_DATA = {
    facilities: ["Bệnh viện", "PK OCP1", "PK OCP2"],
    departments: [
        "Cấp cứu",
        "Khám bệnh",
        "Răng hàm mặt",
        "Tai mũi họng",
        "Nhãn khoa",
        "Da liễu",
        "Vaccine",
        "Nội tổng hợp",
        "Ngoại tổng hợp",
        "Chấn  thương chỉnh hình",
        "Thần kinh cột sống",
        "Phục hồi chức năng",
        "Phụ sản",
        "Nhi sơ sinh",
        "Xét nghiệm",
        "Chẩn đoán hình ảnh",
        "Điện quang can thiệp"
    ],
    fields_by_category: {
        kham_benh: ["Khám cấp cứu", "Khám chuyên khoa", "Khám tổng quát", "Khám cộng đồng"],
        dieu_tri: ["Ngoại trú", "Nội trú", "Daycare"],
        dich_vu: ["Khám bệnh", "Thủ thuật", "Phẫu thuật", "Chăm sóc sau sinh", "Hỗ trợ sinh đẻ", "Chăm sóc toàn diện"],
        tinh_trang: ["Vào viện", "Ra viện theo chỉ định", "Ra viện không theo chỉ định", "Chuyển viện", "Nặng xin về", "Tử vong"],
        xet_nghiem: ["Sinh hóa", "Huyết học", "Vi sinh", "Tế bào học", "Mô bệnh học", "Hóa mô miễn dịch", "Di truyền"],
        cdha: ["Siêu âm", "Siêu âm ABUS", "XQ Tổng quát", "XQ Panorama", "XQ Mammo", "MSCT", "CBCT", "MRI", "DEXA", "Teleradiology"],
        dqct: ["Can thiệp SA", "Can thiệp CT", "Can thiệp XA"]
    },
    department_rules: {
        "Xét nghiệm": {
            type: "xet_nghiem_only",
            note: "Khoa Xét nghiệm: Chỉ hiển thị 7 nhóm xét nghiệm chuyên biệt."
        },
        "Chẩn đoán hình ảnh": {
            type: "cdha_only",
            note: "Khoa Chẩn đoán hình ảnh: Hiển thị 10 kỹ thuật CĐHA."
        },
        "Điện quang can thiệp": {
            type: "dqct_only",
            note: "Khoa Điện quang can thiệp: Hiển thị 3 kỹ thuật can thiệp."
        },
        "Phụ sản": {
            type: "clinical",
            allow_postnatal: true,
            note: "Khoa Phụ sản: Có thêm Chăm sóc sau sinh, Hỗ trợ sinh đẻ, Mổ lấy thai."
        },
        "Khám bệnh": {
            type: "clinical",
            allow_surgery: false,
            note: "Khoa Khám bệnh: Tự động ẩn Phẫu thuật theo quy định."
        },
        "Cấp cứu": {
            type: "clinical",
            allow_surgery: false,
            note: "Khoa Cấp cứu: Tự động ẩn Phẫu thuật theo quy định."
        },
        "Nội tổng hợp": {
            type: "clinical",
            allow_surgery: false,
            note: "Khoa Nội tổng hợp: Tự động ẩn Phẫu thuật theo quy định."
        }
    }
};

module.exports = MASTER_DATA;
