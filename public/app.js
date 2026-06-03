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
  langToggle: document.getElementById("lang-toggle"),
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

// ============ i18n ============
const I18N = {
  current: "zh",
  dict: {},

  detect() {
    var saved = localStorage.getItem("i18n-lang");
    if (saved === "en" || saved === "zh") return saved;
    var lang = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (lang.indexOf("zh") === 0) return "zh";
    return "zh";
  },

  async init() {
    this.current = this.detect();
    await this.loadDict();
    this.applyAll();
  },

  async loadDict() {
    try {
      var res = await fetch("/i18n/" + this.current + ".json");
      if (res.ok) this.dict = await res.json();
      else this.dict = {};
    } catch (e) {
      this.dict = {};
    }
  },

  t(key, params) {
    var text = this.dict[key] || key;
    if (params) {
      Object.keys(params).forEach(function(k) {
        text = text.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
      });
    }
    return text;
  },

  applyAll() {
    this.apply();
    this.applyPlaceholders();
    this.applySelects();
    this.applyTitles();
    this.applyQuillPlaceholder();
    document.documentElement.lang = this.current === "zh" ? "zh-CN" : "en";
  },

  apply() {
    var self = this;
    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      var text = self.t(key);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = text;
      } else {
        el.textContent = text;
      }
    });
  },

  applyPlaceholders() {
    var self = this;
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
      el.placeholder = self.t(el.getAttribute("data-i18n-placeholder"));
    });
  },

  applyTitles() {
    var self = this;
    document.querySelectorAll("[data-i18n-title]").forEach(function(el) {
      el.title = self.t(el.getAttribute("data-i18n-title"));
    });
  },

  applySelects() {
    var self = this;
    var sort = document.getElementById("sort");
    if (sort) {
      sort.querySelectorAll("option[data-i18n]").forEach(function(opt) {
        opt.textContent = self.t(opt.getAttribute("data-i18n"));
      });
    }
  },

  applyQuillPlaceholder() {
    if (quill) {
      var ph = this.t("placeholder-body");
      quill.root.setAttribute("data-placeholder", ph);
    }
  },

  async toggle() {
    var next = this.current === "zh" ? "en" : "zh";
    this.current = next;
    localStorage.setItem("i18n-lang", next);
    await this.loadDict();
    this.applyAll();
    render();
    showToast(I18N.t("toast-lang-switch"));
  }
};

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
      placeholder: I18N.t("placeholder-body"),
      modules: {
        toolbar: [
          ["undo", "redo"],
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
  var locale = I18N.current === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(locale, {
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
  if (state.theme === "light") {
    els.toggleTheme.textContent = I18N.t("theme-light");
  } else if (state.theme === "warm") {
    els.toggleTheme.textContent = I18N.t("theme-warm");
  } else {
    els.toggleTheme.textContent = I18N.t("theme-dark");
  }
}

function openImageModal(dataUrl, title) {
  els.imageModalTitle.textContent = title || I18N.t("toast-image-preview");
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
    showToast(I18N.t("no-image-to-copy"));
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
      var blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob }),
      ]);
      showToast(I18N.t("toast-image-copied"));
      return;
    }
    await navigator.clipboard.writeText(dataUrl);
    showToast(I18N.t("toast-image-copy-fallback"));
  } catch (error) {
    console.error(error);
    showToast(I18N.t("toast-copy-failed"));
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
    return [{ id: createId(), dataUrl: note.imageData, name: I18N.t("main-image") }];
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
      name: String((attachment && attachment.name) || I18N.t("attachment-fallback", { n: index + 1 })),
    };
  })
  .filter(function (a) { return a.dataUrl; });
} else {
  var singleImage = String((note && note.imageData) || (note && note.imageUrl) || "");
  attachments = singleImage
    ? [{ id: createId(), dataUrl: singleImage, name: I18N.t("main-image") }]
      : [];
  }
  return {
    id: (note && note.id) || createId(),
    type: type,
    title: String((note && note.title) || (type === "image" ? I18N.t("untitled-image") : I18N.t("untitled-note"))),
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
          name: String((attachment && attachment.name) || I18N.t("attachment-fallback", { n: index + 1 })),
        };
      })
        .filter(function (a) { return a.dataUrl; })
    : [];
  return {
    id: createId(),
    type: normalizedAttachments.length ? "image" : "text",
    title: title.trim() || (normalizedAttachments.length ? I18N.t("untitled-image") : I18N.t("untitled-note")),
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
        return '<button class="chip' + activeClass + '" type="button" data-tag="' + escapeHtml(tag) + '" title="' + I18N.t("tag-hint") + '">#' + escapeHtml(tag) + ' <span class="tag-count">' + tagCounts[tag] + '</span></button>';
      })
      .join("");
  } else {
    els.tagCloud.innerHTML = '<span class="muted">' + I18N.t("tag-empty") + '</span>';
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
        if (confirm(I18N.t("confirm-delete-tag", { tag: tag }))) {
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
          showToast(I18N.t("tag-deleted", { tag: tag }));
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
        note.pinned ? I18N.t("filter-pinned") : null,
        note.favorite ? I18N.t("filter-favorite") : null,
        note.type === "image" ? I18N.t("filter-image") : I18N.t("filter-text"),
      ]
        .filter(Boolean)
        .map(function (label) { return '<span class="badge-pill">' + escapeHtml(label) + '</span>'; })
        .join("");

      return '<article class="card' + (selected ? " selected" : "") + '" data-id="' + note.id + '">' +
        '<div class="card-body">' +
          '<div class="meta-line">' +
            '<span>' + escapeHtml(formatTime(note.updatedAt)) + '</span>' +
            '<span>' + (note.pinned ? I18N.t("filter-pinned") : "") + (note.favorite ? " " + I18N.t("filter-favorite") : "") + '</span>' +
          '</div>' +
          '<h3 class="card-title">' + escapeHtml(note.title) + '</h3>' +
          '<p class="card-text">' + escapeHtml(note.body || (note.type === "image" ? I18N.t("detail-kind-image") : I18N.t("no-body"))) + '</p>' +
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

  if (els.detailKind) els.detailKind.textContent = editingNew ? I18N.t("detail-kind-new") : note ? (note.type === "image" ? I18N.t("detail-kind-image") : I18N.t("detail-kind-text")) : I18N.t("detail-none");
  if (els.editorTitle) els.editorTitle.textContent = editingNew ? I18N.t("detail-kind-new") : note ? note.title : I18N.t("eyebrow-editor");
  if (els.title) els.title.value = (note && note.title) || "";
  if (quill) {
    quill.clipboard.dangerouslyPasteHTML((note && note.body) || "");
  } else if (els.body) {
    els.body.innerHTML = (note && note.body) || "";
  }
  if (els.tags) els.tags.value = editingNew
    ? ((note && note._tagsRaw) || "")
    : ((note && note.tags) || []).join(", ");
  if (els.attachmentCount) els.attachmentCount.textContent = attachments.length + I18N.t("attachment-unit");

  if (els.detailAttachments) {
    if (attachments.length) {
      els.detailAttachments.innerHTML = attachments
        .map(function (attachment, index) {
          var altText = escapeHtml(attachment.name || I18N.t("attachment-fallback", { n: index + 1 }));
          return '<figure class="attachment-card" data-open-attachment="' + attachment.id + '">' +
            '<img src="' + attachment.dataUrl + '" alt="' + altText + '" />' +
            '<figcaption>' +
              '<span>' + altText + '</span>' +
              '<button class="mini-btn" type="button" data-remove-attachment="' + attachment.id + '">' + I18N.t("delete-attachment") + '</button>' +
            '</figcaption>' +
          '</figure>';
        })
        .join("");
    } else {
      els.detailAttachments.innerHTML = '<div class="muted">' + I18N.t("no-attachment") + '</div>';
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
          openImageModal(attachment.dataUrl, attachment.name || (note && note.title) || I18N.t("img-preview-title"));
      });
    });
  }

  if (els.togglePin) els.togglePin.textContent = (note && note.pinned) ? I18N.t("unpin") : I18N.t("btn-pin");
  if (els.toggleFavorite) els.toggleFavorite.textContent = (note && note.favorite) ? I18N.t("unfavorite") : I18N.t("btn-favorite");
  if (els.detailMeta) els.detailMeta.textContent = note
    ? I18N.t("created-at") + " " + formatTime(note.createdAt || new Date()) + I18N.t("sep") + I18N.t("updated-at") + " " + formatTime(note.updatedAt || new Date())
    : I18N.t("meta-no-note");
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
      showToast(I18N.t("import-updated"));
    } else {
      state.notes.unshift(imported);
      showToast(I18N.t("toast-imported"));
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
    showToast(I18N.t("import-batch", { added: added, updated: updated }));
  } else {
    throw new Error(I18N.t("import-format-error"));
  }
  await persist();
  render();
}

