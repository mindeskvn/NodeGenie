// NodeGenie — export.ts
// Xuất NdeDocument sang JSON thuần cho AI agent đọc
// Version: 1.0.0

import * as fs from 'fs';
import { NdeDocument, NdeNode, flattenNodes } from './ndeParser';

// ──────────────────────────────────────────────
// Xuất JSON đầy đủ (cho AI đọc và ghi lại)
// ──────────────────────────────────────────────
export function exportFullJson(doc: NdeDocument): string {
  try {
    return JSON.stringify(doc, null, 2);
  } catch (err) {
    console.error('[NodeGenie][exportFullJson] Lỗi xuất JSON đầy đủ:', err);
    return '{}';
  }
}

// ──────────────────────────────────────────────
// Xuất danh sách phẳng (flat) cho AI tìm kiếm nhanh
// Mỗi entry: { id, name, desc, file, deps, warn, note, tag, type, parent }
// ──────────────────────────────────────────────
export function exportFlatList(doc: NdeDocument): string {
  try {
    const result: object[] = [];

    function walk(nodes: NdeNode[], parent: string | null) {
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
        if (n.children.length > 0) { walk(n.children, n.name); }
      }
    }

    walk(doc.nodes, null);

    return JSON.stringify({
      meta: doc.meta,
      nodes: result,
      relations: doc.relations
    }, null, 2);
  } catch (err) {
    console.error('[NodeGenie][exportFlatList] Lỗi xuất danh sách phẳng:', err);
    return '{}';
  }
}

// ──────────────────────────────────────────────
// Ghi file JSON ra đĩa
// ──────────────────────────────────────────────
export function writeJsonFile(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[NodeGenie][writeJsonFile] Đã ghi: ${filePath}`);
  } catch (err) {
    console.error(`[NodeGenie][writeJsonFile] Lỗi ghi file ${filePath}:`, err);
    throw err;
  }
}
