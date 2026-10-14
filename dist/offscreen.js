"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/offscreen.ts
  var require_offscreen = __commonJS({
    "src/offscreen.ts"() {
      var worker = new Worker(chrome.runtime.getURL("tokenizer.js"));
      var next = 0;
      var pending = /* @__PURE__ */ new Map();
      worker.onmessage = (event) => {
        pending.get(event.data.id)?.resolve(event.data);
        pending.delete(event.data.id);
      };
      worker.onerror = () => {
        for (const { resolve } of pending.values()) resolve({ error: "Tokenizer worker failed" });
        pending.clear();
      };
      chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (sender.id !== chrome.runtime.id || sender.tab || sender.url !== chrome.runtime.getURL("background.js")) return;
        if (message?.type === "worker-release") {
          worker.postMessage(message);
          return;
        }
        if (message?.type === "worker-cancel") {
          for (const [id2, job] of pending) if (job.jobId === message.jobId) {
            worker.postMessage({ type: "worker-cancel", id: id2 });
            job.resolve({ cancelled: true });
            pending.delete(id2);
          }
          respond({ ok: true });
          return;
        }
        if (message?.type !== "worker-job") return;
        const id = ++next;
        pending.set(id, { jobId: message.jobId, resolve: respond });
        worker.postMessage({ id, key: message.key, texts: message.texts, overrides: message.overrides, includeWords: message.includeWords });
        return true;
      });
    }
  });
  require_offscreen();
})();
//# sourceMappingURL=offscreen.js.map
