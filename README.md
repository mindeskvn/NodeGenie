# NodeGenie Extension — v1.5.0

Extension VS Code để đọc, hiển thị và trực quan hóa file `.nde`.

## Định dạng .nde

File `.nde` là **thuần thông tin** — mỗi dòng là `KEY value`, indent xác định cấu trúc cha-con.

```
META
  name TênHệThống
  version 1.0.0

NODE TênModule
  DESC Mô tả module
  FILE src/path/to/file.ts
  DEPS ModuleA ModuleB

  FUNC tênHàm
    DESC Mô tả hàm làm gì
    FILE src/path/to/file.ts
    CALLS hàmKhác biến.method
    READS biếnĐọc
    WRITES biếnGhi
    EMITS tênEvent
    RETURN KiểuTrảVề
    WARN Cảnh báo khi sửa
    NOTE Ghi chú quan trọng

  VAR tênBiến
    DESC Mô tả biến lưu gì
    TYPE string
    WARN Không đổi tên biến này

LINK ModuleA ModuleB sử dụng
LINK hàmA hàmB gọi
```

### Các KEY

| KEY | Ý nghĩa |
|-----|---------|
| `META` | Block metadata file |
| `NODE` | Module / Component / Class |
| `FUNC` | Hàm / Phương thức |
| `VAR` | Biến / Trạng thái |
| `DESC` | Mô tả ngắn |
| `FILE` | Đường dẫn file liên quan |
| `DEPS` | Phụ thuộc (cách nhau bằng dấu cách) |
| `CALLS` | Các hàm được gọi |
| `READS` | Biến được đọc |
| `WRITES` | Biến được ghi |
| `EMITS` | Event được phát ra |
| `RETURN` | Kiểu giá trị trả về |
| `WARN` | Cảnh báo khi thay đổi |
| `NOTE` | Ghi chú |
| `TAG` | Nhãn phân loại |
| `LINK` | Kết nối: `LINK TừNode ĐếnNode [nhãn]` |
| `#` | Comment (bỏ qua) |

## Tính năng Extension

- **Syntax Highlighting** — Highlight màu cho tất cả keywords
- **NodeGenie Explorer** — Sidebar hiển thị cây node, click nhảy đến dòng
- **Mind Map** — Command `NodeGenie: Open Mind Map` — đồ thị mạng lưới trực quan
- **Hover Tooltip** — Hover vào NODE/FUNC/VAR xem đầy đủ thông tin
- **Diagnostics** — Tự động báo lỗi cú pháp
- **Export JSON** — Command `NodeGenie: Export JSON for AI` — xuất schema cho AI

## Cài đặt & Chạy

```bash
npm install
npm run compile
# Nhấn F5 trong VS Code để chạy Extension Development Host
```

## Phím tắt / Commands

| Command | Mô tả |
|---------|-------|
| `NodeGenie: Open Mind Map` | Mở Mind Map |
| `NodeGenie: Export JSON for AI` | Xuất JSON cho AI |
| `NodeGenie: Refresh Tree` | Reload cây sidebar |
