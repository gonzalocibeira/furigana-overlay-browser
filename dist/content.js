"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/definitions.ts
  function dictionaryURL(language, word) {
    return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(word)}#${language === "en" ? "Japanese" : "\u65E5\u672C\u8A9E"}`;
  }
  function definitionText(html, language) {
    const template = document.createElement("template");
    template.innerHTML = html;
    let japanese = false, partOfSpeech = false;
    const out = [];
    const clean = (element) => {
      const copy = element.cloneNode(true);
      copy.querySelectorAll("script,style,iframe,img,video,audio,svg,ul,ol,dl,table,rt,rp,.mw-editsection,.reference,.citation-whole,.quotation,.h-usage-example").forEach((node) => node.remove());
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    };
    for (const element of template.content.querySelectorAll("h2,h3,h4,h5,h6,ol")) {
      if (element.closest("table,dl,.toc")) continue;
      if (element.tagName === "H2") {
        japanese = /^(Japanese|日本語)(?:\s|$)/u.test(clean(element));
        partOfSpeech = false;
        continue;
      }
      if (!japanese) continue;
      if (element.tagName !== "OL") {
        const heading = clean(element);
        if (!/^語義(?:\s|$)/u.test(heading)) partOfSpeech = /^(Noun|Proper noun|Verb|Adjective|Adverb|Pronoun|Particle|Conjunction|Interjection|Prefix|Suffix|Counter|Numeral|Determiner|Phrase|Proverb|Idiom|Affix|名詞|固有名詞|動詞|形容詞|形容動詞|副詞|代名詞|助詞|接続詞|感動詞|接頭辞|接尾辞|助数詞|数詞|連体詞|成句|熟語|ことわざ|熟字訓|語素)(?:\s|[:：0-9０-９]|$)/u.test(heading);
        continue;
      }
      if (!partOfSpeech || element.parentElement?.closest("ol,ul")) continue;
      for (const item of element.querySelectorAll("li")) {
        if (item.parentElement?.tagName !== "OL" || item.closest("ul")) continue;
        const value = clean(item).slice(0, 600);
        if (value && !out.includes(value)) out.push(value);
        if (out.length === 4) return out;
      }
    }
    return out;
  }
  var init_definitions = __esm({
    "src/definitions.ts"() {
      "use strict";
    }
  });

  // src/reading-panel.ts
  function readingLines(runs) {
    const rows = [];
    for (const run of [...runs].sort((a, b) => a.top - b.top || a.left - b.left)) {
      const row = rows.at(-1);
      if (row && Math.abs(run.top - row[0].top) <= 3) row.push(run);
      else rows.push([run]);
    }
    return rows.map((row) => {
      let text = "", right = -Infinity;
      const readings = [];
      const words = [];
      for (const run of row.sort((a, b) => a.left - b.left)) {
        if (text && run.left - right > 3 && !/\s$/.test(text) && !/^\s/.test(run.text)) text += " ";
        const offset = text.length;
        text += run.text;
        right = run.right;
        for (const part of run.readings) readings.push({ ...part, start: part.start + offset, end: part.end + offset });
        for (const word of run.words ?? []) words.push({ ...word, start: word.start + offset, end: word.end + offset });
      }
      return { text, readings, ...row.some((run) => run.words) ? { words } : {} };
    });
  }
  var ReadingPanel;
  var init_reading_panel = __esm({
    "src/reading-panel.ts"() {
      "use strict";
      init_definitions();
      ReadingPanel = class {
        host = document.createElement("fob-reading-view");
        root = this.host.attachShadow({ mode: "closed" });
        content;
        status;
        context = "";
        scrollTop = 0;
        definition;
        lookupVersion = 0;
        selected;
        definitions = /* @__PURE__ */ new Map();
        constructor(close) {
          this.root.innerHTML = `<style>
:host{all:initial!important;position:fixed!important;right:12px!important;top:var(--reader-top,100px)!important;bottom:12px!important;width:min(420px,calc(100vw - 24px))!important;z-index:2147483647!important;display:block!important;contain:layout style!important;color-scheme:light!important}*{box-sizing:border-box}.reader{height:100%;display:flex;flex-direction:column;background:#fffdf7;color:#193f3c;border:1px solid #cbd8ce;border-radius:16px;box-shadow:0 8px 36px #193f3c26;overflow:hidden;font:13px/1.5 system-ui,sans-serif}.reader.high{color:#101010;background:#fff}.header{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #dfe7e0}h2{font:700 16px/1.3 system-ui;margin:0}small{display:block;color:#647572;font-size:11px;margin-top:3px}button{margin-left:auto;flex:none;background:transparent;border:1px solid #cbd8ce;border-radius:8px;color:inherit;cursor:pointer;padding:6px 9px;font:600 12px system-ui}button:focus-visible,.content:focus-visible{outline:2px solid #c28637;outline-offset:-3px}.content{padding:18px 22px 28px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;font:20px system-ui,sans-serif;user-select:text}.line{margin:0;line-height:var(--reader-spacing,2.8);white-space:pre-wrap;overflow-wrap:anywhere}ruby{ruby-position:over;ruby-align:center}rt{font:var(--reader-ruby,.5em)/1 system-ui,sans-serif}.empty{font:13px/1.6 system-ui;color:#647572}.status{margin:0;padding:10px 18px;border-top:1px solid #dfe7e0;color:#647572;font-size:11px}@media print{:host{display:none!important}}
.word{display:inline;margin:0;padding:0;border:0;border-radius:3px;font:inherit;line-height:inherit;color:inherit;white-space:inherit;user-select:text}.word:hover,.word[aria-pressed=true]{background:#e4ebde;text-decoration:underline;text-decoration-color:#b18a46;text-underline-offset:5px}.word:focus-visible{outline-offset:2px}.definition[hidden]{display:none}.definition{flex:none;max-height:44%;overflow:auto;padding:14px 18px;border-top:1px solid #cbd8ce;background:#f3f6ee}.high .definition{background:#fff}.definition header{display:flex;align-items:center;gap:8px}.definition h3{font-size:18px;margin:0;overflow-wrap:anywhere}.definition h4{margin:12px 0 4px;font-size:12px}.definition p{margin:4px 0;overflow-wrap:anywhere}.definition ol{margin:4px 0;padding-left:20px}.definition a{color:inherit;text-underline-offset:2px}.definition .source{font-size:10px;color:#647572}.definition .pronunciation{font-size:12px;color:#647572}.definition .feedback{font-size:12px;color:#647572}
</style><section class="reader" role="region" aria-label="Furigana reading view"><header class="header"><div><h2>Reading view</h2><small>Click a word for English / \u65E5\u672C\u8A9E definitions online</small></div><button type="button" aria-label="Close reading view">Close</button></header><div class="content" tabindex="0" aria-label="Document reading text" lang="ja"></div><section class="definition" aria-label="Word definition" aria-live="polite" hidden></section><p class="status" role="status" aria-live="polite"></p></section>`;
          this.content = this.root.querySelector(".content");
          this.status = this.root.querySelector(".status");
          this.definition = this.root.querySelector(".definition");
          this.root.querySelector("button").addEventListener("click", close);
          this.content.addEventListener("click", (event) => {
            const button = event.target.closest(".word");
            const selection = this.root.getSelection?.() ?? window.getSelection();
            if (button && (selection?.isCollapsed ?? true)) void this.define(button);
          });
          this.root.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !this.definition.hidden) {
              event.preventDefault();
              this.dismissDefinition(true);
            }
          });
        }
        owns(event) {
          return event.composedPath().includes(this.host);
        }
        loading(show, text) {
          this.dismissDefinition();
          if (!show) {
            this.host.remove();
            this.content.replaceChildren();
            this.context = "";
            this.scrollTop = 0;
            return;
          }
          if (!this.host.isConnected) document.documentElement.append(this.host);
          if (this.content.childElementCount && !this.content.querySelector(".empty")) this.scrollTop = this.content.scrollTop;
          const p = document.createElement("p");
          p.className = "empty";
          p.textContent = text;
          this.content.replaceChildren(p);
          this.status.textContent = "Only the active page\u2019s visible text is processed.";
        }
        display(runs, context, settings, appearance2, top, limited) {
          this.dismissDefinition();
          this.host.style.setProperty("--reader-top", `${Math.max(12, Math.min(top, innerHeight - 180))}px`);
          this.host.style.setProperty("--reader-spacing", String(settings.spacing));
          this.host.style.setProperty("--reader-ruby", `${0.5 * appearance2.scale}em`);
          this.root.querySelector(".reader").classList.toggle("high", appearance2.contrast === "high");
          const fragment = document.createDocumentFragment();
          for (const line of readingLines(runs)) {
            const p = document.createElement("p");
            p.className = "line";
            let cursor = 0;
            const words = (line.words ?? []).map((word) => ({ ...word }));
            for (const part of line.readings) {
              const first = words.findIndex((word) => word.end > part.start && word.start < part.end);
              if (first < 0) continue;
              let last = first;
              while (last + 1 < words.length && words[last + 1].start < part.end) last++;
              if (last > first) {
                words[first].end = words[last].end;
                words[first].lemma = line.text.slice(words[first].start, words[first].end);
                words[first].reading = "";
                words.splice(first + 1, last - first);
              }
            }
            const append = (target, start, end) => {
              let position = start;
              for (const part of line.readings) {
                if (!part.reading || part.start < position || part.end > end) continue;
                target.append(document.createTextNode(line.text.slice(position, part.start)));
                const ruby = document.createElement("ruby");
                ruby.append(document.createTextNode(line.text.slice(part.start, part.end)));
                const rt = document.createElement("rt");
                rt.textContent = part.reading;
                ruby.append(rt);
                target.append(ruby);
                position = part.end;
              }
              target.append(document.createTextNode(line.text.slice(position, end)));
            };
            for (const word of words) {
              if (word.start < cursor || word.end > line.text.length) continue;
              append(p, cursor, word.start);
              const button = document.createElement("button");
              button.type = "button";
              button.className = "word";
              const surface = line.text.slice(word.start, word.end);
              button.dataset.word = word.lemma;
              button.dataset.surface = surface;
              button.dataset.reading = word.reading;
              button.setAttribute("aria-label", `Define ${surface} in English and Japanese`);
              button.setAttribute("aria-pressed", "false");
              button.title = `${surface} \xB7 English / \u65E5\u672C\u8A9E definitions`;
              append(button, word.start, word.end);
              p.append(button);
              cursor = word.end;
            }
            append(p, cursor, line.text.length);
            fragment.append(p);
          }
          if (!runs.length) {
            const p = document.createElement("p");
            p.className = "empty";
            p.textContent = "No readable text is available in this view.";
            fragment.append(p);
          }
          this.content.replaceChildren(fragment);
          this.content.scrollTop = context === this.context ? this.scrollTop : 0;
          this.context = context;
          this.status.textContent = `${context === "pageless" ? "Visible document text" : "Active page \xB7 visible text"} \xB7 Text-only view${limited ? " \xB7 View limit reached" : ""}.`;
        }
        unavailable(text) {
          this.loading(true, text);
        }
        dismissDefinition(focus = false) {
          this.lookupVersion++;
          this.definition.hidden = true;
          this.definition.replaceChildren();
          this.selected?.setAttribute("aria-pressed", "false");
          if (focus) this.selected?.focus();
          this.selected = void 0;
        }
        async define(button) {
          this.dismissDefinition();
          const version = this.lookupVersion;
          this.selected = button;
          button.setAttribute("aria-pressed", "true");
          const word = button.dataset.word, surface = button.dataset.surface;
          this.definition.hidden = false;
          const header = document.createElement("header"), title = document.createElement("h3");
          title.lang = "ja";
          title.textContent = surface;
          const close = document.createElement("button");
          close.type = "button";
          close.textContent = "\xD7";
          close.setAttribute("aria-label", "Close definition");
          close.addEventListener("click", () => this.dismissDefinition(true));
          header.append(title, close);
          this.definition.append(header);
          const pronunciation = document.createElement("p");
          pronunciation.className = "pronunciation";
          pronunciation.lang = "ja";
          pronunciation.textContent = [button.dataset.reading, word !== surface ? `\u8F9E\u66F8\u5F62: ${word}` : ""].filter(Boolean).join(" \xB7 ");
          this.definition.append(pronunciation);
          const body = document.createElement("div");
          body.className = "definition-body";
          body.setAttribute("aria-busy", "true");
          const loading = document.createElement("p");
          loading.className = "feedback";
          loading.textContent = "Looking up English and Japanese definitions\u2026";
          body.append(loading);
          this.definition.append(body);
          let result = this.definitions.get(word);
          if (!result) {
            try {
              const reply = await chrome.runtime.sendMessage({ type: "define-word", word });
              if (reply?.error || !reply?.en || !reply?.ja) throw new Error("Dictionary unavailable");
              result = { en: { page: reply.en, definitions: definitionText(reply.en.html ?? "", "en") }, ja: { page: reply.ja, definitions: definitionText(reply.ja.html ?? "", "ja") } };
              if (reply.en.status !== "error" && reply.ja.status !== "error") {
                this.definitions.set(word, result);
                while (this.definitions.size > 100) this.definitions.delete(this.definitions.keys().next().value);
              }
            } catch {
              result = { en: { page: { status: "error" }, definitions: [] }, ja: { page: { status: "error" }, definitions: [] } };
            }
          }
          if (version !== this.lookupVersion || !this.host.isConnected) return;
          body.replaceChildren();
          body.setAttribute("aria-busy", "false");
          for (const language of ["en", "ja"]) {
            const { page, definitions } = result[language];
            const section = document.createElement("section");
            section.lang = language;
            const heading = document.createElement("h4");
            heading.textContent = language === "en" ? "English" : "\u65E5\u672C\u8A9E";
            section.append(heading);
            if (definitions.length) {
              const list = document.createElement("ol");
              for (const text of definitions) {
                const item = document.createElement("li");
                item.textContent = text;
                list.append(item);
              }
              section.append(list);
            } else {
              const message = document.createElement("p");
              message.className = "feedback";
              message.textContent = page.status === "error" ? language === "en" ? "Could not load definitions. Check your connection and click the word to retry." : "\u5B9A\u7FA9\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u3001\u5358\u8A9E\u3092\u3082\u3046\u4E00\u5EA6\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : language === "en" ? "No English definition found for this Japanese word." : "\u3053\u306E\u5358\u8A9E\u306E\u65E5\u672C\u8A9E\u306E\u5B9A\u7FA9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
              section.append(message);
            }
            const source = document.createElement("a");
            source.className = "source";
            source.textContent = language === "en" ? "English Wiktionary \u2197" : "\u30A6\u30A3\u30AF\u30B7\u30E7\u30CA\u30EA\u30FC\u65E5\u672C\u8A9E\u7248 \u2197";
            source.href = dictionaryURL(language, page.title ?? word);
            source.target = "_blank";
            source.rel = "noopener noreferrer";
            section.append(source);
            body.append(section);
          }
          const notice = document.createElement("p");
          notice.className = "source";
          notice.textContent = "Wiktionary \xB7 CC BY-SA \xB7 Only this word is sent for lookup.";
          body.append(notice);
        }
      };
    }
  });

  // src/shared.ts
  var hiragana;
  var init_shared = __esm({
    "src/shared.ts"() {
      "use strict";
      hiragana = (text) => text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
    }
  });

  // src/preferences.ts
  function appearance(value) {
    const v = value;
    return { scale: typeof v?.scale === "number" && Number.isFinite(v.scale) ? Math.max(0.75, Math.min(1.5, v.scale)) : 1, contrast: v?.contrast === "high" ? "high" : "auto" };
  }
  function appearanceForSite(value, hostname) {
    return appearance(value && typeof value === "object" ? value[hostname] : void 0);
  }
  function validateOverride(word, reading) {
    word = word.trim().normalize("NFC");
    reading = hiragana(reading.trim().normalize("NFKC"));
    if (!word || word.length > 80 || !/[\p{Script=Han}々]/u.test(word) || /[\p{Cc}\p{Cf}]/u.test(word)) throw new Error("Enter a word containing kanji, up to 80 characters.");
    if (!/^[ぁ-ゖーゝゞ]+$/u.test(reading) || reading.length > 80) throw new Error("Enter a reading in hiragana or katakana, up to 80 characters.");
    return { word, reading };
  }
  function validOverrides(value) {
    const entries = [];
    if (value && typeof value === "object") for (const [word, raw] of Object.entries(value)) {
      if (entries.length >= 200) break;
      try {
        if (typeof raw === "string") {
          const v = validateOverride(word, raw);
          entries.push([v.word, v.reading]);
        }
      } catch {
      }
    }
    return Object.fromEntries(entries);
  }
  function docsReadingView(value) {
    const v = value;
    return { enabled: v?.enabled === true, spacing: typeof v?.spacing === "number" && Number.isFinite(v.spacing) ? Math.max(2.2, Math.min(3.4, v.spacing)) : 2.8 };
  }
  var init_preferences = __esm({
    "src/preferences.ts"() {
      "use strict";
      init_shared();
    }
  });

  // src/pacing.ts
  var AdaptivePacer;
  var init_pacing = __esm({
    "src/pacing.ts"() {
      "use strict";
      AdaptivePacer = class {
        last = -Infinity;
        pressure = 0;
        mark(kind, now = performance.now()) {
          const gap = now - this.last;
          this.pressure = gap < 200 ? Math.min(10, this.pressure + 1) : Math.max(0, this.pressure - Math.floor(gap / 200));
          this.last = now;
          return (kind === "scroll" ? 100 : 150) + this.pressure * 35;
        }
        budget(now = performance.now()) {
          return now - this.last < 1e3 && this.pressure >= 3 ? 2 : 4;
        }
      };
    }
  });

  // src/geometry.ts
  var CollisionIndex;
  var init_geometry = __esm({
    "src/geometry.ts"() {
      "use strict";
      CollisionIndex = class {
        cells = /* @__PURE__ */ new Map();
        *keys(box) {
          for (let y = Math.floor(box.top / 64); y <= Math.floor(box.bottom / 64); y++)
            for (let x = Math.floor(box.left / 64); x <= Math.floor(box.right / 64); x++) yield `${x}:${y}`;
        }
        add(box) {
          for (const key of this.keys(box)) {
            const bucket = this.cells.get(key);
            if (bucket) bucket.push(box);
            else this.cells.set(key, [box]);
          }
        }
        overlaps(box) {
          for (const key of this.keys(box)) for (const other of this.cells.get(key) ?? [])
            if (box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top) return true;
          return false;
        }
      };
    }
  });

  // src/content.ts
  var require_content = __commonJS({
    "src/content.ts"() {
      init_reading_panel();
      init_preferences();
      init_pacing();
      init_geometry();
      var hostname = location.hostname || (location.ancestorOrigins[0] ? new URL(location.ancestorOrigins[0]).hostname : "");
      var docs = location.hostname === "docs.google.com" && location.pathname.startsWith("/document/");
      if (docs) {
        const init = () => window.dispatchEvent(new CustomEvent("fob-docs-init", { detail: chrome.runtime.id }));
        init();
        setTimeout(init, 0);
      }
      var host = document.createElement("fob-overlay");
      var shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `<style>:host{all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;overflow:hidden!important;contain:strict!important}span{position:absolute;white-space:nowrap;line-height:1;font-family:system-ui,sans-serif;color:var(--fob-color,#15232b);text-shadow:0 0 2px var(--fob-bg,white);pointer-events:none;user-select:none}@media print{:host{display:none!important}}</style><div aria-hidden="true"></div>`;
      var layer = shadow.querySelector("div");
      var mutationObserver;
      var watchedShadows = /* @__PURE__ */ new WeakSet();
      var observerOptions = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "aria-label", "data-font-css", "width", "height", "transform"] };
      function observeShadow(root) {
        if (mutationObserver && !watchedShadows.has(root)) {
          watchedShadows.add(root);
          mutationObserver.observe(root, observerOptions);
        }
      }
      var enabled = true;
      var excluded = [];
      var revision = 0;
      var timer = 0;
      var running = false;
      var composing = false;
      var message = "Starting offline furigana\u2026";
      var statusState = "loading";
      var readingAppearance = appearance(void 0);
      var overrides = {};
      var viewSettings = docsReadingView(void 0);
      var reader = docs ? new ReadingPanel(() => {
        void chrome.storage.local.set({ docsReadingView: { ...viewSettings, enabled: false } });
      }) : void 0;
      var activeRequest;
      var pacer = new AdaptivePacer();
      var nextScanAt = 0;
      var activePage;
      var inputDocuments = /* @__PURE__ */ new WeakSet();
      function watchInput(target) {
        if (inputDocuments.has(target)) return;
        inputDocuments.add(target);
        target.addEventListener("compositionstart", () => {
          composing = true;
          schedule();
        }, true);
        target.addEventListener("compositionend", () => {
          composing = false;
          schedule();
        }, true);
        target.addEventListener("input", () => schedule(150, "edit"), true);
      }
      function watchDocsInputs(root) {
        const frames = [...root.querySelectorAll("iframe.docs-texteventtarget-iframe")];
        if (root instanceof HTMLIFrameElement && root.matches(".docs-texteventtarget-iframe")) frames.push(root);
        for (const frame2 of frames) {
          const attach = () => {
            try {
              if (frame2.contentDocument) watchInput(frame2.contentDocument);
            } catch {
            }
          };
          attach();
          frame2.addEventListener("load", attach, { once: true });
        }
      }
      var pages = /* @__PURE__ */ new Set();
      var visiblePages = /* @__PURE__ */ new Set();
      var pageObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) entry.isIntersecting ? visiblePages.add(entry.target) : visiblePages.delete(entry.target);
        schedule(100);
      });
      var editorClip;
      var visible = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      function allowed() {
        return enabled && !excluded.includes(hostname) && !document.hidden && !composing;
      }
      function clear() {
        layer.replaceChildren();
      }
      function schedule(delay = 150, activity) {
        revision++;
        clear();
        window.clearTimeout(timer);
        if (activeRequest) {
          void chrome.runtime.sendMessage({ type: "cancel-tokenize", requestId: activeRequest }).catch(() => {
          });
          activeRequest = void 0;
        }
        if (activity) delay = pacer.mark(activity);
        statusState = allowed() ? "loading" : "paused";
        message = !enabled || excluded.includes(hostname) ? "Readings are paused for this page." : document.hidden ? "Paused while this tab is in the background." : composing ? "Waiting for text composition to finish." : activity === "scroll" ? "Waiting for scrolling to settle\u2026" : activity === "edit" ? "Waiting for editing to settle\u2026" : "Updating visible readings\u2026";
        reader?.loading(viewSettings.enabled && enabled && !excluded.includes(hostname) && !document.hidden, message);
        if (allowed()) {
          nextScanAt = performance.now() + delay;
          timer = window.setTimeout(() => {
            if (!running) void scan();
          }, delay);
        }
      }
      function registerPages(root) {
        const found = [...root.querySelectorAll(".kix-page")];
        if (root instanceof Element && root.matches(".kix-page")) found.push(root);
        for (const page of found) if (!pages.has(page)) {
          pages.add(page);
          pageObserver.observe(page);
        }
      }
      function region() {
        if (!docs) return document.body;
        for (const page of pages) if (!page.isConnected) {
          pages.delete(page);
          visiblePages.delete(page);
          pageObserver.unobserve(page);
        }
        let best = activePage && visiblePages.has(activePage) ? activePage : void 0;
        let area = 0;
        const candidates = best ? [best, ...[...visiblePages].filter((p) => p !== best)] : [...visiblePages];
        for (const page of candidates) {
          const r = page.getBoundingClientRect();
          const current = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
          if (current > area) {
            best = page;
            area = current;
          }
        }
        activePage = best;
        if (pages.size) return best;
        return document.querySelector(".kix-appview-editor") ?? void 0;
      }
      function textSource(node) {
        const parent = node.parentElement;
        let block = parent;
        while (block.parentElement && ["inline", "contents"].includes(getComputedStyle(block).display)) block = block.parentElement;
        const style = getComputedStyle(parent);
        if (style.visibility !== "visible" || style.display === "none" || style.writingMode !== "horizontal-tb") return;
        let offset = 0;
        if (node.length > 2e3) {
          const doc = document;
          let first = Infinity;
          for (let y = 8; y < innerHeight; y += Math.max(32, Math.ceil(innerHeight / 64))) {
            const range = doc.caretRangeFromPoint?.(Math.max(1, parent.getBoundingClientRect().left + 2), y);
            if (range?.startContainer === node) first = Math.min(first, range.startOffset);
          }
          if (first === Infinity) return;
          offset = Math.max(0, first - 64);
        }
        const text = node.data.slice(offset, offset + 2e3);
        if (!text.trim()) return;
        return {
          text,
          block,
          identity: node,
          fontSize: parseFloat(style.fontSize),
          color: style.color,
          background: style.backgroundColor,
          rect(start2, end) {
            if (!node.isConnected) return;
            const range = document.createRange();
            range.setStart(node, offset + start2);
            range.setEnd(node, offset + end);
            const rects = [...range.getClientRects()].filter((r) => r.width > 0);
            return rects.length === 1 && visible(rects[0]) ? rects[0] : void 0;
          }
        };
      }
      var measure = document.createElement("canvas").getContext("2d");
      function docsSource(element) {
        const text = element.getAttribute("aria-label") ?? "";
        if (!text || text.length > 2e3) return;
        const box = element.getBoundingClientRect();
        if (!visible(box)) return;
        const font = element.closest("[data-font-css]")?.getAttribute("data-font-css");
        if (!font) return;
        measure.font = font;
        const fullMetrics = measure.measureText(text);
        const width = fullMetrics.width;
        if (!width) return;
        const widths = /* @__PURE__ */ new Map([[0, 0], [text.length, width]]);
        const ink = /* @__PURE__ */ new Map();
        const prefixWidth = (offset) => {
          let value = widths.get(offset);
          if (value === void 0) {
            value = measure.measureText(text.slice(0, offset)).width;
            widths.set(offset, value);
          }
          return value;
        };
        const size = Number(font.match(/([\d.]+)px/)?.[1]);
        if (!size) return;
        const localHeight = element instanceof SVGRectElement ? element.height.baseVal.value : box.height;
        const scaleY = localHeight > 0 ? box.height / localHeight : 1;
        const clip = editorClip;
        const svg = element.closest("svg")?.getBoundingClientRect();
        if (clip && (box.bottom <= clip.top || box.top >= clip.bottom || box.right <= clip.left || box.left >= clip.right)) return;
        if (svg && (box.bottom <= svg.top || box.top >= svg.bottom)) return;
        return { text, orderBox: box, fontSize: size * scaleY, color: "#15232b", background: "white", rect(start2, end) {
          if (!element.isConnected) return;
          const r = box;
          measure.font = font;
          const left = prefixWidth(start2) / width * r.width;
          const right = prefixWidth(end) / width * r.width;
          const fragment = text.slice(start2, end);
          let metrics = ink.get(fragment);
          if (!metrics) {
            metrics = measure.measureText(fragment);
            ink.set(fragment, metrics);
          }
          const ascent = metrics.fontBoundingBoxAscent || size * 0.8;
          const descent = metrics.fontBoundingBoxDescent || size * 0.2;
          const baseline = r.top + (r.height - (ascent + descent) * scaleY) / 2 + ascent * scaleY;
          const inkAscent = metrics.actualBoundingBoxAscent;
          const inkDescent = metrics.actualBoundingBoxDescent;
          const result = new DOMRect(r.left + left, baseline - inkAscent * scaleY, right - left, (inkAscent + inkDescent) * scaleY);
          return visible(result) ? result : void 0;
        } };
      }
      function* sources(root) {
        let node = root;
        while (node) {
          let descend = true;
          let source;
          if (node instanceof Element) {
            if (node === host || node.matches('script,style,noscript,ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) descend = false;
            else if (node !== root) {
              const r = node.getBoundingClientRect();
              const style = getComputedStyle(node);
              if (style.display === "none" || style.visibility === "hidden" || r.width > 0 && r.height > 0 && !visible(r)) descend = false;
            }
            if (descend && docs && node.matches("svg rect[aria-label]")) {
              source = docsSource(node);
              descend = false;
            }
            if (descend && !docs && node.shadowRoot) {
              observeShadow(node.shadowRoot);
              yield* sources(node.shadowRoot);
            }
          } else if (!docs && node instanceof Text && node.parentElement) source = textSource(node);
          yield source;
          if (descend && node.firstChild) {
            node = node.firstChild;
            continue;
          }
          while (node && node !== root && !node.nextSibling) node = node.parentNode;
          if (!node || node === root) break;
          node = node.nextSibling;
        }
      }
      function* webSources() {
        const seeds = /* @__PURE__ */ new Set(), seen = /* @__PURE__ */ new Set();
        let inspected = 0;
        const dx = Math.max(64, Math.ceil(innerWidth / 16)), dy = Math.max(16, Math.ceil(innerHeight / 100));
        for (let y = 4; y < innerHeight; y += dy) for (let x = 4; x < innerWidth; x += dx) {
          let element = document.elementFromPoint(x, y);
          while (element?.shadowRoot) {
            observeShadow(element.shadowRoot);
            const inner = element.shadowRoot.elementFromPoint(x, y);
            if (!inner || inner === element) break;
            element = inner;
          }
          yield void 0;
          if (!element || element === host || seeds.has(element) || seeds.size >= 512) continue;
          if (element.closest('ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) continue;
          seeds.add(element);
          let local = 0;
          for (const source of sources(element)) {
            if (++local > 128 || ++inspected > 4096) break;
            if (source?.identity) {
              if (seen.has(source.identity)) {
                yield void 0;
                continue;
              }
              seen.add(source.identity);
            }
            yield source;
          }
        }
      }
      function* groupedSources(root, prepared) {
        let group = [], length = 0;
        function combine() {
          const parts = group, first = parts[0];
          return { ...first, text: parts.map((p) => p.text).join(""), rect(start2, end) {
            const rectangles = [];
            let offset = 0;
            for (const part of parts) {
              const a = Math.max(0, start2 - offset), b = Math.min(part.text.length, end - offset);
              if (a < b) {
                const r = part.rect(a, b);
                if (!r) return;
                rectangles.push(r);
              }
              offset += part.text.length;
            }
            if (!rectangles.length || rectangles.some((r) => Math.abs(r.top - rectangles[0].top) > 2)) return;
            const left = Math.min(...rectangles.map((r) => r.left)), top = Math.min(...rectangles.map((r) => r.top));
            return new DOMRect(left, top, Math.max(...rectangles.map((r) => r.right)) - left, Math.max(...rectangles.map((r) => r.bottom)) - top);
          } };
        }
        for (const source of docs ? prepared ?? sources(root) : webSources()) {
          if (!source) {
            yield void 0;
            continue;
          }
          if (group.length && (docs || group[0].block !== source.block || length + source.text.length > 2e3)) {
            yield combine();
            group = [];
            length = 0;
          }
          group.push(source);
          length += source.text.length;
          yield void 0;
        }
        if (group.length) yield combine();
      }
      async function frame() {
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }
      async function scan() {
        if (!allowed() || !document.body) return;
        running = true;
        const version = revision;
        let count = 0, attempted = 0, found = false, skippedSpace = 0, unknown = 0;
        const readingMode = docs && viewSettings.enabled;
        const readingRuns = [];
        const runMap = /* @__PURE__ */ new Map();
        let panelCharacters = 0, panelLimited = false;
        const collisions = new CollisionIndex();
        let glyphCount = 0;
        try {
          const root = region();
          if (!root) {
            message = docs ? "Waiting for the active Docs page\u2026" : "Waiting for page content\u2026";
            statusState = "loading";
            reader?.loading(readingMode, message);
            return;
          }
          if (!host.isConnected) document.documentElement.append(host);
          let prepared;
          if (docs) {
            const viewport = document.querySelector(".kix-appview-editor")?.getBoundingClientRect();
            editorClip = new DOMRect(Math.max(0, viewport?.left ?? 0), Math.max(0, viewport?.top ?? 0), 0, 0);
            editorClip.width = Math.max(0, Math.min(innerWidth, viewport?.right ?? innerWidth) - editorClip.left);
            editorClip.height = Math.max(0, Math.min(innerHeight, viewport?.bottom ?? innerHeight) - editorClip.top);
            prepared = [];
            const seen = /* @__PURE__ */ new Set();
            let started = performance.now();
            for (const source of sources(root)) {
              if (performance.now() - started >= pacer.budget()) {
                await frame();
                started = performance.now();
                if (version !== revision || !allowed()) return;
              }
              if (!source) continue;
              const base = source.rect(0, source.text.length);
              if (!base) continue;
              const key = `${source.text}:${base.left.toFixed(1)}:${base.top.toFixed(1)}`;
              if (seen.has(key)) continue;
              seen.add(key);
              if (readingMode) {
                if (panelCharacters + source.text.length > 16e3) {
                  panelLimited = true;
                  break;
                }
                panelCharacters += source.text.length;
                const order = source.orderBox ?? base;
                const run = { text: source.text, top: order.top, left: order.left, right: order.right, readings: [] };
                readingRuns.push(run);
                runMap.set(source, run);
              }
              prepared.push(source);
              let offset = 0;
              for (const glyph of readingMode ? [] : source.text) {
                if (glyphCount >= 8e3) {
                  collisions.add(base);
                  break;
                }
                if (glyph.trim()) {
                  const ink = source.rect(offset, offset + glyph.length);
                  if (ink) {
                    collisions.add(ink);
                    glyphCount++;
                  }
                }
                offset += glyph.length;
                if (performance.now() - started >= pacer.budget()) {
                  await frame();
                  started = performance.now();
                  if (version !== revision || !allowed()) return;
                }
              }
              if (prepared.length >= 2e3) break;
            }
          }
          const iterator = readingMode ? prepared[Symbol.iterator]() : groupedSources(root, prepared);
          let done = false;
          while (!done && attempted < 500 && version === revision && allowed()) {
            const batch = [];
            let length = 0, started = performance.now();
            while (length < 2e3) {
              if (performance.now() - started >= pacer.budget()) {
                await frame();
                started = performance.now();
                if (version !== revision || !allowed()) return;
              }
              const next = iterator.next();
              if (next.done) {
                done = true;
                break;
              }
              if (!next.value) continue;
              if (!readingMode && !/[\p{Script=Han}々]/u.test(next.value.text)) continue;
              if (length + next.value.text.length > 2e3) {
                await process(batch);
                batch.length = 0;
                length = 0;
                if (version !== revision) return;
                if (attempted >= 500) break;
              }
              batch.push(next.value);
              length += next.value.text.length;
              found = true;
            }
            await process(batch);
          }
          if (version !== revision || !allowed()) return;
          statusState = "active";
          if (docs && !prepared?.length) {
            message = "Docs text is unavailable. Reload this document after installation. This editor version may be unsupported.";
            statusState = "unavailable";
            if (readingMode) reader?.unavailable(message);
          } else if (!found) message = "No visible kanji in this view.";
          else message = `Active \u2014 ${layer.childElementCount} visible readings${docs ? activePage ? " on the active page" : " in the editor viewport" : ""}.${skippedSpace ? ` Tight spacing: ${skippedSpace} omitted.` : ""}${unknown ? ` Unknown words: ${unknown}. Add a local correction in the menu.` : ""}${attempted >= 500 ? " View limit reached; scroll to reveal more." : ""}`;
          if (readingMode && prepared?.length) {
            reader?.display(readingRuns, activePage ? String([...pages].indexOf(activePage)) : "pageless", viewSettings, readingAppearance, editorClip?.top ?? 100, panelLimited || attempted >= 500);
            message = `Reading view \u2014 ${count} readings in ${activePage ? "the active page\u2019s visible text" : "the editor viewport"}.${unknown ? ` Unknown words: ${unknown}. Add a local correction in the menu.` : ""}${panelLimited || attempted >= 500 ? " View limit reached; scroll to reveal more." : ""}`;
          }
          async function process(batch) {
            if (!batch.length || version !== revision || !allowed()) return;
            const requestId = crypto.randomUUID();
            activeRequest = requestId;
            let response;
            try {
              response = await chrome.runtime.sendMessage({ type: "tokenize", requestId, texts: batch.map((s) => s.text), overrides, includeWords: readingMode });
            } finally {
              if (activeRequest === requestId) activeRequest = void 0;
            }
            if (version !== revision || !allowed() || response?.cancelled) return;
            if (response?.error) throw new Error(response.error);
            if (readingMode) for (let i = 0; i < batch.length; i++) {
              const run = runMap.get(batch[i]);
              if (run) run.words = response.words?.[i] ?? [];
            }
            let started = performance.now();
            for (let i = 0; i < batch.length; i++) for (const part of response.results[i]) {
              if (attempted >= 500) return;
              attempted++;
              if (!part.reading) {
                unknown++;
                continue;
              }
              if (readingMode) {
                runMap.get(batch[i])?.readings.push(part);
                count++;
                continue;
              }
              if (performance.now() - started >= pacer.budget()) {
                await frame();
                started = performance.now();
                if (version !== revision || !allowed()) return;
              }
              const source = batch[i], rect = source.rect(part.start, part.end);
              if (!rect) continue;
              const span = document.createElement("span");
              span.textContent = part.reading;
              const minimum = docs ? 6 : 7;
              let fontSize = Math.max(minimum, Math.min(18, Math.min(12, source.fontSize * 0.5) * readingAppearance.scale));
              measure.font = `${fontSize}px system-ui`;
              const natural = measure.measureText(part.reading).width;
              fontSize *= Math.min(1, (rect.width + 4) / natural);
              if (fontSize < minimum) {
                skippedSpace++;
                continue;
              }
              let x = 0, y = 0, width = 0, box;
              while (fontSize >= minimum) {
                measure.font = `${fontSize}px system-ui`;
                const metrics = measure.measureText(part.reading);
                width = metrics.width;
                x = rect.left + (rect.width - width) / 2;
                if (docs) {
                  const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
                  const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
                  const baseline = (fontSize - ascent - descent) / 2 + ascent;
                  y = rect.top - 0.5 - baseline - metrics.actualBoundingBoxDescent;
                  box = new DOMRect(x, y + baseline - metrics.actualBoundingBoxAscent, width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
                } else {
                  y = rect.top - fontSize - 1;
                  box = new DOMRect(x, y, width, fontSize);
                }
                const clip = editorClip;
                const clipped = docs && clip && (box.top < clip.top || box.bottom > clip.bottom || box.left < clip.left || box.right > clip.right);
                if (!clipped && x >= 0 && x + width <= innerWidth && box.top >= 0 && !collisions.overlaps(box)) break;
                box = void 0;
                if (fontSize === minimum) break;
                fontSize = Math.max(minimum, fontSize - 0.5);
              }
              if (!box) {
                skippedSpace++;
                continue;
              }
              const probe = document.elementFromPoint(x + width / 2, y + fontSize / 2);
              if (!docs && probe) {
                const doc = document;
                const caret = doc.caretRangeFromPoint?.(x + width / 2, y + fontSize / 2);
                if (caret?.startContainer instanceof Text && caret.startContainer.length) {
                  const n = caret.startContainer, start2 = Math.min(caret.startOffset, n.length - 1);
                  const r = document.createRange();
                  r.setStart(n, start2);
                  r.setEnd(n, start2 + 1);
                  const hit = r.getBoundingClientRect();
                  if (hit.bottom > box.top && hit.top < box.bottom && hit.top < rect.top - 2) {
                    skippedSpace++;
                    continue;
                  }
                }
              }
              span.style.cssText = `left:${x}px;top:${y}px;font-size:${fontSize}px;--fob-color:${readingAppearance.contrast === "high" ? "#101010" : source.color};--fob-bg:${readingAppearance.contrast === "high" ? "white" : source.background === "rgba(0, 0, 0, 0)" ? "white" : source.background}${readingAppearance.contrast === "high" ? ";text-shadow:0 0 2px white,1px 0 white,-1px 0 white,0 1px white,0 -1px white" : ""}`;
              layer.append(span);
              collisions.add(box);
              count++;
            }
          }
        } catch (error) {
          if (version === revision) {
            message = `Furigana unavailable: ${String(error)}`;
            statusState = "unavailable";
            clear();
            if (readingMode) reader?.unavailable(message);
          }
        } finally {
          running = false;
          if (revision !== version && allowed()) {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void scan(), Math.max(0, nextScanAt - performance.now()));
          }
        }
      }
      chrome.runtime.onMessage.addListener((request, _sender, respond) => {
        if (request?.type === "status") respond({ message, state: statusState });
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !["enabled", "excluded", "siteAppearance", "readingOverrides", "docsReadingView"].some((key) => key in changes)) return;
        if (changes.enabled) enabled = changes.enabled.newValue !== false;
        if (changes.excluded) excluded = Array.isArray(changes.excluded.newValue) ? changes.excluded.newValue : [];
        if (changes.siteAppearance) readingAppearance = appearanceForSite(changes.siteAppearance.newValue, hostname);
        if (changes.readingOverrides) overrides = validOverrides(changes.readingOverrides.newValue);
        if (changes.docsReadingView) viewSettings = docsReadingView(changes.docsReadingView.newValue);
        schedule(0);
      });
      async function start() {
        const state = await chrome.storage.local.get({ enabled: true, excluded: [], siteAppearance: {}, readingOverrides: {}, docsReadingView: {} });
        enabled = state.enabled !== false;
        excluded = Array.isArray(state.excluded) ? state.excluded : [];
        readingAppearance = appearanceForSite(state.siteAppearance, hostname);
        overrides = validOverrides(state.readingOverrides);
        viewSettings = docsReadingView(state.docsReadingView);
        if (docs) {
          registerPages(document);
          watchDocsInputs(document);
        }
        watchInput(document);
        const observer = new MutationObserver((records) => {
          let relevant = false;
          for (const record of records) {
            if (record.target === host || host.contains(record.target)) continue;
            const element = record.target instanceof Element ? record.target : record.target.parentElement;
            if (docs && element?.closest(".kix-cursor,.kix-selection-overlay,.kix-selection-overlay-content")) continue;
            if (docs && record.type !== "childList" && element?.closest(".kix-page") && element.closest(".kix-page") !== activePage) continue;
            relevant = true;
            if (docs) {
              for (const node of record.addedNodes) if (node instanceof Element) {
                registerPages(node);
                watchDocsInputs(node);
              }
            }
          }
          if (relevant) schedule(150, "edit");
        });
        mutationObserver = observer;
        observer.observe(document.body, observerOptions);
        document.addEventListener("scroll", (event) => {
          if (!reader?.owns(event)) schedule(100, "scroll");
        }, { capture: true, passive: true });
        document.addEventListener("load", () => schedule(), true);
        window.addEventListener("resize", () => schedule(100));
        window.visualViewport?.addEventListener("resize", () => schedule(100));
        document.addEventListener("visibilitychange", () => schedule(0));
        document.fonts.addEventListener("loadingdone", () => schedule());
        if (!allowed()) message = "Disabled for this page.";
        schedule(0);
      }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
      else void start();
    }
  });
  require_content();
})();
//# sourceMappingURL=content.js.map
