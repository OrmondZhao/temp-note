const DB_NAME = "temp-material-board";
const DB_VERSION = 1;
const STORE_NAME = "state";
const STATE_KEY = "workspace";
const UI_KEY = "workspace-ui";

const els = {
  statTotal: document.getElementById("stat-total"),
  statPinned: document.getElementById("stat-pinned"),
  statImages: document.getElementById("stat-images"),
  tagCloud: document.getElementById("tag-cloud"),
  grid: document.getElementById("grid"),
  emptyState: document.getElementById("empty-state"),
  content: document.getElementById("content"),
  resultCount: document.getElementById("result-count"),
  toast: document.getElementById("toast"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  filterButtons: Array.from(document.querySelectorAll("[data-filter]")),
  title: document.getElementById("detail-title"),
  body: document.getElementById("detail-body"),
  tags: document.getElementById("detail-tags"),
  copySummary: document.getElementById("copy-summary"),
  copyCurrent: document.getElementById("copy-current"),
  newNote: document.getElementById("new-note"),
  dropzone: document.getElementById("editor-dropzone"),
  exportBtn: document.getElementById("export-btn"),
  importBtn: document.getElementById("import-btn"),
  importFile: document.getElementById("import-file"),
  detailKind: document.getElementById("detail-kind"),
  editorTitle: document.getElementById("editor-title"),
  detailAttachments: document.getElementById("detail-attachments"),
  attachmentCount: document.getElementById("attachment-count"),
  detailMeta: document.getElementById("detail-meta"),
  imageModal: document.getElementById("image-modal"),
  imageModalImg: document.getElementById("image-modal-img"),
  imageModalTitle: document.getElementById("image-modal-title"),
  imageModalCopy: document.getElementById("image-modal-copy"),
  imageModalClose: document.getElementById("image-modal-close"),
  toggleTheme: document.getElementById("toggle-theme"),
  saveNote: document.getElementById("save-note"),
  togglePin: document.getElementById("toggle-pin"),
  toggleFavorite: document.getElementById("toggle-favorite"),
  moveUp: document.getElementById("move-up"),
  moveDown: document.getElementById("move-down"),
  deleteNote: document.getElementById("delete-note"),
};

const state = {
  notes: [],
  selectedId: null,
  mode: "edit",
  draft: blankDraft(),
  query: "",
  filters: [],
  sort: "updated-desc",
  theme: "light",
};

let db = null;
let toastTimer = null;
let quill = null;

function blankDraft() {
  return { title: "", body: "", tags: [], _tagsRaw: "", attachments: [] };
}

function createId() {
  return "note_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
}

function initEditorSurface() {
  if (!els.body) return;
  if (window.Quill && !quill) {
    quill = new Quill("#detail-body", {
      theme: "snow",
      placeholder: "在这里输入正文、说明或备注。",
      modules: {
        toolbar: [
          ["bold", "italic", "underline", "strike"],
          [{ header: [1, 2, 3, false] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"]
        ]
      }
    });
    quill.root.setAttribute("spellcheck", "true");
    quill.root.setAttribute("aria-multiline", "true");
    quill.root.classList.add("rich-editor");
  }
}

function getEditorHtml() {
  if (!quill) return els.body ? els.body.innerHTML : "";
  var html = quill.root.innerHTML || "";
  return html === "<p><br></p>" ? "" : html;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseTags(value) {
  if (!value || typeof value !== "string") return [];
  var result = [];
  var current = "";
  for (var i = 0; i < value.length; i++) {
    var c = value.charAt(i);
    if (c === "," || c === ";" || c === "\n") {
      var t = current.trim();
      if (t) result.push(t);
      current = "";
    } else {
      current += c;
    }
  }
  var last = current.trim();
  if (last) result.push(last);
  return result;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 1600);
}

function applyTheme() {
  document.body.dataset.theme = state.theme;
  els.toggleTheme.textContent = state.theme === "dark" ? "浅色模式" : "暗黑模式";
}

function openImageModal(dataUrl, title) {
  els.imageModalTitle.textContent = title || "图片预览";
  els.imageModalImg.src = dataUrl;
  els.imageModal.classList.remove("hidden");
  els.imageModal.setAttribute("aria-hidden", "false");
}

function closeImageModal() {
  els.imageModal.classList.add("hidden");
  els.imageModal.setAttribute("aria-hidden", "true");
  els.imageModalImg.src = "";
}

async function copyImageFromModal() {
  var dataUrl = els.imageModalImg.src;
  if (!dataUrl) {
    showToast("没有可复制的图片");
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
      var blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob }),
      ]);
      showToast("图片已复制");
      return;
    }
    await navigator.clipboard.writeText(dataUrl);
    showToast("当前浏览器不支持图片剪贴板，已复制图片数据");
  } catch (error) {
    console.error(error);
    showToast("复制失败");
  }
}

