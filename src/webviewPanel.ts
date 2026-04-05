// NodeGenie — webviewPanel.ts
// CustomTextEditorProvider — dùng external JS file (media/mindmap.js, không inline script)
// Version: 1.4.0 — Fix: Custom Editor webview không cho phép unsafe-inline script

import * as vscode from 'vscode';
import { parseNde, NdeDocument, NdeNode } from './ndeParser';

interface GraphNode {
  id: string; label: string; kind: string; desc: string; warn: string;
  isRoot: boolean;
  x: number; y: number; vx: number; vy: number;
}
interface GraphEdge {
  from: string; to: string; label: string; type: string;
}

// ──────────────────────────────────────────────────
// Custom Editor Provider
// ──────────────────────────────────────────────────
export class NdeEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'nodegenie.mindMapEditor';

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      NdeEditorProvider.viewType,
      new NdeEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    try {
      // enableScripts + localResourceRoots để cho phép load media/mindmap.js
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      };

      this.render(webviewPanel, document);

      // Nhận message từ webview
      webviewPanel.webview.onDidReceiveMessage(msg => {
        if (msg.command === 'openSource') {
          vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
        }
      });

      // Cập nhật khi file thay đổi
      const sub = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.render(webviewPanel, document);
        }
      });
      webviewPanel.onDidDispose(() => sub.dispose());
    } catch (err) {
      console.error('[NodeGenie][resolveCustomTextEditor] Lỗi:', err);
    }
  }

  private render(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
    try {
      const doc = parseNde(document.getText());
      const scriptUri = webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'media', 'mindmap.js')
      );
      webviewPanel.webview.html = buildMindMapHtml(doc, scriptUri);
    } catch (err) {
      console.error('[NodeGenie][NdeEditorProvider.render] Lỗi:', err);
    }
  }
}

// ──────────────────────────────────────────────────
// Standalone panel (cho command "Open Mind Map")
// ──────────────────────────────────────────────────
export class NdeMindMapPanel {
  static currentPanel: NdeMindMapPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static show(extensionUri: vscode.Uri): NdeMindMapPanel {
    try {
      if (NdeMindMapPanel.currentPanel) {
        NdeMindMapPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside, true);
        return NdeMindMapPanel.currentPanel;
      }
      const panel = vscode.window.createWebviewPanel(
        'nodegenieMindMapPanel', 'NodeGenie Mind Map',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
        }
      );
      NdeMindMapPanel.currentPanel = new NdeMindMapPanel(panel, extensionUri);
      return NdeMindMapPanel.currentPanel;
    } catch (err) {
      console.error('[NodeGenie][NdeMindMapPanel.show] Lỗi:', err);
      throw err;
    }
  }

  update(doc: NdeDocument): void {
    try {
      const scriptUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'media', 'mindmap.js')
      );
      this.panel.webview.html = buildMindMapHtml(doc, scriptUri);
    } catch (err) {
      console.error('[NodeGenie][NdeMindMapPanel.update] Lỗi:', err);
    }
  }

  dispose(): void {
    NdeMindMapPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) { d.dispose(); }
  }
}

// ──────────────────────────────────────────────────
// Build graph data từ NdeDocument
// ──────────────────────────────────────────────────
function buildGraph(doc: NdeDocument): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const hasParent = new Set<string>();

  function addNode(id: string, kind: string, desc: string, warn: string) {
    if (seen.has(id)) { return; }
    seen.add(id);
    nodes.push({ id, label: id, kind, desc, warn, isRoot: false, x: 0, y: 0, vx: 0, vy: 0 });
  }

  function walkNodes(list: NdeNode[], parentId?: string) {
    for (const n of list) {
      addNode(n.name, n.kind, n.desc, n.warn);
      if (parentId) {
        hasParent.add(n.name);
        edges.push({ from: parentId, to: n.name, label: '', type: 'contains' });
      }
      for (const dep of n.deps) {
        addNode(dep, 'NODE', '', '');
        edges.push({ from: n.name, to: dep, label: 'depends', type: 'depends' });
      }
      for (const fn of n.calls) {
        addNode(fn, 'FUNC', '', '');
        edges.push({ from: n.name, to: fn, label: 'calls', type: 'calls' });
      }
      if (n.children.length > 0) { walkNodes(n.children, n.name); }
    }
  }

  walkNodes(doc.nodes);
  for (const rel of doc.relations) {
    addNode(rel.from, 'NODE', '', '');
    addNode(rel.to, 'NODE', '', '');
    edges.push({ from: rel.from, to: rel.to, label: rel.label, type: 'link' });
  }
  nodes.forEach(n => { n.isRoot = !hasParent.has(n.id); });
  return { nodes, edges };
}

