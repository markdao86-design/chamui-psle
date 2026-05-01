#!/usr/bin/env python3
"""把 4 个拆分文件合并成单文件 chamui_app_single.html(部署用)。"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return f.read()

html = read('index.html')
char = read('character.js')
data = read('data.js')
app  = read('app.js')

OLD = '<script src="character.js"></script>\n<script src="data.js"></script>\n<script src="app.js"></script>'
NEW = f'<script>\n{char}\n\n{data}\n\n{app}\n</script>'

if OLD not in html:
    raise SystemExit('❌ 找不到要替换的 <script src="..."> 三连;index.html 结构变了?')

merged = html.replace(OLD, NEW)
out_path = os.path.join(ROOT, 'chamui_app_single.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(merged)

print(f'✅ 合并完成 → chamui_app_single.html ({len(merged.encode("utf-8"))} bytes)')
