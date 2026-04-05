"use strict";
// NodeGenie — treeView.ts
// Cung cấp TreeDataProvider để hiển thị cây .nde trong sidebar VS Code
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
exports.NdeTreeProvider = exports.NdeTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const ndeParser_1 = require("./ndeParser");
// ──────────────────────────────────────────────
// TreeItem cho mỗi node trong cây
// ──────────────────────────────────────────────
class NdeTreeItem extends vscode.TreeItem {
    constructor(node, collapsibleState) {
        super(node.name, collapsibleState);
        this.ndeNode = node;
        // Tooltip: thông tin thuần của node
        const lines = [node.name];
        if (node.desc)
            lines.push(`📄 ${node.desc}`);
        if (node.file)
            lines.push(`📁 ${node.file}`);
        if (node.warn)
            lines.push(`⚠️  ${node.warn}`);
        if (node.note)
            lines.push(`📝 ${node.note}`);
        if (node.deps.length > 0)
            lines.push(`🔗 ${node.deps.join(', ')}`);
        this.tooltip = lines.join('\n');
        this.description = node.desc || node.type || '';
        // Icon theo loại node
        if (node.warn) {
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
        }
        else if (node.type === 'FUNC') {
            this.iconPath = new vscode.ThemeIcon('symbol-method');
        }
        else if (node.type === 'VAR') {
            this.iconPath = new vscode.ThemeIcon('symbol-variable');
        }
        else if (node.file) {
            this.iconPath = new vscode.ThemeIcon('file-code');
        }
        else if (node.children.length > 0) {
            this.iconPath = new vscode.ThemeIcon('symbol-module');
        }
        else {
            this.iconPath = new vscode.ThemeIcon('symbol-field');
        }
        // Click → nhảy đến dòng trong file
        this.command = {
            command: 'nodegenie.gotoLine',
            title: 'Đến dòng',
            arguments: [node.line]
        };
        this.contextValue = 'ndeNode';
    }
}
exports.NdeTreeItem = NdeTreeItem;
// ──────────────────────────────────────────────
// TreeDataProvider chính
// ──────────────────────────────────────────────
class NdeTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.document = null;
    }
    update(doc) {
        try {
            this.document = doc;
            this._onDidChangeTreeData.fire(undefined);
        }
        catch (err) {
            console.error('[NodeGenie][NdeTreeProvider.update] Lỗi cập nhật cây:', err);
        }
    }
    clear() {
        this.document = null;
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        try {
            if (!this.document) {
                return [];
            }
            const src = element ? element.ndeNode.children : this.document.nodes;
            return src.map(n => new NdeTreeItem(n, n.children.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None));
        }
        catch (err) {
            console.error('[NodeGenie][NdeTreeProvider.getChildren] Lỗi lấy node con:', err);
            return [];
        }
    }
    findNodeByName(name) {
        try {
            if (!this.document) {
                return undefined;
            }
            return (0, ndeParser_1.flattenNodes)(this.document.nodes).find(n => n.name === name);
        }
        catch (err) {
            console.error('[NodeGenie][NdeTreeProvider.findNodeByName] Lỗi tìm node:', err);
            return undefined;
        }
    }
}
exports.NdeTreeProvider = NdeTreeProvider;
//# sourceMappingURL=treeView.js.map