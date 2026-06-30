# 介之的世界网站重构版

## 改动概要

- 保留原来的页面结构、深色背景、金色按钮和作品卡片视觉风格。
- 把作品数据、日期解析、排序、分类、上传/导入/导出逻辑集中到 `js/works-store.js`。
- 首页作品集区块支持：全部 / 诗歌 / 散文、时间正序 / 倒序。
- `portfolio.html` 重写为两个板块：诗歌、散文。
- 每篇作品会被标准化出 `timestamp`，支持中文日期如 `2024年3月5日` 和 ISO 日期如 `2024-03-05`。
- 添加作品功能支持手动填写，也支持上传 `.txt` / `.md` / `.json`。

## 静态网站上传机制说明

如果网站部署在 GitHub Pages、Netlify 静态站点或普通静态服务器上，浏览器不能直接改写项目里的 `works-data.js`。

所以本版本的“添加作品”采取两步：

1. 在浏览器中添加作品，作品会进入本地 `localStorage`，页面会立即显示。
2. 点击“导出本地 JSON”，得到 `works-local-export.json`。
3. 将导出的 JSON 合并回项目库的 `works-data.js`，再提交部署。

如果以后想做真正的多人后台上传，需要额外接入后端、数据库或 Headless CMS。

## 推荐项目结构

```text
jiezhiworld_refactor/
├── index.html
├── portfolio.html
├── work.html
├── style.css
├── works-data.js
├── js/
│   ├── works-store.js
│   ├── home.js
│   ├── portfolio.js
│   └── work.js
└── scripts/
    └── txt2worksjs.py
```

## 数据字段建议

新作品建议使用以下字段：

```js
{
  id: 1,
  title: "作品标题",
  type: "poetry", // poetry 或 prose
  date: "2024年3月5日",
  timestamp: "2024-03-05T12:00:00.000Z",
  collection: "再见，海浪",
  content: "正文，可以保留换行"
}
```

## 本地预览

直接打开 `index.html` 也可以看；更推荐在项目目录里启动一个静态服务器：

```bash
python -m http.server 8000
```

然后访问浏览器中的本地地址。

## 注意

原来的首页引用了三张图片：

- `Still Life - Japanese Vase with Roses and Anemones, 1890.jpg`
- `Starry Night over the Rhone, 1888.jpg`
- `Undergrowth with Ivy, 1889.jpg`
- `0111_repro.jpg`

这些图片没有包含在本次上传的代码文件中。部署时需要继续保留在网站根目录，否则图片不会显示。
