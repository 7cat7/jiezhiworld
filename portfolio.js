(function () {
    'use strict';

    const state = {
        type: new URLSearchParams(window.location.search).get('type') || '',
        order: 'desc',
        keyword: ''
    };

    function currentDateInputValue() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'utf-8');
        });
    }

    function setActiveBoardButtons() {
        document.querySelectorAll('[data-board-link]').forEach(link => {
            link.classList.toggle('active', link.dataset.boardLink === state.type);
        });
    }

    function renderLanding() {
        const landing = document.getElementById('library-landing');
        const board = document.getElementById('board-view');
        if (landing) landing.hidden = Boolean(state.type);
        if (board) board.hidden = !state.type;
    }

    function renderBoard() {
        renderLanding();
        setActiveBoardButtons();

        if (!state.type) return;

        const list = document.getElementById('portfolio-list');
        const title = document.getElementById('board-title');
        const count = document.getElementById('board-count');
        if (!list) return;

        const typeLabel = WorksStore.TYPE_LABELS[state.type] || '作品';
        if (title) title.textContent = typeLabel;

        list.innerHTML = '';
        const sourceError = WorksStore.getSourceError && WorksStore.getSourceError();
        const items = WorksStore.queryWorks({ type: state.type, order: state.order, keyword: state.keyword });
        if (count) count.textContent = `${items.length} 篇`;

        if (sourceError && !items.length) {
            const empty = document.createElement('div');
            empty.className = 'portfolio-empty';
            empty.textContent = sourceError;
            list.appendChild(empty);
            return;
        }

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'portfolio-empty';
            empty.textContent = `这里暂时还没有${typeLabel}。`;
            list.appendChild(empty);
            return;
        }

        items.forEach(work => list.appendChild(WorksStore.buildWorkCard(work)));
    }

    function bindBoardLinks() {
        document.querySelectorAll('[data-board-link]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                state.type = link.dataset.boardLink;
                state.order = 'desc';
                history.pushState(null, '', `portfolio.html?type=${encodeURIComponent(state.type)}`);
                document.querySelectorAll('[data-order]').forEach(button => {
                    button.classList.toggle('active', button.dataset.order === 'desc');
                });
                renderBoard();
            });
        });
    }

    function bindSortButtons() {
        document.querySelectorAll('[data-order]').forEach(button => {
            button.addEventListener('click', () => {
                state.order = button.dataset.order;
                document.querySelectorAll('[data-order]').forEach(btn => btn.classList.toggle('active', btn === button));
                renderBoard();
            });
        });
    }

    function bindSearch() {
        const searchInput = document.getElementById('portfolio-search');
        if (!searchInput) return;
        searchInput.addEventListener('input', () => {
            state.keyword = searchInput.value;
            renderBoard();
        });
    }

    function bindUploadForm() {
        const form = document.getElementById('work-upload-form');
        if (!form) return;

        const dateInput = document.getElementById('work-date-input');
        const typeInput = document.getElementById('work-type-input');
        if (dateInput && !dateInput.value) dateInput.value = currentDateInputValue();
        if (typeInput && state.type) typeInput.value = state.type;

        const fileInput = document.getElementById('work-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                const text = await readFileAsText(file);
                const lowerName = file.name.toLowerCase();

                if (lowerName.endsWith('.json')) {
                    const parsed = JSON.parse(text);
                    const imported = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.works) ? parsed.works : [parsed]);
                    WorksStore.importLocalWorks(imported, typeInput ? typeInput.value : state.type);
                    form.reset();
                    if (dateInput) dateInput.value = currentDateInputValue();
                    if (typeInput && state.type) typeInput.value = state.type;
                    renderBoard();
                    alert(`已导入 ${imported.length} 篇作品。`);
                    return;
                }

                if (lowerName.endsWith('.md') && /^##\s+/m.test(text)) {
                    const fallbackType = typeInput ? typeInput.value : (state.type || 'poetry');
                    const imported = WorksStore.parseMarkdownLibrary(text, fallbackType, 'upload');
                    WorksStore.importLocalWorks(imported, fallbackType);
                    form.reset();
                    if (dateInput) dateInput.value = currentDateInputValue();
                    if (typeInput && state.type) typeInput.value = state.type;
                    renderBoard();
                    alert(`已导入 ${imported.length} 篇作品。`);
                    return;
                }

                const titleInput = document.getElementById('work-title-input');
                const contentInput = document.getElementById('work-content-input');
                const filename = file.name.replace(/\.[^.]+$/, '');
                if (titleInput && !titleInput.value.trim()) titleInput.value = filename;
                if (contentInput) contentInput.value = text.trim();
            });
        }

        form.addEventListener('submit', event => {
            event.preventDefault();
            const formData = new FormData(form);
            const title = String(formData.get('title') || '').trim();
            const content = String(formData.get('content') || '').trim();
            if (!title || !content) {
                alert('标题和正文不能为空。');
                return;
            }

            const type = String(formData.get('type') || state.type || 'poetry');
            WorksStore.addLocalWork({
                title,
                type,
                date: String(formData.get('date') || currentDateInputValue()),
                collection: String(formData.get('collection') || '').trim(),
                content
            });

            form.reset();
            if (dateInput) dateInput.value = currentDateInputValue();
            if (typeInput && state.type) typeInput.value = state.type;
            state.type = type;
            history.pushState(null, '', `portfolio.html?type=${encodeURIComponent(state.type)}`);
            renderBoard();
            alert('已添加到浏览器本地作品库。');
        });
    }

    function bindUploadControls() {
        const toggleUpload = document.getElementById('toggle-upload-panel');
        const uploadPanel = document.getElementById('upload-panel');
        if (toggleUpload && uploadPanel) {
            toggleUpload.addEventListener('click', () => {
                const isOpen = uploadPanel.hidden === false;
                uploadPanel.hidden = isOpen;
                toggleUpload.textContent = isOpen ? '添加作品' : '收起添加';
            });
        }

        const exportButton = document.getElementById('export-local-works');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                WorksStore.downloadJson('works-local-export.json', { works: WorksStore.exportLocalWorks() });
            });
        }

        const clearButton = document.getElementById('clear-local-works');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (confirm('确定清空浏览器本地新增作品吗？')) {
                    WorksStore.clearLocalWorks();
                    renderBoard();
                }
            });
        }
    }

    window.addEventListener('popstate', () => {
        state.type = new URLSearchParams(window.location.search).get('type') || '';
        renderBoard();
    });

    document.addEventListener('DOMContentLoaded', async () => {
        bindBoardLinks();
        bindSortButtons();
        bindSearch();
        bindUploadControls();
        bindUploadForm();
        await WorksStore.ready;
        renderBoard();
    });
})();
