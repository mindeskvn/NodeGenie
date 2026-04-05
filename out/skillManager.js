"use strict";
// NodeGenie — skillManager.ts
// Tự động tạo và đồng bộ file SKILL.md vào .agents/skills/nodegenie/ trong workspace
// khi extension được kích hoạt. Nếu nội dung khác phiên bản hiện tại sẽ được cập nhật.
// Version: 1.1.1
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSkillExists = ensureSkillExists;
exports.watchWorkspaceFolders = watchWorkspaceFolders;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Phiên bản hiện tại của SKILL — dùng để so sánh và cập nhật tự động
const SKILL_VERSION = '1.1.0';
// Nội dung SKILL.md — hướng dẫn cho AI agent đọc/ghi .nde
const SKILL_CONTENT = `---
name: nodegenie-nde
description: Đọc, ghi và hiểu file .nde (NodeGenie mind map) trong dự án
---

# NodeGenie — Hướng dẫn đọc và ghi file .nde

File \`.nde\` là sơ đồ tư duy dạng **thuần thông tin** giúp AI agent hiểu cấu trúc mã nguồn: các module, hàm, biến và cách chúng kết nối với nhau.

## Quy tắc định dạng

Mỗi dòng trong file \`.nde\` có cấu trúc:

\`\`\`
[indent] KEY value
\`\`\`

- **indent**: 2 dấu cách mỗi cấp — xác định quan hệ cha-con
- **KEY**: luôn VIẾT HOA
- **value**: text thuần, không có dấu ngoặc, không có ký tự đặc biệt
- **#**: dòng bắt đầu bằng # là comment, bỏ qua khi parse

## Các KEY hợp lệ

| KEY | Ý nghĩa | Ví dụ |
|-----|---------|-------|
| \`META\` | Block thông tin file (đứng đầu file) | \`META\` |
| \`NODE\` | Khai báo module / component / class | \`NODE AuthModule\` |
| \`FUNC\` | Khai báo hàm / phương thức | \`FUNC login\` |
| \`VAR\` | Khai báo biến / trạng thái | \`VAR currentUser\` |
| \`DESC\` | Mô tả ngắn (1 dòng) | \`DESC Xử lý đăng nhập\` |
| \`FILE\` | Đường dẫn file liên quan | \`FILE src/auth/login.ts\` |
| \`DEPS\` | Phụ thuộc (cách nhau dấu cách) | \`DEPS ModuleA ModuleB\` |
| \`CALLS\` | Các hàm được gọi | \`CALLS hashPwd findUser\` |
| \`READS\` | Biến được đọc | \`READS currentSession\` |
| \`WRITES\` | Biến được ghi | \`WRITES accessToken\` |
| \`EMITS\` | Event được phát ra | \`EMITS user.loggedIn\` |
| \`RETURN\` | Kiểu trả về | \`RETURN AuthResult\` |
| \`TYPE\` | Kiểu dữ liệu của biến | \`TYPE string\` hoặc \`TYPE Map\` |
| \`WARN\` | Cảnh báo khi sửa | \`WARN Thay đổi ảnh hưởng token\` |
| \`NOTE\` | Ghi chú quan trọng | \`NOTE Dùng bcrypt salt=12\` |
| \`TAG\` | Nhãn phân loại | \`TAG auth security\` |
| \`LINK\` | Kết nối giữa 2 node (hỗ trợ \`NodeName.FuncName\`) | \`LINK login TokenService.generate gọi\` |

## Cấu trúc file .nde

\`\`\`
# Comment — bị bỏ qua khi parse

META
  name TênHệThống
  version 1.0.0
  author dev
  desc Mô tả tổng quát

NODE TênModule
  DESC Mô tả module
  FILE src/path/to/file.ts
  DEPS Phụ thuộc1 Phụ thuộc2

  FUNC tênhàm
    DESC Mô tả hàm làm gì
    FILE src/path/to/file.ts
    CALLS hàmKhác module.method
    READS biếnĐọc1 biếnĐọc2
    WRITES biếnGhi1 biếnGhi2
    EMITS tênEvent
    RETURN KiểuTrảVề
    WARN Cảnh báo nếu có
    NOTE Ghi chú nếu có

  VAR tênBiến
    DESC Lưu dữ liệu gì
    TYPE string
    WARN Cảnh báo nếu có

LINK TừNode ĐếnNode nhãnKết Nối
\`\`\`

## Quy tắc indent

- **Cấp 0**: META, NODE gốc, LINK
- **Cấp 1** (2 spaces): thuộc tính của NODE / FUNC / VAR gốc; hoặc NODE/FUNC/VAR con
- **Cấp 2** (4 spaces): thuộc tính của NODE/FUNC/VAR con
- Mỗi cấp tăng thêm 2 dấu cách
- **Giới hạn tối đa 4 cấp lồng nhau** — nếu cần lồng sâu hơn, hãy tách thành file \`.nde\` riêng

Ví dụ indent đúng:
\`\`\`
NODE AppRoot          <- cấp 0
  DEPS AuthModule     <- cấp 1 (thuộc tính của AppRoot)
  NODE AuthModule     <- cấp 1 (con của AppRoot)
    DESC Xác thực   <- cấp 2 (thuộc tính của AuthModule)
    FUNC login        <- cấp 2 (con của AuthModule)
      DESC Đăng nhập  <- cấp 3 (thuộc tính của login)
\`\`\`

## Cách AI đọc file .nde

1. Đọc toàn bộ file line by line
2. Dòng nào là \`META\` → đọc các dòng tiếp theo thành key-value metadata
3. Dòng \`NODE\` / \`FUNC\` / \`VAR\` → tạo node mới với tên = phần sau keyword
4. Indent xác định cha-con: node có indent nhỏ hơn là cha của node hiện tại
5. Các KEY còn lại → là thuộc tính của node hiện tại (node gần nhất phía trên)
6. \`LINK From To label\` → tạo kết nối giữa 2 node bất kỳ; \`From\` hoặc \`To\` có thể là dạng \`NodeName.FuncName\` để trỏ đến hàm/biến cụ thể bên trong node

## Cách AI ghi file .nde

Khi agent tạo hoặc cập nhật file \`.nde\`:

1. **Bắt đầu bằng META** nếu là file mới
2. **Mỗi node một nhóm** — NODE/FUNC/VAR → rồi các thuộc tính DESC, FILE, DEPS...
3. **FUNC và VAR** là con của NODE, dùng indent 2 spaces
4. **LINK** luôn đặt ở cuối file, cấp 0
5. **Không dùng dấu hai chấm, ngoặc, hay ký tự đặc biệt** trong value
6. **Mỗi thuộc tính một dòng** — không gộp nhiều thuộc tính trên một dòng

## Cách sử dụng trong dự án

- File \`.nde\` đặt trong thư mục \`.agents/\` hoặc gốc workspace
- Tên file = tên module/hệ thống: \`auth.nde\`, \`database.nde\`...
- Cập nhật \`.nde\` sau mỗi lần thay đổi code quan trọng
- AI agent đọc \`.nde\` trước khi debug để hiểu ngữ cảnh hệ thống
`;
// ──────────────────────────────────────────────────
// Tạo SKILL.md nếu chưa có trong workspace hiện tại
// ──────────────────────────────────────────────────
function ensureSkillExists(context) {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('[NodeGenie][skillManager] Không có workspace nào đang mở, bỏ qua tạo skill');
            return;
        }
        for (const folder of workspaceFolders) {
            createSkillForWorkspace(folder.uri.fsPath);
        }
    }
    catch (err) {
        console.error('[NodeGenie][skillManager.ensureSkillExists] Lỗi tạo skill:', err);
    }
}
function createSkillForWorkspace(workspaceRoot) {
    try {
        const skillDir = path.join(workspaceRoot, '.agents', 'skills', 'nodegenie');
        const skillFile = path.join(skillDir, 'SKILL.md');
        // Kiểm tra nội dung hiện tại — cập nhật nếu khác phiên bản mới
        if (fs.existsSync(skillFile)) {
            const existing = fs.readFileSync(skillFile, 'utf-8');
            // So sánh theo SKILL_VERSION — nếu file cũ không có version hoặc khác thì ghi đè
            if (existing === SKILL_CONTENT) {
                console.log(`[NodeGenie][skillManager] SKILL.md đã ở phiên bản mới nhất (${SKILL_VERSION}): ${skillFile}`);
                return;
            }
            console.log(`[NodeGenie][skillManager] Cập nhật SKILL.md lên v${SKILL_VERSION}: ${skillFile}`);
        }
        // Tạo thư mục nếu chưa có
        fs.mkdirSync(skillDir, { recursive: true });
        // Ghi nội dung skill
        fs.writeFileSync(skillFile, SKILL_CONTENT, 'utf-8');
        console.log(`[NodeGenie][skillManager] Đã tạo SKILL.md tại: ${skillFile}`);
        // Thông báo cho người dùng
        vscode.window.showInformationMessage(`NodeGenie: Đã tạo skill cho AI agent tại .agents/skills/nodegenie/SKILL.md`, 'Mở file').then(btn => {
            if (btn === 'Mở file') {
                vscode.workspace.openTextDocument(skillFile).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
    }
    catch (err) {
        console.error(`[NodeGenie][skillManager.createSkillForWorkspace] Lỗi tạo skill cho workspace:`, err);
    }
}
// ──────────────────────────────────────────────────
// Theo dõi khi workspace mới được thêm vào
// ──────────────────────────────────────────────────
function watchWorkspaceFolders() {
    return vscode.workspace.onDidChangeWorkspaceFolders(event => {
        try {
            for (const folder of event.added) {
                createSkillForWorkspace(folder.uri.fsPath);
            }
        }
        catch (err) {
            console.error('[NodeGenie][skillManager.watchWorkspaceFolders] Lỗi theo dõi workspace:', err);
        }
    });
}
//# sourceMappingURL=skillManager.js.map