// NodeGenie — treeView.ts
// Cung cấp TreeDataProvider để hiển thị cây .nde trong sidebar VS Code
// Version: 1.0.0

import * as vscode from 'vscode';
import { NdeNode, NdeDocument, flattenNodes } from './ndeParser';

// ──────────────────────────────────────────────
// TreeItem cho mỗi node trong cây
// ──────────────────────────────────────────────
export class NdeTreeItem extends vscode.TreeItem {
  public readonly ndeNode: NdeNode;

  constructor(
    node: NdeNode,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(node.name, collapsibleState);
    this.ndeNode = node;

    // Tooltip: thông tin thuần của node
    const lines: string[] = [node.name];
    if (node.desc)           lines.push(`📄 ${node.desc}`);
    if (node.file)           lines.push(`📁 ${node.file}`);
    if (node.warn)           lines.push(`⚠️  ${node.warn}`);
    if (node.note)           lines.push(`📝 ${node.note}`);
    if (node.deps.length > 0) lines.push(`🔗 ${node.deps.join(', ')}`);
    this.tooltip    = lines.join('\n');
    this.description = node.desc || node.type || '';

    // Icon theo loại node
    if (node.warn) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
    } else if (node.type === 'FUNC') {
      this.iconPath = new vscode.ThemeIcon('symbol-method');
    } else if (node.type === 'VAR') {
      this.iconPath = new vscode.ThemeIcon('symbol-variable');
    } else if (node.file) {
      this.iconPath = new vscode.ThemeIcon('file-code');
    } else if (node.children.length > 0) {
      this.iconPath = new vscode.ThemeIcon('symbol-module');
    } else {
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

// ──────────────────────────────────────────────
// TreeDataProvider chính
// ──────────────────────────────────────────────
export class NdeTreeProvider implements vscode.TreeDataProvider<NdeTreeItem> {
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<NdeTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private document: NdeDocument | null = null;

  update(doc: NdeDocument): void {
    try {
      this.document = doc;
      this._onDidChangeTreeData.fire(undefined);
    } catch (err) {
      console.error('[NodeGenie][NdeTreeProvider.update] Lỗi cập nhật cây:', err);
    }
  }

  clear(): void {
    this.document = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: NdeTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: NdeTreeItem): NdeTreeItem[] {
    try {
      if (!this.document) { return []; }
      const src: NdeNode[] = element ? element.ndeNode.children : this.document.nodes;
      return src.map(n =>
        new NdeTreeItem(
          n,
          n.children.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
        )
      );
    } catch (err) {
      console.error('[NodeGenie][NdeTreeProvider.getChildren] Lỗi lấy node con:', err);
      return [];
    }
  }

  findNodeByName(name: string): NdeNode | undefined {
    try {
      if (!this.document) { return undefined; }
      return flattenNodes(this.document.nodes).find(n => n.name === name);
    } catch (err) {
      console.error('[NodeGenie][NdeTreeProvider.findNodeByName] Lỗi tìm node:', err);
      return undefined;
    }
  }
}
