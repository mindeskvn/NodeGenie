// NodeGenie — hoverProvider.ts
// Hiển thị tooltip khi hover vào từ khóa NODE trong file .nde
// Version: 1.0.0

import * as vscode from 'vscode';
import { NdeDocument, flattenNodes } from './ndeParser';

export class NdeHoverProvider implements vscode.HoverProvider {
  private document: NdeDocument | null = null;

  update(doc: NdeDocument): void {
    this.document = doc;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    try {
      if (!this.document) return null;

      const line = document.lineAt(position.line).text;
      const match = line.match(/^\s*NODE\s+(\S+)/);
      if (!match) return null;

      const nodeName = match[1];
      const allNodes = flattenNodes(this.document.nodes);
      const found = allNodes.find(n => n.name === nodeName);
      if (!found) return null;

      // Tạo markdown cho hover (thuần thông tin)
      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      md.appendMarkdown(`**${found.name}**\n\n`);
      if (found.desc) md.appendMarkdown(`📄 **Mô tả:** ${found.desc}\n\n`);
      if (found.type) md.appendMarkdown(`🏷️ **Loại:** ${found.type}\n\n`);
      if (found.file) md.appendMarkdown(`📁 **File:** \`${found.file}\`\n\n`);
      if (found.deps.length > 0) md.appendMarkdown(`🔗 **Phụ thuộc:** ${found.deps.join(', ')}\n\n`);
      if (found.warn) md.appendMarkdown(`⚠️ **Cảnh báo:** ${found.warn}\n\n`);
      if (found.note) md.appendMarkdown(`📝 **Ghi chú:** ${found.note}\n\n`);

      const range = document.getWordRangeAtPosition(position, /\S+/);
      return new vscode.Hover(md, range);
    } catch (err) {
      console.error('[NodeGenie][NdeHoverProvider.provideHover] Lỗi tạo hover:', err);
      return null;
    }
  }
}
