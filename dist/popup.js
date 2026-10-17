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
  function readingViewPreferences(value, legacy) {
    const v = value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
    const old = docsReadingView(legacy);
    const sites = v?.sites && typeof v.sites === "object" && !Array.isArray(v.sites) ? Object.fromEntries(Object.entries(v.sites).filter(([, enabled]) => typeof enabled === "boolean")) : !v && old.enabled ? { "docs.google.com": true } : {};
    return { sites, spacing: docsReadingView({ spacing: v?.spacing ?? old.spacing }).spacing, fontSize: panelFontSizes.includes(v?.fontSize ?? 0) ? v.fontSize : 20, width: typeof v?.width === "number" && Number.isFinite(v.width) ? Math.max(280, Math.min(720, v.width)) : 420 };
  }
  function panelEnabled(settings, hostname) {
    return Object.hasOwn(settings.sites, hostname) && settings.sites[hostname] === true;
  }
  async function mutatePreferences(mutation) {
    const reply = await chrome.runtime.sendMessage({ type: "mutate-preferences", mutation });
    if (!reply || reply.error || !Object.hasOwn(reply, "value")) throw new Error(reply?.error ?? "Could not save the preference. Try again.");
    return reply.value;
  }
  function updateReadingView(patch, site) {
    return mutatePreferences({ kind: "reading-view", patch, site });
  }
  function saveCorrection(word, reading, previousWord) {
    return mutatePreferences({ kind: "save-correction", word, reading, previousWord });
  }
  function removeCorrection(word) {
    return mutatePreferences({ kind: "remove-correction", word });
  }
  function importCorrections(json) {
    return mutatePreferences({ kind: "import-corrections", json });
  }
  function pauseSite(hostname, paused) {
    return mutatePreferences({ kind: "pause-site", hostname, paused });
  }
  function updateSiteAppearance(hostname, patch) {
    return mutatePreferences({ kind: "site-appearance", hostname, patch });
  }
  function correctionMatches(word, reading, query) {
    const normalized = hiragana(query.trim().normalize("NFKC")).toLocaleLowerCase();
    return hiragana(word.normalize("NFKC")).toLocaleLowerCase().includes(normalized) || reading.includes(normalized);
  }
  var panelFontSizes, correctionBackupLimit;
  var init_preferences = __esm({
    "src/preferences.ts"() {
      "use strict";
      init_shared();
      panelFontSizes = [16, 18, 20, 24, 28, 32];
      correctionBackupLimit = 256 * 1024;
    }
  });

  // src/ui-theme.ts
  var uiTheme;
  var init_ui_theme = __esm({
    "src/ui-theme.ts"() {
      "use strict";
      uiTheme = `:root,:host{
  color-scheme:light;
  --ink:#242b2d;--muted:#625d50;--accent:#234e64;--seal:#9f3e2d;
  --paper:#f4ecd8;--surface:#e6d8b9;--line:#242b2d;
  --mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;
  --body:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;
}
*{box-sizing:border-box}
button,input,select{border-radius:0}
button.primary{background:var(--seal);color:var(--paper)}
button.primary:hover{background:var(--ink)}
button:disabled{opacity:.45;cursor:default}
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{
  outline:3px solid var(--accent);outline-offset:3px;
}
[hidden]{display:none!important}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;
    }
  });

  // src/popup.ts
  var require_popup = __commonJS({
    "src/popup.ts"() {
      init_preferences();
      init_ui_theme();
      var theme = document.createElement("style");
      theme.textContent = uiTheme;
      document.head.append(theme);
      async function main() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let hostname = "";
        try {
          if (tab?.url && /^https?:/.test(tab.url)) hostname = new URL(tab.url).hostname;
        } catch {
        }
        const state = await chrome.storage.local.get({ enabled: true, excluded: [], siteAppearance: {}, readingOverrides: {}, docsReadingView: {}, readingView: null });
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
            await pauseSite(hostname, excluded.checked);
            changed();
          } catch {
            show("Could not save the site preference. Reopen the menu and try again.", "unavailable");
          }
        };
        const viewEnabled = document.querySelector("#view-reading-enabled");
        const spacing = document.querySelector("#view-reading-spacing");
        const fontSize = document.querySelector("#panel-font-size");
        const view = readingViewPreferences(state.readingView, state.docsReadingView);
        viewEnabled.checked = panelEnabled(view, hostname);
        viewEnabled.disabled = !hostname;
        spacing.value = String(view.spacing);
        fontSize.value = String(view.fontSize);
        spacing.disabled = fontSize.disabled = !hostname;
        async function saveReadingView(event) {
          const feedback2 = document.querySelector("#view-reading-feedback");
          try {
            const patch = event.target === spacing ? { spacing: Number(spacing.value) } : event.target === fontSize ? { fontSize: Number(fontSize.value) } : {};
            await updateReadingView(patch, event.target === viewEnabled ? { hostname, enabled: viewEnabled.checked } : void 0);
            feedback2.textContent = `Panel preference saved for ${hostname}. Text size and spacing apply everywhere.`;
            feedback2.dataset.error = "false";
            changed();
          } catch {
            feedback2.textContent = "Could not save. Try again.";
            feedback2.dataset.error = "true";
          }
        }
        viewEnabled.onchange = spacing.onchange = fontSize.onchange = (event) => void saveReadingView(event);
        const size = document.querySelector("#reading-size");
        const contrast = document.querySelector("#reading-contrast");
        const initial = appearanceForSite(state.siteAppearance, hostname);
        size.value = String(initial.scale);
        contrast.value = initial.contrast;
        size.disabled = contrast.disabled = !hostname;
        document.querySelector("#appearance-site").textContent = hostname ? `Saved for ${hostname}.` : "Open a website to customize its readings.";
        async function saveAppearance(event) {
          const feedback2 = document.querySelector("#appearance-feedback");
          try {
            await updateSiteAppearance(hostname, event.target === size ? { scale: Number(size.value) } : { contrast: contrast.value === "high" ? "high" : "auto" });
            feedback2.textContent = "Saved for this site.";
            feedback2.dataset.error = "false";
            changed();
          } catch {
            feedback2.textContent = "Could not save. Try again.";
            feedback2.dataset.error = "true";
          }
        }
        size.onchange = contrast.onchange = (event) => void saveAppearance(event);
        const word = document.querySelector("#correction-word");
        const reading = document.querySelector("#correction-reading");
        const form = document.querySelector("#correction-form");
        const list = document.querySelector("#corrections");
        const cancelEdit = document.querySelector("#cancel-edit");
        const feedback = document.querySelector("#correction-feedback");
        const search = document.querySelector("#correction-search");
        let currentCorrections = validOverrides(state.readingOverrides);
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
          currentCorrections = values;
          list.replaceChildren();
          document.querySelector("#correction-count").textContent = Object.keys(values).length ? `(${Object.keys(values).length})` : "";
          let matches = 0;
          for (const [w, r] of Object.entries(values)) {
            if (!correctionMatches(w, r, search.value)) continue;
            matches++;
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
                const values2 = await removeCorrection(w);
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
          document.querySelector("#correction-empty").hidden = matches > 0 || !search.value.trim();
        }
        renderCorrections(validOverrides(state.readingOverrides));
        form.onsubmit = async (event) => {
          event.preventDefault();
          try {
            const values = await saveCorrection(word.value, reading.value, editingWord);
            renderCorrections(values);
            reset();
            report("Saved. Readings update automatically.");
            changed();
          } catch (error) {
            report(error instanceof Error ? error.message : "Could not save the correction.", true);
          }
        };
        search.oninput = () => renderCorrections(currentCorrections);
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== "local") return;
          if (changes.enabled) enabled.checked = changes.enabled.newValue !== false;
          if (changes.excluded) excluded.checked = Array.isArray(changes.excluded.newValue) && changes.excluded.newValue.includes(hostname);
          if (changes.enabled || changes.excluded) changed();
          if (changes.readingOverrides) renderCorrections(validOverrides(changes.readingOverrides.newValue));
          if (changes.siteAppearance) {
            const next = appearanceForSite(changes.siteAppearance.newValue, hostname);
            size.value = String(next.scale);
            contrast.value = next.contrast;
          }
          if (changes.readingView) {
            const view2 = readingViewPreferences(changes.readingView.newValue, state.docsReadingView);
            viewEnabled.checked = panelEnabled(view2, hostname);
            spacing.value = String(view2.spacing);
            fontSize.value = String(view2.fontSize);
          }
        });
        chrome.runtime.onMessage.addListener((message, sender) => {
          if (message?.type === "toolbar-status-changed" && sender.frameId === 0 && sender.tab?.id === tab?.id) void refresh();
        });
        document.querySelector("#export-corrections").onclick = async () => {
          try {
            const latest = await chrome.storage.local.get({ readingOverrides: {} });
            const blob = new Blob([JSON.stringify({ version: 1, corrections: validOverrides(latest.readingOverrides) }, null, 2)], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob), link = document.createElement("a");
            link.href = url;
            link.download = "ko-reading-corrections.json";
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
            report("Correction backup exported.");
          } catch {
            report("Could not export corrections. Try again.", true);
          }
        };
        const file = document.querySelector("#correction-file");
        document.querySelector("#import-corrections").onclick = () => file.click();
        file.onchange = async () => {
          const selected = file.files?.[0];
          if (!selected) return;
          try {
            if (selected.size > correctionBackupLimit) throw new Error("Choose a backup smaller than 256 KiB.");
            const result = await importCorrections(await selected.text());
            renderCorrections(result.values);
            report(`Imported ${result.added} corrections; skipped ${result.skipped} existing words.`);
            changed();
          } catch (error) {
            report(error instanceof Error ? error.message : "Could not import corrections.", true);
          } finally {
            file.value = "";
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
