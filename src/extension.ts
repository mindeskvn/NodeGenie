// NodeGenie — extension.ts
// Version: 1.4.0

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseNde, toJson } from './ndeParser';
import { NdeTreeProvider } from './treeView';
import { NdeHoverProvider } from './hoverProvider';
import { NdeMindMapPanel, NdeEditorProvider } from './webviewPanel';
import { ensureSkillExists, watchWorkspaceFolders } from './skillManager';

// ── Diagnostics collection ──
let diagnosticCollection: vscode.DiagnosticCollection;

// ── State toàn cục ──
let treeProvider: NdeTreeProvider;
let hoverProvider: NdeHoverProvider;
let _extensionUri: vscode.Uri;  // Lưu để refreshAll có thể mở panel

// ──────────────────────────────────────────────
// Kích hoạt extension
// ──────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext): void {
  try {
    console.log('[NodeGenie] Extension đang khởi động — v1.4.0');
    _extensionUri = context.extensionUri;

    // ── Tự động tạo SKILL.md cho AI agent ──
    ensureSkillExists(context);
    context.subscriptions.push(watchWorkspaceFolders());

    // ── Đăng ký Custom Editor Provider (.nde mở bằng Mind Map) ──
    context.subscriptions.push(NdeEditorProvider.register(context));

    diagnosticCollection = vscode.languages.createDiagnosticCollection('nde');
    context.subscriptions.push(diagnosticCollection);

    // ── Khởi tạo providers ──
    treeProvider = new NdeTreeProvider();
    hoverProvider = new NdeHoverProvider();

    // ── Đăng ký Tree View ──
    const treeView = vscode.window.createTreeView('nodegenie.treeView', {
      treeDataProvider: treeProvider,
      showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // ── Đăng ký Hover Provider ──
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { language: 'nde' },
        hoverProvider
      )
    );

    // ── Command: Mở Mind Map ──
    context.subscriptions.push(
      vscode.commands.registerCommand('nodegenie.openMindMap', () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor || editor.document.languageId !== 'nde') {
            vscode.window.showWarningMessage('NodeGenie: Vui lòng mở file .nde trước');
            return;
          }
          const doc = parseNde(editor.document.getText());
          const panel = NdeMindMapPanel.show(context.extensionUri);
          panel.update(doc);
        } catch (err) {
          const msg = `[NodeGenie][openMindMap] Lỗi mở Mind Map: ${err}`;
          console.error(msg);
          vscode.window.showErrorMessage(msg);
        }
      })
    );

    // ── Command: Export JSON ──
    context.subscriptions.push(
      vscode.commands.registerCommand('nodegenie.exportJson', async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor || editor.document.languageId !== 'nde') {
            vscode.window.showWarningMessage('NodeGenie: Vui lòng mở file .nde trước');
            return;
          }
          const doc = parseNde(editor.document.getText());
          const json = toJson(doc);
          const outPath = editor.document.uri.fsPath + '.json';
          fs.writeFileSync(outPath, json, 'utf-8');
          const openDoc = await vscode.workspace.openTextDocument(outPath);
          await vscode.window.showTextDocument(openDoc, vscode.ViewColumn.Beside);
          vscode.window.showInformationMessage(`NodeGenie: Đã xuất → ${path.basename(outPath)}`);
        } catch (err) {
          const msg = `[NodeGenie][exportJson] Lỗi xuất JSON: ${err}`;
          console.error(msg);
          vscode.window.showErrorMessage(msg);
        }
      })
    );

    // ── Command: Refresh Tree ──
    context.subscriptions.push(
      vscode.commands.registerCommand('nodegenie.refreshTree', () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.languageId === 'nde') {
            refreshAll(editor.document);
          }
        } catch (err) {
          console.error('[NodeGenie][refreshTree] Lỗi refresh:', err);
        }
      })
    );

    // ── Command: Goto Line ──
    context.subscriptions.push(
      vscode.commands.registerCommand('nodegenie.gotoLine', async (line: number) => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          const pos = new vscode.Position(line - 1, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } catch (err) {
          console.error('[NodeGenie][gotoLine] Lỗi nhảy đến dòng:', err);
        }
      })
    );

    // ── Tự động parse và mở Mind Map khi activate / switch file .nde ──
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'nde') {
          refreshAll(editor.document, true);  // true = auto-open mind map
        } else {
          treeProvider.clear();
        }
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'nde') {
          refreshAll(event.document, false);  // edit: cập nhật nhưng không focus lại panel
        }
      })
    );

    // ── Nếu đang mở sẵn .nde thì parse và mở Mind Map ngay ──
    const active = vscode.window.activeTextEditor;
    if (active && active.document.languageId === 'nde') {
      refreshAll(active.document, true);
    }

    console.log('[NodeGenie] Extension đã kích hoạt thành công');
  } catch (err) {
    const msg = `[NodeGenie][activate] Lỗi nghiêm trọng khi kích hoạt: ${err}`;
    console.error(msg);
    vscode.window.showErrorMessage(msg);
  }
}

// ──────────────────────────────────────────────
// Parse lại document và cập nhật tất cả providers
// autoOpenMap = true: tự mở / focus Mind Map panel (standalone)
// ──────────────────────────────────────────────
function refreshAll(document: vscode.TextDocument, autoOpenMap = false): void {
  try {
    const ndeDoc = parseNde(document.getText());
    treeProvider.update(ndeDoc);
    hoverProvider.update(ndeDoc);
    // Standalone panel chỉ cập nhật nếu đang mở (custom editor tự xử lý)
    if (NdeMindMapPanel.currentPanel) {
      NdeMindMapPanel.currentPanel.update(ndeDoc);
    }
    updateDiagnostics(document, ndeDoc.errors);
  } catch (err) {
    console.error('[NodeGenie][refreshAll] Lỗi refresh toàn bộ:', err);
  }
}

// ──────────────────────────────────────────────
// Cập nhật diagnostics (lỗi parse)
// ──────────────────────────────────────────────
function updateDiagnostics(document: vscode.TextDocument, errors: string[]): void {
  try {
    const diagnostics: vscode.Diagnostic[] = errors.map(msg => {
      // Cố gắng lấy số dòng từ message
      const lineMatch = msg.match(/Dòng (\d+)/);
      const lineNum = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
      const range = new vscode.Range(lineNum, 0, lineNum, 9999);
      return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error);
    });
    diagnosticCollection.set(document.uri, diagnostics);
  } catch (err) {
    console.error('[NodeGenie][updateDiagnostics] Lỗi cập nhật diagnostics:', err);
  }
}

// ──────────────────────────────────────────────
// Hủy extension
// ──────────────────────────────────────────────
export function deactivate(): void {
  console.log('[NodeGenie] Extension đã tắt');
}
