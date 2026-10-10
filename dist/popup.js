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

  // src/popup.ts
  var require_popup = __commonJS({
    "src/popup.ts"() {
      init_preferences();
      async function main() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let hostname = "";
        try {
          if (tab?.url && /^https?:/.test(tab.url)) hostname = new URL(tab.url).hostname;
        } catch {
        }
        const state = await chrome.storage.local.get({ enabled: true, excluded: [], siteAppearance: {}, readingOverrides: {}, docsReadingView: {} });
        const enabled = document.querySelector("#enabled");
        const excluded = document.querySelector("#excluded");
        const status = document.querySelector("#status");
        const card = document.querySelector("#status-card");
        const label = document.querySelector("#status-label");
        document.querySelector("#site").textContent = hostname || "Unavailable on this page";
        enabled.checked = state.enabled !== false;
        excluded.checked = Array.isArray(state.excluded) && state.excluded.includes(hostname);
        excluded.disabled = !hostname;
        function show(text, mode) {
          status.textContent = text;
          card.dataset.state = mode;
          label.textContent = { active: "On this page", paused: "Paused", unavailable: "Page unavailable", loading: "Getting ready" }[mode];
        }
        let revision = 0;
        async function refresh() {
          const current = ++revision;
          if (!enabled.checked) {
            show("Automatic readings are turned off.", "paused");
            return;
          }
          if (excluded.checked) {
            show(`Readings are paused on ${hostname}.`, "paused");
            return;
          }
          if (!hostname || tab?.id === void 0) {
            show("Open a webpage or Google Doc to see readings.", "unavailable");
            return;
          }
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: "status" }, { frameId: 0 });
            if (current === revision) show(response.message, response.state ?? (/^Active|^No visible/.test(response.message) ? "active" : /unavailable|unsupported/i.test(response.message) ? "unavailable" : "loading"));
          } catch {
            if (current === revision) show("Reload this tab to start automatic readings. Browser-protected pages are unavailable.", "unavailable");
          }
        }
        const timers = [];
        function changed() {
          timers.forEach(clearTimeout);
          timers.length = 0;
          void refresh();
          for (const delay of [300, 1200, 4e3]) timers.push(window.setTimeout(() => void refresh(), delay));
        }
        enabled.onchange = async () => {
          try {
            await chrome.storage.local.set({ enabled: enabled.checked });
            changed();
          } catch {
            show("Could not save the preference. Reopen the menu and try again.", "unavailable");
          }
        };
        excluded.onchange = async () => {
          try {
            const latest = await chrome.storage.local.get({ excluded: [] });
            const sites = new Set(Array.isArray(latest.excluded) ? latest.excluded : []);
            excluded.checked ? sites.add(hostname) : sites.delete(hostname);
            await chrome.storage.local.set({ excluded: [...sites] });
            changed();
          } catch {
            show("Could not save the site preference. Reopen the menu and try again.", "unavailable");
          }
        };
        const docsPage = hostname === "docs.google.com" && !!tab.url && new URL(tab.url).pathname.startsWith("/document/");
        document.querySelector("#docs-reading-panel").hidden = !docsPage;
        const viewEnabled = document.querySelector("#docs-reading-enabled");
        const spacing = document.querySelector("#docs-reading-spacing");
        const view = docsReadingView(state.docsReadingView);
        viewEnabled.checked = view.enabled;
        spacing.value = String(view.spacing);
        spacing.disabled = !view.enabled;
        async function saveReadingView() {
          const feedback2 = document.querySelector("#docs-reading-feedback");
          try {
            await chrome.storage.local.set({ docsReadingView: { enabled: viewEnabled.checked, spacing: Number(spacing.value) } });
            spacing.disabled = !viewEnabled.checked;
            feedback2.textContent = "Saved for Google Docs.";
            feedback2.dataset.error = "false";
            changed();
          } catch {
            feedback2.textContent = "Could not save. Try again.";
            feedback2.dataset.error = "true";
          }
        }
        viewEnabled.onchange = spacing.onchange = () => void saveReadingView();
        const size = document.querySelector("#reading-size");
        const contrast = document.querySelector("#reading-contrast");
        const initial = appearanceForSite(state.siteAppearance, hostname);
        size.value = String(initial.scale);
        contrast.value = initial.contrast;
        size.disabled = contrast.disabled = !hostname;
        document.querySelector("#appearance-site").textContent = hostname ? `Saved for ${hostname}.` : "Open a website to customize its readings.";
        async function saveAppearance() {
          const feedback2 = document.querySelector("#appearance-feedback");
          try {
            const latest = await chrome.storage.local.get({ siteAppearance: {} });
            const sites = latest.siteAppearance && typeof latest.siteAppearance === "object" ? { ...latest.siteAppearance } : {};
            sites[hostname] = { scale: Number(size.value), contrast: contrast.value };
            await chrome.storage.local.set({ siteAppearance: sites });
            feedback2.textContent = "Saved for this site.";
            feedback2.dataset.error = "false";
            changed();
          } catch {
            feedback2.textContent = "Could not save. Try again.";
            feedback2.dataset.error = "true";
          }
        }
        size.onchange = contrast.onchange = () => void saveAppearance();
        const word = document.querySelector("#correction-word");
        const reading = document.querySelector("#correction-reading");
        const form = document.querySelector("#correction-form");
        const list = document.querySelector("#corrections");
        const cancelEdit = document.querySelector("#cancel-edit");
        const feedback = document.querySelector("#correction-feedback");
        let editingWord;
        function report(text, error = false) {
          feedback.textContent = text;
          feedback.dataset.error = String(error);
        }
        function reset() {
          form.reset();
          editingWord = void 0;
          cancelEdit.hidden = true;
        }
        cancelEdit.onclick = () => {
          reset();
          report("");
        };
        function renderCorrections(values) {
          list.replaceChildren();
          document.querySelector("#correction-count").textContent = Object.keys(values).length ? `(${Object.keys(values).length})` : "";
          for (const [w, r] of Object.entries(values)) {
            const row = document.createElement("li");
            row.className = "correction";
            const copy = document.createElement("span");
            copy.textContent = w;
            const kana = document.createElement("small");
            kana.textContent = r;
            copy.append(kana);
            const edit = document.createElement("button");
            edit.type = "button";
            edit.textContent = "Edit";
            edit.setAttribute("aria-label", `Edit ${w}`);
            edit.onclick = () => {
              word.value = w;
              reading.value = r;
              editingWord = w;
              cancelEdit.hidden = false;
              word.focus();
            };
            const remove = document.createElement("button");
            remove.type = "button";
            remove.textContent = "Remove";
            remove.setAttribute("aria-label", `Remove ${w}`);
            remove.onclick = async () => {
              try {
                const latest = await chrome.storage.local.get({ readingOverrides: {} }), values2 = validOverrides(latest.readingOverrides);
                delete values2[w];
                await chrome.storage.local.set({ readingOverrides: values2 });
                renderCorrections(values2);
                if (editingWord === w) reset();
                report("Correction removed.");
                changed();
              } catch {
                report("Could not remove the correction. Try again.", true);
              }
            };
            row.append(copy, edit, remove);
            list.append(row);
          }
        }
        renderCorrections(validOverrides(state.readingOverrides));
        form.onsubmit = async (event) => {
          event.preventDefault();
          try {
            const correction = validateOverride(word.value, reading.value);
            const latest = await chrome.storage.local.get({ readingOverrides: {} }), values = validOverrides(latest.readingOverrides);
            if (editingWord && editingWord !== correction.word) delete values[editingWord];
            if (!(correction.word in values) && Object.keys(values).length >= 200) throw new Error("You have 200 corrections. Remove one before adding another.");
            values[correction.word] = correction.reading;
            await chrome.storage.local.set({ readingOverrides: values });
            renderCorrections(values);
            reset();
            report("Saved. Readings update automatically.");
            changed();
          } catch (error) {
            report(error instanceof Error ? error.message : "Could not save the correction.", true);
          }
        };
        changed();
      }
      void main();
    }
  });
  require_popup();
})();
//# sourceMappingURL=popup.js.map