function loadUiState() {
  try {
    var raw = localStorage.getItem(UI_KEY);
    if (!raw) return;
    var ui = JSON.parse(raw);
    if (ui.query) state.query = ui.query;
    if (ui.filters && Array.isArray(ui.filters)) {
      state.filters = ui.filters;
    } else if (ui.filter) {
      state.filters = ui.filter === "all" ? [] : [ui.filter];
    }
    if (ui.sort) state.sort = ui.sort;
    if (ui.theme) state.theme = ui.theme;
  } catch (e) {
    // ignore invalid ui state
  }
}

function saveUiState() {
  localStorage.setItem(
    UI_KEY,
    JSON.stringify({
      query: state.query,
      filters: state.filters,
      sort: state.sort,
      theme: state.theme,
    })
  );
}

function openDB() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function () {
      var database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

function dbGet(id) {
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = function () { resolve(request.result || null); };
    request.onerror = function () { reject(request.error); };
  });
}

function dbPut(value) {
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    var request = tx.objectStore(STORE_NAME).put(value);
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

function cloneNotes(notes) {
  return notes.map(function (note) {
    return Object.assign({}, note, { 
      tags: note.tags ? note.tags.slice() : [],
      attachments: note.attachments ? note.attachments.slice() : []
    });
  });
}

async function loadState() {
  db = await openDB();
  var record = await dbGet(STATE_KEY);
  var rawNotes = [];
  if (record) {
    if (Array.isArray(record)) {
      rawNotes = record;
    } else if (Array.isArray(record.notes)) {
      rawNotes = record.notes;
    } else if (record.note) {
      rawNotes = [record.note];
    }
  }
  state.notes = rawNotes.filter(Boolean).map(function (note, index) {
    return normalizeNote(note, index);
  });
  state.selectedId = state.notes[0] ? state.notes[0].id : null;
}

async function persist() {
  await dbPut({
    id: STATE_KEY,
    notes: cloneNotes(state.notes),
    updatedAt: new Date().toISOString(),
  });
}

function currentNote() {
  return state.notes.find(function (note) { return note.id === state.selectedId; }) || null;
}

function readEditorFields() {
  return {
    title: els.title.value,
    body: getEditorHtml(),
    rawTags: els.tags.value,
  };
}

function readEditorSource() {
  var fields = readEditorFields();
  if (state.mode === "new") {
    return Object.assign({}, state.draft, {
      title: fields.title,
      body: fields.body,
      _tagsRaw: fields.rawTags,
      tags: parseTags(fields.rawTags),
    });
  }
  var note = currentNote();
  if (!note) {
    return Object.assign(blankDraft(), {
      title: fields.title,
      body: fields.body,
      _tagsRaw: fields.rawTags,
      tags: parseTags(fields.rawTags),
    });
  }
  return Object.assign({}, note, {
    title: fields.title,
    body: fields.body,
    tags: parseTags(fields.rawTags),
  });
}

function flushEditorState() {
  var fields = readEditorFields();

  if (state.mode === "new") {
    Object.assign(state.draft, {
      title: fields.title,
      body: fields.body,
      _tagsRaw: fields.rawTags,
      tags: parseTags(fields.rawTags),
    });
    return state.draft;
  }

  var note = currentNote();
  if (!note) return null;

  Object.assign(note, {
    title: fields.title,
    body: fields.body,
    tags: parseTags(fields.rawTags),
    updatedAt: new Date().toISOString(),
  });
  return note;
}

function currentEditorData() {
  if (state.mode === "new") return state.draft;
  var note = currentNote();
  if (!note) return blankDraft();
  return note;
}

function getAttachmentList(note) {
  if (!note) return [];
  if (Array.isArray(note.attachments)) return note.attachments;
  if (note.imageData) {
    return [{ id: createId(), dataUrl: note.imageData, name: "主图" }];
  }
  return [];
}

function setEditorAttachments(attachments) {
  if (state.mode === "new") {
    state.draft.attachments = attachments;
    renderEditor();
    return;
  }
  var note = currentNote();
  if (!note) return;
  updateCurrent({ type: attachments.length ? "image" : "text", attachments: attachments });
}

function normalizeNote(note, fallbackIndex) {
  if (fallbackIndex === undefined) fallbackIndex = 0;
  var type = note && note.type === "image" ? "image" : "text";
  var tags = Array.isArray(note && note.tags)
    ? note.tags.map(function (tag) { return String(tag).trim(); }).filter(Boolean)
    : typeof (note && note.tags) === "string"
      ? parseTags(note.tags)
    : [];
  var attachments;
  if (Array.isArray(note && note.attachments) && note.attachments.length) {
    attachments = note.attachments
      .filter(Boolean)
      .map(function (attachment, index) {
        return {
          id: (attachment && attachment.id) || createId(),
          dataUrl: String((attachment && attachment.dataUrl) || (attachment && attachment.imageData) || (attachment && attachment.url) || ""),
          name: String((attachment && attachment.name) || ("附件 " + (index + 1))),
        };
      })
      .filter(function (a) { return a.dataUrl; });
  } else {
    var singleImage = String((note && note.imageData) || (note && note.imageUrl) || "");
    attachments = singleImage
      ? [{ id: createId(), dataUrl: singleImage, name: "主图" }]
      : [];
  }
  return {
    id: (note && note.id) || createId(),
    type: type,
    title: String((note && note.title) || (type === "image" ? "未命名图片" : "未命名素材")),
    body: String((note && note.body) || ""),
    attachments: attachments,
    tags: tags,
    pinned: Boolean(note && note.pinned),
    favorite: Boolean(note && note.favorite),
    sortOrder: Number((note && note.sortOrder) || (fallbackIndex + 1)),
    createdAt: (note && note.createdAt) || new Date().toISOString(),
    updatedAt: (note && note.updatedAt) || new Date().toISOString(),
  };
}

function setEditorToNew() {
  if (state.mode === "new") {
    var draft = flushEditorState();
    if (draft && (String(draft.title || "").trim() || String(draft.body || "").trim() || getAttachmentList(draft).length)) {
      saveCurrentSafe();
    }
  } else if (state.selectedId) {
    if (flushEditorState()) {
      persist();
    }
  }
  state.mode = "new";
  state.selectedId = null;
  state.draft = blankDraft();
  render();
  els.title.focus();
}

function makeNote(options) {
  var title = options.title;
  var body = options.body;
  var tags = options.tags;
  var attachments = options.attachments;
  var now = new Date().toISOString();
  var normalizedAttachments = Array.isArray(attachments)
    ? attachments
        .filter(Boolean)
        .map(function (attachment, index) {
        return {
          id: (attachment && attachment.id) || createId(),
          dataUrl: String((attachment && attachment.dataUrl) || (attachment && attachment.imageData) || (attachment && attachment.url) || ""),
          name: String((attachment && attachment.name) || ("附件 " + (index + 1))),
        };
      })
        .filter(function (a) { return a.dataUrl; })
    : [];
  return {
    id: createId(),
    type: normalizedAttachments.length ? "image" : "text",
    title: title.trim() || (normalizedAttachments.length ? "未命名图片" : "未命名素材"),
    body: body.trim(),
    attachments: normalizedAttachments,
    tags: tags,
    pinned: false,
    favorite: false,
    sortOrder: state.notes.length + 1,
    createdAt: now,
    updatedAt: now,
  };
}

function activeNotes() {
  var query = state.query.trim().toLowerCase();
  var notes = state.notes.slice();

  if (state.filters && state.filters.length) {
    notes = notes.filter(function (note) {
      var matchText = state.filters.indexOf("text") !== -1 && note.type === "text";
      var matchImage = state.filters.indexOf("image") !== -1 && note.type === "image";
      var matchPinned = state.filters.indexOf("pinned") !== -1 && note.pinned;
      var matchFavorite = state.filters.indexOf("favorite") !== -1 && note.favorite;
      return matchText || matchImage || matchPinned || matchFavorite;
    });
  }

  if (query) {
    notes = notes.filter(function (note) {
      var haystack = [note.title, note.body, (note.tags || []).join(" "), note.type].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  if (state.sort === "created-asc") {
    notes.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
  } else if (state.sort === "created-desc") {
    notes.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  } else if (state.sort === "manual") {
    notes.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  } else {
    notes.sort(function (a, b) {
      var pinnedDiff = Number(b.pinned) - Number(a.pinned);
      if (pinnedDiff !== 0) return pinnedDiff;
      var favoriteDiff = Number(b.favorite) - Number(a.favorite);
      if (favoriteDiff !== 0) return favoriteDiff;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  return notes;
}

function renderStats() {
  els.statTotal.textContent = String(state.notes.length);
  els.statPinned.textContent = String(state.notes.filter(function (n) { return n.pinned; }).length);
  els.statImages.textContent = String(state.notes.filter(function (n) { return n.type === "image"; }).length);
}

function renderTags() {
  var tagCounts = {};
  state.notes.forEach(function (note) {
    (note.tags || []).forEach(function (tag) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  var tags = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; }).slice(0, 14);

  if (tags.length) {
    els.tagCloud.innerHTML = tags
      .map(function (tag) {
        var activeClass = state.query === tag ? " active" : "";
        return '<button class="chip' + activeClass + '" type="button" data-tag="' + escapeHtml(tag) + '" title="右键删除标签">#' + escapeHtml(tag) + ' <span class="tag-count">' + tagCounts[tag] + '</span></button>';
      })
      .join("");
  } else {
    els.tagCloud.innerHTML = '<span class="muted">还没有标签，先给素材补一个吧。</span>';
  }

  els.tagCloud.querySelectorAll("[data-tag]").forEach(function (button) {
    button.addEventListener("click", function () {
      var tag = button.getAttribute("data-tag") || "";
      state.query = tag;
      els.search.value = tag;
      saveUiState();
      render();
    });

    button.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      var tag = button.getAttribute("data-tag") || "";
      if (confirm('Delete tag "' + tag + '" from all cards?')) {
        state.notes.forEach(function (note) {
          note.tags = (note.tags || []).filter(function (t) { return t !== tag; });
          note.updatedAt = new Date().toISOString();
        });
        if (state.query === tag) {
          state.query = "";
          els.search.value = "";
        }
        persist();
        render();
        showToast('已删除标签 "' + tag + '"');
      }
    });
  });
}

function renderFinder() {
  var notes = activeNotes();
  els.resultCount.textContent = notes.length + " / " + state.notes.length;
  els.grid.innerHTML = notes
    .map(function (note) {
      var selected = state.mode === "edit" && note.id === state.selectedId;
      var badges = [
        note.pinned ? "置顶" : null,
        note.favorite ? "收藏" : null,
        note.type === "image" ? "图片" : "文本",
      ]
        .filter(Boolean)
        .map(function (label) { return '<span class="badge-pill">' + escapeHtml(label) + '</span>'; })
        .join("");

      return '<article class="card' + (selected ? " selected" : "") + '" data-id="' + note.id + '">' +
        '<div class="card-body">' +
          '<div class="meta-line">' +
            '<span>' + escapeHtml(formatTime(note.updatedAt)) + '</span>' +
            '<span>' + (note.pinned ? "置顶" : "") + (note.favorite ? " 收藏" : "") + '</span>' +
          '</div>' +
          '<h3 class="card-title">' + escapeHtml(note.title) + '</h3>' +
          '<p class="card-text">' + escapeHtml(note.body || (note.type === "image" ? "图片素材" : "暂无正文")) + '</p>' +
          '<div class="badges">' + badges + '</div>' +
        '</div>' +
      '</article>';
    })
    .join("");

  els.emptyState.classList.toggle("hidden", notes.length !== 0);
}

function renderEditor() {
  var note = state.mode === "new" ? state.draft : currentNote();
  var editingNew = state.mode === "new";
  var attachments = getAttachmentList(note);

  if (els.detailKind) els.detailKind.textContent = editingNew ? "新建内容" : note ? (note.type === "image" ? "图片素材" : "文本素材") : "未选择";
  if (els.editorTitle) els.editorTitle.textContent = editingNew ? "新建内容" : note ? note.title : "主编辑区";
  if (els.title) els.title.value = (note && note.title) || "";
  if (quill) {
    quill.clipboard.dangerouslyPasteHTML((note && note.body) || "");
  } else if (els.body) {
    els.body.innerHTML = (note && note.body) || "";
  }
  if (els.tags) els.tags.value = editingNew
    ? ((note && note._tagsRaw) || "")
    : ((note && note.tags) || []).join(", ");
  if (els.attachmentCount) els.attachmentCount.textContent = attachments.length + " 张";

  if (els.detailAttachments) {
    if (attachments.length) {
      els.detailAttachments.innerHTML = attachments
        .map(function (attachment, index) {
          var altText = escapeHtml(attachment.name || ("附件 " + (index + 1)));
          return '<figure class="attachment-card" data-open-attachment="' + attachment.id + '">' +
            '<img src="' + attachment.dataUrl + '" alt="' + altText + '" />' +
            '<figcaption>' +
              '<span>' + altText + '</span>' +
              '<button class="mini-btn" type="button" data-remove-attachment="' + attachment.id + '">删除</button>' +
            '</figcaption>' +
          '</figure>';
        })
        .join("");
    } else {
      els.detailAttachments.innerHTML = '<div class="muted">当前没有截图附件，粘贴或拖入图片即可追加。</div>';
    }

    els.detailAttachments.querySelectorAll("[data-remove-attachment]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        var attachmentId = button.getAttribute("data-remove-attachment");
        var nextAttachments = attachments.filter(function (a) { return a.id !== attachmentId; });
        setEditorAttachments(nextAttachments);
      });
    });

    els.detailAttachments.querySelectorAll("[data-open-attachment]").forEach(function (card) {
      card.addEventListener("click", function () {
        var attachmentId = card.getAttribute("data-open-attachment");
        var attachment = attachments.find(function (item) { return item.id === attachmentId; });
        if (!attachment) return;
          openImageModal(attachment.dataUrl, attachment.name || (note && note.title) || "图片预览");
      });
    });
  }

  if (els.togglePin) els.togglePin.textContent = (note && note.pinned) ? "取消置顶" : "置顶";
  if (els.toggleFavorite) els.toggleFavorite.textContent = (note && note.favorite) ? "取消收藏" : "收藏";
  if (els.detailMeta) els.detailMeta.textContent = note
    ? "创建于 " + formatTime(note.createdAt || new Date()) + " · 更新于 " + formatTime(note.updatedAt || new Date())
    : "点击右侧卡片可切换到编辑模式，或在左侧新建一条内容。";
}

function renderButtons() {
  els.filterButtons.forEach(function (button) {
    var filterValue = button.dataset.filter;
    var isActive = filterValue === "all" ? state.filters.length === 0 : state.filters.indexOf(filterValue) !== -1;
    button.classList.toggle("active", isActive);
  });
  els.search.value = state.query;
  els.sort.value = state.sort;
  applyTheme();
}

function render() {
  renderButtons();
  renderStats();
  renderTags();
  renderFinder();
  renderEditor();
}

function selectNote(id) {
  if (state.mode === "edit" && state.selectedId) {
    if (flushEditorState()) {
      persist();
    }
  }
  state.mode = "edit";
  state.selectedId = id;
  render();
}

function updateCurrent(patch) {
  if (state.mode === "new") {
    Object.assign(state.draft, patch);
    renderEditor();
    var hasContent = state.draft.title.trim() || state.draft.body.trim() || getAttachmentList(state.draft).length;
    if (!hasContent) return;
    var note = makeNote({
      title: state.draft.title,
      body: state.draft.body,
      tags: parseTags(state.draft._tagsRaw || ""),
      attachments: getAttachmentList(state.draft),
    });
    state.notes.unshift(note);
    state.selectedId = note.id;
    state.mode = "edit";
    state.draft = blankDraft();
    render();
    persist().catch(function (error) { console.error(error); });
    return;
  }
  var note = currentNote();
  if (!note) {
    state.mode = "new";
    state.draft = Object.assign(blankDraft(), patch);
    renderEditor();
    return;
  }
  flushEditorState();
  Object.assign(note, patch, { updatedAt: new Date().toISOString() });
  render();
  persist().catch(function (error) { console.error(error); });
}

async function importData(file) {
  var payload = JSON.parse(await file.text());
  if (payload.note) {
    var imported = normalizeNote(payload.note, state.notes.length);
    var existingIndex = -1;
    for (var i = 0; i < state.notes.length; i++) {
      if (state.notes[i].id === imported.id) {
        existingIndex = i;
        break;
      }
    }
    if (existingIndex >= 0) {
      state.notes[existingIndex] = imported;
      showToast("已更新卡片");
    } else {
      state.notes.unshift(imported);
      showToast("已导入新卡片");
    }
    state.selectedId = imported.id;
    state.mode = "edit";
  } else if (Array.isArray(payload.notes)) {
    var added = 0;
    var updated = 0;
    payload.notes.filter(Boolean).forEach(function (noteItem) {
      var n = normalizeNote(noteItem, state.notes.length);
      var idx = -1;
      for (var j = 0; j < state.notes.length; j++) {
        if (state.notes[j].id === n.id) {
          idx = j;
          break;
        }
      }
      if (idx >= 0) {
        state.notes[idx] = n;
        updated++;
      } else {
        state.notes.unshift(n);
        added++;
      }
    });
    state.selectedId = state.notes[0] ? state.notes[0].id : null;
    state.mode = "edit";
    showToast("已导入 " + added + " 条新卡片，更新 " + updated + " 条卡片");
  } else {
    throw new Error("导入文件格式不正确");
  }
  await persist();
  render();
}

function saveCurrentSafe() {
  var source = flushEditorState();

  if (state.mode === "new") {
    var draft = source || currentEditorData();
    if (!draft.title.trim() && !draft.body.trim() && !getAttachmentList(draft).length) {
      showToast("没有可保存的内容");
      return;
    }

    var note = makeNote({
      title: draft.title,
      body: draft.body,
      tags: Array.isArray(draft.tags) ? draft.tags : parseTags(draft._tagsRaw || ""),
      attachments: getAttachmentList(draft),
    });

    state.notes.unshift(note);
    state.selectedId = note.id;
    state.mode = "edit";
    state.draft = blankDraft();
    persist();
    showToast("已保存当前卡片");
    render();
    return;
  }

  if (!source) {
    showToast("没有可保存的内容");
    return;
  }

  persist();
  showToast("已保存");
  render();
}

async function copyCurrentSafe() {
  var note = readEditorSource();
  var attachments = getAttachmentList(note);
  var text = [
    note.title,
    quill ? quill.getText() : note.body,
    note.tags && note.tags.length ? "标签：" + note.tags.join("，") : "",
    attachments.length ? "截图：" + attachments.length + " 张" : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(text || note.title || note.body || "");
    showToast("已复制");
  } catch (e) {
    showToast("复制失败");
  }
}

async function exportDataSafe() {
  var source = readEditorSource();

  if (state.mode === "edit") {
    var current = flushEditorState();
    if (current) {
      await persist();
      source = current;
    }
  } else if (state.mode === "new") {
    var draft = source;
    var hasDraftContent =
      draft &&
      (String(draft.title || "").trim() || String(draft.body || "").trim() || getAttachmentList(draft).length);
    if (hasDraftContent) {
      var note = makeNote({
        title: draft.title,
        body: draft.body,
        tags: Array.isArray(draft.tags) ? draft.tags : parseTags(draft._tagsRaw || ""),
        attachments: getAttachmentList(draft),
      });
      state.notes.unshift(note);
      state.selectedId = note.id;
      state.mode = "edit";
      state.draft = blankDraft();
      await persist();
      source = note;
      render();
      showToast("已保存当前卡片，准备导出");
    }
  }

  var hasContent =
    source &&
    (String(source.title || "").trim() || String(source.body || "").trim() || getAttachmentList(source).length);
  if (!hasContent) {
    showToast("先写点内容再导出");
    return;
  }

  var note = normalizeNote(source);
  var data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), note: note }, null, 2);
  var blob = new Blob([data], { type: "application/json;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = (note.title || "未命名") + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("已导出 " + a.download);
}

function togglePin() {
  if (state.mode === "new") {
    showToast("新建内容保存后再置顶");
    return;
  }
  var note = currentNote();
  if (!note) return;
  updateCurrent({ pinned: !note.pinned });
}

function toggleFavorite() {
  if (state.mode === "new") {
    showToast("新建内容保存后再收藏");
    return;
  }
  var note = currentNote();
  if (!note) return;
  updateCurrent({ favorite: !note.favorite });
}

function moveSelected(delta) {
  if (state.mode === "new") {
    showToast("新建内容保存后才能调整顺序");
    return;
  }
  flushEditorState();
  var index = state.notes.findIndex(function (note) { return note.id === state.selectedId; });
  if (index === -1) return;
  var nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= state.notes.length) return;
  var item = state.notes.splice(index, 1)[0];
  state.notes.splice(nextIndex, 0, item);
  state.notes.forEach(function (note, order) {
    note.sortOrder = order + 1;
    note.updatedAt = new Date().toISOString();
  });
  persist().catch(function (error) { console.error(error); });
  render();
}

function deleteCurrent() {
  if (state.mode === "new") {
    state.draft = blankDraft();
    render();
    showToast("草稿已清空");
    return;
  }
  flushEditorState();
  var note = currentNote();
  if (!note) return;
  var ok = confirm("删除「" + note.title + "」？");
  if (!ok) return;
  state.notes = state.notes.filter(function (item) { return item.id !== note.id; });
  state.selectedId = state.notes[0] ? state.notes[0].id : null;
  persist().catch(function (error) { console.error(error); });
  showToast("已删除");
  render();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveUiState();
  render();
  showToast(state.theme === "dark" ? "已切换为暗黑模式" : "已切换为浅色模式");
}

function seedExample() {
  if (state.notes.length) {
    showToast("当前已有素材，示例未重复插入");
    return;
  }
  state.notes = [
    {
      id: createId(),
      type: "text",
      title: "需求摘录",
      body: "先把临时内容放在这里，后面再整理成正式文档。",
      attachments: [],
      tags: ["工作", "待审"],
      pinned: true,
      favorite: false,
      sortOrder: 1,
      createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: createId(),
      type: "image",
      title: "参考截图",
      body: "先拖一张截图进来，后面再继续标注和搜索。",
      attachments: [
        {
          id: createId(),
          dataUrl:
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
              '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
              '<stop offset="0%" stop-color="#2d7c73"/>' +
              '<stop offset="100%" stop-color="#f0b34f"/>' +
              '</linearGradient></defs>' +
              '<rect width="640" height="360" rx="36" fill="#f6efe4"/>' +
              '<rect x="34" y="34" width="572" height="292" rx="28" fill="url(#g)" opacity="0.92"/>' +
              '<circle cx="500" cy="100" r="72" fill="rgba(255,255,255,0.18)"/>' +
              '<rect x="90" y="124" width="238" height="20" rx="10" fill="rgba(255,255,255,0.86)"/>' +
              '<rect x="90" y="162" width="310" height="14" rx="7" fill="rgba(255,255,255,0.75)"/>' +
              '<rect x="90" y="188" width="270" height="14" rx="7" fill="rgba(255,255,255,0.65)"/>' +
              '<text x="90" y="258" fill="white" font-size="26" font-family="Arial, sans-serif">参考截图</text>' +
              '</svg>'
            ),
          name: "示例图 1",
        },
      ],
      tags: ["截图", "参考"],
      pinned: false,
      favorite: true,
      sortOrder: 2,
      createdAt: new Date(Date.now() - 1000 * 60 * 66).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  ];
  state.selectedId = state.notes[0].id;
  state.mode = "edit";
  persist().then(function () { render(); });
  showToast("已插入示例内容");
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result)); };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

