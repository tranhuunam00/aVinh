---
name: pdf-to-word-converter
description: >-
  Chuyên gia chuyển đổi biểu mẫu, tài liệu từ PDF sang Word (DOCX) đạt chuẩn thể thức
  văn bản hành chính (Nghị định 30/2020/NĐ-CP) và độ chính xác 1:1 so với bản gốc.
  Bao gồm xử lý Footnote OpenXML, typography, căn lề, bảng biểu, checkbox, tab leaders và quy trình kiểm thử thị giác.
---

# Kỹ Năng Chuyên Sâu: Chuyển Đổi Biểu Mẫu / Tài Liệu PDF Sang Word (DOCX)

Kỹ năng này hướng dẫn quy trình toàn diện để trích xuất, tái tạo và chuẩn hóa biểu mẫu hoặc văn bản từ file PDF sang định dạng Microsoft Word (`.docx`) với độ tương đồng 1:1, tuân thủ nghiêm ngặt quy chuẩn văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Chuẩn Thể Thức Văn Bản Hành Chính (Nghị định 30/2020/NĐ-CP)**:
   - **Font chữ**: Luôn dùng `Times New Roman`, màu đen (`#000000`).
   - **Khổ giấy & Căn lề chuẩn A4**:
     - Kích thước: 210mm × 297mm.
     - Lề trái (Left): `30mm` (hoặc `25mm` cho biểu mẫu rộng).
     - Lề phải (Right): `15mm` - `18mm`.
     - Lề trên (Top): `20mm`.
     - Lề dưới (Bottom): `20mm`.
   - **Quốc hiệu & Tiêu ngữ**:
     - Dòng 1: `CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM` (12pt - 13pt, In hoa, Đậm, **phải nằm trọn trên 1 dòng duy nhất**).
     - Dòng 2: `Độc lập - Tự do - Hạnh phúc` (13pt - 14pt, Đậm, có gạch ngang liền dưới).
   - **Cơ quan ban hành**:
     - Dòng 1: `TÊN CƠ QUAN CHỦ QUẢN` (12pt, In hoa, Đứng / Thường).
     - Dòng 2: `TÊN TỔ CHỨC` (12pt, In hoa, Đậm, có gạch ngang phân cách ngắn).
   - **Chữ ký & Đóng dấu**:
     - Chức vụ: In hoa, Đậm (13pt - 14pt).
     - Hướng dẫn: In nghiêng, trong ngoặc đơn `(Họ, tên và chữ ký - đóng dấu)` (13pt - 14pt).

2. **Quy Tắc Nhận Diện & Xử Lý Footnote (Chú Thích Chân Trang)**:
   - **Ký tự chú thích (`¹`)**: Khi xuất hiện số nhỏ bên cạnh từ ngữ (ví dụ `CÔNG NGHỆ¹`), đó là **Footnote Reference** (chỉ số trên), KHÔNG phải số thứ tự hay văn bản thông thường.
   - **Đường gạch phân cách**: Đường gạch ngang ở cuối trang phía trên nội dung footnote là **Footnote Separator Line** tự động của MS Word, KHÔNG phải gạch chân của đề mục, KHÔNG chèn vào body text.
   - **Phân bổ trang**: Trang nào có footnote reference thì Word tự động hiển thị footnote và đường gạch ở đáy trang đó. Trang không có footnote sẽ không xuất hiện đường gạch.
   - **Cơ chế kỹ thuật**: Tạo cấu trúc Footnote OpenXML chuẩn (`word/footnotes.xml`) và inject qua zip để Word quản lý hoàn toàn tự động.

3. **Căn Chỉnh Checkbox & Dòng Chấm Điền Thông Tin**:
   - **Checkbox (`☐`)**: Dùng ký tự Unicode `\u2610` (Segoe UI Symbol) kết hợp Right Tab Stop để thẳng hàng cột tuyệt đối.
   - **Dòng chấm điền thông tin (`...................`)**: Sử dụng **Tab Stop với Dot Leader** (`WD_TAB_LEADER.DOTS`) thay vì gõ chuỗi dấu chấm thủ công để không bao giờ bị tràn dòng ngoài ý muốn.

