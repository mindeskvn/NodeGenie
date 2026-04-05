# NodeGenie — VS Code Extension

> **Đọc, hiển thị và trực quan hóa file `.nde` (NodeGenie Mind Map) ngay trong VS Code.**  
> Hỗ trợ AI agent hiểu cấu trúc mã nguồn thông qua sơ đồ tư duy dạng thuần thông tin.

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](https://github.com/nodegenie/nodegenie/releases)
[![VS Code](https://img.shields.io/badge/vscode-%5E1.85.0-blueviolet)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🎨 **Syntax Highlighting** | Tô màu toàn bộ keywords trong file `.nde` |
| 🗂️ **NodeGenie Explorer** | Sidebar cây node, click để nhảy đến dòng tương ứng |
| 🗺️ **Mind Map** | Đồ thị mạng lưới trực quan — kéo, zoom, pan, tooltip |
| 💡 **Hover Tooltip** | Hover vào `NODE` / `FUNC` / `VAR` để xem thông tin đầy đủ |
| 🔍 **Diagnostics** | Tự động phát hiện và báo lỗi cú pháp |
| 📤 **Export JSON** | Xuất schema chuẩn cho AI agent sử dụng |
| 🤖 **Auto Skill Sync** | Tự động tạo và cập nhật `SKILL.md` cho AI agent trong workspace |
| 🔗 **Custom Editor** | File `.nde` mở trực tiếp bằng Mind Map editor (không cần text editor) |

---

## 📄 Định dạng file `.nde`

File thuần text — mỗi dòng là `KEY value`, indent xác định quan hệ cha-con.

```
# Comment — bị bỏ qua khi parse

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
    CALLS hàmKhác module.method
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

### Các KEY hỗ trợ

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
| `TYPE` | Kiểu dữ liệu của biến |
| `WARN` | Cảnh báo khi thay đổi |
| `NOTE` | Ghi chú quan trọng |
| `TAG` | Nhãn phân loại |
| `LINK` | Kết nối giữa các node: `LINK TừNode ĐếnNode [nhãn]` |
| `#` | Comment (bỏ qua khi parse) |

---

## ⌨️ Commands & Phím tắt

| Command | Mô tả |
|---------|-------|
| `NodeGenie: Open Mind Map` | Mở Mind Map dạng đồ thị |
| `NodeGenie: Export JSON for AI` | Xuất JSON schema cho AI |
| `NodeGenie: Refresh Tree` | Reload cây sidebar |

> Các lệnh cũng xuất hiện trên thanh tiêu đề editor khi mở file `.nde`.

---

## ⚙️ Cài đặt

| Setting | Mặc định | Mô tả |
|---------|----------|-------|
| `nodegenie.autoShowMindMap` | `false` | Tự động mở Mind Map khi mở file `.nde` |

---

## 🚀 Build & Chạy

```bash
npm install
npm run compile
# Nhấn F5 trong VS Code để chạy Extension Development Host

# Đóng gói .vsix
npm run package
```

---

## 📁 Cấu trúc dự án

```
NodeGenie/
├── src/
│   ├── extension.ts       # Entry point, đăng ký commands & providers
│   ├── ndeParser.ts       # Parser file .nde
│   ├── treeView.ts        # NodeGenie Explorer (sidebar)
│   ├── hoverProvider.ts   # Hover tooltip
│   ├── webviewPanel.ts    # Mind Map webview & custom editor
│   ├── skillManager.ts    # Tự động tạo/cập nhật SKILL.md cho AI
│   └── export.ts          # Xuất JSON cho AI
├── media/
│   └── mindmap.js         # Force-directed graph (D3-like)
├── syntaxes/
│   └── nde.tmLanguage.json
├── examples/
│   └── sample.nde
└── package.json
```

---

## 📜 License

MIT © NodeGenie
