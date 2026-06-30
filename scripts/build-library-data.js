const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'js', 'library-data.js');

const SOURCES = [
  { file: 'poem.md', source: 'poem', defaultType: 'poetry' },
  { file: 'article.md', source: 'article', defaultType: 'prose' }
];

const TYPE_LABELS = {
  poetry: '诗歌',
  prose: '散文'
};

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeType(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  if (['poetry', 'poem', '诗歌', '诗'].includes(raw)) return 'poetry';
  if (['prose', 'article', 'essay', '散文', '文章'].includes(raw)) return 'prose';
  return fallback || 'poetry';
}

function parseDateToTimestamp(value) {
  if (!value) return '';
  const raw = String(value).trim();

  const isoDate = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00.000Z`;
  }

  const chineseDate = raw.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})\s*日/);
  if (chineseDate) {
    const [, year, month, day] = chineseDate;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00.000Z`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function timestampToDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function makeStableId(source, title, date, collection, index) {
  const hash = crypto
    .createHash('sha1')
    .update([source, title, date, collection].join('\n'))
    .digest('hex')
    .slice(0, 8);

  return `${source}-${index + 1}-${hash}`;
}

function parseMarkdownLibrary(markdown, defaultType, source) {
  const text = String(markdown || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = text
    .split(/\n(?=##\s+)/)
    .map(block => block.trim())
    .filter(block => /^##\s+/.test(block));

  return blocks
    .map((block, index) => {
      const lines = block.split('\n');
      const title = lines.shift().replace(/^##\s+/, '').trim();
      const meta = {};
      let cursor = 0;

      while (cursor < lines.length) {
        const line = lines[cursor].trim();

        if (!line) {
          cursor += 1;
          break;
        }

        const match = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
        if (!match) break;

        meta[match[1].toLowerCase()] = match[2].trim();
        cursor += 1;
      }

      const content = lines.slice(cursor).join('\n').trim();
      if (!title || !content) return null;

      const type = normalizeType(meta.type, defaultType);
      const timestamp = parseDateToTimestamp(meta.date) || '1970-01-01T12:00:00.000Z';
      const date = timestampToDate(timestamp) || String(meta.date || '').trim();
      const collection = String(meta.collection || '').trim();

      return {
        id: makeStableId(source, title, date, collection, index),
        title,
        date,
        timestamp,
        sortTime: new Date(timestamp).getTime() || 0,
        collection,
        type,
        typeLabel: TYPE_LABELS[type] || '作品',
        content,
        source
      };
    })
    .filter(Boolean);
}

function buildLibrary() {
  const works = [];

  for (const item of SOURCES) {
    const filePath = path.join(ROOT_DIR, item.file);
    const markdown = readTextIfExists(filePath);

    if (!markdown.trim()) {
      console.warn(`[build-library-data] 跳过空文件或不存在的文件：${item.file}`);
      continue;
    }

    const parsed = parseMarkdownLibrary(markdown, item.defaultType, item.source);
    console.log(`[build-library-data] ${item.file}: ${parsed.length} 篇`);
    works.push(...parsed);
  }

  if (!works.length) {
    throw new Error('没有从 poem.md / article.md 读取到任何作品，请检查 Markdown 格式。');
  }

  return works;
}

function writeLibraryData(works) {
  const output = `window.JIEZHIWORLD_WORKS = ${JSON.stringify(works, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log(`[build-library-data] 已生成 ${path.relative(ROOT_DIR, OUTPUT_FILE)}，共 ${works.length} 篇。`);
}

writeLibraryData(buildLibrary());
