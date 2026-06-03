# 临时笔记 / Temp Note

一个在浏览器中随时打开、用于临时收集和查看文本与图片素材的轻量网页应用。
A desk-level web page for capturing text and images that come fast and get used fast — open it anytime in your browser.

---

## 访问地址 / URL

**在线访问（无需任何配置） / Online (no setup needed)：** https://note.kzhao29.win

### 语言切换 / Language Switch

点击右上角 **EN / 中文** 按钮即可在当前页面切换语言，无需跳转。
Click the **EN / 中文** button in the top-right corner to switch language on the same page.
语言偏好自动保存到浏览器本地 / Language preference is saved locally in the browser.

---

## 功能说明 / Features

* **中英双语 / Bilingual**: 同一页面内动态切换，文本/标签/提示语全部支持 / Dynamic language switch on a single page — all text, labels, and messages are translated
* **富文本编辑 / Rich Text**: 基于 Quill 编辑器，支持加粗、斜体、标题、列表、代码块、链接等 / Built on Quill editor, supports bold, italic, headings, lists, code blocks, links
* **文本记录 / Text Notes**: 输入标题、正文、标签，输入时自动保存 / Enter title, body, tags; auto-saved as you type
* **图文混排 / Mixed Content**: 编辑区支持文本和图片混合编辑，图片以 Base64 编码内联存储 / Images stored inline as Base64
* **截图粘贴 / Paste Screenshots**: `Ctrl+V` 直接粘贴，或拖拽图片到编辑区 / `Ctrl+V` to paste, or drag & drop images onto the editor
* **拖拽预览 / Drag Preview**: 拖拽图片进入放置区时，半透明显示图片预览 / When dragging an image over the drop zone, a semi-transparent preview appears
* **多附件 / Multiple Attachments**: 同一卡片可保存多张截图 / One card can hold multiple screenshots
* **自动保存 / Auto-Save**: 内容保存在浏览器本地 IndexedDB，刷新不丢失 / Saved in browser IndexedDB; survives page refresh
* **搜索筛选 / Search & Filter**: 按关键词搜索、按类型（文本/图片）筛选、按置顶/收藏筛选 / Search by keyword; filter by type (text/image), pinned, or favorites
* **置顶收藏 / Pin & Favorite**: 重要内容可置顶或收藏 / Mark important items as pinned or favorites
* **导入导出 / Import & Export**: 单条或批量 JSON 导出与导入，内容完全一致 / Single or batch JSON export/import with full fidelity
* **明暗主题 / Themes**: 浅色 / 米棕 / 暗黑三种主题 / Light / Warm / Dark themes

## 界面布局 / Layout

```
┌──────────┬─────────────────────┬──────────────┐
│  左侧栏  │      主编辑区        │   右侧卡片   │
│  Left    │      Editor         │   Cards      │
│          │                     │              │
│ 统计数据  │  标题 / 正文 / 标签  │  搜索筛选   │
│ Stats    │  Title / Body / Tags │  Search     │
│ 新建复制  │  截图附件           │  卡片列表   │
│ Actions  │  Screenshots        │  Card List  │
│  标签云  │                     │              │
│  Tags    │                     │              │
└──────────┴─────────────────────┴──────────────┘
```

## 数据存储 / Data Storage

* **IndexedDB**: 素材内容（文本、图片）保存在浏览器本地 / Content (text & images) stored in browser IndexedDB
* **localStorage**: 界面状态（搜索词、筛选条件、语言偏好、主题） / UI state (search, filters, language, theme)
* **导出文件**: JSON 文件下载到本地 / Exported as JSON file download

---

## 本地开发 / Local Development

```bash
# 克隆项目
git clone <repo-url>
cd temp-note

# 安装依赖
npm install

# 启动本地开发服务器
npm start
```

浏览器访问 http://localhost:3173

本地模式下导出的 JSON 保存在 `exports/` 文件夹。

### 修改语言包 / Editing Translations

编辑 `public/i18n/` 目录下的 JSON 文件：
Edit the JSON files in `public/i18n/`:

* `zh.json` — 中文翻译 / Chinese translations
* `en.json` — 英文翻译 / English translations

---

## 项目结构 / Project Structure

```
temp-note/
├── public/
│   ├── index.html          # 主页面（语言自动检测）
│   │                         Main page (auto-detects language)
│   ├── en/
│   │   └── index.html      # 英文入口（重定向到 /）
│   │                         English entry (redirects to /)
│   ├── i18n/
│   │   ├── zh.json         # 中文语言包
│   │   └── en.json         # 英文语言包
│   ├── style.css           # 样式
│   └── app.js              # 前端逻辑（i18n 核心）
├── server.js               # 本地开发服务器
├── package.json
├── exports/                # 本地开发导出目录
├── README.md               # 本文件
├── requirements.md
└── prd.md
```

---

## 注意 / Notes

* 图片数据量较大时，浏览器本地存储空间有限，请定期导出备份
* When image data is large, browser storage is limited — export regularly as backup
* 清除浏览器缓存会导致本地数据丢失
* Clearing browser cache will erase local data
* 数据仅保存在当前浏览器设备，不支持跨设备同步
* Data is stored only in the current browser; no cross-device sync