---

## 2. Quy Trình Chuyển Đổi 5 Bước (5-Step Workflow)

### Bước 1: Phân Tích & Trích Xuất PDF Gốc
Sử dụng PyMuPDF (`pymupdf`) để kiểm tra kích thước trang, font, cỡ chữ, cờ đậm/nghiêng (`flags`), tọa độ hình vẽ và xuất ảnh trang gốc để đối chiếu:
```python
import pymupdf

doc = pymupdf.open("source.pdf")
for page_idx, page in enumerate(doc):
    # Xuất ảnh DPI cao để so sánh thị giác
    pix = page.get_pixmap(dpi=200)
    pix.save(f"pdf_orig_page_{page_idx+1}.png")
    
    # Trích xuất chi tiết từng span văn bản
    text_page = page.get_text("dict")
    for block in text_page["blocks"]:
        if "lines" in block:
            for line in block["lines"]:
                for span in line["spans"]:
                    print(f"Text: {span['text']} | Font: {span['font']} | Size: {span['size']:.1f} | Flags: {span['flags']}")
```

### Bước 2: Dựng Khung DOCX Với Python-Docx
- Thiết lập khổ giấy A4, lề chuẩn.
- Bảng Quốc hiệu / Cơ quan: Chia 2 cột không viền (ví dụ Cột trái `52mm`, Cột phải `110mm`).
- Bảng Checkbox: Chia 2 cột `81mm`, mỗi ô đặt Right Tab Stop `76mm` kèm `☐`.
- Gắn thẻ XML `<w:footnoteReference w:id="1"/>` tại điểm cần chú thích:
```python
import docx
from docx.oxml import parse_xml

# Tạo Footnote Reference chuẩn OpenXML với chỉ số trên
fn_ref = parse_xml(
    r'<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    r'<w:rPr>'
    r'<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
    r'<w:rStyle w:val="FootnoteReference"/>'
    r'<w:vertAlign w:val="superscript"/>'
    r'<w:b/>'
    r'<w:sz w:val="22"/>'
    r'</w:rPr>'
    r'<w:footnoteReference w:id="1"/>'
    r'</w:r>'
)
paragraph._p.append(fn_ref)
```

### Bước 3: Inject Footnote OpenXML Vào File DOCX
Sau khi lưu file DOCX tạm, mở zip và chèn `word/footnotes.xml` cùng quan hệ trong `[Content_Types].xml` và `word/_rels/document.xml.rels`:
```python
import zipfile

def inject_footnote_into_docx(in_docx_path, out_docx_path, footnote_text):
    footnotes_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:footnote w:type="separator" w:id="-1">
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p>
  </w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0">
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p>
  </w:footnote>
  <w:footnote w:id="1">
    <w:p>
      <w:pPr>
        <w:pStyle w:val="FootnoteText"/>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:rStyle w:val="FootnoteReference"/>
          <w:vertAlign w:val="superscript"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:footnoteRef/>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:i/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t xml:space="preserve"> {footnote_text}</w:t>
      </w:r>
    </w:p>
  </w:footnote>
</w:footnotes>""".encode('utf-8')

    with zipfile.ZipFile(in_docx_path, 'r') as zin:
        with zipfile.ZipFile(out_docx_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == '[Content_Types].xml':
                    ct_str = data.decode('utf-8')
                    if 'footnotes.xml' not in ct_str:
                        fn_override = '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>'
                        ct_str = ct_str.replace('</Types>', f'{fn_override}</Types>')
                        data = ct_str.encode('utf-8')
                elif item.filename == 'word/_rels/document.xml.rels':
                    rels_str = data.decode('utf-8')
                    if 'footnotes.xml' not in rels_str:
                        fn_rel = '<Relationship Id="rIdFootnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>'
                        rels_str = rels_str.replace('</Relationships>', f'{fn_rel}</Relationships>')
                        data = rels_str.encode('utf-8')
                zout.writestr(item, data)
            zout.writestr('word/footnotes.xml', footnotes_xml)
```

