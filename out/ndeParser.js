"use strict";
// NodeGenie — ndeParser.ts
// Phân tích file .nde thành cây NdeDocument
// Version: 1.0.0
//
// Định dạng .nde: THUẦN THÔNG TIN (pure plain text)
// ─────────────────────────────────────────────────
// Mỗi dòng: [indent] KEY value
// Indent (2 spaces) = xác định cấp cha-con
// Mọi giá trị đều là text thuần, không cú pháp đặc biệt
//
// KEY hỗ trợ:
//  NODE   Khai báo một module/component/class
//  FUNC   Khai báo một hàm
//  VAR    Khai báo một biến/trạng thái
//  META   Block metadata của file (version, author, desc...)
//  LINK   Kết nối giữa 2 node: LINK From To label
//  DESC   Mô tả ngắn
//  FILE   Đường dẫn file liên quan
//  DEPS   Phụ thuộc (cách nhau bằng dấu cách)
//  CALLS  Các hàm mà node này gọi
//  READS  Các biến mà node này đọc
//  WRITES Các biến mà node này ghi
//  EMITS  Các event mà node này phát ra
//  RETURN Kiểu giá trị trả về
//  WARN   Cảnh báo khi sửa
//  NOTE   Ghi chú quan trọng
//  TAG    Nhãn phân loại
//  TYPE   Loại node (NODE/FUNC/VAR nếu dùng chung block)
// ─────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNde = parseNde;
exports.toJson = toJson;
exports.flattenNodes = flattenNodes;
// ──────────────────────────────────────────────────
// Các keyword là khai báo node mới
// ──────────────────────────────────────────────────
const NODE_KINDS = new Set(['NODE', 'FUNC', 'VAR']);
// ──────────────────────────────────────────────────
// Parse một dòng text → { indent, key, value }
// ──────────────────────────────────────────────────
function parseLine(raw) {
    try {
        const trimEnd = raw.trimEnd();
        if (trimEnd.trim() === '' || trimEnd.trim().startsWith('#')) {
            return null;
        }
        const indentStr = trimEnd.match(/^(\s*)/)?.[1] ?? '';
        // Tab = 2 spaces
        const indent = indentStr.replace(/\t/g, '  ').length;
        const rest = trimEnd.trimStart();
        const spaceIdx = rest.indexOf(' ');
        if (spaceIdx === -1) {
            return { indent, key: rest.toUpperCase(), value: '' };
        }
        return {
            indent,
            key: rest.substring(0, spaceIdx).toUpperCase(),
            value: rest.substring(spaceIdx + 1).trim()
        };
    }
    catch (err) {
        console.error('[NodeGenie][parseLine] Lỗi phân tích dòng:', err);
        return null;
    }
}
// ──────────────────────────────────────────────────
// Tạo NdeNode rỗng
// ──────────────────────────────────────────────────
function createNode(kind, name, line, depth) {
    return {
        kind,
        name,
        desc: '', file: '',
        deps: [], calls: [], reads: [], writes: [], emits: [],
        returnType: '', warn: '', note: '', tag: '', type: kind,
        children: [],
        line,
        depth
    };
}
// ──────────────────────────────────────────────────
// Áp dụng thuộc tính vào node
// ──────────────────────────────────────────────────
function applyProperty(node, key, value) {
    try {
        const list = () => value.split(/\s+/).filter(s => s.length > 0);
        switch (key) {
            case 'DESC':
                node.desc = value;
                break;
            case 'FILE':
                node.file = value;
                break;
            case 'DEPS':
                node.deps = list();
                break;
            case 'CALLS':
                node.calls = list();
                break;
            case 'READS':
                node.reads = list();
                break;
            case 'WRITES':
                node.writes = list();
                break;
            case 'EMITS':
                node.emits = list();
                break;
            case 'RETURN':
                node.returnType = value;
                break;
            case 'WARN':
                node.warn = value;
                break;
            case 'NOTE':
                node.note = value;
                break;
            case 'TAG':
                node.tag = value;
                break;
            case 'TYPE':
                node.type = value;
                break;
        }
    }
    catch (err) {
        console.error(`[NodeGenie][applyProperty] Lỗi áp dụng key=${key}:`, err);
    }
}
// ──────────────────────────────────────────────────
// Hàm chính: parse toàn bộ nội dung file .nde
// ──────────────────────────────────────────────────
function parseNde(content) {
    const doc = { meta: {}, nodes: [], relations: [], errors: [] };
    try {
        const lines = content.split(/\r?\n/);
        let inMeta = false;
        // Stack theo dõi cha-con: [{ node, indent }]
        const stack = [];
        let currentNode = null;
        for (let i = 0; i < lines.length; i++) {
            const parsed = parseLine(lines[i]);
            if (!parsed) {
                continue;
            }
            const { indent, key, value } = parsed;
            // ── META block ──
            if (key === 'META') {
                inMeta = true;
                currentNode = null;
                stack.length = 0;
                continue;
            }
            if (inMeta) {
                if (NODE_KINDS.has(key) || key === 'LINK') {
                    inMeta = false;
                    // Tiếp tục xử lý bên dưới (không continue)
                }
                else {
                    if (value !== '') {
                        doc.meta[key.toLowerCase()] = value;
                    }
                    continue;
                }
            }
            // ── LINK ──
            if (key === 'LINK') {
                const parts = value.split(/\s+/);
                if (parts.length >= 2) {
                    doc.relations.push({
                        from: parts[0],
                        to: parts[1],
                        label: parts.slice(2).join(' ') || 'related',
                        line: i + 1
                    });
                }
                else {
                    doc.errors.push(`Dòng ${i + 1}: LINK thiếu thông tin (cần: LINK TừNode ĐếnNode [nhãn])`);
                }
                continue;
            }
            // ── NODE / FUNC / VAR ──
            if (NODE_KINDS.has(key)) {
                const kind = key;
                const newNode = createNode(kind, value, i + 1, indent);
                // Pop stack để tìm cha đúng
                while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                    stack.pop();
                }
                if (stack.length === 0) {
                    doc.nodes.push(newNode);
                }
                else {
                    stack[stack.length - 1].node.children.push(newNode);
                }
                stack.push({ node: newNode, indent });
                currentNode = newNode;
                continue;
            }
            // ── Thuộc tính của node hiện tại ──
            if (currentNode !== null) {
                applyProperty(currentNode, key, value);
            }
        }
    }
    catch (err) {
        const msg = `[NodeGenie][parseNde] Lỗi nghiêm trọng: ${err}`;
        console.error(msg);
        doc.errors.push(msg);
    }
    return doc;
}
// ──────────────────────────────────────────────────
// Xuất NdeDocument sang JSON thuần (cho AI)
// ──────────────────────────────────────────────────
function toJson(doc) {
    try {
        return JSON.stringify(doc, null, 2);
    }
    catch (err) {
        console.error('[NodeGenie][toJson] Lỗi chuyển JSON:', err);
        return '{}';
    }
}
// ──────────────────────────────────────────────────
// Duyệt phẳng toàn bộ cây node
// ──────────────────────────────────────────────────
function flattenNodes(nodes) {
    const result = [];
    function walk(list) {
        for (const n of list) {
            result.push(n);
            if (n.children.length > 0) {
                walk(n.children);
            }
        }
    }
    try {
        walk(nodes);
    }
    catch (err) {
        console.error('[NodeGenie][flattenNodes] Lỗi duyệt cây:', err);
    }
    return result;
}
//# sourceMappingURL=ndeParser.js.map