(function () {
    'use strict';

    const TYPE_LABELS = {
        poetry: '诗歌',
        prose: '散文'
    };

    let libraryWorks = [];
    let sourceError = '';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function htmlToText(value) {
        return String(value || '')
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    function textToHtml(value) {
        return escapeHtml(value)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n/g, '<br>');
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

    function normalizeType(value, fallback) {
        const raw = String(value || '').trim().toLowerCase();
        if (['poetry', 'poem', '诗歌', '诗'].includes(raw)) return 'poetry';
        if (['prose', 'article', 'essay', '散文', '文章'].includes(raw)) return 'prose';
        return fallback || 'poetry';
    }

    function normalizeWork(work, index, source, fallbackType) {
        const type = normalizeType(work.type, fallbackType);
        const timestamp = work.timestamp || parseDateToTimestamp(work.date) || '1970-01-01T12:00:00.000Z';
        const date = work.date || timestampToDate(timestamp);

        return {
            id: String(work.id || `${source}-${index + 1}`),
            title: String(work.title || '未命名作品').trim(),
            date,
            timestamp,
            sortTime: new Date(timestamp).getTime() || 0,
            collection: String(work.collection || '').trim(),
            type,
            typeLabel: TYPE_LABELS[type],
            content: htmlToText(work.content),
            source: source || work.source || 'library'
        };
    }

    function parseMarkdownLibrary(markdown, defaultType, source) {
        const text = String(markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const blocks = text
            .replace(/^\uFEFF/, '')
            .split(/\n(?=##\s+)/)
            .map(block => block.trim())
            .filter(block => /^##\s+/.test(block));

        return blocks.map((block, index) => {
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

            return normalizeWork({
                id: `${source}-${index + 1}`,
                title,
                date: meta.date || '',
                collection: meta.collection || '',
                type: meta.type || defaultType,
                content: lines.slice(cursor).join('\n').trim()
            }, index, source, defaultType);
        }).filter(work => work.title && work.content);
    }

    async function loadLibraries() {
        const generatedWorks = Array.isArray(window.JIEZHIWORLD_WORKS)
            ? window.JIEZHIWORLD_WORKS
            : [];

        if (generatedWorks.length) {
            libraryWorks = generatedWorks.map((work, index) => normalizeWork(work, index, work.source || 'library', work.type));
            sourceError = '';
            return;
        }

        const embedded = window.JIEZHIWORLD_MARKDOWN_DATA || {};
        const poemWorks = parseMarkdownLibrary(embedded['poem.md'] || '', 'poetry', 'poem');
        const articleWorks = parseMarkdownLibrary(embedded['article.md'] || '', 'prose', 'article');
        libraryWorks = poemWorks.concat(articleWorks);
        sourceError = libraryWorks.length ? '' : '没有读取到作品数据。请确认 js/library-data.js 已部署。';
    }

    function getAllWorks() {
        return libraryWorks.slice();
    }

    function compareWorks(order) {
        const direction = order === 'asc' ? 1 : -1;

        return (a, b) => {
            if (a.sortTime === b.sortTime) {
                return a.title.localeCompare(b.title, 'zh-Hans-CN');
            }
            return (a.sortTime - b.sortTime) * direction;
        };
    }

    function queryWorks(options) {
        const opts = options || {};
        let result = getAllWorks();

        if (opts.type && opts.type !== 'all') {
            result = result.filter(work => work.type === opts.type);
        }

        if (opts.keyword) {
            const keyword = String(opts.keyword).trim().toLowerCase();
            result = result.filter(work => {
                const text = `${work.title}\n${work.collection}\n${work.content}`.toLowerCase();
                return text.includes(keyword);
            });
        }

        return result.sort(compareWorks(opts.order || 'desc'));
    }

    function getWorkById(id) {
        const target = String(id || '');
        return getAllWorks().find(work => String(work.id) === target) || null;
    }

    function firstLine(work) {
        return (String(work.content || '')
            .split(/\n|。|！|!|\?|？/)
            .find(line => line.trim()) || '').trim();
    }

    function buildWorkCard(work) {
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        item.innerHTML = `
            <h3><a href="work.html?id=${encodeURIComponent(work.id)}">${escapeHtml(work.title)}</a></h3>
            <div class="first-line">${escapeHtml(work.date)} · ${escapeHtml(work.typeLabel)}${work.collection ? ' · ' + escapeHtml(work.collection) : ''}</div>
            <p>${escapeHtml(firstLine(work))}</p>
        `;
        return item;
    }

    window.WorksStore = {
        TYPE_LABELS,
        ready: loadLibraries(),
        getSourceError: () => sourceError,
        parseMarkdownLibrary,
        parseDateToTimestamp,
        timestampToDate,
        htmlToText,
        textToHtml,
        escapeHtml,
        firstLine,
        getAllWorks,
        queryWorks,
        getWorkById,
        buildWorkCard
    };
})();