### Bước 4: Chuyển DOCX Sang PDF Bằng MS Word COM
Xuất file PDF trực tiếp qua engine của Microsoft Word để đảm bảo layout hiển thị thực tế chính xác 100%:
```python
import os
import win32com.client

def export_docx_to_pdf(docx_path, pdf_path):
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        doc_word = word.Documents.Open(os.path.abspath(docx_path))
        doc_word.ExportAsFixedFormat(os.path.abspath(pdf_path), 17) # 17 = wdExportFormatPDF
        doc_word.Close(False)
    finally:
        word.Quit()
```

### Bước 5: Kiểm Thử & So Sánh Thị Giác (Visual QC)
- Render từng trang của PDF mới sinh thành PNG (`gen_page_1.png`, `gen_page_2.png`).
- So sánh trực quan đối chiếu từng dòng, ngắt trang, độ rộng cột, vị trí dấu chân trang và chỉ số trên.
- Tinh chỉnh các tham số `space_before`, `space_after`, `line_spacing` để trang tài liệu phân trang đồng đều, không bị mồ côi dòng (orphan lines).

---

## 3. Bảng Tham Chiếu Kích Thước & Kiểu Chữ Chuẩn

Thành phần | Font Style | Cỡ chữ (pt) | Căn lề | Ghi chú
:--- | :--- | :--- | :--- | :---
`PHỤ LỤC ...` | In hoa, Đậm | 12pt | Giữa | Đầu trang
`Mẫu số ...` | Đậm | 12pt | Phải | Góc phải đầu trang
`TÊN CƠ QUAN CHỦ QUẢN` | In hoa, Đứng | 12pt | Giữa (Cột 1) | Bảng không viền
`TÊN TỔ CHỨC` | In hoa, Đậm | 12pt | Giữa (Cột 1) | Dưới có đường kẻ phân cách ngắn
`CỘNG HOÀ XÃ HỘI...` | In hoa, Đậm | 12pt | Giữa (Cột 2) | Rộng ~110mm để không bị rớt chữ
`Độc lập - Tự do - Hạnh phúc` | Đậm | 13pt - 14pt | Giữa (Cột 2) | Dưới có đường kẻ phân cách liền
`Địa danh, ngày... tháng...` | Nghiêng | 13pt - 14pt | Giữa (Cột 2) | Dưới Quốc hiệu
`TIÊU ĐỀ BIỂU MẪU` | In hoa, Đậm | 14pt | Giữa | Có thể gắn Footnote Reference
`Đề mục 1, 2, 3...` | Đứng (Regular) | 14pt | Trái | Thụt dòng và khoảng cách dòng chuẩn
`Ghi chú dưới đề mục` | Nghiêng | 13pt - 14pt | Trái / Nghiêng | Trong ngoặc đơn
`Ô checkbox (☐)` | Segoe UI Symbol | 14pt | Phải cột (Tab Stop) | Căn thẳng hàng tuyệt đối
`ĐẠI DIỆN TỔ CHỨC...` | In hoa, Đậm | 14pt | Giữa (Cột 2) | Chữ ký bên phải
`(Họ, tên và chữ ký...)` | Nghiêng | 14pt | Giữa (Cột 2) | Dưới tiêu đề người ký
`Nội dung Footnote` | Nghiêng | 11pt - 12pt | Trái | Đáy trang tự động qua OpenXML

---

## 4. Checklist Kiểm Định Trước Khi Bàn Giao (QC Checklist)
- [ ] Quốc hiệu `CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM` nằm trên **1 dòng duy nhất**.
- [ ] Ký hiệu Footnote `¹` là **chỉ số trên (Superscript)** gắn liền sau tiêu đề, cỡ chữ 11-12pt rõ ràng.
- [ ] Đường gạch đáy trang là **Footnote Separator Line** tự động (chỉ hiện ở trang có footnote).
- [ ] Các dòng điền thông tin dùng **Tab Leader Dots**, không bị tràn rớt dòng.
- [ ] Các ô checkbox `☐` căn thẳng tắp theo lề cột.
- [ ] Toàn bộ font chữ là `Times New Roman` chuẩn mực.
- [ ] Số trang và cách ngắt đoạn khớp hoàn toàn với mẫu chuẩn.
