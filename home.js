(function () {
    'use strict';

    function renderWorks() {
        const list = document.querySelector('.portfolio-list.no-bg');
        if (!list) return;
        list.innerHTML = '';

        const sourceError = WorksStore.getSourceError && WorksStore.getSourceError();
        if (sourceError) {
            const empty = document.createElement('div');
            empty.className = 'portfolio-empty';
            empty.textContent = sourceError;
            list.appendChild(empty);
            return;
        }

        const works = WorksStore.queryWorks({ type: 'all', order: 'desc' }).slice(0, 3);
        if (!works.length) {
            const empty = document.createElement('div');
            empty.className = 'portfolio-empty';
            empty.textContent = '这里暂时还没有作品。';
            list.appendChild(empty);
            return;
        }

        works.forEach(work => {
            const card = WorksStore.buildWorkCard(work);
            card.classList.add('no-bg');
            list.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await WorksStore.ready;
        renderWorks();
    });
})();
