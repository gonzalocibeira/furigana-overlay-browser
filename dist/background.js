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
  var init_preferences = __esm({
    "src/preferences.ts"() {
      "use strict";
      init_shared();
    }
  });

  // src/background.ts
  var require_background = __commonJS({
    "src/background.ts"() {
      init_preferences();
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
              const result = await chrome.runtime.sendMessage({ type: "worker-job", jobId: job.jobId, key: `${tabId}:readings`, texts: job.texts, overrides: job.overrides });
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
        const tabId = sender.tab.id, owner = sender.documentId ?? `frame:${sender.frameId ?? 0}`;
        let queue = queues.get(tabId);
        if (message.type === "cancel-tokenize") {
          if (queue) {
            for (const job of queue.jobs) if (job.owner === owner && job.requestId === message.requestId) cancel(job);
            queue.jobs = queue.jobs.filter((job) => !job.cancelled);
            if (queue.active?.owner === owner && queue.active.requestId === message.requestId) cancel(queue.active);
          }
          respond({ ok: true });
          return;
        }
        if (typeof message.requestId !== "string" || !Array.isArray(message.texts) || message.texts.length > 2e3 || message.texts.some((s) => typeof s !== "string") || message.texts.join("").length > 2e3) {
          respond({ error: "Invalid batch" });
          return;
        }
        if (!queue) {
          queue = { jobs: [], running: false, closed: false };
          queues.set(tabId, queue);
        }
        for (const job of queue.jobs) if (job.owner === owner) cancel(job);
        queue.jobs = queue.jobs.filter((job) => !job.cancelled);
        if (queue.active?.owner === owner) cancel(queue.active);
        if (queue.jobs.length >= 32) {
          respond({ error: "Too many active frames. Try scrolling after other frames settle." });
          return;
        }
        queue.jobs.push({ overrides: validOverrides(message.overrides), texts: message.texts, requestId: message.requestId, owner, jobId: crypto.randomUUID(), cancelled: false, dispatched: false, respond });
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
