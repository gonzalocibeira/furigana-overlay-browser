"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/shared.ts
  var hiragana;
  var init_shared = __esm({
    "src/shared.ts"() {
      "use strict";
      hiragana = (text) => text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
    }
  });

  // src/preferences.ts
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
  var correctionBackupLimit;
  var init_preferences = __esm({
    "src/preferences.ts"() {
      "use strict";
      init_shared();
      correctionBackupLimit = 256 * 1024;
    }
  });

  // src/dictionary.ts
  var require_dictionary = __commonJS({
    "src/dictionary.ts"() {
      "use strict";
      var pending = /* @__PURE__ */ new Map();
      async function page(language, word) {
        try {
          const url = new URL(`https://${language}.wiktionary.org/w/api.php`);
          url.search = new URLSearchParams({ action: "parse", page: word, prop: "text", format: "json", formatversion: "2", redirects: "1", disableeditsection: "1" }).toString();
          const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal: AbortSignal.timeout(8e3) });
          if (!response.ok) return { status: response.status === 404 ? "missing" : "error" };
          const reader = response.body?.getReader();
          if (!reader) return { status: "error" };
          const chunks = [];
          let size = 0;
          for (; ; ) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 1e6) {
              await reader.cancel();
              return { status: "error" };
            }
            chunks.push(value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          const data = JSON.parse(new TextDecoder().decode(bytes));
          if (data.error) return { status: data.error.code === "missingtitle" ? "missing" : "error" };
          return typeof data.parse?.text === "string" ? { status: "ok", html: data.parse.text, title: data.parse.title } : { status: "error" };
        } catch {
          return { status: "error" };
        }
      }
      chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type !== "define-word") return;
        let url;
        try {
          url = sender.url ? new URL(sender.url) : void 0;
        } catch {
        }
        if (sender.tab?.id === void 0 || sender.frameId !== 0 || !url || !["http:", "https:"].includes(url.protocol) || typeof message.word !== "string" || !/^[\p{L}\p{M}\p{N}々〆ー・\s'-]{1,80}$/u.test(message.word) || !message.word.trim()) {
          respond({ error: "Invalid dictionary request" });
          return;
        }
        const word = message.word.trim();
        let job = pending.get(word);
        if (!job) {
          if (pending.size >= 8) {
            respond({ error: "Dictionary is busy. Try again." });
            return;
          }
          job = Promise.all([page("en", word), page("ja", word)]).then(([en, ja]) => ({ en, ja })).finally(() => pending.delete(word));
          pending.set(word, job);
        }
        void job.then(respond);
        return true;
      });
    }
  });

  // src/action-state.ts
  function toolbarPresentation(url, preferences, page) {
    if (preferences.enabled === false) return { state: "paused", title: "K\u014D \u2014 paused everywhere" };
    let hostname = "";
    try {
      const parsed = new URL(url ?? "");
      if (/^https?:$/.test(parsed.protocol)) hostname = parsed.hostname;
    } catch {
    }
    if (hostname && Array.isArray(preferences.excluded) && preferences.excluded.includes(hostname)) return { state: "paused", title: `K\u014D \u2014 paused on ${hostname}` };
    if (!hostname) return { state: "unavailable", title: "K\u014D \u2014 unavailable on this page" };
    if (!page) return { state: "unavailable", title: "K\u014D \u2014 reload this tab to start readings" };
    if (page.toolbarAvailability !== "ready") return { state: "unavailable", title: `K\u014D \u2014 ${page.message}` };
    return { state: "active", title: `K\u014D \u2014 active on ${hostname}` };
  }
  var init_action_state = __esm({
    "src/action-state.ts"() {
      "use strict";
    }
  });

  // src/action.ts
  var require_action = __commonJS({
    "src/action.ts"() {
      "use strict";
      init_action_state();
      var revisions = /* @__PURE__ */ new Map();
      async function refreshTab(tabId, navigating = false) {
        const revision = /* @__PURE__ */ Symbol();
        revisions.set(tabId, revision);
        try {
          const [tab, preferences] = await Promise.all([chrome.tabs.get(tabId), chrome.storage.local.get({ enabled: true, excluded: [] })]);
          let page;
          if (!navigating && toolbarPresentation(tab.url, preferences).state === "unavailable" && /^https?:/.test(tab.url ?? "")) {
            try {
              const response = await chrome.tabs.sendMessage(tabId, { type: "status" }, { frameId: 0 });
              if (typeof response?.message === "string" && ["ready", "unavailable"].includes(response.toolbarAvailability)) page = response;
            } catch {
            }
          }
          if (revisions.get(tabId) !== revision) return;
          const presentation = toolbarPresentation(tab.url, preferences, page);
          const path = Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/icon-${presentation.state}-${size}.png`]));
          await Promise.all([chrome.action.setIcon({ tabId, path }), chrome.action.setTitle({ tabId, title: presentation.title })]);
        } catch {
        }
      }
      async function refreshAll() {
        try {
          await Promise.all((await chrome.tabs.query({})).flatMap((tab) => tab.id === void 0 ? [] : [refreshTab(tab.id)]));
        } catch {
        }
      }
      chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type !== "toolbar-status-changed" || sender.frameId !== 0 || sender.tab?.id === void 0) return;
        respond({ ok: true });
        void refreshTab(sender.tab.id);
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && ("enabled" in changes || "excluded" in changes)) void refreshAll();
      });
      chrome.tabs.onActivated.addListener(({ tabId }) => void refreshTab(tabId));
      chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
        if (changes.status === "loading" || changes.url) void refreshTab(tabId, changes.status === "loading" || tab.status === "loading");
        else if (changes.status === "complete") void refreshTab(tabId);
      });
      chrome.tabs.onRemoved.addListener((tabId) => revisions.delete(tabId));
      chrome.runtime.onInstalled.addListener(() => void refreshAll());
      chrome.runtime.onStartup.addListener(() => void refreshAll());
      void refreshAll();
    }
  });

  // src/background.ts
  var require_background = __commonJS({
    "src/background.ts"() {
      init_preferences();
      var import_dictionary = __toESM(require_dictionary());
      var import_action = __toESM(require_action());
      var creating;
      async function ensureOffscreen() {
        const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
        if (contexts.length) return;
        if (!creating) creating = chrome.offscreen.createDocument({ url: "offscreen.html", reasons: [chrome.offscreen.Reason.WORKERS], justification: "Run the bundled offline Japanese tokenizer in a worker." }).finally(() => {
          creating = void 0;
        });
        await creating;
      }
      var queues = /* @__PURE__ */ new Map();
      function cancel(job) {
        if (job.cancelled) return;
        job.cancelled = true;
        job.respond({ cancelled: true });
        if (job.dispatched) chrome.runtime.sendMessage({ type: "worker-cancel", jobId: job.jobId }).catch(() => {
        });
      }
      async function drain(tabId, queue) {
        queue.running = true;
        try {
          while (queue.jobs.length && !queue.closed) {
            const job = queue.jobs.shift();
            queue.active = job;
            try {
              if (job.cancelled) continue;
              await ensureOffscreen();
              if (job.cancelled || queue.closed) continue;
              job.dispatched = true;
              const result = await chrome.runtime.sendMessage({ type: "worker-job", jobId: job.jobId, key: `${tabId}:${job.purpose}`, texts: job.texts, overrides: job.overrides, includeWords: job.includeWords });
              if (!job.cancelled) job.respond(result);
            } catch (error) {
              if (!job.cancelled) job.respond({ error: String(error) });
            } finally {
              queue.active = void 0;
            }
          }
        } finally {
          queue.running = false;
          if (!queue.jobs.length && queues.get(tabId) === queue) queues.delete(tabId);
        }
      }
      chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (!["tokenize", "cancel-tokenize"].includes(message?.type) || sender.tab?.id === void 0) return;
        if (message.purpose !== void 0 && message.purpose !== "readings" && message.purpose !== "playground") {
          respond({ error: "Invalid analysis purpose" });
          return;
        }
        const purpose = message.purpose ?? "readings";
        const tabId = sender.tab.id, owner = sender.documentId ?? `frame:${sender.frameId ?? 0}`;
        let queue = queues.get(tabId);
        if (message.type === "cancel-tokenize") {
          if (queue) {
            for (const job of queue.jobs) if (job.owner === owner && job.purpose === purpose && job.requestId === message.requestId) cancel(job);
            queue.jobs = queue.jobs.filter((job) => !job.cancelled);
            if (queue.active?.owner === owner && queue.active.purpose === purpose && queue.active.requestId === message.requestId) cancel(queue.active);
          }
          respond({ ok: true });
          return;
        }
        if (typeof message.requestId !== "string" || !Array.isArray(message.texts) || message.texts.length > 2e3 || message.texts.some((s) => typeof s !== "string") || message.texts.join("").length > 2e3) {
          respond({ error: "Invalid batch" });
          return;
        }
        if (purpose === "playground" && (!message.texts.length || message.texts.length > 4 || message.texts.some((text) => !text.length || text.length > 40))) {
          respond({ error: "Playground analysis accepts up to four verbs of 40 characters each" });
          return;
        }
        if (!queue) {
          queue = { jobs: [], running: false, closed: false };
          queues.set(tabId, queue);
        }
        for (const job of queue.jobs) if (job.owner === owner && job.purpose === purpose) cancel(job);
        queue.jobs = queue.jobs.filter((job) => !job.cancelled);
        if (queue.active?.owner === owner && queue.active.purpose === purpose) cancel(queue.active);
        if (queue.jobs.length >= 32) {
          respond({ error: "Too many active frames. Try scrolling after other frames settle." });
          return;
        }
        queue.jobs.push({ overrides: purpose === "playground" ? {} : validOverrides(message.overrides), texts: message.texts, includeWords: purpose === "playground" || message.includeWords === true, requestId: message.requestId, owner, purpose, jobId: crypto.randomUUID(), cancelled: false, dispatched: false, respond });
        if (!queue.running) void drain(tabId, queue);
        return true;
      });
      chrome.tabs.onRemoved.addListener((tabId) => {
        const queue = queues.get(tabId);
        if (queue) {
          queue.closed = true;
          for (const job of queue.jobs.splice(0)) cancel(job);
          if (queue.active) cancel(queue.active);
          queues.delete(tabId);
        }
        chrome.runtime.sendMessage({ type: "worker-release", tabId }).catch(() => {
        });
      });
    }
  });
  require_background();
})();
//# sourceMappingURL=background.js.map
