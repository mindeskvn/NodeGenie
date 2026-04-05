"use strict";
// NodeGenie — export.ts
// Xuất NdeDocument sang JSON thuần cho AI agent đọc
// Version: 1.0.0
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
exports.exportFullJson = exportFullJson;
exports.exportFlatList = exportFlatList;
exports.writeJsonFile = writeJsonFile;
const fs = __importStar(require("fs"));
// ──────────────────────────────────────────────
// Xuất JSON đầy đủ (cho AI đọc và ghi lại)
// ──────────────────────────────────────────────
function exportFullJson(doc) {
    try {
        return JSON.stringify(doc, null, 2);
    }
    catch (err) {
        console.error('[NodeGenie][exportFullJson] Lỗi xuất JSON đầy đủ:', err);
        return '{}';
    }
}
// ──────────────────────────────────────────────
// Xuất danh sách phẳng (flat) cho AI tìm kiếm nhanh
// Mỗi entry: { id, name, desc, file, deps, warn, note, tag, type, parent }
// ──────────────────────────────────────────────
function exportFlatList(doc) {
    try {
        const result = [];
        function walk(nodes, parent) {
            for (const n of nodes) {
                result.push({
                    name: n.name,
                    parent: parent,
                    desc: n.desc,
                    file: n.file,
                    type: n.type,
                    tag: n.tag,
                    deps: n.deps,
                    warn: n.warn,
                    note: n.note
                });
                if (n.children.length > 0) {
                    walk(n.children, n.name);
                }
            }
        }
        walk(doc.nodes, null);
        return JSON.stringify({
            meta: doc.meta,
            nodes: result,
            relations: doc.relations
        }, null, 2);
    }
    catch (err) {
        console.error('[NodeGenie][exportFlatList] Lỗi xuất danh sách phẳng:', err);
        return '{}';
    }
}
// ──────────────────────────────────────────────
// Ghi file JSON ra đĩa
// ──────────────────────────────────────────────
function writeJsonFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[NodeGenie][writeJsonFile] Đã ghi: ${filePath}`);
    }
    catch (err) {
        console.error(`[NodeGenie][writeJsonFile] Lỗi ghi file ${filePath}:`, err);
        throw err;
    }
}
//# sourceMappingURL=export.js.map