// ──────────────────────────────────────────────────
// Build HTML — data dùng JSON tag, script dùng file ngoài
// ──────────────────────────────────────────────────
export function buildMindMapHtml(doc: NdeDocument, scriptUri: vscode.Uri): string {
  const { nodes, edges } = buildGraph(doc);
  const title = doc.meta['name'] || 'NodeGenie Mind Map';
  const desc  = doc.meta['desc']  || '';
  const payload = JSON.stringify({ nodes, edges });

  // CSP: cho phép script từ vscode-resource (local media file)
  // Không cần unsafe-inline vì script là file external
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           script-src vscode-resource: vscode-webview-resource: https: 'self';
           style-src 'unsafe-inline';
           img-src vscode-resource: https: data:;">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0c14;color:#e0e0e0;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
#hdr{padding:8px 16px;background:#12152b;border-bottom:1px solid #2a2f50;display:flex;align-items:center;gap:8px;flex-shrink:0}
#hdr h1{font-size:14px;font-weight:600;color:#7ec8e3}
#hdr .sub{font-size:11px;color:#666}
#tb{padding:5px 12px;background:#0e1020;border-bottom:1px solid #1e2238;display:flex;gap:6px;align-items:center;flex-shrink:0}
button{background:#1a1e35;color:#b0bcd0;border:1px solid #2d3455;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;transition:background .15s}
button:hover{background:#252c48}
#lg{display:flex;gap:10px;font-size:10px;color:#555;margin-left:auto}
.ld{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:3px;vertical-align:middle}
#wrap{flex:1;position:relative;overflow:hidden}
svg{width:100%;height:100%;display:block;cursor:grab}
svg:active{cursor:grabbing}
#tip{position:absolute;background:#12152b;border:1px solid #2a3060;border-radius:6px;padding:8px 12px;font-size:11px;color:#c9d1e0;pointer-events:none;display:none;max-width:280px;line-height:1.7;white-space:pre-wrap;z-index:10;box-shadow:0 6px 20px rgba(0,0,0,.7)}
#st{position:absolute;bottom:6px;right:10px;font-size:10px;color:#333}
</style>
</head>
<body>
<div id="hdr">
  <h1>🔮 ${title}</h1>
  <span class="sub">${desc}</span>
</div>
<div id="tb">
  <button id="bFit">⟳ Fit</button>
  <button id="bRun">▶ Sắp xếp lại</button>
  <button id="bSrc">📄 Xem file nguồn</button>
  <div id="lg">
    <span><span class="ld" style="background:#FFD700;border-radius:2px"></span>gốc</span>
    <span><span class="ld" style="background:#4A9EFF"></span>phụ thuộc</span>
    <span><span class="ld" style="background:#aaf0aa"></span>gọi</span>
    <span><span class="ld" style="background:#FF7A00"></span>kết nối</span>
    <span><span class="ld" style="background:#444;border-radius:2px"></span>chứa</span>
  </div>
</div>
<div id="wrap">
  <svg id="svg"><defs id="defs"></defs><g id="root"><g id="ge"></g><g id="gn"></g></g></svg>
  <div id="tip"></div>
  <div id="st">Nodes: ${nodes.length} | Edges: ${edges.length}</div>
</div>
<!-- Data JSON (không bị CSP block vì type=application/json) -->
<script id="graph-data" type="application/json">${payload}</script>
<!-- Script external từ media/ — được phép qua localResourceRoots -->
<script src="${scriptUri}"></script>
</body>
</html>`;
}
