"use strict";
// NodeGenie — hoverProvider.ts
// Hiển thị tooltip khi hover vào từ khóa NODE trong file .nde
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
exports.NdeHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const ndeParser_1 = require("./ndeParser");
class NdeHoverProvider {
    constructor() {
        this.document = null;
    }
    update(doc) {
        this.document = doc;
    }
    provideHover(document, position) {
        try {
            if (!this.document)
                return null;
            const line = document.lineAt(position.line).text;
            const match = line.match(/^\s*NODE\s+(\S+)/);
            if (!match)
                return null;
            const nodeName = match[1];
            const allNodes = (0, ndeParser_1.flattenNodes)(this.document.nodes);
            const found = allNodes.find(n => n.name === nodeName);
            if (!found)
                return null;
            // Tạo markdown cho hover (thuần thông tin)
            const md = new vscode.MarkdownString();
            md.isTrusted = true;
            md.appendMarkdown(`**${found.name}**\n\n`);
            if (found.desc)
                md.appendMarkdown(`📄 **Mô tả:** ${found.desc}\n\n`);
            if (found.type)
                md.appendMarkdown(`🏷️ **Loại:** ${found.type}\n\n`);
            if (found.file)
                md.appendMarkdown(`📁 **File:** \`${found.file}\`\n\n`);
            if (found.deps.length > 0)
                md.appendMarkdown(`🔗 **Phụ thuộc:** ${found.deps.join(', ')}\n\n`);
            if (found.warn)
                md.appendMarkdown(`⚠️ **Cảnh báo:** ${found.warn}\n\n`);
            if (found.note)
                md.appendMarkdown(`📝 **Ghi chú:** ${found.note}\n\n`);
            const range = document.getWordRangeAtPosition(position, /\S+/);
            return new vscode.Hover(md, range);
        }
        catch (err) {
            console.error('[NodeGenie][NdeHoverProvider.provideHover] Lỗi tạo hover:', err);
            return null;
        }
    }
}
exports.NdeHoverProvider = NdeHoverProvider;
//# sourceMappingURL=hoverProvider.js.map