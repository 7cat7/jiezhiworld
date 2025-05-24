import re
import os

# 输入输出路径
TXT_PATH = r'D:/life/Interest/文学/诗歌/我的天合集.txt'
JS_PATH = 'works-data.js'

# 读取txt
with open(TXT_PATH, 'r', encoding='utf-8') as f:
    lines = [line.rstrip() for line in f]

works = []
cur = {}
content_lines = []
work_id = 1

def flush_work():
    global work_id
    if cur.get('title') and content_lines:
        works.append({
            'id': work_id,
            'title': cur['title'],
            'date': cur.get('date', ''),
            'collection': cur.get('collection', ''),
            'content': '<br>'.join(content_lines).strip()
        })
        work_id += 1

# 解析逻辑
for i, line in enumerate(lines):
    # 标题：空行后第一行，或首行
    if not line.strip():
        continue
    # 检查是否为新作品标题
    if (i == 0 or not lines[i-1].strip()) and (i+1 < len(lines) and lines[i+1].strip() == '介之'):
        if cur.get('title'):
            flush_work()
            content_lines = []
        cur = {'title': line.strip()}
        continue
    # 作者行
    if line.strip() == '介之':
        continue
    # 时间+专辑行
    m = re.match(r'(\d{4}年\d{1,2}月\d{1,2}日)(?:[ \u00b7·]+《?([^》]+)》?)?', line)
    if m:
        cur['date'] = m.group(1)
        cur['collection'] = m.group(2) or ''
        continue
    # 其他内容
    content_lines.append(line)
# 最后一首
if cur.get('title') and content_lines:
    flush_work()

# 写入JS
with open(JS_PATH, 'w', encoding='utf-8') as f:
    f.write('// 作品数据自动生成\nconst works = [\n')
    for w in works:
        f.write('  {\n')
        f.write(f"    id: {w['id']},\n")
        f.write(f"    title: {repr(w['title'])},\n")
        f.write(f"    date: {repr(w['date'])},\n")
        f.write(f"    collection: {repr(w['collection'])},\n")
        f.write(f"    content: `{w['content']}`\n")
        f.write('  },\n')
    f.write('];\n')
print(f'共导出 {len(works)} 首作品到 {JS_PATH}') 