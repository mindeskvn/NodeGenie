"use strict";
// NodeGenie — extension.ts
// Version: 1.4.0
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ndeParser_1 = require("./ndeParser");
const treeView_1 = require("./treeView");
const hoverProvider_1 = require("./hoverProvider");
const webviewPanel_1 = require("./webviewPanel");
const skillManager_1 = require("./skillManager");
// ── Diagnostics collection ──
let diagnosticCollection;
// ── State toàn cục ──
let treeProvider;
let hoverProvider;
let _extensionUri; // Lưu để refreshAll có thể mở panel
// ──────────────────────────────────────────────
// Kích hoạt extension
// ──────────────────────────────────────────────
function activate(context) {
    try {
        console.log('[NodeGenie] Extension đang khởi động — v1.4.0');
        _extensionUri = context.extensionUri;
        // ── Tự động tạo SKILL.md cho AI agent ──
        (0, skillManager_1.ensureSkillExists)(context);
        context.subscriptions.push((0, skillManager_1.watchWorkspaceFolders)());
        // ── Đăng ký Custom Editor Provider (.nde mở bằng Mind Map) ──
        context.subscriptions.push(webviewPanel_1.NdeEditorProvider.register(context));
        diagnosticCollection = vscode.languages.createDiagnosticCollection('nde');
        context.subscriptions.push(diagnosticCollection);
        // ── Khởi tạo providers ──
        treeProvider = new treeView_1.NdeTreeProvider();
        hoverProvider = new hoverProvider_1.NdeHoverProvider();
        // ── Đăng ký Tree View ──
        const treeView = vscode.window.createTreeView('nodegenie.treeView', {
            treeDataProvider: treeProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);
        // ── Đăng ký Hover Provider ──
        context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'nde' }, hoverProvider));
        // ── Command: Mở Mind Map ──
        context.subscriptions.push(vscode.commands.registerCommand('nodegenie.openMindMap', () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.languageId !== 'nde') {
                    vscode.window.showWarningMessage('NodeGenie: Vui lòng mở file .nde trước');
                    return;
                }
                const doc = (0, ndeParser_1.parseNde)(editor.document.getText());
                const panel = webviewPanel_1.NdeMindMapPanel.show(context.extensionUri);
                panel.update(doc);
            }
            catch (err) {
                const msg = `[NodeGenie][openMindMap] Lỗi mở Mind Map: ${err}`;
                console.error(msg);
                vscode.window.showErrorMessage(msg);
            }
        }));
        // ── Command: Export JSON ──
        context.subscriptions.push(vscode.commands.registerCommand('nodegenie.exportJson', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.languageId !== 'nde') {
                    vscode.window.showWarningMessage('NodeGenie: Vui lòng mở file .nde trước');
                    return;
                }
                const doc = (0, ndeParser_1.parseNde)(editor.document.getText());
                const json = (0, ndeParser_1.toJson)(doc);
                const outPath = editor.document.uri.fsPath + '.json';
                fs.writeFileSync(outPath, json, 'utf-8');
                const openDoc = await vscode.workspace.openTextDocument(outPath);
                await vscode.window.showTextDocument(openDoc, vscode.ViewColumn.Beside);
                vscode.window.showInformationMessage(`NodeGenie: Đã xuất → ${path.basename(outPath)}`);
            }
            catch (err) {
                const msg = `[NodeGenie][exportJson] Lỗi xuất JSON: ${err}`;
                console.error(msg);
                vscode.window.showErrorMessage(msg);
            }
        }));
        // ── Command: Refresh Tree ──
        context.subscriptions.push(vscode.commands.registerCommand('nodegenie.refreshTree', () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.languageId === 'nde') {
                    refreshAll(editor.document);
                }
            }
            catch (err) {
                console.error('[NodeGenie][refreshTree] Lỗi refresh:', err);
            }
        }));
        // ── Command: Goto Line ──
        context.subscriptions.push(vscode.commands.registerCommand('nodegenie.gotoLine', async (line) => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor)
                    return;
                const pos = new vscode.Position(line - 1, 0);
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
            }
            catch (err) {
                console.error('[NodeGenie][gotoLine] Lỗi nhảy đến dòng:', err);
            }
        }));
        // ── Tự động parse và mở Mind Map khi activate / switch file .nde ──
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'nde') {
                refreshAll(editor.document, true); // true = auto-open mind map
            }
            else {
                treeProvider.clear();
            }
        }));
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'nde') {
                refreshAll(event.document, false); // edit: cập nhật nhưng không focus lại panel
            }
        }));
        // ── Nếu đang mở sẵn .nde thì parse và mở Mind Map ngay ──
        const active = vscode.window.activeTextEditor;
        if (active && active.document.languageId === 'nde') {
            refreshAll(active.document, true);
        }
        console.log('[NodeGenie] Extension đã kích hoạt thành công');
    }
    catch (err) {
        const msg = `[NodeGenie][activate] Lỗi nghiêm trọng khi kích hoạt: ${err}`;
        console.error(msg);
        vscode.window.showErrorMessage(msg);
    }
}
// ──────────────────────────────────────────────
// Parse lại document và cập nhật tất cả providers
// autoOpenMap = true: tự mở / focus Mind Map panel (standalone)
// ──────────────────────────────────────────────
function refreshAll(document, autoOpenMap = false) {
    try {
        const ndeDoc = (0, ndeParser_1.parseNde)(document.getText());
        treeProvider.update(ndeDoc);
        hoverProvider.update(ndeDoc);
        // Standalone panel chỉ cập nhật nếu đang mở (custom editor tự xử lý)
        if (webviewPanel_1.NdeMindMapPanel.currentPanel) {
            webviewPanel_1.NdeMindMapPanel.currentPanel.update(ndeDoc);
        }
        updateDiagnostics(document, ndeDoc.errors);
    }
    catch (err) {
        console.error('[NodeGenie][refreshAll] Lỗi refresh toàn bộ:', err);
    }
}
// ──────────────────────────────────────────────
// Cập nhật diagnostics (lỗi parse)
// ──────────────────────────────────────────────
function updateDiagnostics(document, errors) {
    try {
        const diagnostics = errors.map(msg => {
            // Cố gắng lấy số dòng từ message
            const lineMatch = msg.match(/Dòng (\d+)/);
            const lineNum = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
            const range = new vscode.Range(lineNum, 0, lineNum, 9999);
            return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error);
        });
        diagnosticCollection.set(document.uri, diagnostics);
    }
    catch (err) {
        console.error('[NodeGenie][updateDiagnostics] Lỗi cập nhật diagnostics:', err);
    }
}
// ──────────────────────────────────────────────
// Hủy extension
// ──────────────────────────────────────────────
function deactivate() {
    console.log('[NodeGenie] Extension đã tắt');
}
//# sourceMappingURL=extension.js.map