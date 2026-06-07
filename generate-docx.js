const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, NumberFormat
} = require('docx');

// Read PRD
const md = fs.readFileSync('PRD.md', 'utf-8');
const lines = md.split('\n');

const children = [];
let i = 0;

function addHeading(text, level) {
  const cleaned = text.replace(/^#+\s*/, '');
  children.push(new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 :
             level === 2 ? HeadingLevel.HEADING_2 :
             level === 3 ? HeadingLevel.HEADING_3 :
             level === 4 ? HeadingLevel.HEADING_4 : HeadingLevel.HEADING_2,
    text: cleaned,
    spacing: { before: level <= 2 ? 360 : 240, after: 120 },
  }));
}

function addParagraph(text, opts = {}) {
  if (!text.trim()) {
    children.push(new Paragraph({ spacing: { after: 80 } }));
    return;
  }
  // Handle inline formatting
  let cleaned = text;
  const runs = [];

  // Bold text
  const boldRegex = /\*\*(.+?)\*\*/g;
  // Inline code
  const codeRegex = /`([^`]+)`/g;
  // Links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // Simple approach: parse for bold
  const parts = [];
  let remaining = cleaned;

  // Process bold
  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0]);
      if (idx > 0) parts.push({ text: remaining.substring(0, idx), bold: false });
      parts.push({ text: boldMatch[1], bold: true });
      remaining = remaining.substring(idx + boldMatch[0].length);
    } else {
      parts.push({ text: remaining.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1'), bold: false });
      remaining = '';
    }
  }

  const filteredParts = parts.filter(p => p.text);
  if (filteredParts.length === 0) filteredParts.push({ text: cleaned, bold: false });

  children.push(new Paragraph({
    text: filteredParts[0].text,
    ...opts,
    spacing: { after: opts.spacingAfter || 80 },
  }));
}

function addBullet(text) {
  const cleaned = text.replace(/^[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  children.push(new Paragraph({
    text: cleaned,
    bullet: { level: 0 },
    spacing: { after: 60 },
  }));
}

function addTable(headers, rows) {
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ text: h, bold: true, fontSize: 20 })],
          shading: { fill: '6366f1', type: ShadingType.CLEAR },
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
        })),
      }),
      ...rows.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ text: cell, fontSize: 18 })],
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
        })),
      })),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 160 } }));
}

// ============ Parse Markdown ============
while (i < lines.length) {
  const line = lines[i];

  // Empty line
  if (!line.trim()) {
    i++;
    continue;
  }

  // Heading
  if (line.startsWith('#### ')) { addHeading(line, 4); i++; continue; }
  if (line.startsWith('### ')) { addHeading(line, 3); i++; continue; }
  if (line.startsWith('## ')) { addHeading(line, 2); i++; continue; }
  if (line.startsWith('# ')) { addHeading(line, 1); i++; continue; }

  // Horizontal rule
  if (line.match(/^-{3,}$/)) { addParagraph('—'.repeat(40)); i++; continue; }

  // Table
  if (line.startsWith('|')) {
    const tableLines = [];
    while (i < lines.length && lines[i].startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }
    // Filter out separator rows
    const dataRows = tableLines.filter(l => !l.match(/^\|[\s\-:|]+\|$/));
    if (dataRows.length > 0) {
      const headers = dataRows[0].split('|').filter(c => c.trim()).map(c => c.trim());
      const rows = dataRows.slice(1).map(l =>
        l.split('|').filter(c => c.trim()).map(c => c.trim())
      );
      addTable(headers, rows);
    }
    continue;
  }

  // Bullet list
  if (line.match(/^[-*]\s/)) {
    while (i < lines.length && lines[i].match(/^[-*]\s/)) {
      addBullet(lines[i]);
      i++;
    }
    continue;
  }

  // Numbered list
  if (line.match(/^\d+\.\s/)) {
    while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
      const cleaned = lines[i].replace(/^\d+\.\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
      children.push(new Paragraph({
        text: cleaned,
        numbering: { reference: 'default', level: 0 },
        spacing: { after: 60 },
      }));
      i++;
    }
    continue;
  }

  // Code block
  if (line.startsWith('```')) {
    i++;
    const codeLines = [];
    while (i < lines.length && !lines[i].startsWith('```')) {
      codeLines.push(lines[i]);
      i++;
    }
    i++; // skip closing ```
    if (codeLines.length > 0) {
      children.push(new Paragraph({
        text: codeLines.join('\n'),
        font: 'Consolas',
        fontSize: 16,
        shading: { fill: 'f1f5f9', type: ShadingType.CLEAR },
        spacing: { after: 120 },
      }));
    }
    continue;
  }

  // Regular paragraph
  addParagraph(line);
  i++;
}

// Create document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Microsoft YaHei', size: 22 },
      },
    },
  },
  sections: [{
    properties: {},
    children,
  }],
});

// Write file
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('PRD.docx', buffer);
  console.log('✅ PRD.docx generated successfully!');
  console.log('📄 Location: ' + __dirname + '\\PRD.docx');
});
