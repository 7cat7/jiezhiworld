# jiezhiworld 作品集重构版

这个版本把作品集主数据改为读取根目录下的 `poem.md`，不再依赖旧的 `works-data.js`。

## 文件结构

```text
jiezhiworld_refactor/
├── index.html              # 首页
├── portfolio.html          # 全部作品页：诗歌 / 散文两栏
├── work.html               # 单篇作品详情页
├── poem.md                 # 作品集主数据源
├── style.css               # 原视觉风格 + 少量新增控件样式
├── js/
│   ├── works-store.js      # Markdown 读取、解析、排序、本地新增作品库
│   ├── home.js             # 首页作品预览
│   ├── portfolio.js        # 作品集页、搜索、上传、导出
│   └── work.js             # 详情页
└── scripts/
    └── normalize_poem_md.py # 将原始合集 Markdown 清洗为 poem.md 的脚本
```

## poem.md 格式

每一篇作品用一个二级标题开始，日期统一为 `YYYY-MM-DD`：

```md
## 作品标题
date: 2024-11-07
collection: 明天
type: poetry

正文第一行
正文第二行
```

字段说明：

- `date`：必填，格式为 `YYYY-MM-DD`。
- `collection`：选填，专辑或系列名。
- `type`：必填，`poetry` 表示诗歌，`prose` 表示散文。

当前由 `合集(1).md` 清洗得到的 `poem.md` 共整理出 84 篇作品；原文件中的作者名“介之”、中文日期、`回到主页` 等导航残留已清理。

## 本地预览

由于页面通过 `fetch('poem.md')` 读取 Markdown，直接双击 HTML 文件时，部分浏览器会因为本地文件限制而读取失败。推荐用本地服务器打开：

```bash
cd jiezhiworld_refactor
python -m http.server 8000
```

然后访问浏览器中的本地地址。

## 添加新作品

`portfolio.html` 里保留了上传/新增功能：

1. 手动填写标题、板块、日期、专辑和正文，可以保存到浏览器本地。
2. 上传单篇 `.txt` / `.md` 可以自动填充正文。
3. 上传符合 `poem.md` 结构的 Markdown，可以批量导入到浏览器本地作品库。
4. 点击“导出本地 JSON”可以把本地新增内容导出，之后再人工合并进 `poem.md` 或项目库。

静态网页无法直接把浏览器里的上传内容写回服务器文件；若需要真正后台上传，需要再接一个后端或使用 GitHub API / CMS。
