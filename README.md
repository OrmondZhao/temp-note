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
* **图文混排 / Mixed Content**: 编辑区支持文本和图片混合编辑，图片以 Base64 编码内嵌在正文中，无需独立附件管理 / Text and images mixed in one editor; images stored inline as Base64 in body, no separate attachment management
* **截图粘贴 / Paste Screenshots**: `Ctrl+V` 直接粘贴，或拖拽图片到编辑区，图片直接写入正文 / `Ctrl+V` to paste, or drag & drop images onto the editor — images are embedded directly into body
* **自动保存 / Auto-Save**: 内容保存在浏览器本地 IndexedDB，刷新不丢失；应用启动时申请 `navigator.storage.persist()` 权限，授权后浏览器自动清理模式不会删除本地数据 / Saved in browser IndexedDB; survives page refresh; app requests persistent storage permission on boot so browser auto-cleanup won't erase data
* **数据备份 / Data Backup**: 每次保存时自动持久化；支持单条或批量 JSON 导出到本地文件 / Auto-persisted on every save; supports single or batch JSON export to local file
* **搜索筛选 / Search & Filter**: 按关键词搜索、按类型（文本/图片）筛选、按置顶/收藏筛选 / Search by keyword; filter by type (text/image), pinned, or favorites
* **置顶收藏 / Pin & Favorite**: 重要内容可置顶或收藏 / Mark important items as pinned or favorites
* **导入导出 / Import & Export**: 单条或批量 JSON 导出与导入，内容完全一致 / Single or batch JSON export/import with full fidelity
* **明暗主题 / Themes**: 浅色 / 米棕 / 暗黑三种主题 / Light / Warm / Dark themes
* **侧栏折叠 / Collapsible Panels**: 左右侧栏均可折叠，点击顶部 ‹ / › 按钮收起，双击边缘按钮恢复 / Collapse either panel via the ‹ / › button; restore from the floating button at the screen edge

---

## 技术栈 / Tech Stack

| 层面 / Layer | 技术 / Technology |
|---|---|
| 编辑器 / Editor | Quill.js 1.3.7 (CDN) |
| 存储 / Storage | IndexedDB（内容 / content）+ localStorage（界面状态 / UI state） |
| 本地开发 / Dev Server | Node.js HTTP，零外部依赖 / Zero external dependencies |
| 线上部署 / Hosting | Cloudflare Pages |
| 构建 / Build | 无构建步骤，纯 HTML/CSS/JS / Zero build step |

---

## 界面布局 / Layout

```
┌──────────┬─────────────────────┬──────────────┐
│  左侧栏  │      主编辑区        │   右侧卡片   │
│  Left    │      Editor         │   Cards      │
│          │                     │              │
│ 统计数据  │  标题 / 正文 / 标签  │  搜索筛选   │
│ Stats    │  Title / Body / Tags │  Search     │
│ 新建复制  │                     │  卡片列表   │
│ Actions  │                     │  Card List  │
│  标签云  │                     │              │
│  Tags    │                     │              │
└──────────┴─────────────────────┴──────────────┘
```

左右侧栏均可折叠，点击顶部 ‹ / › 按钮收起，折叠后屏幕边缘会出现展开按钮。
Both side panels can be collapsed — click the ‹ / › button at the top, or restore from the floating button at the screen edge.

---

## 浏览器兼容 / Browser Support

* **Chrome / Edge** — 推荐，完整支持 / Recommended, full support
* **Firefox** — 兼容 / Compatible
* **Safari** — 兼容 / Compatible
* **IE** — 不支持 / Not supported

---

## 数据存储 / Data Storage

* **IndexedDB**: 素材内容（文本、图片）保存在浏览器本地 / Content (text & images) stored in browser IndexedDB
* **localStorage**: 界面状态（搜索词、筛选条件、语言偏好、主题） / UI state (search, filters, language, theme)
* **导出文件**: JSON 文件下载到本地 / Exported as JSON file download

### 导出格式示例 / Export Format Example