async function handleIncomingImage(dataUrl, title) {
  if (title === undefined) title = "截图素材";
  if (state.mode === "new") {
    state.draft.attachments = getAttachmentList(state.draft).concat([{ id: createId(), dataUrl: dataUrl, name: title }]);
    if (!state.draft.title.trim()) state.draft.title = title;
    renderEditor();
    showToast("已添加到草稿");
    return;
  }
  var note = currentNote();
  if (!note) {
    state.mode = "new";
    state.draft = Object.assign({}, blankDraft(), {
      title: title,
      _tagsRaw: "",
      attachments: [{ id: createId(), dataUrl: dataUrl, name: title }],
    });
    render();
    showToast("已加入新草稿");
    return;
  }
  var attachments = getAttachmentList(note).concat([{ id: createId(), dataUrl: dataUrl, name: title }]);
  updateCurrent({ type: "image", attachments: attachments, title: note.title || title });
}

function wireEvents() {
  els.grid.addEventListener("click", function (event) {
    var card = event.target.closest("[data-id]");
    if (card) {
      selectNote(card.getAttribute("data-id"));
    }
  });

  els.newNote.addEventListener("click", setEditorToNew);
  els.copyCurrent.addEventListener("click", copyCurrentSafe);
  els.copySummary.addEventListener("click", copyCurrentSafe);
  els.togglePin.addEventListener("click", togglePin);
  els.toggleFavorite.addEventListener("click", toggleFavorite);
  els.moveUp.addEventListener("click", function () { moveSelected(-1); });
  els.moveDown.addEventListener("click", function () { moveSelected(1); });
  els.deleteNote.addEventListener("click", deleteCurrent);
  els.toggleTheme.addEventListener("click", toggleTheme);
  els.imageModalCopy.addEventListener("click", copyImageFromModal);
  els.imageModalClose.addEventListener("click", closeImageModal);
  els.imageModal.addEventListener("click", function (event) {
    if (event.target === els.imageModal) {
      closeImageModal();
    }
  });
  els.exportBtn.addEventListener("click", exportDataSafe);
  els.importBtn.addEventListener("click", function () { els.importFile.click(); });

  els.importFile.addEventListener("change", async function () {
    var file = els.importFile.files && els.importFile.files[0];
    if (!file) return;
    try {
      await importData(file);
    } catch (error) {
      console.error(error);
      showToast(error.message || "导入失败");
    } finally {
      els.importFile.value = "";
    }
  });

  els.search.addEventListener("input", function (event) {
    state.query = event.target.value;
    saveUiState();
    render();
  });

  els.sort.addEventListener("change", function (event) {
    state.sort = event.target.value;
    saveUiState();
    render();
  });

  els.filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filterValue = button.dataset.filter;
      if (filterValue === "all") {
        state.filters = [];
      } else {
        var index = state.filters.indexOf(filterValue);
        if (index === -1) {
          state.filters.push(filterValue);
        } else {
          state.filters.splice(index, 1);
        }
      }
      saveUiState();
      render();
    });
  });

  els.saveNote.addEventListener("click", saveCurrentSafe);

  els.tags.addEventListener("input", function () {
    if (state.mode === "new") {
      state.draft._tagsRaw = els.tags.value;
    }
  });

  els.dropzone.addEventListener("dragover", function (event) {
    event.preventDefault();
    els.dropzone.style.borderColor = "rgba(201, 107, 63, 0.55)";
  });

  els.dropzone.addEventListener("dragleave", function () {
    els.dropzone.style.borderColor = "rgba(45, 124, 115, 0.26)";
  });

  els.dropzone.addEventListener("drop", async function (event) {
    event.preventDefault();
    els.dropzone.style.borderColor = "rgba(45, 124, 115, 0.26)";
    var files = Array.from(event.dataTransfer.files).filter(function (file) { return file.type.startsWith("image/"); });
    if (!files.length) {
      showToast("这里只接受图片文件");
      return;
    }
    for (var i = 0; i < files.length; i++) {
      var dataUrl = await readFileAsDataUrl(files[i]);
      await handleIncomingImage(dataUrl, files[i].name.replace(/\.[^.]+$/, ""));
    }
  });

  document.addEventListener("paste", async function (event) {
    var items = Array.from((event.clipboardData && event.clipboardData.items) || []);
    var imageItem = items.find(function (item) { return item.type.startsWith("image/"); });
    if (!imageItem) return;
    var file = imageItem.getAsFile();
    if (!file) return;
    var dataUrl = await readFileAsDataUrl(file);
    await handleIncomingImage(dataUrl, "粘贴图片");
    event.preventDefault();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (!els.imageModal.classList.contains("hidden")) {
        closeImageModal();
        return;
      }
      if (document.activeElement && ["INPUT", "TEXTAREA"].indexOf(document.activeElement.tagName) !== -1) {
        document.activeElement.blur();
      } else if (state.mode === "new") {
        state.draft = blankDraft();
        render();
      }
    }
  });
}

async function boot() {
  try {
    loadUiState();
    await loadState();
    if (!state.notes.length) {
      await persist();
    }
    initEditorSurface();
    wireEvents();
    render();
  } catch (error) {
    console.error(error);
    showToast("页面启动失败");
  }
}

document.addEventListener("DOMContentLoaded", function() {
  boot();
});

