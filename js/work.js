(function () {
    'use strict';

    function getQueryParam(name) {
        return new URL(window.location.href).searchParams.get(name);
    }

    function renderWork() {
        const id = getQueryParam('id');
        const work = WorksStore.getWorkById(id);
        const title = document.getElementById('work-title');
        const date = document.getElementById('work-date');
        const collection = document.getElementById('work-collection');
        const content = document.getElementById('work-content');
        const nav = document.getElementById('work-nav');

        if (!work) {
            title.textContent = '未找到作品';
            content.textContent = WorksStore.getSourceError() || '作品不存在或已被移除。';
            nav.innerHTML = '<a href="portfolio.html" class="back-home-btn">返回作品集</a><a href="index.html" class="back-home-btn">返回主页</a>';
            return;
        }

        title.textContent = work.title;
        date.textContent = work.date;
        collection.textContent = `${work.typeLabel}${work.collection ? ' · ' + work.collection : ''}`;
        content.innerHTML = WorksStore.textToHtml(work.content);

        const ordered = WorksStore.queryWorks({ type: work.type, order: 'desc' });
        const index = ordered.findIndex(item => item.id === work.id);
        const prev = ordered[index - 1];
        const next = ordered[index + 1];
        let html = '';
        if (prev) html += `<a href="work.html?id=${encodeURIComponent(prev.id)}" class="back-home-btn">上一篇</a>`;
        html += `<a href="portfolio.html?type=${encodeURIComponent(work.type)}" class="back-home-btn">返回${work.typeLabel}</a>`;
        html += '<a href="index.html" class="back-home-btn">返回主页</a>';
        if (next) html += `<a href="work.html?id=${encodeURIComponent(next.id)}" class="back-home-btn">下一篇</a>`;
        nav.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await WorksStore.ready;
        renderWork();
    });
})();
