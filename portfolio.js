(function () {
    'use strict';

    const state = {
        type: new URLSearchParams(window.location.search).get('type') || '',
        order: 'desc',
        keyword: ''
    };

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

        const items = WorksStore.queryWorks({
            type: state.type,
            order: state.order,
            keyword: state.keyword
        });

        if (count) count.textContent = `${items.length} 篇`;

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'portfolio-empty';
            empty.textContent = WorksStore.getSourceError() || `这里暂时还没有${typeLabel}。`;
            list.appendChild(empty);
            return;
        }

        items.forEach(work => list.appendChild(WorksStore.buildWorkCard(work)));
    }

    function openBoard(type) {
        state.type = type;
        state.order = 'desc';
        history.pushState(null, '', `portfolio.html?type=${encodeURIComponent(type)}`);

        document.querySelectorAll('[data-order]').forEach(button => {
            button.classList.toggle('active', button.dataset.order === 'desc');
        });

        renderBoard();
    }

    function bindBoardLinks() {
        document.querySelectorAll('[data-board-link]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                openBoard(link.dataset.boardLink);
            });
        });
    }

    function bindSortButtons() {
        document.querySelectorAll('[data-order]').forEach(button => {
            button.addEventListener('click', () => {
                state.order = button.dataset.order;
                document.querySelectorAll('[data-order]').forEach(btn => {
                    btn.classList.toggle('active', btn === button);
                });
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

    window.addEventListener('popstate', () => {
        state.type = new URLSearchParams(window.location.search).get('type') || '';
        renderBoard();
    });

    document.addEventListener('DOMContentLoaded', async () => {
        bindBoardLinks();
        bindSortButtons();
        bindSearch();
        await WorksStore.ready;
        renderBoard();
    });
})();