```json
{
  "version": 1,
  "exportedAt": "2026-06-08T12:00:00.000Z",
  "note": {
    "id": "abc123",
    "type": "text",
    "title": "会议记录",
    "body": "<p>讨论了下季度目标...</p><img src=\"data:image/png;base64,...\" />",
    "tags": ["工作", "会议"],
    "pinned": false,
    "favorite": true,
    "createdAt": "2026-06-08T10:00:00.000Z",
    "updatedAt": "2026-06-08T11:30:00.000Z"
  }
}
```

---

## 本地开发 / Local Development

> **零依赖设计 / Zero-Dependency Design**：本应用不依赖 npm 包。Quill.js 通过 CDN 加载，本地开发服务器仅使用 Node.js 内置模块（`http`、`fs`、`path`），`npm install` 不会安装任何生产依赖。

```bash
# 克隆项目
git clone <repo-url>
cd temp-note

# 安装依赖（无生产依赖，仅用于项目元信息）
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

## 线上部署 / Deployment

本应用是纯静态站点，托管在 Cloudflare Pages。
The app is a pure static site hosted on Cloudflare Pages.

1. 将仓库推送到 GitHub / Push the repo to GitHub
2. 在 Cloudflare Pages 中连接仓库 / Connect the repo in Cloudflare Pages
   - **构建输出目录 / Build output directory**: `public/`
   - **构建命令 / Build command**: 留空（无构建步骤） / Leave empty (no build step)
3. 绑定自定义域名（可选） / Bind custom domain (optional)

也可部署到任意静态托管平台（Vercel、Netlify、GitHub Pages 等）。
Can also be deployed to any static hosting platform (Vercel, Netlify, GitHub Pages, etc.).

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
│   │   ├── zh.json         # 中文语言包 / Chinese translations
│   │   └── en.json         # 英文语言包 / English translations
│   ├── style.css           # 样式 / Stylesheet
│   └── app.js              # 前端逻辑（i18n 核心、IndexedDB 操作）
│                             Frontend logic (i18n core, IndexedDB ops)
├── server.js               # 本地开发服务器 & 导出 API
│                             Local dev server & export API
├── package.json             # 项目元信息（零生产依赖）
│                             Project metadata (zero prod deps)
├── launch-localhost.*       # 一键启动脚本 / One-click launch scripts
├── exports/                # 本地开发导出目录（.gitignore 排除 JSON）
│                             Local export dir (JSON excluded by .gitignore)
├── README.md               # 本文件 / This file
├── requirements.md          # 需求文档 / Requirements document
└── prd.md                   # 产品需求文档 / Product requirements document
```

---

## 路线图 / Roadmap

- [x] **V1** — 文本/图片编辑、搜索筛选、置顶收藏、导入导出、中英双语、明暗主题
- [ ] **V2** — 键盘快捷键、拖拽排序、标签体系增强、图片预览增强
- [ ] **V3** — 云端同步、多端同步、OCR 识别、历史版本

---

## 注意 / Notes

* 图片数据量较大时，浏览器本地存储空间有限，请定期导出备份
* When image data is large, browser storage is limited — export regularly as backup
* 应用已申请永久存储权限，浏览器自动清理不会删除本地数据
* App requests persistent storage permission — browser auto-cleanup will not erase your data
* 手动清除"Cookies 和网站数据"会删除所有本地存储
* Manually clearing "Cookies and site data" will erase all local storage
* 数据仅保存在当前浏览器设备，不支持跨设备同步
* Data is stored only in the current browser; no cross-device sync
* 浏览器 IndexedDB 存储上限因浏览器而异（通常 50MB ~ 500MB），大量图片可能触及上限
* IndexedDB storage limits vary by browser (typically 50MB–500MB); large images may hit the cap

---

## 相关文档 / Related Docs

* [产品需求文档 (PRD)](./prd.md) / Product Requirements Document
* [需求文档 (Requirements)](./requirements.md) / Requirements document

---

## 许可证 / License

MIT
