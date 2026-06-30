(function () {
    'use strict';

    const STORAGE_KEY = 'jiezhiworld.localWorks.v2';
    const TYPE_LABELS = {
        poetry: '诗歌',
        prose: '散文'
    };
    const LIBRARIES = [
        { path: 'poem.md', type: 'poetry', source: 'poem' },
        { path: 'article.md', type: 'prose', source: 'article' }
    ];

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
        const timestamp = work.timestamp || parseDateToTimestamp(work.date) || new Date(0).toISOString();
        const date = timestampToDate(timestamp) || String(work.date || '').trim();
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
            source: source || 'local'
        };
    }

    function parseMarkdownLibrary(markdown, defaultType, source) {
        const text = String(markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const blocks = text.split(/\n(?=##\s+)/).filter(block => /^##\s+/.test(block.trim()));

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

    async function fetchText(path, optional) {
        try {
            const response = await fetch(path, { cache: 'no-store' });
            if (!response.ok) {
                if (optional && response.status === 404) return '';
                throw new Error(`${path}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            if (optional) return '';
            throw error;
        }
    }

    async function loadLibraries() {
        try {
            const loaded = await Promise.all(LIBRARIES.map(async library => {
                const markdown = await fetchText(library.path, library.source === 'article');
                return parseMarkdownLibrary(markdown, library.type, library.source);
            }));
            libraryWorks = loaded.flat();
            sourceError = libraryWorks.length ? '' : '没有读取到作品。';
        } catch (error) {
            console.warn('读取作品 Markdown 失败：', error);
            libraryWorks = [];
            sourceError = '未能读取 poem.md / article.md。';
        }
    }

    function loadLocalWorks() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('读取本地作品库失败：', error);
            return [];
        }
    }

    function saveLocalWorks(works) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(works, null, 2));
    }

    function getAllWorks() {
        const local = loadLocalWorks().map((work, index) => normalizeWork(work, index, 'local', work.type));
        return libraryWorks.concat(local);
    }

    function compareWorks(order) {
        const direction = order === 'asc' ? 1 : -1;
        return (a, b) => {
            if (a.sortTime === b.sortTime) return a.title.localeCompare(b.title, 'zh-Hans-CN');
            return (a.sortTime - b.sortTime) * direction;
        };
    }

    function queryWorks(options) {
        const opts = options || {};
        let result = getAllWorks();

        if (opts.type && opts.type !== 'all') result = result.filter(work => work.type === opts.type);
        if (opts.keyword) {
            const keyword = String(opts.keyword).trim().toLowerCase();
            result = result.filter(work => `${work.title}\n${work.collection}\n${work.content}`.toLowerCase().includes(keyword));
        }

        return result.sort(compareWorks(opts.order || 'desc'));
    }

    function getWorkById(id) {
        const target = String(id || '');
        return getAllWorks().find(work => String(work.id) === target) || null;
    }

    function firstLine(work) {
        return (String(work.content || '').split(/\n|。|！|!|\?|？/).find(line => line.trim()) || '').trim();
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

    function addLocalWork(work) {
        const localWorks = loadLocalWorks();
        const timestamp = parseDateToTimestamp(work.date) || work.timestamp || new Date().toISOString();
        const next = {
            id: `local-${Date.now()}`,
            title: String(work.title || '未命名作品').trim(),
            date: timestampToDate(timestamp),
            timestamp,
            collection: String(work.collection || '').trim(),
            type: normalizeType(work.type, 'poetry'),
            content: htmlToText(work.content)
        };
        localWorks.unshift(next);
        saveLocalWorks(localWorks);
        return next;
    }

    function importLocalWorks(importedWorks, fallbackType) {
        const incoming = Array.isArray(importedWorks) ? importedWorks : [importedWorks];
        const localWorks = loadLocalWorks();
        const now = Date.now();
        incoming.forEach((work, index) => {
            const timestamp = parseDateToTimestamp(work.date) || work.timestamp || new Date().toISOString();
            localWorks.unshift({
                id: work.id || `local-${now}-${index}`,
                title: String(work.title || '未命名作品').trim(),
                date: timestampToDate(timestamp),
                timestamp,
                collection: String(work.collection || '').trim(),
                type: normalizeType(work.type, fallbackType || 'poetry'),
                content: htmlToText(work.content)
            });
        });
        saveLocalWorks(localWorks);
        return incoming.length;
    }

    function clearLocalWorks() {
        window.localStorage.removeItem(STORAGE_KEY);
    }

    function exportLocalWorks() {
        return loadLocalWorks();
    }

    function downloadJson(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
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
        addLocalWork,
        importLocalWorks,
        clearLocalWorks,
        exportLocalWorks,
        downloadJson,
        buildWorkCard
    };
})();