function saveCurrentSafe() {
  var source = flushEditorState();

  if (state.mode === "new") {
    var draft = source || currentEditorData();
    if (!draft.title.trim() && !draft.body.trim() && !getAttachmentList(draft).length) {
      showToast(I18N.t("toast-no-content"));
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
    showToast(I18N.t("saved-card"));
    render();
    return;
  }

  if (!source) {
    showToast(I18N.t("toast-no-content"));
    return;
  }

  persist();
  showToast(I18N.t("toast-saved"));
  render();
}

async function copyCurrentSafe() {
  var note = readEditorSource();
  var attachments = getAttachmentList(note);
  var text = [
    note.title,
    quill ? quill.getText() : note.body,
    note.tags && note.tags.length ? I18N.t("tag-label") + note.tags.join(I18N.current === "zh" ? "，" : ", ") : "",
    attachments.length ? I18N.t("screenshot-count", { n: attachments.length }) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(text || note.title || note.body || "");
    showToast(I18N.t("toast-copied"));
  } catch (e) {
    showToast(I18N.t("toast-copy-failed"));
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
      showToast(I18N.t("toast-exporting"));
    }
  }

  var hasContent =
    source &&
    (String(source.title || "").trim() || String(source.body || "").trim() || getAttachmentList(source).length);
  if (!hasContent) {
    showToast(I18N.t("toast-write-first"));
    return;
  }

  var note = normalizeNote(source);
  var data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), note: note }, null, 2);
  var blob = new Blob([data], { type: "application/json;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = (note.title || I18N.t("export-unnamed")) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(I18N.t("exported-file", { file: a.download }));
}

function togglePin() {
  if (state.mode === "new") {
    showToast(I18N.t("toast-save-first"));
    return;
  }
  var note = currentNote();
  if (!note) return;
  updateCurrent({ pinned: !note.pinned });
}

function toggleFavorite() {
  if (state.mode === "new") {
    showToast(I18N.t("toast-pin-after-save"));
    return;
  }
  var note = currentNote();
  if (!note) return;
  updateCurrent({ favorite: !note.favorite });
}

function moveSelected(delta) {
  if (state.mode === "new") {
    showToast(I18N.t("toast-move-after-save"));
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
    showToast(I18N.t("toast-draft-cleared"));
    return;
  }
  flushEditorState();
  var note = currentNote();
  if (!note) return;
  var ok = confirm(I18N.t("confirm-delete-note", { title: note.title }));
  if (!ok) return;
  state.notes = state.notes.filter(function (item) { return item.id !== note.id; });
  state.selectedId = state.notes[0] ? state.notes[0].id : null;
  persist().catch(function (error) { console.error(error); });
  showToast(I18N.t("toast-deleted"));
  render();
}

function toggleTheme() {
  if (state.theme === "light") {
    state.theme = "warm";
  } else if (state.theme === "warm") {
    state.theme = "dark";
  } else {
    state.theme = "light";
  }
  saveUiState();
  render();
  if (state.theme === "light") {
    showToast(I18N.t("theme-switched-light"));
  } else if (state.theme === "warm") {
    showToast(I18N.t("theme-switched-warm"));
  } else {
    showToast(I18N.t("theme-switched-dark"));
  }
}

function seedExample() {
  if (state.notes.length) {
    showToast(I18N.t("toast-example-exists"));
    return;
  }
  state.notes = [
    {
      id: createId(),
      type: "text",
      title: I18N.t("example-title-text"),
      body: I18N.t("example-body-text"),
      attachments: [],
      tags: [I18N.t("example-tag-work"), I18N.t("example-tag-pending")],
      pinned: true,
      favorite: false,
      sortOrder: 1,
      createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: createId(),
      type: "image",
      title: I18N.t("example-title-image"),
      body: I18N.t("example-body-image"),
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
              '<text x="90" y="258" fill="white" font-size="26" font-family="Arial, sans-serif">' + I18N.t("example-svg-text") + '</text>' +
              '</svg>'
            ),
          name: I18N.t("example-attachment-name"),
        },
      ],
      tags: [I18N.t("example-tag-screenshot"), I18N.t("example-tag-reference")],
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
  showToast(I18N.t("toast-example-added"));
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
  if (title === undefined) title = I18N.t("screenshot-material");
  if (state.mode === "new") {
    state.draft.attachments = getAttachmentList(state.draft).concat([{ id: createId(), dataUrl: dataUrl, name: title }]);
    if (!state.draft.title.trim()) state.draft.title = title;
    renderEditor();
    showToast(I18N.t("toast-draft-added"));
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
    showToast(I18N.t("toast-new-draft"));
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
      showToast(error.message || I18N.t("import-failed"));
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

  els.langToggle.addEventListener("click", function () {
    I18N.toggle();
  });

  els.tags.addEventListener("input", function () {
    if (state.mode === "new") {
      state.draft._tagsRaw = els.tags.value;
    }
  });

  els.dropzone.addEventListener("dragenter", function (event) {
    event.preventDefault();
    els.dropzone.classList.add("drag-over");
    els.dropzone._dragCounter = (els.dropzone._dragCounter || 0) + 1;
    var files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length && files[0].type.startsWith("image/")) {
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function (e) {
        var preview = els.dropzone.querySelector(".dz-preview");
        if (preview) preview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  els.dropzone.addEventListener("dragleave", function (event) {
    els.dropzone._dragCounter = (els.dropzone._dragCounter || 0) - 1;
    if (els.dropzone._dragCounter <= 0) {
      els.dropzone._dragCounter = 0;
      els.dropzone.classList.remove("drag-over");
      var preview = els.dropzone.querySelector(".dz-preview");
      if (preview) preview.src = "";
    }
  });

  els.dropzone.addEventListener("dragover", function (event) {
    event.preventDefault();
    var files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length && files[0].type.startsWith("image/")) {
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function (e) {
        var preview = els.dropzone.querySelector(".dz-preview");
        if (preview) preview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  els.dropzone.addEventListener("drop", async function (event) {
    event.preventDefault();
    els.dropzone._dragCounter = 0;
    els.dropzone.classList.remove("drag-over");
    var preview = els.dropzone.querySelector(".dz-preview");
    if (preview) preview.src = "";
    var files = Array.from(event.dataTransfer.files).filter(function (file) { return file.type.startsWith("image/"); });
    if (!files.length) {
      showToast(I18N.t("toast-image-needed"));
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
    await handleIncomingImage(dataUrl, I18N.t("paste-image"));
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
    await I18N.init();
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
    showToast(I18N.t("boot-failed"));
  }
}

document.addEventListener("DOMContentLoaded", function() {
  boot();
});

