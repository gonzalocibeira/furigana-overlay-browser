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

  // src/shared.ts
  function align(surface, raw) {
    if (!kanji.test(surface) || !raw || raw === "*") return [];
    const reading = hiragana(raw);
    const runs = [...surface.matchAll(/[\p{Script=Han}々〆ヵヶ]+|[^\p{Script=Han}々〆ヵヶ]+/gu)];
    let cursor = 0;
    const out = [];
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i], value = run[0];
      if (!kanji.test(value)) {
        const kana2 = hiragana(value);
        if (!reading.startsWith(kana2, cursor)) return [{ start: 0, end: surface.length, reading }];
        cursor += kana2.length;
      } else {
        const next = runs[i + 1];
        let end = reading.length;
        if (next) {
          const anchor = hiragana(next[0]);
          end = reading.indexOf(anchor, cursor + 1);
          if (end < 0 || reading.indexOf(anchor, end + 1) !== -1) return [{ start: 0, end: surface.length, reading }];
        }
        if (end <= cursor) return [{ start: 0, end: surface.length, reading }];
        out.push({ start: run.index, end: run.index + value.length, reading: reading.slice(cursor, end) });
        cursor = end;
      }
    }
    return cursor === reading.length ? out : [{ start: 0, end: surface.length, reading }];
  }
  var hiragana, kanji;
  var init_shared = __esm({
    "src/shared.ts"() {
      "use strict";
      hiragana = (text) => text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
      kanji = /[\p{Script=Han}々〆ヵヶ]/u;
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
  var panelFontSizes, correctionBackupLimit;
  var init_preferences = __esm({
    "src/preferences.ts"() {
      "use strict";
      init_shared();
      panelFontSizes = [16, 18, 20, 24, 28, 32];
      correctionBackupLimit = 256 * 1024;
    }
  });

  // src/definitions.ts
  function dictionaryURL(language, word) {
    return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(word)}#${language === "en" ? "Japanese" : "\u65E5\u672C\u8A9E"}`;
  }
  function definitionText(html, language) {
    const template = document.createElement("template");
    template.innerHTML = html;
    let japanese2 = false, partOfSpeech = false;
    const out = [];
    const clean = (element4) => {
      const copy = element4.cloneNode(true);
      copy.querySelectorAll("script,style,iframe,img,video,audio,svg,ul,ol,dl,table,rt,rp,.mw-editsection,.reference,.citation-whole,.quotation,.h-usage-example").forEach((node) => node.remove());
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    };
    for (const element4 of template.content.querySelectorAll("h2,h3,h4,h5,h6,ol")) {
      if (element4.closest("table,dl,.toc")) continue;
      if (element4.tagName === "H2") {
        japanese2 = /^(Japanese|日本語)(?:\s|$)/u.test(clean(element4));
        partOfSpeech = false;
        continue;
      }
      if (!japanese2) continue;
      if (element4.tagName !== "OL") {
        const heading = clean(element4);
        if (!/^語義(?:\s|$)/u.test(heading)) partOfSpeech = /^(Noun|Proper noun|Verb|Adjective|Adverb|Pronoun|Particle|Conjunction|Interjection|Prefix|Suffix|Counter|Numeral|Determiner|Phrase|Proverb|Idiom|Affix|名詞|固有名詞|動詞|形容詞|形容動詞|副詞|代名詞|助詞|接続詞|感動詞|接頭辞|接尾辞|助数詞|数詞|連体詞|成句|熟語|ことわざ|熟字訓|語素)(?:\s|[:：0-9０-９]|$)/u.test(heading);
        continue;
      }
      if (!partOfSpeech || element4.parentElement?.closest("ol,ul")) continue;
      for (const item of element4.querySelectorAll("li")) {
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

  // node_modules/kamiya-codec/dist/kamiya.min.mjs
  function N(r, e) {
    if (e < 0 || e > 4) throw new Error("vowel must be between 0 and 4");
    let n = k.get(r);
    if (typeof n == "undefined") throw new Error("unknown character");
    let a = A[n][e];
    if (a.length === 0) throw new Error("vowel for kana does not exist");
    return a;
  }
  function m(r, e) {
    {
      if (r === "\u3059\u308B") return H(r, e);
      if (r === "\u304F\u308B" || r === "\u6765\u308B") return R(r, e);
      if (r === "\u3060") return O(r, e);
      if (r === "\u3067\u3059") return Z(r, e);
      if (r.endsWith("\u304F\u3060\u3055\u308B")) {
        if (e === "Dictionary") return [r];
        if (e === "Conjunctive") return [r.slice(0, -2) + "\u3055\u3044"];
        throw new Error("unknown conjugation for -kudasaru");
      }
      let i = j.get(r);
      if (i && i.has(e)) return [i.get(e) || ""];
    }
    let n = r.slice(0, -1), a = r.slice(-1), t = C.get(e === "Imperative" ? "Conditional" : e);
    if (typeof t == "undefined") throw new Error("Conjugation not yet implemented");
    if (t < 5) return a === "\u3046" ? t === 0 ? [n + "\u308F"] : [n + N("\u3042", t)] : [n + N(a, t)];
    let u = t - 5, o = U.get(r === "\u884C\u304F" || r === "\u3044\u304F" ? "\u3064" : a);
    if (!o) throw new Error("Unknown verb ending. Is it in dictionary form?");
    return [n + o[u]];
  }
  function y(r, e) {
    if (r === "\u3059\u308B") return H(r, e);
    if (r === "\u304F\u308B" || r === "\u6765\u308B") return R(r, e);
    if (r === "\u3060") return O(r, e);
    if (r === "\u3067\u3059") return Z(r, e);
    let n = r.slice(0, -1);
    switch (e) {
      case "Negative":
      case "Zu":
      case "Nu":
        return [n];
      case "Conjunctive":
        return [n];
      case "Dictionary":
        return [r];
      case "Conditional":
        return [n + "\u308C"];
      case "Imperative":
        return [n + "\u308D", n + "\u3088"];
      case "Volitional":
        return [n + "\u3088\u3046"];
      case "Te":
        return [n + "\u3066"];
      case "Ta":
        return [n + "\u305F"];
      case "Tara":
        return [n + "\u305F\u3089"];
      case "Tari":
        return [n + "\u305F\u308A"];
      default:
        throw new Error("Unhandled conjugation");
    }
  }
  function R(r, e) {
    let n = "";
    switch (e) {
      case "Negative":
      case "Zu":
      case "Nu":
        n = "\u3053";
        break;
      case "Conjunctive":
        n = "\u304D";
        break;
      case "Dictionary":
        n = "\u304F\u308B";
        break;
      case "Conditional":
        n = "\u304F\u308C";
        break;
      case "Imperative":
        n = "\u3053\u3044";
        break;
      case "Volitional":
        n = "\u3053\u3088\u3046";
        break;
      case "Te":
        n = "\u304D\u3066";
        break;
      case "Ta":
        n = "\u304D\u305F";
        break;
      case "Tara":
        n = "\u304D\u305F\u3089";
        break;
      case "Tari":
        n = "\u304D\u305F\u308A";
        break;
      default:
        throw new Error("Unhandled conjugation");
    }
    let a = r.slice(0, -1);
    if (a === "\u304F") return [n];
    if (a === "\u6765") return ["\u6765" + n.slice(1)];
    throw new Error("Expected input to be \u6765\u308B or \u304F\u308B");
  }
  function H(r, e) {
    switch (e) {
      case "Negative":
        return ["\u3057"];
      case "Conjunctive":
        return ["\u3057"];
      case "Dictionary":
        return ["\u3059\u308B"];
      case "Conditional":
        return ["\u3059\u308C"];
      case "Imperative":
        return ["\u3057\u308D", "\u305B\u3088"];
      case "Volitional":
        return ["\u3057\u3088\u3046"];
      case "Te":
        return ["\u3057\u3066"];
      case "Ta":
        return ["\u3057\u305F"];
      case "Tara":
        return ["\u3057\u305F\u3089"];
      case "Tari":
        return ["\u3057\u305F\u308A"];
      case "Zu":
        return ["\u305B\u305A"];
      case "Nu":
        return ["\u305B\u306C"];
      default:
        throw new Error("Unhandled conjugation");
    }
  }
  function O(r, e) {
    switch (e) {
      case "Negative":
        return ["\u3067\u306A\u3044", "\u3067\u306F\u306A\u3044", "\u3058\u3083\u306A\u3044"];
      case "Dictionary":
        return ["\u3060"];
      case "Conditional":
        return ["\u306A\u3089"];
      case "Te":
        return ["\u3067"];
      case "Ta":
        return ["\u3060\u3063\u305F"];
      case "Tara":
        return ["\u3060\u3063\u305F\u3089"];
      case "Tari":
        return ["\u3060\u3063\u305F\u308A"];
      default:
        throw new Error("Unhandled conjugation");
    }
  }
  function Z(r, e) {
    switch (e) {
      case "Negative":
        return ["\u3067\u3042\u308A\u307E\u305B\u3093", "\u3067\u306F\u3042\u308A\u307E\u305B\u3093"];
      case "Dictionary":
        return ["\u3067\u3059"];
      case "Te":
        return ["\u3067\u3057\u3066"];
      case "Ta":
        return ["\u3067\u3057\u305F"];
      case "Tara":
        return ["\u3067\u3057\u305F\u3089"];
      case "Tari":
        return ["\u3067\u3057\u305F\u308A"];
      default:
        throw new Error("Unhandled conjugation");
    }
  }
  var f, A, k, T, V, j, C, P, K, W, U;
  var init_kamiya_min = __esm({
    "node_modules/kamiya-codec/dist/kamiya.min.mjs"() {
      f = (r) => r.split("");
      A = [f("\u3042\u3044\u3046\u3048\u304A"), f("\u304B\u304D\u304F\u3051\u3053"), f("\u304C\u304E\u3050\u3052\u3054"), f("\u3055\u3057\u3059\u305B\u305D"), f("\u3056\u3058\u305A\u305C\u305E"), f("\u305F\u3061\u3064\u3066\u3068"), f("\u3060\u3062\u3065\u3067\u3069"), f("\u306A\u306B\u306C\u306D\u306E"), f("\u306F\u3072\u3075\u3078\u307B"), f("\u3070\u3073\u3076\u3079\u307C"), f("\u3071\u3074\u3077\u307A\u307D"), f("\u307E\u307F\u3080\u3081\u3082"), ["\u3084", "", "\u3086", "", "\u3088"], f("\u3089\u308A\u308B\u308C\u308D"), ["\u308F", "", "", "", "\u3092"], ["\u3093", "", "", "", ""]];
      k = /* @__PURE__ */ new Map([]);
      A.forEach((r, e) => {
        r.forEach((n) => {
          n.length > 0 && k.set(n, e);
        });
      });
      T = ["Negative", "Conjunctive", "Dictionary", "Conditional", "Imperative", "Volitional", "Te", "Ta", "Tara", "Tari", "Zu", "Nu"];
      V = [["\u3042\u308B", "Negative", ""], ["\u3054\u3056\u308B", "Conjunctive", "\u3054\u3056\u3044"], ["\u3044\u3089\u3063\u3057\u3083\u308B", "Conjunctive", "\u3044\u3089\u3063\u3057\u3083\u3044"], ["\u3044\u3089\u3063\u3057\u3083\u308B", "Conditional", "\u3044\u3089\u3063\u3057\u3083\u3044"], ["\u3044\u3089\u3063\u3057\u3083\u308B", "Imperative", "\u3044\u3089\u3063\u3057\u3083\u3044"]];
      j = /* @__PURE__ */ new Map([]);
      for (let [r, e, n] of V) {
        let a = j.get(r);
        a ? a.set(e, n) : j.set(r, /* @__PURE__ */ new Map([[e, n]]));
      }
      C = new Map(T.filter((r) => r !== "Imperative").map((r, e) => [r, e]));
      C.set("Zu", (P = C.get("Negative")) != null ? P : -1);
      C.set("Nu", (K = C.get("Negative")) != null ? K : -1);
      W = [["\u304F", ["\u3044\u3066", "\u3044\u305F", "\u3044\u305F\u3089", "\u3044\u305F\u308A"]], ["\u3050", ["\u3044\u3067", "\u3044\u3060", "\u3044\u3060\u3089", "\u3044\u3060\u308A"]], ["\u3059", ["\u3057\u3066", "\u3057\u305F", "\u3057\u305F\u3089", "\u3057\u305F\u308A"]], ["\u306C", ["\u3093\u3067", "\u3093\u3060", "\u3093\u3060\u3089", "\u3093\u3060\u308A"]], ["\u3076", ["\u3093\u3067", "\u3093\u3060", "\u3093\u3060\u3089", "\u3093\u3060\u308A"]], ["\u3080", ["\u3093\u3067", "\u3093\u3060", "\u3093\u3060\u3089", "\u3093\u3060\u308A"]], ["\u3064", ["\u3063\u3066", "\u3063\u305F", "\u3063\u305F\u3089", "\u3063\u305F\u308A"]], ["\u308B", ["\u3063\u3066", "\u3063\u305F", "\u3063\u305F\u3089", "\u3063\u305F\u308A"]], ["\u3046", ["\u3063\u3066", "\u3063\u305F", "\u3063\u305F\u3089", "\u3063\u305F\u308A"]]];
      U = /* @__PURE__ */ new Map([]);
      for (let [r, e] of W) U.set(r, e);
    }
  });

  // src/verb-playground.ts
  function validBase(base) {
    if (!base.lemma || base.lemma.length > 40 || !japanese.test(base.lemma) || !kana.test(base.reading) || helperLemmas.has(base.lemma) || irregularLexemes.has(base.lemma)) return false;
    if (base.prefix && (!japanese.test(base.prefix) || !base.prefixReading || !kana.test(base.prefixReading) || base.lemma !== "\u3059\u308B" || (base.prefix + base.lemma).length > 40)) return false;
    if (base.verbClass === "\u4E00\u6BB5") return base.lemma.endsWith("\u308B") && base.reading.endsWith("\u308B");
    if (base.verbClass === "\u30B5\u5909\u30FB\u30B9\u30EB") return base.lemma === "\u3059\u308B" && base.reading === "\u3059\u308B";
    if (base.verbClass === "\u30AB\u5909\u30FB\u6765\u30EB" || base.verbClass === "\u30AB\u5909\u30FB\u30AF\u30EB") return ["\u6765\u308B", "\u304F\u308B"].includes(base.lemma) && base.reading === "\u304F\u308B";
    return godan.has(base.verbClass) && /[うくぐすつぬぶむる]$/u.test(base.lemma);
  }
  function wordBase(word) {
    if (word.pos !== "\u52D5\u8A5E" || word.posDetail !== "\u81EA\u7ACB" || !word.verbForm || !word.lemmaReading || !word.verbClass) return;
    const base = { lemma: word.lemma, reading: hiragana(word.lemmaReading), verbClass: word.verbClass };
    return validBase(base) ? base : void 0;
  }
  function restrictVerbBase(base) {
    return { ...base, restricted: true };
  }
  function verbBaseText(base) {
    return (base.prefix ?? "") + base.lemma;
  }
  function verbBaseReading(base) {
    return (base.prefixReading ?? "") + base.reading;
  }
  function elementary(base, conj) {
    if (base.verbClass === "\u4E94\u6BB5\u30FB\u30AB\u884C\u4FC3\u97F3\u4FBF" && (conj === "Te" || conj === "Ta")) {
      const ending = conj === "Te" ? "\u3063\u3066" : "\u3063\u305F";
      return { text: base.lemma.slice(0, -1) + ending, reading: base.reading.slice(0, -1) + ending };
    }
    if (base.reading === "\u3042\u308B" && ["\u3042\u308B", "\u6709\u308B", "\u5728\u308B"].includes(base.lemma) && conj === "Negative") return { text: "", reading: "" };
    if (godan.has(base.verbClass)) {
      const prefix = "\u4EEE";
      const a2 = m(prefix + base.lemma, conj), b2 = m(prefix + base.reading, conj);
      if (a2.length !== 1 || b2.length !== 1) throw new Error("Ambiguous godan form");
      return { text: a2[0].slice(prefix.length), reading: b2[0].slice(prefix.length) };
    }
    const fn = base.verbClass === "\u4E00\u6BB5" ? y : m;
    const a = fn(base.lemma, conj), b = fn(base.reading, conj);
    if (conj === "Imperative" && a.length > 1 && b.length > 1) return { text: a[0], reading: b[0] };
    if (a.length !== 1 || b.length !== 1) throw new Error("Ambiguous elementary form");
    return { text: a[0], reading: b[0] };
  }
  function add(pair, suffix) {
    return { text: pair.text + suffix, reading: pair.reading + suffix };
  }
  function derived(base, family, spoken) {
    const make = (pair, verbClass = "\u4E00\u6BB5") => ({ lemma: pair.text, reading: pair.reading, verbClass });
    const negative = () => elementary(base, "Negative");
    if (family === "potential") {
      if (isSuru(base)) return make({ text: "\u3067\u304D\u308B", reading: "\u3067\u304D\u308B" });
      if (isKuru(base)) return make(add(negative(), "\u3089\u308C\u308B"));
      return make(add(elementary(base, base.verbClass === "\u4E00\u6BB5" ? "Negative" : "Conditional"), base.verbClass === "\u4E00\u6BB5" ? "\u3089\u308C\u308B" : "\u308B"));
    }
    if (family === "passive") return make(isSuru(base) ? { text: "\u3055\u308C\u308B", reading: "\u3055\u308C\u308B" } : add(negative(), base.verbClass === "\u4E00\u6BB5" || isKuru(base) ? "\u3089\u308C\u308B" : "\u308C\u308B"));
    if (family === "causative" || family === "causativePassive") {
      const pair = isSuru(base) ? { text: "\u3055\u305B\u308B", reading: "\u3055\u305B\u308B" } : add(negative(), base.verbClass === "\u4E00\u6BB5" || isKuru(base) ? "\u3055\u305B\u308B" : "\u305B\u308B");
      return make(family === "causativePassive" ? { text: pair.text.slice(0, -1) + "\u3089\u308C\u308B", reading: pair.reading.slice(0, -1) + "\u3089\u308C\u308B" } : pair);
    }
    const te = elementary(base, "Te");
    if (family === "teIru") return make(add(te, "\u3044\u308B"));
    if (family === "teMiru") return make(add(te, "\u307F\u308B"));
    if (family === "teOku") return make(spoken ? { text: te.text.slice(0, -1) + (te.text.endsWith("\u3067") ? "\u3069\u304F" : "\u3068\u304F"), reading: te.reading.slice(0, -1) + (te.reading.endsWith("\u3067") ? "\u3069\u304F" : "\u3068\u304F") } : add(te, "\u304A\u304F"), "\u4E94\u6BB5\u30FB\u30AB\u884C\u30A4\u97F3\u4FBF");
    if (family === "teShimau") return make(spoken ? { text: te.text.slice(0, -1) + (te.text.endsWith("\u3067") ? "\u3058\u3083\u3046" : "\u3061\u3083\u3046"), reading: te.reading.slice(0, -1) + (te.reading.endsWith("\u3067") ? "\u3058\u3083\u3046" : "\u3061\u3083\u3046") } : add(te, "\u3057\u307E\u3046"), "\u4E94\u6BB5\u30FB\u30EF\u884C\u4FC3\u97F3\u4FBF");
    return base;
  }
  function finiteForm(base, state) {
    if (state.polite) return add(elementary(base, "Conjunctive"), state.negative ? state.past ? "\u307E\u305B\u3093\u3067\u3057\u305F" : "\u307E\u305B\u3093" : state.past ? "\u307E\u3057\u305F" : "\u307E\u3059");
    if (state.negative) return add(elementary(base, "Negative"), state.past ? "\u306A\u304B\u3063\u305F" : "\u306A\u3044");
    return elementary(base, state.past ? "Ta" : "Dictionary");
  }
  function generate(base, state) {
    const family = state.family;
    if (family === "desire") return add(elementary(base, "Conjunctive"), (state.negative ? state.past ? "\u305F\u304F\u306A\u304B\u3063\u305F" : "\u305F\u304F\u306A\u3044" : state.past ? "\u305F\u304B\u3063\u305F" : "\u305F\u3044") + (state.polite ? "\u3067\u3059" : ""));
    if (family === "te") return state.negative ? add(elementary(base, "Negative"), "\u306A\u304F\u3066") : elementary(base, "Te");
    if (family === "without") return add(elementary(base, "Negative"), "\u306A\u3044\u3067");
    if (family === "conditionalBa") return add(elementary(base, state.negative ? "Negative" : "Conditional"), state.negative ? "\u306A\u3051\u308C\u3070" : "\u3070");
    if (family === "conditionalTara") return add(finiteForm(base, { ...state, past: true }), "\u3089");
    if (family === "volitional") {
      if (state.polite) return add(elementary(base, "Conjunctive"), "\u307E\u3057\u3087\u3046");
      const stem = elementary(base, "Volitional");
      return base.verbClass === "\u4E00\u6BB5" || isSuru(base) || isKuru(base) ? stem : add(stem, "\u3046");
    }
    if (family === "request") return state.negative ? add(elementary(base, "Negative"), "\u306A\u3044\u3067\u304F\u3060\u3055\u3044") : add(elementary(base, "Te"), "\u304F\u3060\u3055\u3044");
    if (family === "imperative") return elementary(base, "Imperative");
    if (family === "prohibition") return add(elementary(base, "Dictionary"), "\u306A");
    const target = derived(base, family, state.spoken), pair = finiteForm(target, state);
    if (family === "teIru" && state.spoken) {
      const te = elementary(base, "Te");
      return { text: te.text + pair.text.slice(te.text.length + 1), reading: te.reading + pair.reading.slice(te.reading.length + 1) };
    }
    return pair;
  }
  function stateId(state) {
    return [state.family, +state.past, +state.negative, +state.polite, +state.spoken].join(":");
  }
  function formsFor(base) {
    if (!validBase(base)) return [];
    const restricted = base.restricted || lexicalRestrictions.has(base.lemma) || base.reading === "\u3042\u308B" && ["\u3042\u308B", "\u6709\u308B", "\u5728\u308B"].includes(base.lemma);
    const out = [];
    for (const family of verbFamilies) {
      if (restricted && !restrictedFamilies.has(family.id)) continue;
      for (const past of family.controls.includes("past") ? [false, true] : [false]) for (const negative of family.controls.includes("negative") ? [false, true] : [false]) for (const polite of family.controls.includes("polite") ? [false, true] : [false]) for (const spoken of family.controls.includes("spoken") ? [false, true] : [false]) {
        const state = { family: family.id, past, negative, polite, spoken };
        const pair = generate(base, state);
        out.push({ ...state, id: stateId(state), text: (base.prefix ?? "") + pair.text, reading: (base.prefixReading ?? "") + pair.reading });
      }
    }
    return out;
  }
  function sourceAliases(base, forms) {
    const aliases = [];
    for (const form of forms) {
      if (form.family === "desire" && form.polite && form.negative) {
        const pair = add(elementary(base, "Conjunctive"), form.past ? "\u305F\u304F\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F" : "\u305F\u304F\u3042\u308A\u307E\u305B\u3093");
        aliases.push({ ...form, id: form.id + ":alias", text: (base.prefix ?? "") + pair.text, reading: (base.prefixReading ?? "") + pair.reading });
      }
      if (form.family === "imperative" && (base.verbClass === "\u4E00\u6BB5" || isSuru(base))) {
        const pair = isSuru(base) ? { text: "\u305B\u3088", reading: "\u305B\u3088" } : add(elementary(base, "Negative"), "\u3088");
        aliases.push({ ...form, id: form.id + ":alias", text: (base.prefix ?? "") + pair.text, reading: (base.prefixReading ?? "") + pair.reading });
      }
    }
    return aliases;
  }
  function model(base, forms, source, sourceReading, matches2, start = 0, end = source.length) {
    const first = matches2[0];
    const initial = { family: first.family, past: first.past, negative: first.negative, polite: first.polite, spoken: first.spoken };
    return { start, end, source, sourceReading, lemma: verbBaseText(base), base, forms, initial, sourceMatches: matches2, requiresChoice: new Set(matches2.map((match) => match.family)).size > 1 };
  }
  function createVerbPlayground(base, source) {
    const forms = formsFor(base), text = source?.text ?? verbBaseText(base), reading = source?.reading ?? verbBaseReading(base);
    const matches2 = source ? [...forms, ...sourceAliases(base, forms)].filter((form) => form.text === text && form.reading === reading) : forms.filter((form) => form.family === "simple" && !form.past && !form.negative && !form.polite && !form.spoken);
    if (!matches2.length) throw new Error("Unsupported dictionary verb or source form");
    return model(base, forms, text, reading, matches2, source?.start, source?.end);
  }
  function contiguous(words, left, right) {
    return left >= 0 && right < words.length && words[left].end === words[right].start;
  }
  function auxiliaryPrefix(text, words, start) {
    let index = start - 1;
    if (!contiguous(words, index, start)) return false;
    if (words[index].pos === "\u52D5\u8A5E") return true;
    const previous = text.slice(words[index].start, words[index].end);
    if (words[start].lemma === "\u5F97\u308B" && previous === "\u3092" && contiguous(words, index - 1, index) && words[index - 1].lemma === "\u306C" && text.slice(words[index - 1].start, words[index - 1].end) === "\u3056\u308B") return true;
    if (previous === "\u306F" || previous === "\u3082") {
      if (!contiguous(words, index - 1, index)) return false;
      index--;
    }
    const link = text.slice(words[index].start, words[index].end);
    return (link === "\u3066" || link === "\u3067") && contiguous(words, index - 1, index) && words[index - 1].pos === "\u52D5\u8A5E";
  }
  function unsupportedContinuation(text, words, endIndex, family) {
    const next = endIndex + 1;
    if (!contiguous(words, endIndex, next)) return false;
    if (words[next].pos === "\u52A9\u52D5\u8A5E" || words[next].pos === "\u52D5\u8A5E") return true;
    const link = text.slice(words[next].start, words[next].end);
    if (link === "\u306A" && words[next].posDetail === "\u7D42\u52A9\u8A5E" && (words[endIndex].pos === "\u52D5\u8A5E" || words[endIndex].lemma === "\u307E\u3059")) return true;
    if (link === "\u3067" && words[endIndex].lemma === "\u306A\u3044") return true;
    if (["te", "without"].includes(family) && ["\u306F", "\u3082"].includes(link)) return true;
    return ["\u3066", "\u3067", "\u3068"].includes(link) && contiguous(words, next, next + 1) && words[next + 1].pos === "\u52D5\u8A5E";
  }
  function terminal(word, family) {
    if (["te", "without", "conditionalBa"].includes(family)) return word.pos === "\u52A9\u8A5E" && word.posDetail === "\u63A5\u7D9A\u52A9\u8A5E";
    if (family === "conditionalTara") return word.verbForm === "\u4EEE\u5B9A\u5F62";
    if (family === "imperative") return !!word.verbForm?.startsWith("\u547D\u4EE4") || word.lemma === "\u3088" && word.pos === "\u52A9\u8A5E" && word.posDetail === "\u7D42\u52A9\u8A5E";
    if (family === "request") return !!word.verbForm?.startsWith("\u547D\u4EE4");
    if (family === "prohibition") return word.pos === "\u52A9\u8A5E" && word.posDetail === "\u7D42\u52A9\u8A5E";
    return word.verbForm === "\u57FA\u672C\u5F62" || family === "teShimau" && word.lemma === "\u3046" && word.pos === "\u611F\u52D5\u8A5E";
  }
  function buildVerbPlayground(text, words, wordIndex) {
    if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) return;
    let best;
    for (let start = Math.max(0, wordIndex - 11); start <= wordIndex; start++) {
      const word = words[start], base = wordBase(word);
      if (!base || auxiliaryPrefix(text, words, start) || word.start < 0 || word.end > text.length || word.start >= word.end) continue;
      if ((["\u3044\u308B", "\u5C45\u308B"].includes(base.lemma) || ["\u304F\u308B", "\u3059\u308B"].includes(base.lemma) && godan.has(base.verbClass)) && word.verbForm === "\u57FA\u672C\u5F62" && text.slice(word.start, word.end) === base.lemma) continue;
      let forms, all;
      try {
        forms = formsFor(base);
        all = [...forms, ...sourceAliases(base, forms)];
      } catch {
        continue;
      }
      if (all.length > 128) continue;
      const index = /* @__PURE__ */ new Map();
      for (const form of all) {
        const key = form.text + "\0" + form.reading;
        index.set(key, [...index.get(key) ?? [], form]);
      }
      let sourceReading = "";
      for (let endIndex = start; endIndex < Math.min(words.length, start + 12); endIndex++) {
        const endWord = words[endIndex];
        if (endIndex > start && !contiguous(words, endIndex - 1, endIndex)) break;
        if (endWord.end > text.length || endWord.end <= endWord.start || endWord.end - word.start > 80) break;
        sourceReading += hiragana(endWord.reading);
        if (endIndex < wordIndex) continue;
        const source = text.slice(word.start, endWord.end);
        const matches2 = (index.get(source + "\0" + sourceReading) ?? []).filter((form) => terminal(endWord, form.family) && !unsupportedContinuation(text, words, endIndex, form.family));
        if (matches2.length && (!best || word.start < best.start || word.start === best.start && endWord.end > best.end)) best = model(base, forms, source, sourceReading, matches2, word.start, endWord.end);
      }
    }
    return best;
  }
  function dictionaryVerbCandidates(input, words) {
    if (!input || input.length > 40 || !japanese.test(input) || !words.length || words[0].start !== 0 || words.at(-1).end !== input.length) return [];
    if (words.some((word, index) => word.start < 0 || word.end <= word.start || word.end > input.length || index > 0 && !contiguous(words, index - 1, index))) return [];
    if (input === "\u304F\u308B") return [
      { lemma: "\u6765\u308B", reading: "\u304F\u308B", verbClass: "\u30AB\u5909\u30FB\u6765\u30EB", label: "\u6765\u308B \u2014 come" },
      { lemma: "\u7E70\u308B", reading: "\u304F\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u7E70\u308B \u2014 reel, turn, or leaf through" }
    ];
    if (input === "\u3059\u308B") return [
      { lemma: "\u3059\u308B", reading: "\u3059\u308B", verbClass: "\u30B5\u5909\u30FB\u30B9\u30EB", label: "\u3059\u308B \u2014 do" },
      { lemma: "\u5237\u308B", reading: "\u3059\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u5237\u308B \u2014 print" },
      { lemma: "\u647A\u308B", reading: "\u3059\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u647A\u308B \u2014 rub or grind" }
    ];
    if (input === "\u5C45\u308B") return [
      { lemma: "\u5C45\u308B", reading: "\u3044\u308B", verbClass: "\u4E00\u6BB5", label: "\u5C45\u308B\uFF08\u3044\u308B\uFF09\u2014 exist or stay (animate)" },
      { lemma: "\u5C45\u308B", reading: "\u304A\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u5C45\u308B\uFF08\u304A\u308B\uFF09\u2014 be or stay" }
    ];
    if (input === "\u3044\u308B") return [
      { lemma: "\u3044\u308B", reading: "\u3044\u308B", verbClass: "\u4E00\u6BB5", label: "\u3044\u308B \u2014 exist or stay (animate)" },
      { lemma: "\u8981\u308B", reading: "\u3044\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u8981\u308B \u2014 need" },
      { lemma: "\u714E\u308B", reading: "\u3044\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u714E\u308B \u2014 roast" },
      { lemma: "\u7092\u308B", reading: "\u3044\u308B", verbClass: "\u4E94\u6BB5\u30FB\u30E9\u884C", label: "\u7092\u308B \u2014 roast or toast" }
    ];
    const last = words.at(-1), base = wordBase(last);
    if (!base || last.verbForm !== "\u57FA\u672C\u5F62" || input.slice(last.start, last.end) !== base.lemma || hiragana(last.reading) !== base.reading) return [];
    if (words.length === 1) return [lexicalRestrictions.has(base.lemma) ? restrictVerbBase(base) : base];
    if (words.length === 2 && base.lemma === "\u3059\u308B" && words[0].pos === "\u540D\u8A5E" && words[0].posDetail === "\u30B5\u5909\u63A5\u7D9A" && kana.test(hiragana(words[0].reading))) return [{ ...base, prefix: input.slice(0, last.start), prefixReading: hiragana(words[0].reading) }];
    return [];
  }
  function potentialBaseQueries(base) {
    if (base.prefix || base.verbClass !== "\u4E00\u6BB5" || lexicalRestrictions.has(base.lemma) || !base.lemma.endsWith("\u308B")) return [];
    const tail = potentialRows[base.lemma.at(-2) ?? ""];
    const queries = tail ? [base.lemma.slice(0, -2) + tail] : [];
    if (base.lemma === "\u3053\u308C\u308B") queries.push("\u304F\u308B");
    return queries;
  }
  function isRaDroppedPotential(source, query, words) {
    if (!potentialBaseQueries(source).includes(query)) return false;
    if (source.lemma === "\u3044\u308C\u308B" && source.reading === "\u3044\u308C\u308B") return false;
    for (const candidate of dictionaryVerbCandidates(query, words)) {
      if (candidate.prefix || candidate.verbClass !== "\u4E00\u6BB5" && !isKuru(candidate)) continue;
      const stem = elementary(candidate, "Negative");
      if (stem.text + "\u308C\u308B" === source.lemma && stem.reading + "\u308C\u308B" === source.reading) return true;
      if (isKuru(candidate) && source.lemma === "\u3053\u308C\u308B" && source.reading === "\u3053\u308C\u308B") return true;
    }
    return false;
  }
  function resolvePotentialBase(source, query, words) {
    if (!potentialBaseQueries(source).includes(query)) return;
    for (const candidate of dictionaryVerbCandidates(query, words)) {
      if (candidate.prefix || !godan.has(candidate.verbClass)) continue;
      const potential = formsFor(candidate).find((form) => form.family === "potential" && !form.past && !form.negative && !form.polite && !form.spoken);
      if (potential?.text === source.lemma && potential.reading === source.reading) return candidate;
    }
  }
  var finite, verbFamilies, godan, kana, japanese, helperLemmas, irregularLexemes, lexicalRestrictions, restrictedFamilies, isSuru, isKuru, potentialRows;
  var init_verb_playground = __esm({
    "src/verb-playground.ts"() {
      "use strict";
      init_kamiya_min();
      init_shared();
      finite = ["past", "negative", "polite"];
      verbFamilies = [
        { id: "simple", label: "Basic", group: "Everyday forms", description: "State an action or situation. Nonpast can describe the present, habits, or the future.", controls: finite },
        { id: "te", label: "Connect: \uFF5E\u3066\uFF0F\uFF5E\u306A\u304F\u3066", group: "Everyday forms", description: "Connect an affirmative or negative statement to what follows, sometimes giving a reason. Negative \uFF5E\u306A\u304F\u3066 differs from \uFF5E\u306A\u3044\u3067.", controls: ["negative"] },
        { id: "without", label: "Without doing: \uFF5E\u306A\u3044\u3067", group: "Everyday forms", description: "Describe not doing an action, or make a casual negative request. This differs from \uFF5E\u306A\u304F\u3066.", controls: [] },
        { id: "desire", label: "Want to: \uFF5E\u305F\u3044", group: "Everyday forms", description: "Express a desire to do something. Who wants it and the surrounding context matter.", controls: finite },
        { id: "potential", label: "Can: potential", group: "Ability and voice", description: "Express ability or possibility. Ichidan verbs and \u6765\u308B share this spelling with passive and some respectful uses.", controls: finite },
        { id: "passive", label: "Passive", group: "Ability and voice", description: "Present someone or something as affected by an action. Participants and particles may need changes.", controls: finite },
        { id: "causative", label: "Make or let: causative", group: "Ability and voice", description: "Express making or allowing someone to act; the sentence determines which meaning applies.", controls: finite },
        { id: "causativePassive", label: "Be made to: causative-passive", group: "Ability and voice", description: "Express being made to act. This playground uses the full form, not the shortened causative-passive.", controls: finite },
        { id: "conditionalBa", label: "If: \uFF5E\u3070", group: "Conditions and intentions", description: "Set a condition. This form has no independent past or polite switch here.", controls: ["negative"] },
        { id: "conditionalTara", label: "If or when: \uFF5E\u305F\u3089", group: "Conditions and intentions", description: "Set a condition or say when something happens. Its \u305F does not by itself locate the condition in the past.", controls: ["negative", "polite"] },
        { id: "volitional", label: "Intention or invitation", group: "Conditions and intentions", description: "Express an intention or invitation. The polite form ends in \uFF5E\u307E\u3057\u3087\u3046.", controls: ["polite"] },
        { id: "request", label: "Please: \uFF5E\u3066\u304F\u3060\u3055\u3044", group: "Requests and commands", description: "Make an affirmative or negative request. Politeness also depends on context.", controls: ["negative"] },
        { id: "imperative", label: "Direct command", group: "Requests and commands", description: "Give a direct, forceful command. This is not a polite request.", controls: [] },
        { id: "prohibition", label: "Do not: \uFF5E\u308B\u306A", group: "Requests and commands", description: "Give a direct prohibition. This is stronger than a negative request.", controls: [] },
        { id: "teIru", label: "Ongoing or resulting state: \uFF5E\u3066\u3044\u308B", group: "Everyday constructions", description: "Describe an ongoing action, repeated activity, or resulting state. The verb and context determine the meaning.", controls: [...finite, "spoken"] },
        { id: "teMiru", label: "Try doing: \uFF5E\u3066\u307F\u308B", group: "Everyday constructions", description: "Try an action to see what happens. This differs from trying hard or attempting unsuccessfully.", controls: finite },
        { id: "teOku", label: "Prepare or leave: \uFF5E\u3066\u304A\u304F", group: "Everyday constructions", description: "Do something in preparation, or leave a situation as it is.", controls: [...finite, "spoken"] },
        { id: "teShimau", label: "Finish or end up: \uFF5E\u3066\u3057\u307E\u3046", group: "Everyday constructions", description: "Express completion or an unintended result, sometimes with regret. Regret is not automatic.", controls: [...finite, "spoken"] }
      ];
      godan = /* @__PURE__ */ new Set(["\u4E94\u6BB5\u30FB\u30AB\u884C\u30A4\u97F3\u4FBF", "\u4E94\u6BB5\u30FB\u30AB\u884C\u4FC3\u97F3\u4FBF", "\u4E94\u6BB5\u30FB\u30AC\u884C", "\u4E94\u6BB5\u30FB\u30B5\u884C", "\u4E94\u6BB5\u30FB\u30BF\u884C", "\u4E94\u6BB5\u30FB\u30CA\u884C", "\u4E94\u6BB5\u30FB\u30D0\u884C", "\u4E94\u6BB5\u30FB\u30DE\u884C", "\u4E94\u6BB5\u30FB\u30E9\u884C", "\u4E94\u6BB5\u30FB\u30EF\u884C\u4FC3\u97F3\u4FBF"]);
      kana = /^[\p{Script=Hiragana}ー]+$/u;
      japanese = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー]+$/u;
      helperLemmas = /* @__PURE__ */ new Set(["\u308C\u308B", "\u3089\u308C\u308B", "\u305B\u308B", "\u3055\u305B\u308B"]);
      irregularLexemes = /* @__PURE__ */ new Set(["\u554F\u3046", "\u8ACB\u3046", "\u4E5E\u3046", "\u604B\u3046", "\u3086\u304F", "\u5F80\u304F", "\u901D\u304F", "\u306A\u3055\u308B", "\u70BA\u3055\u308B", "\u304F\u3060\u3055\u308B", "\u4E0B\u3055\u308B", "\u304A\u3063\u3057\u3083\u308B", "\u4EF0\u308B", "\u3044\u3089\u3063\u3057\u3083\u308B", "\u3054\u3056\u308B", "\u5FA1\u5EA7\u308B"]);
      lexicalRestrictions = /* @__PURE__ */ new Set(["\u3067\u304D\u308B", "\u51FA\u6765\u308B"]);
      restrictedFamilies = /* @__PURE__ */ new Set(["simple", "te", "without", "conditionalBa", "conditionalTara"]);
      isSuru = (base) => base.verbClass === "\u30B5\u5909\u30FB\u30B9\u30EB";
      isKuru = (base) => base.verbClass === "\u30AB\u5909\u30FB\u6765\u30EB" || base.verbClass === "\u30AB\u5909\u30FB\u30AF\u30EB";
      potentialRows = { "\u3048": "\u3046", "\u3051": "\u304F", "\u3052": "\u3050", "\u305B": "\u3059", "\u3066": "\u3064", "\u306D": "\u306C", "\u3079": "\u3076", "\u3081": "\u3080", "\u308C": "\u308B" };
    }
  });

  // src/mimetic-data.ts
  var ninjal, daijisen, mimeticEntries;
  var init_mimetic_data = __esm({
    "src/mimetic-data.ts"() {
      "use strict";
      ninjal = (word) => ({ label: "NINJAL \xB7 Japanese reference", url: `https://www2.ninjal.ac.jp/Onomatope/50_on/${word}.html` });
      daijisen = (word, id, slug = word) => ({ label: "Daijisen \xB7 Japanese reference", url: `https://kotobank.jp/word/${encodeURIComponent(slug)}-${id}` });
      mimeticEntries = [
        { id: "rolling", category: "movement", keywords: ["roll", "ball", "stone"], sceneUse: "Rolling objects", initialVariant: 0, variants: [
          { aliases: [], term: "\u3053\u308D\u3053\u308D", gloss: "A small, round object rolling.", example: "\u8D64\u3044\u30D3\u30FC\u7389\u304C\u3053\u308D\u3053\u308D\u3068\u673A\u306E\u7AEF\u307E\u3067\u8EE2\u304C\u3063\u305F\u3002", translation: "A red marble rolled to the edge of the desk.", sceneDescription: "A small ball rolls along the ground.", otherUses: "Also used for a round, plump body, frequent changes, and some kinds of laughter or insect sounds.", reference: ninjal("korokoro") },
          { aliases: [], term: "\u3054\u308D\u3054\u308D", gloss: "A large or heavy object rolling with a rumbling impression.", example: "\u5742\u9053\u3092\u5927\u304D\u306A\u77F3\u304C\u3054\u308D\u3054\u308D\u3068\u8EE2\u304C\u3063\u3066\u3044\u304F\u3002", translation: "A large stone rolls down the slope.", sceneDescription: "A large, uneven stone rolls along the ground.", otherUses: "Also used for thunder, a cat\u2019s purr, bodily sensations, or lounging about. This scene illustrates rolling only.", reference: ninjal("gorogoro") }
        ] },
        { id: "rotation", category: "movement", keywords: ["turn", "spin", "circle"], sceneUse: "Things turning", initialVariant: 0, variants: [
          { aliases: [], term: "\u304F\u308B\u304F\u308B", gloss: "Spinning lightly or neatly, as a small top does.", example: "\u624B\u306E\u3072\u3089\u306E\u4E0A\u3067\u5C0F\u3055\u306A\u3053\u307E\u304C\u304F\u308B\u304F\u308B\u56DE\u308B\u3002", translation: "A little top spins on a palm.", sceneDescription: "A small top spins neatly in place.", otherUses: "Also used for curling hair, rolling up paper, and repeated changes. The difference is not a universal size rule.", reference: ninjal("kurukuru") },
          { aliases: [], term: "\u3050\u308B\u3050\u308B", gloss: "Turning round and round, as a spinning ride does.", example: "\u904A\u5712\u5730\u306E\u30AB\u30C3\u30D7\u304C\u3050\u308B\u3050\u308B\u56DE\u3063\u3066\u3044\u308B\u3002", translation: "The cups of an amusement park ride turn round and round.", sceneDescription: "A cup on a ride circles repeatedly around a center.", otherUses: "Also used for circling an area, winding rope around something, dizziness, or stomach sounds.", reference: ninjal("guruguru") }
        ] },
        { id: "light", category: "nature", keywords: ["light", "sparkle", "glare", "sun"], sceneUse: "Light shining", initialVariant: 0, variants: [
          { aliases: [], term: "\u304D\u3089\u304D\u3089", gloss: "Sparkling or glittering light.", example: "\u671D\u306E\u5149\u3067\u6C60\u306E\u6C34\u9762\u304C\u304D\u3089\u304D\u3089\u8F1D\u3044\u3066\u3044\u308B\u3002", translation: "The pond\u2019s surface sparkles in the morning light.", sceneDescription: "Several small points of light sparkle on water.", otherUses: "Can describe shining eyes, gems, or glittering clothing as well. Brightness alone does not determine the word.", reference: ninjal("kirakira") },
          { aliases: [], term: "\u304E\u3089\u304E\u3089", gloss: "Strong, glaring light, often felt as harsh.", example: "\u7A93\u306E\u5916\u3067\u306F\u5F37\u3044\u65E5\u5DEE\u3057\u304C\u304E\u3089\u304E\u3089\u7167\u308A\u3064\u3051\u3066\u3044\u308B\u3002", translation: "Outside the window, the sunlight glares intensely.", sceneDescription: "A sun gives off broad, strong rays.", otherUses: "Can also describe an intense look in someone\u2019s eyes. This scene illustrates sunlight.", reference: daijisen("\u304E\u3089\u304E\u3089", 480078) }
        ] },
        { id: "rain", category: "nature", keywords: ["rain", "water", "weather"], sceneUse: "Rain falling", initialVariant: 0, variants: [
          { aliases: [], term: "\u3057\u3068\u3057\u3068", gloss: "Rain falling quietly and gently.", example: "\u5EAD\u306E\u82B1\u306B\u3057\u3068\u3057\u3068\u3068\u96E8\u304C\u964D\u308A\u7D9A\u3044\u3066\u3044\u308B\u3002", translation: "Gentle rain keeps falling on the garden flowers.", sceneDescription: "Fine, spaced raindrops fall quietly below a cloud.", otherUses: "This scene shows the common rain use; the word also has older uses for quiet movement or dampness.", reference: daijisen("\u3057\u3068\u3057\u3068", 522183) },
          { aliases: ["\u3056\u30FC\u3056\u30FC"], term: "\u3056\u3042\u3056\u3042", gloss: "Heavy rain falling with a strong rushing sound.", example: "\u99C5\u306B\u7740\u3044\u305F\u9014\u7AEF\u3001\u96E8\u304C\u3056\u3042\u3056\u3042\u3068\u964D\u308A\u59CB\u3081\u305F\u3002", translation: "Just as we reached the station, rain began pouring down.", sceneDescription: "Many thick raindrops pour down below a cloud.", otherUses: "Can also describe water rushing from a hose or other source. This scene illustrates rain.", reference: ninjal("zaazaa") }
        ] },
        { id: "texture", category: "texture", keywords: ["smooth", "rough", "dry", "gritty"], sceneUse: "Surface texture", initialVariant: 0, variants: [
          { aliases: [], term: "\u3055\u3089\u3055\u3089", gloss: "A dry, smooth, nonsticky feel.", example: "\u3053\u306E\u5E03\u306F\u3055\u3089\u3055\u3089\u3057\u3066\u3044\u3066\u6C17\u6301\u3061\u304C\u3044\u3044\u3002", translation: "This fabric feels pleasantly smooth and dry.", sceneDescription: "A fingertip glides across smooth fabric.", otherUses: "Also used for silky hair, fine powder, flowing water, fluent writing, or with \u306A\u3044 to mean \u201Cnot at all.\u201D", reference: ninjal("sarasara") },
          { aliases: [], term: "\u3056\u3089\u3056\u3089", gloss: "A rough or gritty feel.", example: "\u3056\u3089\u3056\u3089\u3057\u305F\u7D19\u306B\u925B\u7B46\u3067\u7DDA\u3092\u5F15\u3044\u305F\u3002", translation: "I drew a pencil line on rough paper.", sceneDescription: "A fingertip moves over the uneven surface of rough paper.", otherUses: "Can describe rough skin, grit in the mouth, a sandy floor, or sand falling. It is not simply the opposite in every use.", reference: ninjal("zarazara") }
        ] },
        { id: "smile", category: "people", keywords: ["smile", "grin", "face"], sceneUse: "Facial expressions", initialVariant: 0, variants: [
          { aliases: [], term: "\u306B\u3053\u306B\u3053", gloss: "Smiling with an openly happy or friendly impression.", example: "\u53CB\u9054\u306B\u4F1A\u3046\u3068\u3001\u5F1F\u306F\u306B\u3053\u306B\u3053\u3057\u305F\u3002", translation: "My little brother smiled happily when he saw his friend.", sceneDescription: "A face has an open, cheerful smile.", otherUses: "The expression describes the visible smile; it cannot tell you everything about someone\u2019s feelings.", reference: ninjal("nikoniko") },
          { aliases: [], term: "\u306B\u3084\u306B\u3084", gloss: "Grinning to oneself; the reason may be private.", example: "\u79D8\u5BC6\u306E\u8A08\u753B\u3092\u8003\u3048\u3066\u3001\u5144\u306F\u306B\u3084\u306B\u3084\u3057\u3066\u3044\u308B\u3002", translation: "My older brother is grinning to himself over a secret plan.", sceneDescription: "A face has a small, knowing grin.", otherUses: "May suggest private pleasure, a smirk, or an unsettling smile to an observer. It does not always imply bad intentions.", reference: ninjal("niyaniya") }
        ] },
        // New comparisons describe one authored use, not universal opposites.
        { id: "anticipation", category: "feelings", keywords: ["excited", "anticipation", "nervous", "heartbeat"], sceneUse: "Waiting for something", initialVariant: 0, variants: [
          { aliases: [], term: "\u308F\u304F\u308F\u304F", gloss: "Excitedly looking forward to something.", example: "\u660E\u65E5\u306E\u9060\u8DB3\u306E\u3053\u3068\u3092\u8003\u3048\u308B\u3068\u3001\u308F\u304F\u308F\u304F\u3059\u308B\u3002", translation: "Thinking about tomorrow\u2019s outing makes me excited.", sceneDescription: "A person looks forward to an outing, with a bag ready beside them.", otherUses: "Usually expresses pleased anticipation. It can occur together with \u3069\u304D\u3069\u304D; excitement and a pounding heart can go together.", reference: ninjal("wakuwaku") },
          { aliases: [], term: "\u3069\u304D\u3069\u304D", gloss: "Feeling your heart beat quickly or strongly.", example: "\u767A\u8868\u306E\u9806\u756A\u3092\u5F85\u3063\u3066\u3044\u308B\u3068\u3001\u80F8\u304C\u3069\u304D\u3069\u304D\u3057\u305F\u3002", translation: "My heart pounded while I waited for my turn to present.", sceneDescription: "A person waits beside a presentation board, with a pounding-heart symbol.", otherUses: "Can accompany anxiety, excitement, attraction, or exercise. This scene shows nervousness before a presentation.", reference: ninjal("dokidoki") }
        ] },
        { id: "irritation", category: "feelings", keywords: ["irritated", "impatient", "annoyed", "anger"], sceneUse: "Unpleasant feelings", initialVariant: 0, variants: [
          { aliases: [], term: "\u3044\u3089\u3044\u3089", gloss: "Feeling impatient or irritated by something that keeps bothering you.", example: "\u30D0\u30B9\u304C\u306A\u304B\u306A\u304B\u6765\u306A\u304F\u3066\u3001\u3044\u3089\u3044\u3089\u3057\u305F\u3002", translation: "I became impatient because the bus was taking so long.", sceneDescription: "A person waits by a bus-stop clock with an impatient expression.", otherUses: "Can describe irritation at delays, noise, or repeated frustrations. It does not always mean outright anger.", reference: ninjal("iraira") },
          { aliases: [], term: "\u3080\u304B\u3080\u304B", gloss: "Anger or resentment welling up.", example: "\u5931\u793C\u306A\u3053\u3068\u3092\u8A00\u308F\u308C\u3066\u3001\u3080\u304B\u3080\u304B\u3057\u305F\u3002", translation: "I felt anger welling up after someone said something rude.", sceneDescription: "A person reacts angrily to an unwelcome comment shown as a jagged speech bubble.", otherUses: "Also describes nausea or an upset stomach. This scene illustrates anger, so check which sense fits your passage.", reference: ninjal("mukamuka") }
        ] },
        { id: "relief", category: "feelings", keywords: ["relief", "relieved", "refreshed", "clear"], sceneUse: "Feeling better", initialVariant: 0, variants: [
          { aliases: [], term: "\u307B\u3063\u3068", gloss: "Feeling relief when a worry or strain eases.", example: "\u306A\u304F\u3057\u305F\u9375\u304C\u898B\u3064\u304B\u3063\u3066\u3001\u307B\u3063\u3068\u3057\u305F\u3002", translation: "I felt relieved when I found my lost key.", sceneDescription: "A person relaxes their shoulders after finding a key.", otherUses: "Often accompanies \u3059\u308B, \u5B89\u5FC3\u3059\u308B, or \u4E00\u606F\u3064\u304F. Relief can follow worry, effort, or reaching a safe stopping point.", reference: ninjal("hotto") },
          { aliases: [], term: "\u3059\u3063\u304D\u308A", gloss: "Feeling clear and refreshed, without a lingering burden.", example: "\u6C17\u306B\u306A\u3063\u3066\u3044\u305F\u4ED5\u4E8B\u3092\u7D42\u3048\u3066\u3001\u6C17\u5206\u304C\u3059\u3063\u304D\u308A\u3057\u305F\u3002", translation: "Finishing the task that had been on my mind left me feeling refreshed.", sceneDescription: "A completed task is checked off and a person\u2019s thought cloud clears.", otherUses: "Also describes uncluttered rooms, clean designs, clear weather, or waking refreshed. It overlaps with relief in some situations.", reference: ninjal("sukkiri") }
        ] },
        { id: "worry", category: "feelings", keywords: ["worried", "anxious", "flustered", "uncertain"], sceneUse: "Reacting to uncertainty", initialVariant: 0, variants: [
          { aliases: [], term: "\u306F\u3089\u306F\u3089", gloss: "Watching anxiously because something might go wrong.", example: "\u3053\u307C\u308C\u305D\u3046\u306A\u30B3\u30C3\u30D7\u3092\u904B\u3076\u5B50\u3069\u3082\u3092\u898B\u3066\u3001\u306F\u3089\u306F\u3089\u3057\u305F\u3002", translation: "I watched anxiously as a child carried a glass that looked ready to spill.", sceneDescription: "An observer watches a child carrying a glass with water near the rim.", otherUses: "Also describes leaves or petals fluttering down and tears falling. The scene shows an anxious observer\u2019s feelings.", reference: ninjal("harahara") },
          { aliases: [], term: "\u304A\u308D\u304A\u308D", gloss: "Being flustered and unsure what to do.", example: "\u5207\u7B26\u304C\u898B\u3064\u304B\u3089\u305A\u3001\u6539\u672D\u306E\u524D\u3067\u304A\u308D\u304A\u308D\u3057\u305F\u3002", translation: "Unable to find my ticket, I stood flustered in front of the ticket gate.", sceneDescription: "A person searches their pockets uncertainly beside a ticket gate.", otherUses: "Can describe being overwhelmed by surprise, distress, or worry. Older uses include a trembling, tearful voice.", reference: daijisen("\u304A\u308D\u304A\u308D", 455547) }
        ] },
        { id: "sleep", category: "body", keywords: ["sleep", "doze", "drowsy", "soundly"], sceneUse: "Sleep", initialVariant: 0, variants: [
          { aliases: [], term: "\u3046\u3068\u3046\u3068", gloss: "Dozing or drifting into light sleep.", example: "\u96FB\u8ECA\u306E\u5EA7\u5E2D\u3067\u3001\u3064\u3044\u3046\u3068\u3046\u3068\u3057\u3066\u3057\u307E\u3063\u305F\u3002", translation: "I accidentally dozed off in my train seat.", sceneDescription: "A seated person\u2019s sleepy head dips slightly above an open book.", otherUses: "Describes drowsiness or shallow sleep. It does not imply a full night of deep, uninterrupted sleep.", reference: daijisen("\u3046\u3068\u3046\u3068", 441022) },
          { aliases: [], term: "\u3050\u3063\u3059\u308A", gloss: "Sleeping soundly and deeply.", example: "\u6628\u591C\u306F\u671D\u307E\u3067\u3050\u3063\u3059\u308A\u7720\u308C\u305F\u3002", translation: "Last night I slept soundly until morning.", sceneDescription: "A person rests comfortably under a blanket, with a moon above the bed.", otherUses: "Used with sleeping or resting; it describes sound sleep without requiring audible snoring.", reference: ninjal("gussuri") }
        ] },
        { id: "exhaustion", category: "body", keywords: ["tired", "exhausted", "drained", "limp"], sceneUse: "Being worn out", initialVariant: 0, variants: [
          { aliases: [], term: "\u304F\u305F\u304F\u305F", gloss: "Thoroughly exhausted, with little energy left.", example: "\u9577\u3044\u5C71\u9053\u3092\u6B69\u3044\u3066\u3001\u3082\u3046\u304F\u305F\u304F\u305F\u3060\u3002", translation: "After walking the long mountain trail, I\u2019m completely worn out.", sceneDescription: "An exhausted walker sits beside their backpack after a long hike.", otherUses: "Also describes worn-out, limp clothing or food cooked very soft. The fatigue sense overlaps with \u3050\u3063\u305F\u308A.", reference: daijisen("\u304F\u305F\u304F\u305F", 483799) },
          { aliases: [], term: "\u3050\u3063\u305F\u308A", gloss: "Drained of strength, with a limp or drooping appearance.", example: "\u4E00\u65E5\u4E2D\u52D5\u304D\u56DE\u3063\u305F\u3042\u3068\u3001\u30BD\u30D5\u30A1\u30FC\u3067\u3050\u3063\u305F\u308A\u3057\u3066\u3044\u305F\u3002", translation: "After being on the move all day, I lay drained on the sofa.", sceneDescription: "A tired person lies limply across a sofa with their arms resting down.", otherUses: "Can follow tiredness, heat, or illness. It is not a fixed, more severe stage of \u304F\u305F\u304F\u305F.", reference: daijisen("\u3050\u3063\u305F\u308A", 3210060, "\u3050\u3064\u305F\u308A") }
        ] },
        { id: "pain", category: "body", keywords: ["pain", "throbbing", "prickly", "itchy"], sceneUse: "Kinds of discomfort", initialVariant: 0, variants: [
          { aliases: [], term: "\u305A\u304D\u305A\u304D", gloss: "A repeated, throbbing pain.", example: "\u6B6F\u304C\u305A\u304D\u305A\u304D\u75DB\u3080\u3002", translation: "My tooth aches with a throbbing pain.", sceneDescription: "A tooth is surrounded by repeated pulse marks.", otherUses: "Can describe a toothache, headache, or pain around a wound. The expression describes a sensation, not its cause.", reference: daijisen("\u305A\u304D\u305A\u304D", 541033) },
          { aliases: [], term: "\u3061\u304F\u3061\u304F", gloss: "A repeated prickling sensation, like small needle pricks.", example: "\u65B0\u3057\u3044\u30BB\u30FC\u30BF\u30FC\u3092\u7740\u308B\u3068\u3001\u9996\u304C\u3061\u304F\u3061\u304F\u3059\u308B\u3002", translation: "The new sweater feels prickly around my neck.", sceneDescription: "Small pointed fibers on a sweater touch the skin at the neckline.", otherUses: "Also describes repeated small jabs, sewing, or pointed remarks that hurt someone\u2019s feelings.", reference: daijisen("\u3061\u304F\u3061\u304F", 565605) }
        ] },
        { id: "stomach", category: "body", keywords: ["hungry", "full", "stomach", "eating"], sceneUse: "Before and after eating", initialVariant: 0, variants: [
          { aliases: [], term: "\u307A\u3053\u307A\u3053", gloss: "Very hungry, with an empty-stomach feeling.", example: "\u304A\u663C\u3092\u98DF\u3079\u3066\u3044\u306A\u3044\u306E\u3067\u3001\u304A\u8179\u304C\u307A\u3053\u307A\u3053\u3060\u3002", translation: "I haven\u2019t had lunch, so I\u2019m very hungry.", sceneDescription: "A hungry person stands beside an empty bowl, with a stomach symbol.", otherUses: "Also describes repeated bowing or a thin surface denting in and out. This scene shows hunger.", reference: ninjal("pekopeko") },
          { aliases: [], term: "\u3071\u3093\u3071\u3093", gloss: "Swollen or filled so tightly that it feels ready to burst.", example: "\u98DF\u3079\u3059\u304E\u3066\u3001\u304A\u8179\u304C\u3071\u3093\u3071\u3093\u306B\u306A\u3063\u305F\u3002", translation: "I ate too much, and now my stomach feels stretched full.", sceneDescription: "A person with a full-stomach symbol sits beside several emptied bowls.", otherUses: "Also describes an overstuffed bag, clapping, or popping sounds. This scene shows being overly full after eating.", reference: daijisen("\u3071\u3093\u3071\u3093", 607227) }
        ] },
        { id: "balance", category: "body", keywords: ["unsteady", "dizzy", "sway", "stagger"], sceneUse: "Keeping your balance", initialVariant: 0, variants: [
          { aliases: [], term: "\u3075\u3089\u3075\u3089", gloss: "Swaying or feeling unable to stand steadily.", example: "\u5BDD\u4E0D\u8DB3\u3067\u3001\u7ACB\u3061\u4E0A\u304C\u308B\u3068\u3075\u3089\u3075\u3089\u3057\u305F\u3002", translation: "After too little sleep, I felt unsteady when I stood up.", sceneDescription: "A person sways beside a chair, with a curved balance line.", otherUses: "Also describes wandering without a firm purpose or wavering in a decision. This scene shows physical unsteadiness.", reference: ninjal("furafura") },
          { aliases: [], term: "\u3088\u308D\u3088\u308D", gloss: "Staggering or moving with difficulty keeping your balance.", example: "\u91CD\u3044\u8377\u7269\u3092\u6301\u3063\u3066\u3001\u3088\u308D\u3088\u308D\u6B69\u3044\u305F\u3002", translation: "I staggered along carrying the heavy luggage.", sceneDescription: "A person carrying a heavy box takes uneven, unsteady steps.", otherUses: "Can describe a person or a bicycle swerving or almost falling. It overlaps with \u3075\u3089\u3075\u3089 rather than forming a severity scale.", reference: ninjal("yoroyoro") }
        ] },
        { id: "temperature", category: "body", keywords: ["warm", "cool", "temperature", "touch"], sceneUse: "Feeling temperature", initialVariant: 0, variants: [
          { aliases: [], term: "\u307D\u304B\u307D\u304B", gloss: "Feeling pleasantly warm.", example: "\u65E5\u306A\u305F\u306B\u5EA7\u308B\u3068\u3001\u80CC\u4E2D\u304C\u307D\u304B\u307D\u304B\u3057\u3066\u304D\u305F\u3002", translation: "Sitting in the sunshine made my back feel pleasantly warm.", sceneDescription: "A person sits comfortably in a sunny patch with gentle warmth lines.", otherUses: "Can describe warm weather or a warming body. Another use describes repeated blows; this scene illustrates warmth only.", reference: daijisen("\u307D\u304B\u307D\u304B", 629296) },
          { aliases: [], term: "\u3072\u3093\u3084\u308A", gloss: "Feeling cool or cold to the touch.", example: "\u51B7\u3084\u3057\u305F\u30BF\u30AA\u30EB\u304C\u3001\u3072\u3093\u3084\u308A\u3057\u3066\u6C17\u6301\u3061\u3044\u3044\u3002", translation: "The chilled towel feels pleasantly cool.", sceneDescription: "A cool towel rests on a person\u2019s forehead beside a snowflake symbol.", otherUses: "Also describes cool air or a cool room. Whether the sensation is pleasant depends on the situation.", reference: daijisen("\u3072\u3093\u3084\u308A", 614851) }
        ] },
        { id: "walking", category: "movement", keywords: ["walk", "slow", "brisk", "pace"], sceneUse: "Walking pace", initialVariant: 0, variants: [
          { aliases: [], term: "\u306E\u308D\u306E\u308D", gloss: "Moving sluggishly or more slowly than expected.", example: "\u75B2\u308C\u3066\u3001\u99C5\u307E\u3067\u306E\u308D\u306E\u308D\u6B69\u3044\u305F\u3002", translation: "Feeling tired, I walked sluggishly to the station.", sceneDescription: "A walker makes slow progress toward a station sign.", otherUses: "Also describes traffic, queues, or slow actions. It often carries an impression of delay, unlike a relaxed stroll.", reference: ninjal("noronoro") },
          { aliases: [], term: "\u3059\u305F\u3059\u305F", gloss: "Walking briskly, without hesitation or stopping.", example: "\u5F7C\u5973\u306F\u8FF7\u308F\u305A\u3001\u51FA\u53E3\u307E\u3067\u3059\u305F\u3059\u305F\u6B69\u3044\u3066\u3044\u3063\u305F\u3002", translation: "She walked briskly straight to the exit without hesitating.", sceneDescription: "A walker heads toward an exit with a clear stride and forward trail.", otherUses: "Usually describes a person\u2019s brisk, unhesitating walk. It does not mean running.", reference: daijisen("\u3059\u305F\u3059\u305F", 542064) }
        ] },
        { id: "busy", category: "movement", keywords: ["busy", "rush", "efficient", "work"], sceneUse: "Getting things done", initialVariant: 0, variants: [
          { aliases: [], term: "\u3070\u305F\u3070\u305F", gloss: "Rushing about busily, with many things to do.", example: "\u51FA\u304B\u3051\u308B\u524D\u306B\u3001\u5FD8\u308C\u7269\u3092\u63A2\u3057\u3066\u3070\u305F\u3070\u305F\u3057\u3066\u3044\u305F\u3002", translation: "Before leaving, I rushed around looking for things I had forgotten.", sceneDescription: "A person hurriedly moves between a bag, a clock, and scattered belongings.", otherUses: "Also describes flapping, noisy footsteps, kicking limbs, or things happening one after another. This scene shows a busy rush.", reference: ninjal("batabata") },
          { aliases: [], term: "\u3066\u304D\u3071\u304D", gloss: "Acting briskly, efficiently, and decisively.", example: "\u673A\u306E\u4E0A\u306E\u66F8\u985E\u3092\u3066\u304D\u3071\u304D\u7247\u4ED8\u3051\u305F\u3002", translation: "I briskly and efficiently sorted away the papers on the desk.", sceneDescription: "A person moves papers into orderly trays and completes a checklist.", otherUses: "Can describe clear, prompt replies as well as efficient actions. Mere speed or frantic movement does not guarantee this impression.", reference: daijisen("\u3066\u304D\u3071\u304D", 575447) }
        ] },
        { id: "wandering", category: "movement", keywords: ["wander", "stroll", "lost", "walk"], sceneUse: "Walking around", initialVariant: 0, variants: [
          { aliases: [], term: "\u3046\u308D\u3046\u308D", gloss: "Moving around without a clear direction or appearing unsettled.", example: "\u51FA\u53E3\u304C\u308F\u304B\u3089\u305A\u3001\u99C5\u306E\u4E2D\u3092\u3046\u308D\u3046\u308D\u3057\u305F\u3002", translation: "Not knowing where the exit was, I wandered around the station.", sceneDescription: "A person follows a winding path between station signs while searching for the exit.", otherUses: "Can describe pacing or lingering around an area. It can sound suspicious in some contexts, but does not itself prove bad intent.", reference: ninjal("urouro") },
          { aliases: [], term: "\u3076\u3089\u3076\u3089", gloss: "Strolling without a fixed purpose or hurry.", example: "\u4F11\u65E5\u306F\u3001\u5546\u5E97\u8857\u3092\u3076\u3089\u3076\u3089\u6B69\u304F\u3002", translation: "On days off, I stroll around the shopping street.", sceneDescription: "A relaxed walker passes shop windows on a gentle path.", otherUses: "Also describes something dangling and swaying, or idling without work. This scene illustrates a relaxed stroll.", reference: ninjal("burabura") }
        ] },
        { id: "looking", category: "people", keywords: ["look", "stare", "attention", "eyes"], sceneUse: "Ways of looking", initialVariant: 0, variants: [
          { aliases: [], term: "\u3058\u3063\u3068", gloss: "Looking steadily, with your attention fixed on something.", example: "\u732B\u304C\u7A93\u306E\u5916\u3092\u3058\u3063\u3068\u898B\u3066\u3044\u308B\u3002", translation: "The cat is looking steadily out of the window.", sceneDescription: "A cat keeps its gaze fixed on a bird outside the window.", otherUses: "Also describes staying still, thinking intently, or quietly enduring something. The scene illustrates a steady gaze.", reference: ninjal("jitto") },
          { aliases: [], term: "\u3058\u308D\u3058\u308D", gloss: "Conspicuously looking someone or something over.", example: "\u77E5\u3089\u306A\u3044\u4EBA\u3092\u3058\u308D\u3058\u308D\u898B\u308B\u306E\u306F\u5931\u793C\u3060\u3002", translation: "It is rude to stare at a stranger and look them up and down.", sceneDescription: "An observer\u2019s gaze moves from another person\u2019s hat down to their shoes.", otherUses: "Often suggests an intrusive or rude gaze. It is not simply a longer or more attentive version of \u3058\u3063\u3068.", reference: ninjal("jirojiro") }
        ] },
        { id: "laughter", category: "people", keywords: ["laugh", "giggle", "chuckle", "voice"], sceneUse: "Laughter", initialVariant: 0, variants: [
          { aliases: [], term: "\u304F\u3059\u304F\u3059", gloss: "Laughing quietly or trying to suppress a laugh.", example: "\u53CB\u9054\u304B\u3089\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u8AAD\u3093\u3067\u3001\u304F\u3059\u304F\u3059\u7B11\u3063\u305F\u3002", translation: "I quietly chuckled while reading a message from a friend.", sceneDescription: "A person covers a small smile while reading their phone.", otherUses: "The quiet laugh may be private or shared. It does not by itself mean laughing maliciously at someone.", reference: ninjal("kusukusu") },
          { aliases: [], term: "\u3052\u3089\u3052\u3089", gloss: "Laughing loudly and without holding back.", example: "\u30B3\u30E1\u30C7\u30A3\u30FC\u3092\u898B\u3066\u3001\u307F\u3093\u306A\u3067\u3052\u3089\u3052\u3089\u7B11\u3063\u305F\u3002", translation: "We all laughed loudly while watching the comedy.", sceneDescription: "A person laughs with an open mouth and broad laughter marks.", otherUses: "Can describe joyful laughter or laughing at someone\u2019s mistake. The surrounding situation determines whether it seems unkind.", reference: ninjal("geragera") }
        ] },
        { id: "crying", category: "people", keywords: ["cry", "sob", "tears", "voice"], sceneUse: "Crying", initialVariant: 0, variants: [
          { aliases: [], term: "\u3057\u304F\u3057\u304F", gloss: "Crying quietly with weak, subdued sobs.", example: "\u5F1F\u306F\u5927\u5207\u306A\u304A\u3082\u3061\u3083\u3092\u306A\u304F\u3057\u3066\u3001\u3057\u304F\u3057\u304F\u6CE3\u3044\u305F\u3002", translation: "My little brother quietly sobbed after losing his favorite toy.", sceneDescription: "A downcast face sheds a few tears with a small, closed mouth.", otherUses: "Also describes a persistent, relatively dull pain, such as a stomachache. This scene illustrates crying.", reference: daijisen("\u3057\u304F\u3057\u304F", 518215) },
          { aliases: [], term: "\u308F\u3093\u308F\u3093", gloss: "Crying loudly, with your voice raised.", example: "\u59B9\u306F\u8EE2\u3093\u3067\u3001\u308F\u3093\u308F\u3093\u6CE3\u304D\u51FA\u3057\u305F\u3002", translation: "My little sister fell and began crying loudly.", sceneDescription: "A tearful face cries with an open mouth and wide voice marks.", otherUses: "Also represents a dog barking or loud sounds echoing; it is a child\u2019s word for a dog too. Check the passage for the intended sense.", reference: daijisen("\u308F\u3093\u308F\u3093", 666104) }
        ] },
        { id: "softness", category: "texture", keywords: ["soft", "fluffy", "chewy", "bread", "mochi"], sceneUse: "Soft food textures", initialVariant: 0, variants: [
          { aliases: [], term: "\u3075\u308F\u3075\u308F", gloss: "Soft, airy, and lightly puffed up.", example: "\u3053\u306E\u30D1\u30F3\u306F\u3001\u3075\u308F\u3075\u308F\u3057\u3066\u3044\u308B\u3002", translation: "This bread is soft and fluffy.", sceneDescription: "A light, airy piece of bread compresses gently under a fingertip.", otherUses: "Also describes floating, drifting, fluffy bedding, or a flighty feeling. This scene shows airy bread.", reference: daijisen("\u3075\u308F\u3075\u308F", 622898) },
          { aliases: [], term: "\u3082\u3061\u3082\u3061", gloss: "Soft and chewy, with a slightly sticky texture.", example: "\u3053\u306E\u304A\u9905\u306F\u3001\u3082\u3061\u3082\u3061\u3057\u305F\u98DF\u611F\u3060\u3002", translation: "This mochi has a soft, chewy texture.", sceneDescription: "A piece of mochi stretches slightly as it is gently pulled.", otherUses: "Also describes plump, springy-feeling skin. This scene illustrates a food texture rather than an opposite of \u3075\u308F\u3075\u308F.", reference: daijisen("\u3082\u3061\u3082\u3061", 645794) }
        ] },
        { id: "moisture", category: "texture", keywords: ["moist", "damp", "wet", "sweat"], sceneUse: "Moisture", initialVariant: 0, variants: [
          { aliases: [], term: "\u3057\u3063\u3068\u308A", gloss: "Lightly and evenly moist.", example: "\u3053\u306E\u30B1\u30FC\u30AD\u306F\u3001\u3057\u3063\u3068\u308A\u3057\u3066\u3044\u3066\u304A\u3044\u3057\u3044\u3002", translation: "This cake is moist and delicious.", sceneDescription: "A slice of cake has an evenly moist interior with small moisture marks.", otherUses: "Also describes moist skin, damp clothes, or a calm, composed atmosphere. It is not always a positive judgement.", reference: daijisen("\u3057\u3063\u3068\u308A", 3211894, "\u3057\u3064\u3068\u308A") },
          { aliases: [], term: "\u3058\u3063\u3068\u308A", gloss: "Noticeably damp or moist, often with sweat.", example: "\u6691\u3044\u90E8\u5C4B\u306B\u3044\u305F\u3089\u3001\u984D\u306B\u3058\u3063\u3068\u308A\u6C57\u3092\u304B\u3044\u305F\u3002", translation: "My forehead became damp with sweat in the hot room.", sceneDescription: "A forehead has a layer of sweat beads below a warm-air symbol.", otherUses: "Often describes sweat or heavy dampness. Older uses overlap with a calm, composed sense of \u3057\u3063\u3068\u308A; context matters.", reference: daijisen("\u3058\u3063\u3068\u308A", 3211895, "\u3058\u3064\u3068\u308A") }
        ] },
        { id: "stickiness", category: "texture", keywords: ["sticky", "stringy", "natto", "syrup"], sceneUse: "Kinds of stickiness", initialVariant: 0, variants: [
          { aliases: [], term: "\u306D\u3070\u306D\u3070", gloss: "Viscous or stringy stickiness.", example: "\u7D0D\u8C46\u3092\u6DF7\u305C\u308B\u3068\u3001\u306D\u3070\u306D\u3070\u3057\u305F\u7CF8\u304C\u4F38\u3073\u308B\u3002", translation: "Stirring natto produces long, sticky threads.", sceneDescription: "Chopsticks lift sticky threads from a bowl of natto.", otherUses: "Also describes other sticky foods or materials. Threads are a useful illustration, not a requirement in every use.", reference: ninjal("nebaneba") },
          { aliases: [], term: "\u3079\u305F\u3079\u305F", gloss: "Sticky material clinging to a surface.", example: "\u30B7\u30ED\u30C3\u30D7\u304C\u6307\u306B\u3064\u3044\u3066\u3001\u3079\u305F\u3079\u305F\u3059\u308B\u3002", translation: "Syrup got on my fingers, and they feel sticky.", sceneDescription: "Syrup clings between a fingertip and a small puddle on a plate.", otherUses: "Also describes clinging affection or covering a surface with something. Its physical sticky sense can overlap with \u306D\u3070\u306D\u3070.", reference: daijisen("\u3079\u305F\u3079\u305F", 624917) }
        ] },
        { id: "slipperiness", category: "texture", keywords: ["slippery", "smooth", "slimy", "oily"], sceneUse: "Slippery surfaces", initialVariant: 0, variants: [
          { aliases: [], term: "\u3064\u308B\u3064\u308B", gloss: "Smooth and slippery to the touch.", example: "\u78E8\u3044\u305F\u77F3\u306E\u8868\u9762\u306F\u3001\u3064\u308B\u3064\u308B\u3057\u3066\u3044\u308B\u3002", translation: "The polished stone has a smooth, slippery surface.", sceneDescription: "A fingertip glides across a smooth, polished stone.", otherUses: "Also describes smooth skin or a slippery floor or icy road. A smooth surface need not have slime or oil on it.", reference: ninjal("tsurutsuru") },
          { aliases: [], term: "\u306C\u308B\u306C\u308B", gloss: "Slippery with a slimy, soapy, or oily feel.", example: "\u305B\u3063\u3051\u3093\u304C\u3064\u3044\u3066\u3001\u624B\u304C\u306C\u308B\u306C\u308B\u3059\u308B\u3002", translation: "My hands feel slippery with soap on them.", sceneDescription: "A soapy hand slides over a wet bar of soap with a visible slippery layer.", otherUses: "Can describe oil, algae, seaweed, or other slippery coatings. It is not simply a stronger degree of \u3064\u308B\u3064\u308B.", reference: ninjal("nurunuru") }
        ] },
        { id: "crispness", category: "texture", keywords: ["crisp", "crunch", "cookie", "toast", "food"], sceneUse: "Crisp food textures", initialVariant: 0, variants: [
          { aliases: [], term: "\u3055\u304F\u3055\u304F", gloss: "A light, crisp bite with a pleasant breaking sound.", example: "\u713C\u304D\u305F\u3066\u306E\u30AF\u30C3\u30AD\u30FC\u306F\u3001\u3055\u304F\u3055\u304F\u3057\u3066\u3044\u308B\u3002", translation: "The freshly baked cookies have a light, crisp texture.", sceneDescription: "A cookie breaks into light crumbs with small crisp-bite marks.", otherUses: "Also describes chopping, stepping on snow, easy progress, or responsive software. This scene illustrates a cookie\u2019s texture.", reference: daijisen("\u3055\u304F\u3055\u304F", 509580) },
          { aliases: [], term: "\u304B\u308A\u304B\u308A", gloss: "Hard, dry, and crisp when bitten.", example: "\u30D1\u30F3\u306E\u8033\u3092\u304B\u308A\u304B\u308A\u306B\u713C\u3044\u305F\u3002", translation: "I toasted the bread crusts until they were crisp and crunchy.", sceneDescription: "A toasted bread crust snaps into firm pieces with sharp crunch marks.", otherUses: "Also describes scratching sounds or being irritable. Food examples overlap with \u3055\u304F\u3055\u304F; there is no universal hardness scale.", reference: daijisen("\u304B\u308A\u304B\u308A", 467818) }
        ] },
        { id: "dryness", category: "texture", keywords: ["dry", "parched", "skin", "thirsty"], sceneUse: "Dryness", initialVariant: 0, variants: [
          { aliases: [], term: "\u304B\u3089\u304B\u3089", gloss: "Thoroughly dry or parched.", example: "\u9577\u304F\u8D70\u3063\u305F\u306E\u3067\u3001\u306E\u3069\u304C\u304B\u3089\u304B\u3089\u3060\u3002", translation: "My throat is parched after the long run.", sceneDescription: "A thirsty person holds an empty cup beside a dry-throat symbol.", otherUses: "Also describes thoroughly dry laundry, empty contents, rattling sounds, or a kind of laughter. This scene shows thirst.", reference: ninjal("karakara") },
          { aliases: [], term: "\u304B\u3055\u304B\u3055", gloss: "Dry and lacking a smooth, supple feel.", example: "\u51AC\u306B\u306A\u308B\u3068\u3001\u624B\u304C\u304B\u3055\u304B\u3055\u306B\u306A\u308B\u3002", translation: "My hands become dry and rough in winter.", sceneDescription: "A hand has dry, uneven skin marks on its surface.", otherUses: "Also describes dry leaves or paper rustling, and figuratively a lack of emotional warmth. This scene shows dry skin.", reference: daijisen("\u304B\u3055\u304B\u3055", 461613) }
        ] },
        { id: "crowd", category: "sounds", keywords: ["crowd", "chatter", "murmur", "noisy"], sceneUse: "Crowd sounds", initialVariant: 0, variants: [
          { aliases: [], term: "\u304C\u3084\u304C\u3084", gloss: "The noisy chatter of a group of people.", example: "\u4F11\u307F\u6642\u9593\u306E\u6559\u5BA4\u306F\u3001\u304C\u3084\u304C\u3084\u3057\u3066\u3044\u305F\u3002", translation: "The classroom was full of noisy chatter during the break.", sceneDescription: "Several people chat in small groups with overlapping speech bubbles.", otherUses: "Often describes a busy room or gathering. It overlaps with \u3056\u308F\u3056\u308F; the pair is not a fixed loud-versus-quiet rule.", reference: ninjal("gayagaya") },
          { aliases: [], term: "\u3056\u308F\u3056\u308F", gloss: "A crowd\u2019s restless noise or murmuring.", example: "\u958B\u6F14\u3092\u5F85\u3064\u5BA2\u3067\u3001\u4F1A\u5834\u304C\u3056\u308F\u3056\u308F\u3057\u3066\u3044\u308B\u3002", translation: "The venue is filled with the murmur of people waiting for the show to begin.", sceneDescription: "An audience murmurs and shifts while waiting in rows of seats.", otherUses: "Also describes rustling leaves or a restless, uneasy feeling. Crowd uses overlap with \u304C\u3084\u304C\u3084.", reference: daijisen("\u3056\u308F\u3056\u308F", 512678) }
        ] },
        { id: "knocking", category: "sounds", keywords: ["knock", "tap", "bang", "door"], sceneUse: "Knocking on a door", initialVariant: 0, variants: [
          { aliases: [], term: "\u3068\u3093\u3068\u3093", gloss: "Repeated light taps or knocks.", example: "\u6249\u3092\u3068\u3093\u3068\u3093\u3068\u8EFD\u304F\u305F\u305F\u3044\u305F\u3002", translation: "I tapped lightly on the door.", sceneDescription: "A hand gives a door small, repeated taps with short sound marks.", otherUses: "Also describes smooth progress or two amounts being roughly equal, including breaking even. This scene shows knocking only.", reference: daijisen("\u3068\u3093\u3068\u3093", 586781) },
          { aliases: [], term: "\u3069\u3093\u3069\u3093", gloss: "Repeated strong, heavy knocks or bangs.", example: "\u5916\u304B\u3089\u3001\u30C9\u30A2\u3092\u3069\u3093\u3069\u3093\u305F\u305F\u304F\u97F3\u304C\u3057\u305F\u3002", translation: "I heard someone banging repeatedly on the door from outside.", sceneDescription: "A hand knocks firmly on a door with broad impact marks.", otherUses: "Also describes rapid progress, increasing amounts, or doing more and more. Sound intensity is the comparison in this scene.", reference: ninjal("dondon") }
        ] }
      ];
    }
  });

  // src/mimetic-playground.ts
  function normalizeMimetic(surface) {
    return surface.normalize("NFKC").replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 96));
  }
  function findMimetic(surface) {
    const match = spellings.get(normalizeMimetic(surface));
    return match ? { ...match.entry, initialVariant: match.index } : void 0;
  }
  function matchMimeticAt(text, words, wordIndex) {
    if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) return void 0;
    let best;
    for (let startIndex = Math.max(0, wordIndex - 7); startIndex <= wordIndex; startIndex++) {
      const start = words[startIndex].start;
      let previousEnd = start;
      for (let endIndex = startIndex; endIndex < Math.min(words.length, startIndex + 8); endIndex++) {
        const word = words[endIndex];
        if (!Number.isInteger(word.start) || !Number.isInteger(word.end) || word.start !== previousEnd || word.start < 0 || word.end <= word.start || word.end > text.length || word.end - start > 24) break;
        previousEnd = word.end;
        if (endIndex < wordIndex) continue;
        const entry = findMimetic(text.slice(start, word.end));
        if (entry && (!best || word.end - start > best.end - best.start)) best = { start, end: word.end, entry };
      }
    }
    return best;
  }
  function svgNode(tag, attrs = {}, children = []) {
    const node = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    node.append(...children);
    return node;
  }
  function scene(entry, index, play) {
    const svg = svgNode("svg", { viewBox: "0 0 240 124", "aria-hidden": "true", focusable: "false", class: "mimetic-art" });
    const stroke = { fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" };
    const line = (d, attrs = {}) => svgNode("path", { ...stroke, d, ...attrs });
    const circle = (cx, cy, r, attrs = {}) => svgNode("circle", { ...stroke, cx, cy, r, ...attrs });
    const group = (className, children) => svgNode("g", { class: className }, children);
    const box = (x, y2, width, height, attrs = {}) => svgNode("rect", { ...stroke, x, y: y2, width, height, rx: 3, fill: "var(--surface)", ...attrs });
    const at = (className, x, y2, children) => {
      const node = group(className, children);
      node.setAttribute("transform", `translate(${x} ${y2})`);
      return node;
    };
    const face = (x, y2, r, mood = "neutral") => {
      const eyes = mood === "happy" ? "M-14-4q4-5 8 0M6-4q4-5 8 0" : mood === "angry" ? "M-14-8-6-4M6-4 14-8" : "M-13-5h4M9-5h4";
      const mouth = mood === "happy" ? "M-9 7q9 10 18 0" : mood === "worried" || mood === "sad" || mood === "angry" ? "M-8 13q8-9 16 0" : "M-7 9H7";
      const node = group("mimetic-face", [circle(0, 0, 24, { fill: "var(--surface)" }), line(eyes), line(mouth, { stroke: "var(--accent)" })]);
      node.setAttribute("transform", `translate(${x} ${y2}) scale(${r / 24})`);
      return node;
    };
    const person = (x, y2, mood = "neutral", seated = false) => at("mimetic-person", x, y2, [
      face(0, 0, 14, mood),
      line("M0 15V43M0 24-15 38M0 24 15 38"),
      line(seated ? "M0 43H20V66M0 43-18 50-18 66" : "M0 43-12 67M0 43 12 67")
    ]);
    const clock = (x, y2) => at("", x, y2, [circle(0, 0, 13, { fill: "var(--paper)" }), line("M0-9V0L7 4")]);
    const bag = (x, y2) => at("", x, y2, [box(0, 0, 25, 30), line("M7 0V-6Q13-13 19-6V0M5 17H20")]);
    const heart = (x, y2) => at("mimetic-pulse", x, y2, [line("M0 13-17-3C-28-20-5-29 0-13C5-29 28-20 17-3Z", { fill: "var(--accent)" })]);
    const drop = (x, y2, r = 4) => at("mimetic-drop", x, y2, [line(`M0 ${-r * 2}Q${r * 2} ${r} 0 ${r}Q${-r * 2} ${r} 0 ${-r * 2}Z`, { fill: "var(--accent)", "stroke-width": 1 })]);
    const bubble = (x, y2, width = 34) => at("", x, y2, [line(`M0 0H${width}V21H14L6 29V21H0Z`, { fill: "var(--paper)" }), line(`M7 8H${width - 7}M7 14H${width - 12}`, { "stroke-width": 1 })]);
    const ground = () => line("M20 110H220", { class: "mimetic-trail" });
    const motion = (className, children) => group(className, children);
    const soundMarks = (x, y2, big = false) => at("mimetic-pulse", x, y2, [
      line(`M0-14 ${big ? 18 : 9}-24M3 0H${big ? 26 : 13}M0 14 ${big ? 18 : 9} 24`, { "stroke-width": big ? 3 : 1.5, stroke: "var(--accent)" })
    ]);
    const checklist = (x, y2) => at("", x, y2, [box(0, 0, 37, 46, { fill: "var(--paper)" }), line("M6 11 9 14 14 7M6 25 9 28 14 21M18 12H30M18 26H30M6 38H30", { stroke: "var(--accent)" })]);
    svg.dataset.scene = entry.id;
    svg.dataset.variant = String(index);
    svg.dataset.playing = String(play);
    const renderers = { rolling: () => {
      svg.append(line("M12 104H228"), line("M30 70H60m-8-6 8 6-8 6", { class: "mimetic-trail" }));
      const object = index === 0 ? [circle(0, 0, 12, { fill: "var(--accent)" }), line("M-7-7 7 7M7-7-7 7", { stroke: "var(--paper)" })] : [
        line("M-25-12-10-27 13-24 28-7 21 19 0 28-22 15Z", { fill: "var(--surface)" }),
        line("M-10-20 0-3 18 6M0-3-16 9")
      ];
      const mover = group("mimetic-roll", [group("mimetic-wheel", object)]);
      mover.setAttribute("transform", `translate(92 ${index === 0 ? 91 : 75})`);
      svg.append(mover);
    }, rotation: () => {
      svg.append(line("M65 26A59 40 0 1 1 59 85m0 0 2-13m-2 13 13-2", { class: "mimetic-trail" }));
      if (index === 0) {
        const top = group("mimetic-spin", [line("M120 31V45"), line("M83 57 120 41 157 57 120 99Z", { fill: "var(--surface)" }), line("M83 57 120 72 157 57M120 72V99"), line("M103 49 139 64", { stroke: "var(--accent)", "stroke-width": 5 })]);
        svg.append(top);
      } else {
        svg.append(circle(120, 65, 10, { fill: "var(--accent)" }));
        const cup = group("mimetic-orbit", [line("M160 44H198L193 70Q180 82 165 70Z", { fill: "var(--surface)" }), line("M198 50Q216 48 210 63Q208 69 195 67"), line("M165 44Q179 37 198 44")]);
        svg.append(cup);
      }
    }, light: () => {
      if (index === 0) {
        svg.append(line("M13 96Q38 86 63 96T113 96T163 96T213 96M26 110Q51 100 76 110T126 110T176 110T226 110", { class: "mimetic-trail" }));
        for (const [cx, cy, r] of [[57, 45, 13], [117, 66, 9], [179, 32, 17]]) svg.append(group("mimetic-spark", [line(`M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`, { fill: "var(--accent)" })]));
      } else {
        const rays = [circle(120, 62, 25, { fill: "var(--accent)" })];
        for (let n = 0; n < 12; n++) {
          const angle = n * Math.PI / 6;
          rays.push(line(`M${120 + Math.cos(angle) * 34} ${62 + Math.sin(angle) * 34}L${120 + Math.cos(angle) * 52} ${62 + Math.sin(angle) * 52}`, { "stroke-width": 5 }));
        }
        svg.append(group("mimetic-glare", rays));
      }
    }, rain: () => {
      svg.append(line("M57 43Q37 21 64 17Q78-2 100 14Q119-3 138 12Q167 4 172 24Q204 23 190 43Z", { fill: "var(--surface)" }));
      const drops = [];
      for (let n = 0; n < (index === 0 ? 9 : 24); n++) {
        const x = 47 + n % 8 * 21, y2 = 58 + Math.floor(n / 8) * 19;
        drops.push(line(`M${x} ${y2}l${index === 0 ? -2 : -6} ${index === 0 ? 7 : 13}`, { "stroke-width": index === 0 ? 1.5 : 3 }));
      }
      svg.append(group("mimetic-rainfall", drops), line("M38 115H201", { class: "mimetic-trail" }));
    }, texture: () => {
      svg.append(line("M24 69H216V112H24Z", { fill: "var(--surface)" }));
      for (let y2 = 78; y2 <= 100; y2 += 11) {
        const d = index === 0 ? `M31 ${y2}Q44 ${y2 - 4} 57 ${y2}T83 ${y2}T109 ${y2}T135 ${y2}T161 ${y2}T187 ${y2}T213 ${y2}` : `M31 ${y2}l7-4 6 6 7-7 7 6 7-4 7 5 7-6 7 5 7-5 7 5 7-6 7 6 7-4 7 4 7-6 7 6 7-5 7 6 7-7 7 5 7-3 7 4 7-4 7 4`;
        svg.append(line(d, { "stroke-width": 1.4, class: "mimetic-trail" }));
      }
      svg.append(group("mimetic-touch", [line("M88 19V52Q88 68 103 68H128Q136 68 136 60V47Q136 42 130 42H111V18Q111 9 101 9T88 19Z", { fill: "var(--paper)" }), line("M94 62H105", { stroke: "var(--accent)", "stroke-width": 3 })]));
    }, smile: () => {
      svg.append(circle(120, 62, 45, { fill: "var(--surface)" }));
      const features = index === 0 ? [
        line("M94 51Q101 41 108 51M132 51Q139 41 146 51"),
        line("M99 70Q120 95 141 70", { stroke: "var(--accent)", "stroke-width": 3 })
      ] : [
        line("M94 48 108 52M132 52 146 48"),
        line("M105 76Q125 82 143 66", { stroke: "var(--accent)", "stroke-width": 3 }),
        line("M140 63 147 65")
      ];
      svg.append(group("mimetic-expression", features));
    }, anticipation: () => {
      svg.append(ground(), person(77, 35, index === 0 ? "happy" : "worried"));
      if (index === 0) svg.append(bag(165, 74), motion("mimetic-bob", [line("M140 29 145 39 156 40 148 48 150 59 140 53 130 59 132 48 124 40 135 39Z", { fill: "var(--accent)" })]));
      else svg.append(box(146, 18, 65, 43), line("M154 31H203M154 43H190M178 61V82M163 84H193"), heart(119, 88));
    }, irritation: () => {
      svg.append(ground(), motion("mimetic-restless", [person(82, 35, "angry")]));
      if (index === 0) svg.append(clock(181, 35), line("M181 49V108M161 65H201", { class: "mimetic-trail" }));
      else svg.append(motion("mimetic-pulse", [line("M145 24 157 28 166 18 174 29 190 24 188 39 202 47 187 55 191 69 174 65 164 77 157 63 142 66 145 51 133 41 148 36Z", { fill: "var(--paper)" }), line("M168 33V49M168 56V58", { stroke: "var(--accent)", "stroke-width": 4 })]));
    }, relief: () => {
      svg.append(ground(), motion("mimetic-breathe", [person(80, 34, "happy")]));
      if (index === 0) svg.append(motion("mimetic-bob", [circle(158, 59, 10, { stroke: "var(--accent)" }), line("M166 65 190 89M181 80 188 73M187 86 194 79", { stroke: "var(--accent)", "stroke-width": 4 })]), line("M104 47q15 9 23-1", { class: "mimetic-trail" }));
      else svg.append(checklist(164, 41), motion("mimetic-clear", [line("M99 20q7-16 20-8 14-10 24 4 13 0 12 13H103Z", { class: "mimetic-trail" })]), line("M100 49 111 43M104 59H116M100 69 111 75", { stroke: "var(--accent)" }));
    }, worry: () => {
      svg.append(ground());
      if (index === 0) {
        svg.append(person(50, 35, "worried"), person(123, 45, "neutral"), line("M123 69 153 72M141 65H163L160 91H144Z", { fill: "var(--paper)" }), motion("mimetic-tilt", [line("M143 72H162", { stroke: "var(--accent)", "stroke-width": 3 })]), line("M66 32 103 37", { class: "mimetic-trail", "stroke-dasharray": "3 4" }));
      } else svg.append(motion("mimetic-restless", [person(83, 36, "worried"), box(77, 66, 7, 9)]), box(160, 48, 34, 62), line("M154 49H205M167 66H187M177 56V76", { stroke: "var(--accent)" }), line("M118 24Q116 12 128 12T139 24Q139 29 129 34V40M129 48V50"));
    }, sleep: () => {
      if (index === 0) {
        svg.append(ground(), line("M67 63V99H113M72 98V110M107 98V110"), motion("mimetic-nod", [face(96, 38, 16, "sad")]), line("M95 54V80H117V108M95 65 126 73M95 80 84 98V108"), line("M122 66 144 60 164 67V91L144 85 122 91Z", { fill: "var(--paper)" }), line("M144 60V85"));
      } else svg.append(box(43, 74, 153, 33), line("M43 66V115M196 66V115"), face(69, 61, 14, "happy"), motion("mimetic-breathe", [line("M82 72Q121 48 181 70V99H81Z", { fill: "var(--surface)" })]), line("M197 16A17 17 0 1 0 215 36 15 15 0 0 1 197 16Z", { fill: "var(--accent)" }));
    }, exhaustion: () => {
      svg.append(ground());
      if (index === 0) svg.append(line("M30 83 49 50 67 84M36 74H60", { class: "mimetic-trail" }), person(100, 36, "sad", true), line("M77 91H124V109H77Z", { fill: "var(--surface)" }), bag(168, 76), motion("mimetic-sag", [line("M132 36q9 7 0 14m9-8q9 7 0 14", { class: "mimetic-trail" })]));
      else svg.append(box(40, 70, 155, 37), box(34, 61, 17, 46), box(185, 61, 17, 46), face(69, 64, 13, "sad"), motion("mimetic-sag", [line("M83 73 150 77 173 91M111 75 119 99M149 78 173 81M88 70 91 83", { "stroke-width": 3 })]));
    }, pain: () => {
      if (index === 0) svg.append(line("M91 30Q106 19 120 29Q137 19 150 31Q159 45 146 62L138 103Q128 108 123 75Q120 66 116 75Q112 108 102 103L94 62Q82 45 91 30Z", { fill: "var(--surface)" }), motion("mimetic-pulse", [line("M66 40 76 45M63 61H76M68 82 78 76M164 44 175 38M166 62H180M163 79 175 86", { stroke: "var(--accent)", "stroke-width": 3 })]));
      else svg.append(face(120, 29, 19, "worried"), line("M91 49 65 67 79 88 90 77V113H150V77L161 88 175 67 149 49 139 57H101Z", { fill: "var(--surface)" }), line("M103 55V65M111 56V65M119 56V65M127 56V65M135 55V65"), motion("mimetic-pulse", [line("M101 61 104 49M113 62 116 50M125 62 128 50M137 61 140 49", { stroke: "var(--accent)" })]));
    }, stomach: () => {
      svg.append(ground(), person(84, 35, index === 0 ? "sad" : "neutral"));
      if (index === 0) svg.append(motion("mimetic-pulse", [line("M76 68 83 64 89 69 96 64", { stroke: "var(--accent)" })]), line("M147 81H204Q201 105 175 105T147 81Z", { fill: "var(--paper)" }), line("M153 85H198", { class: "mimetic-trail" }));
      else {
        svg.append(motion("mimetic-breathe", [circle(84, 70, 17, { fill: "var(--surface)", stroke: "var(--accent)" })]));
        for (const x of [142, 171, 200]) svg.append(line(`M${x} 85h25q-2 16-12 16t-13-16Z`, { fill: "var(--paper)" }));
      }
    }, balance: () => {
      svg.append(ground());
      if (index === 0) svg.append(line("M39 59V91H72M44 91V110M69 91V110"), motion("mimetic-sway", [person(122, 36, "worried")]), line("M159 34q15-11 20 3t20 0", { class: "mimetic-trail" }));
      else svg.append(motion("mimetic-stagger", [person(88, 35, "worried"), box(113, 58, 62, 35), line("M101 72H126M128 60V93")]), line("M79 108 91 102 105 109 118 104 132 110", { class: "mimetic-trail" }));
    }, temperature: () => {
      if (index === 0) {
        svg.append(ground(), person(80, 38, "happy"), circle(180, 34, 16, { fill: "var(--accent)" }), line("M180 9V2M180 59V67M155 34H147M205 34H213M162 16 156 10M198 52 204 58M162 52 156 58M198 16 204 10"));
        svg.append(motion("mimetic-rise", [line("M126 56q-8 10 0 20t0 20M139 53q-8 10 0 20t0 20", { stroke: "var(--accent)" })]));
      } else svg.append(face(112, 76, 31, "happy"), box(81, 40, 62, 17, { fill: "var(--paper)" }), motion("mimetic-pulse", [line("M182 29V67M165 38 199 58M165 58 199 38M177 34 182 39 187 34M177 62 182 57 187 62", { stroke: "var(--accent)" })]));
    }, walking: () => {
      svg.append(ground(), line("M191 47V108M176 26H218V47H176Z", { fill: "var(--paper)" }), line("M184 37H209m-6-5 6 5-6 5", { stroke: "var(--accent)" }));
      const walker = motion(index === 0 ? "mimetic-slow-walk" : "mimetic-walk", [person(77, 35, index === 0 ? "sad" : "neutral")]);
      svg.append(walker, index === 0 ? line("M41 96H51M52 105H59", { class: "mimetic-trail" }) : line("M27 58H52M23 70H47M30 83H54", { class: "mimetic-trail" }));
    }, busy: () => {
      svg.append(ground());
      if (index === 0) svg.append(motion("mimetic-restless", [person(112, 35, "worried")]), bag(37, 76), clock(194, 29), box(172, 75, 31, 18), line("M170 74 188 60 210 74M48 42H65V62H48", { fill: "var(--paper)" }));
      else svg.append(person(69, 35, "neutral"), line("M115 80H216M122 81V110M208 81V110"), box(161, 71, 40, 9), box(166, 62, 40, 9), motion("mimetic-sort", [box(120, 54, 32, 14, { fill: "var(--paper)" })]), checklist(171, 9));
    }, wandering: () => {
      svg.append(ground());
      if (index === 0) svg.append(motion("mimetic-restless", [person(68, 34, "worried")]), line("M152 30H209V47H152M178 47V86M160 38H198m-5-4 5 4-5 4", { fill: "var(--paper)" }), line("M93 106Q137 76 154 96T207 95", { class: "mimetic-trail", "stroke-dasharray": "4 4" }));
      else svg.append(motion("mimetic-slow-walk", [person(66, 35, "happy")]), box(147, 44, 70, 57), line("M141 43 151 27H213L223 43ZM159 45V100M185 45V100M159 77H185", { fill: "var(--paper)" }), line("M95 105Q119 93 136 104", { class: "mimetic-trail" }));
    }, looking: () => {
      if (index === 0) svg.append(box(145, 17, 69, 78, { fill: "var(--paper)" }), line("M180 17V95M145 56H214"), line("M53 94Q57 64 78 65Q100 62 106 92V105H53M52 100Q28 107 34 87M61 61 59 38 75 49 87 43 94 60Q96 80 76 80T61 61Z", { fill: "var(--surface)" }), line("M77 60H81M89 60H92M96 66 100 68M109 62 164 47", { class: "mimetic-trail", "stroke-dasharray": "3 4" }), motion("mimetic-bob", [line("M164 42q11-13 23 0l8-3-3 8h-24m7-5 5 5", { fill: "var(--accent)" })]));
      else svg.append(ground(), person(51, 35, "neutral"), person(179, 35, "neutral"), line("M156 23H201M165 23V12H191V23M166 103H175M183 103H192"), motion("mimetic-gaze", [line("M68 32 157 18M68 36 164 94", { class: "mimetic-trail", "stroke-dasharray": "3 4", stroke: "var(--accent)" })]));
    }, laughter: () => {
      svg.append(face(120, 61, 34, "happy"));
      if (index === 0) svg.append(box(46, 45, 24, 40, { fill: "var(--paper)" }), line("M52 52H63M52 58H64M52 64H61"), motion("mimetic-bob", [line("M126 76 136 67Q142 62 145 69L137 86 121 90", { fill: "var(--paper)" })]), line("M98 73Q110 83 121 74", { stroke: "var(--accent)" }));
      else svg.append(motion("mimetic-laugh", [svgNode("ellipse", { ...stroke, cx: 120, cy: 76, rx: 13, ry: 10, fill: "var(--accent)" })]), soundMarks(164, 61, true), at("", 76, 61, [line("M0-14-18-24M-3 0H-26M0 14-18 24", { "stroke-width": 3, stroke: "var(--accent)" })]));
    }, crying: () => {
      svg.append(face(120, 60, 34, "sad"), drop(101, 79, 3), drop(139, 84, 3));
      if (index === 0) svg.append(line("M109 78q4-3 8 0t8 0", { stroke: "var(--accent)" }), line("M100 53 109 56M132 56 141 53"));
      else svg.append(svgNode("ellipse", { ...stroke, cx: 120, cy: 77, rx: 8, ry: 11, fill: "var(--accent)" }), drop(98, 94, 4), drop(143, 99, 4), soundMarks(165, 61, true), line("M77 36 62 27M74 60H55M77 83 62 94", { stroke: "var(--accent)", "stroke-width": 3 }));
    }, softness: () => {
      if (index === 0) svg.append(line("M70 104V72Q60 55 75 46Q87 36 101 43Q118 27 134 43Q151 34 168 50Q179 64 169 74V104Z", { fill: "var(--surface)" }), circle(97, 77, 4), circle(121, 90, 5), circle(145, 76, 4), motion("mimetic-press", [line("M113 12V45Q113 58 121 58T129 45V12", { fill: "var(--paper)" })]));
      else svg.append(motion("mimetic-stretch", [line("M73 68Q84 44 119 57Q157 45 168 69Q162 99 122 92Q81 99 73 68Z", { fill: "var(--surface)" })]), line("M43 57 74 66 68 83 40 77M197 55 168 65 173 82 202 75", { fill: "var(--paper)" }), line("M90 70Q119 76 149 69", { stroke: "var(--accent)" }));
    }, moisture: () => {
      if (index === 0) {
        svg.append(line("M78 54 114 31 176 51V101H78Z", { fill: "var(--surface)" }), line("M78 54H176M114 31V53M78 71H176"), drop(98, 87, 3), drop(121, 88, 3), drop(151, 86, 3));
      } else svg.append(face(115, 71, 35, "worried"), drop(92, 53, 3), drop(107, 46, 3), drop(127, 45, 3), drop(142, 54, 3), motion("mimetic-rise", [line("M177 34q-8 9 0 18t0 18M192 34q-8 9 0 18t0 18", { stroke: "var(--accent)" })]));
    }, stickiness: () => {
      if (index === 0) {
        svg.append(line("M66 81H171Q166 111 118 111T66 81Z", { fill: "var(--surface)" }));
        for (const x of [86, 105, 126, 148]) svg.append(circle(x, 84, 5, { fill: "var(--accent)" }));
        svg.append(motion("mimetic-lift", [line("M121 24 162 67M132 19 171 61"), line("M153 57Q130 68 109 83M159 63Q152 78 135 84M145 50Q106 57 89 83", { stroke: "var(--accent)" })]));
      } else svg.append(svgNode("ellipse", { ...stroke, cx: 116, cy: 99, rx: 62, ry: 11, fill: "var(--paper)" }), line("M86 95Q105 88 125 94T153 98Q129 107 86 101Z", { fill: "var(--accent)", "stroke-width": 1 }), motion("mimetic-lift", [line("M113 13V63Q113 73 123 73T133 63V13", { fill: "var(--paper)" }), line("M117 70Q113 84 104 97M127 71Q143 85 139 97", { stroke: "var(--accent)", "stroke-width": 3 })]));
    }, slipperiness: () => {
      svg.append(svgNode("ellipse", { ...stroke, cx: 121, cy: 93, rx: 64, ry: 20, fill: "var(--surface)" }));
      if (index === 0) svg.append(line("M79 88Q109 75 161 86", { class: "mimetic-trail" }));
      else svg.append(svgNode("ellipse", { ...stroke, cx: 121, cy: 86, rx: 49, ry: 12, fill: "var(--accent)" }), circle(176, 77, 8), circle(189, 64, 5), line("M104 85H139", { stroke: "var(--paper)" }));
      svg.append(motion("mimetic-slide", [line("M85 15V54Q85 69 101 69H125Q135 69 135 60V51Q135 44 126 44H109V15Q109 5 97 5T85 15Z", { fill: "var(--paper)" })]));
    }, crispness: () => {
      if (index === 0) {
        svg.append(motion("mimetic-crack", [line("M113 34A34 34 0 0 0 113 100L105 90 115 80 105 70 115 59 105 47Z", { fill: "var(--surface)" }), line("M122 34A34 34 0 0 1 122 100L114 90 124 80 114 70 124 59 114 47Z", { fill: "var(--surface)" })]), circle(94, 56, 3), circle(98, 83, 3), circle(137, 55, 3), circle(138, 81, 3), circle(166, 95, 2), circle(175, 83, 2));
      } else svg.append(motion("mimetic-crack", [line("M59 40 104 31 120 49 110 58 119 68 109 79 118 91 66 102Z", { fill: "var(--surface)" }), line("M129 30 177 40 172 103 129 93 120 81 130 69 121 58 131 49Z", { fill: "var(--surface)" })]), line("M70 48 98 42M139 43 165 49M73 91 98 85M140 84 161 91", { stroke: "var(--accent)", "stroke-width": 4 }), soundMarks(185, 69));
    }, dryness: () => {
      if (index === 0) svg.append(ground(), person(77, 35, "sad"), line("M148 73H181L177 106H152ZM181 80Q200 77 196 90Q195 98 180 97"), motion("mimetic-pulse", [line("M71 53 78 48 84 54 91 48", { stroke: "var(--accent)" })]));
      else svg.append(line("M82 103V64Q82 55 90 58L100 65V28Q100 19 108 20Q114 20 114 29V55H120V17Q120 10 127 10T134 17V55H140V24Q140 16 147 17T154 25V56H160V39Q160 31 167 32T174 40V86Q171 105 154 111H96Z", { fill: "var(--surface)" }), motion("mimetic-pulse", [line("M105 78 111 74 117 80 124 75M125 95 131 90 138 96 145 91M148 69 154 65 160 70", { stroke: "var(--accent)" })]));
    }, crowd: () => {
      if (index === 0) svg.append(person(55, 48, "happy"), person(119, 52, "neutral"), person(183, 48, "happy"), motion("mimetic-bob", [bubble(28, 7, 38), bubble(91, 10, 43), bubble(166, 5, 42)]));
      else {
        for (const [row, y2] of [43, 83].entries()) for (let n = 0; n < 5; n++) {
          const x = 40 + n * 39;
          svg.append(face(x, y2, 10, "neutral"), line(`M${x - 12} ${y2 + 26}V${y2 + 14}H${x + 12}V${y2 + 26}`, { fill: "var(--surface)" }));
          if (row === 0 && n % 2 === 0) svg.append(motion("mimetic-bob", [line(`M${x - 5} ${y2 - 20}h4m4 0h4m4 0h4`, { stroke: "var(--accent)" })]));
        }
      }
    }, knocking: () => {
      svg.append(box(122, 14, 62, 101, { fill: "var(--paper)" }), box(131, 23, 43, 32), circle(173, 76, 3, { fill: "var(--accent)" }), motion("mimetic-knock", [line("M40 64H74V52Q74 46 80 46H100Q106 46 106 53V60H113V75Q113 87 101 87H80V81H40Z", { fill: "var(--surface)" }), line("M82 54V65M91 53V65M100 54V65")]), soundMarks(193, 68, index === 1));
      if (index === 1) svg.append(line("M112 37 117 43M111 95 117 90", { stroke: "var(--accent)", "stroke-width": 3 }));
    } };
    renderers[entry.id]();
    return svg;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function renderMimeticPlayground(entry) {
    const root = element("section", "mimetic-playground");
    root.setAttribute("aria-label", "Mimetic Playground");
    const heading = element("h4", "mimetic-heading", "Mimetic Playground");
    const context = element("p", "mimetic-context", entry.sceneUse);
    const controls = element("div", "mimetic-controls");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Compare expressions");
    const detail = element("div", "mimetic-detail");
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-atomic", "true");
    const term = element("p", "mimetic-term");
    term.lang = "ja";
    const gloss = element("p", "mimetic-gloss");
    const example = element("p", "mimetic-example");
    example.lang = "ja";
    const translation = element("p", "mimetic-translation");
    detail.append(term, gloss);
    const examples = element("div", "mimetic-examples");
    examples.setAttribute("aria-live", "polite");
    examples.append(example, translation);
    const figure = element("figure", "mimetic-figure");
    const stage = element("div", "mimetic-stage");
    const caption = element("figcaption", "mimetic-caption");
    figure.append(stage, caption);
    const replay = element("button", "mimetic-replay", "Replay scene");
    replay.type = "button";
    const motionNote = element("p", "mimetic-motion-note", "Reduced motion: the illustration stays still.");
    const uses = element("p", "mimetic-uses");
    const reference = element("a", "mimetic-reference");
    reference.target = "_blank";
    reference.rel = "noopener noreferrer";
    let selected = entry.initialVariant;
    const buttons = entry.variants.map((variant, index) => {
      const button = element("button", "mimetic-choice", variant.term);
      button.type = "button";
      button.lang = "ja";
      button.addEventListener("click", () => update(index, true));
      controls.append(button);
      return button;
    });
    function update(index, play) {
      selected = index;
      const variant = entry.variants[index];
      for (const [i, button] of buttons.entries()) button.setAttribute("aria-pressed", String(i === index));
      term.textContent = variant.term;
      gloss.textContent = variant.gloss;
      example.textContent = variant.example;
      translation.textContent = variant.translation;
      caption.textContent = variant.sceneDescription;
      uses.textContent = variant.otherUses;
      let url;
      try {
        url = new URL(variant.reference.url);
      } catch {
      }
      if (url?.protocol === "https:" && ["www2.ninjal.ac.jp", "kotobank.jp"].includes(url.hostname)) {
        reference.href = url.href;
        reference.textContent = `${variant.reference.label} (opens a new tab)`;
        reference.hidden = false;
      } else {
        reference.removeAttribute("href");
        reference.hidden = true;
      }
      stage.replaceChildren(scene(entry, index, play));
    }
    replay.addEventListener("click", () => stage.replaceChildren(scene(entry, selected, true)));
    const more = element("details", "mimetic-more");
    more.append(element("summary", "", "Other uses & reference"), element("p", "", "These are related expressions, each shown in one context."), uses, reference);
    root.append(heading, context, controls, detail, figure, replay, motionNote, examples, more);
    update(selected, false);
    return root;
  }
  var spellings, svgNS, mimeticStyles;
  var init_mimetic_playground = __esm({
    "src/mimetic-playground.ts"() {
      "use strict";
      init_mimetic_data();
      init_mimetic_data();
      spellings = /* @__PURE__ */ new Map();
      for (const entry of mimeticEntries) for (const [index, variant] of entry.variants.entries()) {
        for (const spelling of [variant.term, ...variant.aliases]) {
          const key = normalizeMimetic(spelling);
          if (spellings.has(key)) throw new Error(`Duplicate mimetic spelling: ${key}`);
          spellings.set(key, { entry, index });
        }
      }
      svgNS = "http://www.w3.org/2000/svg";
      mimeticStyles = `
.mimetic-playground{min-width:0;margin-top:12px;padding-top:12px;border-top:2px solid var(--line);color:var(--ink);font:12px/1.55 var(--body,system-ui)}
.mimetic-playground .mimetic-heading{margin:0 0 8px;font:800 11px/1.4 var(--mono,monospace);text-transform:uppercase}
.mimetic-playground .mimetic-context,.mimetic-playground .mimetic-uses{margin:8px 0;color:var(--muted,var(--ink));font-size:11px}
.mimetic-controls{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.mimetic-controls .mimetic-choice{flex:1;min-width:0;white-space:nowrap;font-size:16px}
.mimetic-playground .mimetic-choice,.mimetic-playground .mimetic-replay{margin:0;padding:7px 9px;border:2px solid var(--line);background:var(--paper);color:var(--ink);cursor:pointer;font:700 12px/1.4 var(--body,system-ui)}
.mimetic-playground .mimetic-choice[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.mimetic-playground button:focus-visible,.mimetic-playground a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.mimetic-playground .mimetic-term{margin:8px 0 2px;font-size:21px;font-weight:700}
.mimetic-playground .mimetic-gloss{margin:0 0 10px;font-weight:700}
.mimetic-playground .mimetic-example{margin:8px 0 2px;font-size:15px;line-height:1.8;overflow-wrap:anywhere}
.mimetic-playground .mimetic-translation{margin:2px 0 8px;color:var(--muted,var(--ink))}
.mimetic-figure{margin:12px 0 8px}.mimetic-stage{overflow:hidden;background:var(--paper);border:1px solid var(--line)}
.mimetic-art{display:block;width:100%;height:auto;max-height:180px;color:var(--ink)}.mimetic-trail{opacity:.55}
.mimetic-playground .mimetic-caption{padding:5px 0;font-size:11px;overflow-wrap:anywhere}
.mimetic-playground .mimetic-reference{display:inline-block;margin:4px 0;font-size:10px;color:var(--accent);overflow-wrap:anywhere;text-underline-offset:3px}
.mimetic-more{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;font-size:11px;color:var(--muted)}.mimetic-more summary{cursor:pointer;font-weight:600}.mimetic-motion-note{display:none}.mimetic-art .mimetic-spin{transform-origin:120px 65px}.mimetic-art .mimetic-orbit{transform-origin:120px 65px}.mimetic-art .mimetic-expression{transform-origin:120px 65px}.mimetic-art .mimetic-spark,.mimetic-art .mimetic-wheel{transform-box:fill-box;transform-origin:center}
.mimetic-art[data-playing=true] .mimetic-roll{animation:mimetic-roll 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-wheel{animation:mimetic-wheel 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-spin{animation:mimetic-spin 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-orbit{animation:mimetic-spin 2.4s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-spark{animation:mimetic-spark 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-glare{animation:mimetic-glare 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-rainfall{animation:mimetic-rainfall .65s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-touch{animation:mimetic-touch 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-expression{animation:mimetic-expression 1.8s ease-in-out 1}
.mimetic-art .mimetic-pulse,.mimetic-art .mimetic-breathe,.mimetic-art .mimetic-tilt,.mimetic-art .mimetic-nod,.mimetic-art .mimetic-sway,.mimetic-art .mimetic-stretch{transform-box:fill-box;transform-origin:center}
.mimetic-art[data-playing=true] .mimetic-pulse{animation:mimetic-pulse 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-bob{animation:mimetic-bob 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-restless{animation:mimetic-restless 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-breathe{animation:mimetic-breathe 2.2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-clear{animation:mimetic-clear 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-tilt{animation:mimetic-tilt 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-nod{animation:mimetic-nod 2.2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sag{animation:mimetic-sag 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sway{animation:mimetic-sway 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-stagger{animation:mimetic-stagger 2.3s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-rise{animation:mimetic-rise 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-slow-walk{animation:mimetic-slow-walk 2.4s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-walk{animation:mimetic-walk 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sort{animation:mimetic-sort 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-gaze{animation:mimetic-gaze 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-laugh{animation:mimetic-laugh .7s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-drop{animation:mimetic-drop .7s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-press{animation:mimetic-press 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-stretch{animation:mimetic-stretch 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-lift{animation:mimetic-lift 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-slide{animation:mimetic-slide 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-crack{animation:mimetic-crack 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-knock{animation:mimetic-knock .6s ease-in-out 3}
@keyframes mimetic-roll{0%,100%{translate:0 0}50%{translate:80px 0}}
@keyframes mimetic-wheel{0%,100%{rotate:0deg}50%{rotate:150deg}}
@keyframes mimetic-spin{0%{rotate:0deg}100%{rotate:720deg}}
@keyframes mimetic-spark{0%,100%{scale:1;opacity:1}50%{scale:.75;opacity:.65}}
@keyframes mimetic-glare{0%,100%{opacity:1}50%{opacity:.7}}
@keyframes mimetic-rainfall{0%{translate:0 -7px}100%{translate:0 7px}}
@keyframes mimetic-touch{0%,100%{translate:0 0}50%{translate:65px 0}}
@keyframes mimetic-expression{0%,100%{scale:1}50%{scale:1.05}}
@keyframes mimetic-pulse{0%,100%{scale:1;opacity:1}50%{scale:1.1;opacity:.7}}
@keyframes mimetic-bob{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes mimetic-restless{0%,100%{translate:0 0}25%{translate:-4px 0}75%{translate:4px 0}}
@keyframes mimetic-breathe{0%,100%{scale:1}50%{scale:1 1.035}}
@keyframes mimetic-clear{0%,100%{opacity:.5}50%{opacity:.08}}
@keyframes mimetic-tilt{0%,100%{rotate:0deg}50%{rotate:6deg}}
@keyframes mimetic-nod{0%,100%{rotate:0deg;translate:0 0}50%{rotate:8deg;translate:0 3px}}
@keyframes mimetic-sag{0%,100%{translate:0 0}50%{translate:0 3px}}
@keyframes mimetic-sway{0%,100%{rotate:0deg}25%{rotate:-3deg}75%{rotate:3deg}}
@keyframes mimetic-stagger{0%,100%{translate:0 0}33%{translate:9px 2px}66%{translate:18px -1px}}
@keyframes mimetic-rise{0%,100%{translate:0 0;opacity:1}50%{translate:0 -7px;opacity:.5}}
@keyframes mimetic-slow-walk{0%,100%{translate:0 0}50%{translate:20px 0}}
@keyframes mimetic-walk{0%,100%{translate:0 0}50%{translate:48px 0}}
@keyframes mimetic-sort{0%,100%{translate:0 0}50%{translate:42px 9px}}
@keyframes mimetic-gaze{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes mimetic-laugh{0%,100%{translate:0 0}50%{translate:0 -2px}}
@keyframes mimetic-drop{0%,100%{translate:0 0;opacity:1}70%{translate:0 5px;opacity:.5}}
@keyframes mimetic-press{0%,100%{translate:0 0}50%{translate:0 9px}}
@keyframes mimetic-stretch{0%,100%{scale:1}50%{scale:1.15 1}}
@keyframes mimetic-lift{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes mimetic-slide{0%,100%{translate:0 0}50%{translate:30px 0}}
@keyframes mimetic-crack{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes mimetic-knock{0%,100%{translate:0 0}50%{translate:7px 0}}
@media(prefers-reduced-motion:reduce){.mimetic-art[data-playing=true] *{animation:none!important}.mimetic-playground .mimetic-replay{display:none}.mimetic-playground .mimetic-motion-note{display:block;margin:6px 0;font-size:11px;color:var(--muted,var(--ink))}}
`;
    }
  });

  // src/meaning-forks.ts
  function endings(lemma) {
    const stem = lemma.slice(0, -1);
    return [
      { tokens: [[stem, lemma, "\u9023\u7528\u5F62"], ["\u307E\u305B", "\u307E\u3059", "\u672A\u7136\u5F62"], ["\u3093", "\u3093", "\u57FA\u672C\u5F62"], ["\u3067\u3057", "\u3067\u3059", "\u9023\u7528\u5F62"], ["\u305F", "\u305F", "\u57FA\u672C\u5F62"]], past: true, negative: true, polite: true },
      { tokens: [[stem, lemma, "\u9023\u7528\u5F62"], ["\u307E\u3057", "\u307E\u3059", "\u9023\u7528\u5F62"], ["\u305F", "\u305F", "\u57FA\u672C\u5F62"]], past: true, negative: false, polite: true },
      { tokens: [[stem, lemma, "\u9023\u7528\u5F62"], ["\u307E\u305B", "\u307E\u3059", "\u672A\u7136\u5F62"], ["\u3093", "\u3093", "\u57FA\u672C\u5F62"]], past: false, negative: true, polite: true },
      { tokens: [[stem, lemma, "\u672A\u7136\u5F62"], ["\u306A\u304B\u3063", "\u306A\u3044", "\u9023\u7528\u30BF\u63A5\u7D9A"], ["\u305F", "\u305F", "\u57FA\u672C\u5F62"]], past: true, negative: true, polite: false },
      { tokens: [[stem, lemma, "\u672A\u7136\u5F62"], ["\u306A\u3044", "\u306A\u3044", "\u57FA\u672C\u5F62"]], past: false, negative: true, polite: false },
      { tokens: [[stem, lemma, "\u9023\u7528\u5F62"], ["\u307E\u3059", "\u307E\u3059", "\u57FA\u672C\u5F62"]], past: false, negative: false, polite: true },
      { tokens: [[stem, lemma, "\u9023\u7528\u5F62"], ["\u305F", "\u305F", "\u57FA\u672C\u5F62"]], past: true, negative: false, polite: false },
      { tokens: [[lemma, lemma, "\u57FA\u672C\u5F62"]], past: false, negative: false, polite: false }
    ];
  }
  function sourceSurface(text, word) {
    if (!Number.isInteger(word.start) || !Number.isInteger(word.end) || word.start < 0 || word.end <= word.start || word.end > text.length) return;
    return text.slice(word.start, word.end);
  }
  function suffixFor(text, base) {
    if (base.pos !== "\u52D5\u8A5E" || base.posDetail !== "\u81EA\u7ACB" || !base.verbClass || !base.verbForm || suffixes.has(base.lemma)) return [];
    const surface = sourceSurface(text, base);
    if (!surface) return [];
    const ichidan = base.verbClass === "\u4E00\u6BB5" && base.verbForm === "\u672A\u7136\u5F62" && base.lemma.endsWith("\u308B") && surface === base.lemma.slice(0, -1);
    const kuru = base.verbClass.startsWith("\u30AB\u5909") && base.verbForm === "\u672A\u7136\u5F62" && (base.lemma === "\u6765\u308B" && surface === "\u6765" || base.lemma === "\u304F\u308B" && surface === "\u3053");
    if (ichidan || kuru) return [{ lemma: "\u3089\u308C\u308B", kind: "rareru" }, { lemma: "\u3055\u305B\u308B", kind: "causative" }];
    const suru = base.verbClass === "\u30B5\u5909\u30FB\u30B9\u30EB" && base.lemma === "\u3059\u308B" && base.verbForm === "\u672A\u7136\u30EC\u30EB\u63A5\u7D9A" && surface === "\u3055";
    const last = base.lemma.slice(-1), negativeLast = godanNegative[last];
    const godan2 = base.verbClass.startsWith("\u4E94\u6BB5\u30FB") && base.verbForm === "\u672A\u7136\u5F62" && negativeLast && surface === base.lemma.slice(0, -1) + negativeLast;
    return suru || godan2 ? [{ lemma: "\u305B\u308B", kind: "causative" }] : [];
  }
  function matchEnding(text, words, index, base, ending) {
    const tokens = [];
    let previous = base;
    for (let offset = 0; offset < ending.tokens.length; offset++) {
      const word = words[index + offset];
      const [surface, lemma, form] = ending.tokens[offset];
      if (!word || word.start !== previous.end || sourceSurface(text, word) !== surface || word.lemma !== lemma || word.verbForm !== form) return;
      if (offset === 0 ? word.pos !== "\u52D5\u8A5E" || word.posDetail !== "\u63A5\u5C3E" || word.verbClass !== "\u4E00\u6BB5" : word.pos !== "\u52A9\u52D5\u8A5E") return;
      tokens.push(word);
      previous = word;
    }
    const next = words[index + ending.tokens.length];
    if (next?.start === previous.end && (next.pos === "\u52D5\u8A5E" || next.pos === "\u52A9\u52D5\u8A5E")) return;
    if (next?.start === previous.end && next.pos === "\u52A9\u8A5E" && ["\u306A", "\u3066", "\u3067", "\u305F\u3089", "\u3070", "\u305F\u308A", "\u3060\u308A", "\u3068", "\u306A\u304C\u3089", "\u3064\u3064"].includes(sourceSurface(text, next) ?? "")) return;
    return tokens;
  }
  function buildMeaningForks(text, words, wordIndex) {
    if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) return;
    for (let index = Math.max(0, wordIndex - 5); index <= wordIndex; index++) {
      const base = words[index];
      for (const suffix of suffixFor(text, base)) {
        for (const ending of endings(suffix.lemma)) {
          const tokens = matchEnding(text, words, index + 1, base, ending);
          if (!tokens || wordIndex > index + tokens.length) continue;
          const end = tokens[tokens.length - 1].end;
          const reading = [base, ...tokens].map((word) => word.reading).join("");
          return {
            start: base.start,
            end,
            source: text.slice(base.start, end),
            reading: hiragana(reading),
            lemma: base.lemma,
            kind: suffix.kind,
            past: ending.past,
            negative: ending.negative,
            polite: ending.polite,
            possibilities: suffix.kind === "rareru" ? ["potential", "passive", "honorific"] : ["make", "let"]
          };
        }
      }
    }
  }
  function element2(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function renderMeaningForks(forks) {
    const root = element2("section", "meaning-forks");
    const heading = element2("h3", "meaning-title", "Meaning Forks");
    root.append(heading);
    const traits = [forks.past ? "Past form" : "Nonpast form", forks.negative ? "Negative form" : "Affirmative form", forks.polite ? "Polite ending" : "Plain ending"];
    root.append(element2("p", "meaning-traits", traits.join(" \xB7 ")));
    root.append(element2("p", "meaning-intro", "Explore a function. These are common possibilities, not a ranking or a sentence translation."));
    const controls = element2("fieldset", "meaning-controls");
    controls.append(element2("legend", "meaning-legend", "Compare functions"));
    const detail = element2("div", "meaning-detail");
    detail.id = `meaning-detail-${++nextId}`;
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-atomic", "true");
    const buttons = [];
    const select = (choice) => {
      const description = descriptions[choice];
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.function === choice));
      const label = element2("h4", "meaning-selected", description.label);
      const diagram = element2("div", "meaning-diagram");
      diagram.setAttribute("aria-hidden", "true");
      diagram.append(element2("span", "meaning-role", description.roles[0]), element2("span", "meaning-relation", `\u2193 ${description.roles[1]} \u2193`), element2("span", "meaning-role", description.roles[2]));
      const explanation = element2("p", "meaning-explanation", description.explanation);
      detail.replaceChildren(label, diagram, explanation);
    };
    for (const choice of forks.possibilities) {
      const button = element2("button", "meaning-choice", descriptions[choice].label);
      button.type = "button";
      button.dataset.function = choice;
      button.setAttribute("aria-controls", detail.id);
      button.addEventListener("click", () => select(choice));
      buttons.push(button);
      controls.append(button);
    }
    root.append(controls, detail);
    root.append(element2("p", "meaning-note", "The diagram shows roles only. The source ending controls tense and negation. Context determines which function fits; other uses may exist."));
    const references = element2("p", "meaning-references");
    const sources = forks.kind === "rareru" ? [["Potential", "https://guidetojapanese.org/learn/complete/potential"], ["Passive and honorific", "https://guidetojapanese.org/learn/grammar/causepass"]] : [["Causative", "https://guidetojapanese.org/learn/grammar/causepass"]];
    references.append(document.createTextNode("Grammar reference: "));
    sources.forEach(([label, href], index) => {
      if (index) references.append(document.createTextNode(" \xB7 "));
      const link = element2("a", "meaning-reference", label);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      references.append(link);
    });
    root.append(references);
    if (forks.possibilities.length) select(forks.possibilities[0]);
    return root;
  }
  var suffixes, godanNegative, descriptions, nextId, meaningForkStyles;
  var init_meaning_forks = __esm({
    "src/meaning-forks.ts"() {
      "use strict";
      init_shared();
      suffixes = /* @__PURE__ */ new Set(["\u3089\u308C\u308B", "\u308C\u308B", "\u3055\u305B\u308B", "\u305B\u308B"]);
      godanNegative = { "\u3046": "\u308F", "\u304F": "\u304B", "\u3050": "\u304C", "\u3059": "\u3055", "\u3064": "\u305F", "\u306C": "\u306A", "\u3076": "\u3070", "\u3080": "\u307E", "\u308B": "\u3089" };
      descriptions = {
        potential: { label: "Potential", roles: ["Actor", "ability / possibility", "Action"], explanation: "Potential concerns whether an action is possible for someone." },
        passive: { label: "Passive", roles: ["Another actor", "action affects", "Subject"], explanation: "Passive describes a subject affected by an action. The effect can be indirect." },
        honorific: { label: "Honorific", roles: ["Speaker", "shows respect toward", "Actor"], explanation: "The honorific use shows respect for the person performing the action. A \uFF5E\u307E\u3059 ending instead marks politeness toward the listener." },
        make: { label: "Make", roles: ["Causer", "makes", "Someone act"], explanation: "The causer makes someone perform the action." },
        let: { label: "Let", roles: ["Permitter", "allows", "Someone act"], explanation: "The permitter lets someone perform the action." }
      };
      nextId = 0;
      meaningForkStyles = `
.meaning-forks{min-width:0;max-width:100%;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.55}
.meaning-title{font-size:16px;margin:0 0 6px}
.meaning-traits{font-family:var(--mono);font-size:10px;color:var(--muted);margin:0 0 10px;overflow-wrap:anywhere}
.meaning-intro,.meaning-note{margin:8px 0;color:var(--muted)}
.meaning-controls{border:0;padding:0;margin:12px 0;display:flex;gap:6px;flex-wrap:wrap;min-width:0}
.meaning-legend{font-size:11px;color:var(--muted);margin-bottom:6px;padding:0}
.meaning-choice{font:inherit;border:1px solid var(--line);padding:6px 9px;margin:0;background:var(--paper);color:var(--ink);cursor:pointer}
.meaning-choice[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.meaning-choice:focus-visible,.meaning-reference:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.meaning-detail{border:1px solid var(--line);padding:12px;background:var(--paper)}
.meaning-selected{margin:0 0 10px;font-size:13px}
.meaning-diagram{display:flex;align-items:center;flex-direction:column;gap:4px;margin:0 0 10px}
.meaning-role{border:1px solid var(--line);padding:5px 9px;max-width:100%;overflow-wrap:anywhere;text-align:center}
.meaning-relation{font-size:11px;color:var(--accent);text-align:center}
.meaning-explanation{margin:0;overflow-wrap:anywhere}
.meaning-note,.meaning-references{font-size:11px}
.meaning-references{margin:12px 0 0;color:var(--muted)}
.meaning-reference{color:var(--accent)}
`;
    }
  });

  // src/exploration.ts
  function wordExplorations(text, words, wordIndex, surface, overrides) {
    const verb = buildVerbPlayground(text, words, wordIndex);
    const meaning = buildMeaningForks(text, words, wordIndex);
    const corrected = (start, end) => Object.keys(overrides).some((word) => {
      let position = text.indexOf(word);
      while (position !== -1) {
        if (position < end && position + word.length > start) return true;
        position = text.indexOf(word, position + 1);
      }
      return false;
    });
    return {
      ...verb && !corrected(verb.start, verb.end) ? { verb } : {},
      ...meaning && !corrected(meaning.start, meaning.end) ? { meaning } : {},
      mimetic: matchMimeticAt(text, words, wordIndex)?.entry ?? findMimetic(surface)
    };
  }
  function changedRange(original, value) {
    const a = Array.from(original), b = Array.from(value);
    let prefix = 0, suffix = 0;
    while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
    return { start: b.slice(0, prefix).join("").length, end: b.slice(0, b.length - suffix).join("").length };
  }
  function annotated(text, reading, original) {
    const span = document.createElement("span");
    span.lang = "ja";
    const change = original === void 0 ? void 0 : changedRange(original, text);
    const append = (parent, start, end) => {
      const from = change ? Math.max(start, change.start) : end, to = change ? Math.min(end, change.end) : end;
      if (from < to) {
        parent.append(document.createTextNode(text.slice(start, from)));
        const mark = document.createElement("mark");
        mark.textContent = text.slice(from, to);
        parent.append(mark, document.createTextNode(text.slice(to, end)));
      } else parent.append(document.createTextNode(text.slice(start, end)));
    };
    let offset = 0;
    for (const part of align(text, reading)) {
      append(span, offset, part.start);
      const ruby = document.createElement("ruby");
      append(ruby, part.start, part.end);
      const rt = document.createElement("rt");
      rt.textContent = part.reading;
      ruby.append(rt);
      span.append(ruby);
      offset = part.end;
    }
    append(span, offset, text.length);
    return span;
  }
  function renderVerbPlayground(model2) {
    const section = document.createElement("section");
    section.className = "verb-playground";
    section.setAttribute("aria-label", "Verb Playground");
    const heading = document.createElement("h4");
    heading.textContent = "Verb Playground";
    const description = document.createElement("p");
    description.className = "verb-instruction";
    description.textContent = "Choose a form and adjust its ending.";
    const familyLabel = document.createElement("label");
    familyLabel.className = "verb-family-label";
    familyLabel.append(document.createTextNode("Form "));
    const select = document.createElement("select");
    select.className = "verb-family";
    select.setAttribute("aria-label", "Verb form");
    familyLabel.append(select);
    const explanation = document.createElement("p");
    explanation.className = "verb-explanation";
    const controls = document.createElement("div");
    controls.className = "verb-controls";
    const state = { ...model2.initial };
    let pristine = true, chosen = !model2.requiresChoice;
    const families = verbFamilies.filter((family) => model2.forms.some((form) => form.family === family.id));
    const groups = /* @__PURE__ */ new Map();
    for (const family of families) {
      let group = groups.get(family.group);
      if (!group) {
        group = document.createElement("optgroup");
        group.label = family.group;
        groups.set(family.group, group);
        select.append(group);
      }
      const option = document.createElement("option");
      option.value = family.id;
      option.textContent = family.label;
      group.append(option);
    }
    const choices = document.createElement("div");
    choices.className = "verb-ambiguity";
    if (model2.requiresChoice) {
      const prompt = document.createElement("p");
      prompt.textContent = "This spelling has several interpretations, including possible respectful uses. Choose a supported interpretation to explore; the passage determines its meaning.";
      choices.append(prompt);
      const seen = /* @__PURE__ */ new Set();
      for (const match of model2.sourceMatches) {
        if (seen.has(match.family)) continue;
        seen.add(match.family);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = verbFamilies.find((family) => family.id === match.family)?.label ?? match.family;
        button.addEventListener("click", () => {
          Object.assign(state, match);
          chosen = true;
          pristine = true;
          paintControls();
          render();
          select.focus();
        });
        choices.append(button);
      }
    }
    const result = document.createElement("div");
    result.className = "verb-result";
    result.setAttribute("aria-live", "polite");
    result.setAttribute("aria-atomic", "true");
    const render = () => {
      const family = families.find((family2) => family2.id === state.family);
      const variant = model2.forms.find((form) => form.family === state.family && form.past === state.past && form.negative === state.negative && form.polite === state.polite && form.spoken === state.spoken);
      const japanese2 = annotated(pristine ? model2.source : variant?.text ?? model2.source, pristine ? model2.sourceReading : variant?.reading ?? model2.sourceReading, model2.source);
      japanese2.className = "verb-japanese";
      const caption = document.createElement("p");
      caption.className = "verb-state";
      const traits = [];
      if (chosen && family) {
        traits.push(family.label);
        if (family.controls.includes("past")) traits.push(state.past ? "Past" : "Nonpast");
        if (family.controls.includes("negative")) traits.push(state.negative ? "Negative" : "Affirmative");
        if (family.controls.includes("polite")) traits.push(state.polite ? "Polite" : "Plain");
        if (state.spoken) traits.push("Spoken shortening");
      } else traits.push("Original spelling \xB7 Choose an interpretation above");
      caption.textContent = traits.join(" \xB7 ");
      result.replaceChildren(japanese2, caption);
      familyLabel.hidden = controls.hidden = explanation.hidden = !chosen;
      choices.hidden = chosen;
      select.value = state.family;
      explanation.textContent = family?.description ?? "";
    };
    const paintControls = () => {
      controls.replaceChildren();
      const family = families.find((family2) => family2.id === state.family);
      for (const [key, label] of [["past", "Past"], ["negative", "Negative"], ["polite", "Polite"], ["spoken", "Spoken shortening"]]) {
        if (!family?.controls.includes(key)) continue;
        const container = document.createElement("label"), input = document.createElement("input");
        input.type = "checkbox";
        input.checked = state[key];
        input.dataset.control = key;
        input.addEventListener("change", () => {
          state[key] = input.checked;
          pristine = false;
          render();
        });
        container.append(input, document.createTextNode(label));
        controls.append(container);
      }
    };
    select.addEventListener("change", () => {
      const family = families.find((family2) => family2.id === select.value);
      if (!family) return;
      state.family = family.id;
      for (const key of ["past", "negative", "polite", "spoken"]) if (!family.controls.includes(key)) state[key] = false;
      pristine = false;
      paintControls();
      render();
    });
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "verb-reset";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      Object.assign(state, model2.initial);
      chosen = !model2.requiresChoice;
      pristine = true;
      paintControls();
      render();
    });
    const output = document.createElement("div");
    output.className = "verb-output";
    const resultBar = document.createElement("div");
    resultBar.className = "verb-result-bar";
    resultBar.append(document.createTextNode("Result"), reset);
    output.append(resultBar, result);
    const help = document.createElement("details");
    help.className = "verb-help";
    const summary = document.createElement("summary");
    summary.textContent = "How to use this form";
    const note = document.createElement("p");
    note.textContent = "Underlined characters differ from the original. Reset restores its exact spelling. These forms are demonstrations; the surrounding sentence and social context may need other changes.";
    help.append(summary, note);
    section.append(heading, description, choices, familyLabel, controls, output, explanation, help);
    paintControls();
    render();
    return section;
  }
  function withOriginal(base, original) {
    try {
      return createVerbPlayground(base, { text: original.source, reading: original.sourceReading, start: original.start, end: original.end });
    } catch {
      return;
    }
  }
  async function verifiedVerbInterpretations(model2, tokenize, signal) {
    const queries = potentialBaseQueries(model2.base).filter((query) => Array.from(query).length <= 40).slice(0, 4);
    if (!queries.length) return [{ label: model2.base.label ?? model2.source, model: model2 }];
    const restricted = withOriginal(restrictVerbBase(model2.base), model2);
    const choices = restricted ? [{ label: `${model2.base.label ?? model2.lemma} \xB7 dictionary entry (limited forms)`, model: restricted }] : [];
    const results = await tokenize(queries, signal);
    if (signal.aborted) return [];
    const seen = /* @__PURE__ */ new Set();
    let verified = false;
    for (let index = 0; index < queries.length; index++) {
      if (isRaDroppedPotential(model2.base, queries[index], results[index] ?? [])) return [];
      const base = resolvePotentialBase(model2.base, queries[index], results[index] ?? []);
      if (!base || seen.has(base.lemma)) continue;
      verified = true;
      const derived2 = withOriginal(base, model2);
      if (!derived2) continue;
      seen.add(base.lemma);
      choices.push({ label: `Potential of ${base.prefix ?? ""}${base.lemma} (${base.prefixReading ?? ""}${base.reading})`, model: derived2 });
    }
    return verified ? choices : [{ label: model2.base.label ?? model2.source, model: model2 }];
  }
  function disposeExplorations(panel) {
    explorationCleanup.get(panel)?.();
    explorationCleanup.delete(panel);
  }
  function renderExplorations(models, settings = {}) {
    const panel = document.createElement("div");
    panel.className = "explore-panel";
    panel.hidden = true;
    const tools = document.createElement("div");
    tools.className = "explore-tools";
    tools.setAttribute("role", "group");
    tools.setAttribute("aria-label", "Exploration tools");
    const body = document.createElement("div");
    body.className = "explore-body";
    const options = [];
    let controller, disposed = false;
    const cancel = () => {
      controller?.abort();
      controller = void 0;
    };
    explorationCleanup.set(panel, () => {
      disposed = true;
      cancel();
    });
    if (models.verb) {
      const model2 = models.verb;
      options.push({ label: "Verb Playground", source: model2.source, reading: model2.sourceReading, render: () => {
        const wrapper = document.createElement("div");
        if (!potentialBaseQueries(model2.base).length) {
          wrapper.append(renderVerbPlayground(model2));
          return wrapper;
        }
        if (!settings.tokenize) {
          const restricted = withOriginal(restrictVerbBase(model2.base), model2);
          const note = document.createElement("p");
          note.textContent = "Other constructions need a local dictionary check. Only supported basic forms are available here.";
          wrapper.append(note);
          if (restricted) wrapper.append(renderVerbPlayground(restricted));
          return wrapper;
        }
        const loading = document.createElement("p");
        loading.setAttribute("role", "status");
        loading.textContent = "Checking possible dictionary bases locally\u2026";
        wrapper.append(loading);
        controller = new AbortController();
        const current = controller;
        void verifiedVerbInterpretations(model2, settings.tokenize, current.signal).then((interpretations) => {
          if (disposed || current.signal.aborted) return;
          if (!interpretations.length) {
            const note = document.createElement("p");
            note.textContent = "This appears to contain a derived construction outside the supported forms. Try its dictionary verb in Playgrounds.";
            wrapper.replaceChildren(note);
            return;
          }
          if (interpretations.length === 1) {
            wrapper.replaceChildren(renderVerbPlayground(interpretations[0].model));
            return;
          }
          const choices = document.createElement("div");
          choices.className = "verb-base-choices";
          const prompt = document.createElement("p");
          prompt.textContent = "This word may be a potential form or its own dictionary entry. Choose which to explore.";
          choices.append(prompt);
          for (const interpretation of interpretations) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = interpretation.label;
            button.addEventListener("click", () => {
              wrapper.replaceChildren(renderVerbPlayground(interpretation.model));
              wrapper.querySelector("select,button")?.focus();
            });
            choices.append(button);
          }
          wrapper.replaceChildren(choices);
        }).catch(() => {
          if (disposed || current.signal.aborted) return;
          const note = document.createElement("p");
          note.textContent = "Could not verify other bases. Only supported basic dictionary forms are available.";
          const restricted = withOriginal(restrictVerbBase(model2.base), model2);
          wrapper.replaceChildren(note);
          if (restricted) wrapper.append(renderVerbPlayground(restricted));
        });
        return wrapper;
      } });
    }
    if (models.mimetic) {
      const model2 = models.mimetic;
      options.push({ label: "Mimetic Playground", render: () => renderMimeticPlayground(model2) });
    }
    if (models.meaning) {
      const model2 = models.meaning;
      options.push({ label: "Meaning Forks", source: model2.source, reading: model2.reading, render: () => renderMeaningForks(model2) });
    }
    const buttons = [];
    const choose = (index) => {
      cancel();
      buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
      const option = options[index];
      body.replaceChildren();
      if (option.source) {
        const label = document.createElement("p");
        label.className = "explore-source-label";
        label.textContent = "Original phrase";
        const source = document.createElement("p");
        source.className = "explore-source";
        source.append(annotated(option.source, option.reading ?? ""));
        body.append(label, source);
      }
      body.append(option.render());
    };
    for (let i = 0; i < options.length; i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = options[i].label;
      button.addEventListener("click", () => choose(i));
      buttons.push(button);
      tools.append(button);
    }
    if (options.length > 1) panel.append(tools);
    panel.append(body);
    if (options.length) choose(0);
    return panel;
  }
  var explorationStyles, explorationCleanup;
  var init_exploration = __esm({
    "src/exploration.ts"() {
      "use strict";
      init_shared();
      init_verb_playground();
      init_mimetic_playground();
      init_meaning_forks();
      explorationStyles = `
.explore-toggle,.definition-retry{margin:8px 8px 0 0;font-size:11px}
.explore-panel{margin-top:12px;border:1px solid var(--line);padding:12px;background:var(--paper);min-width:0}
.explore-panel[hidden]{display:none}.explore-tools{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.explore-tools button{margin:0;font-size:10px}.explore-tools button[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.explore-panel h4{margin:0 0 8px;font:800 12px/1.4 var(--mono);text-transform:uppercase}
.explore-panel p{font-size:12px}.explore-panel .explore-source{font:20px/2 var(--body);margin:4px 0 14px;overflow-wrap:anywhere}
.explore-panel .explore-source-label{font-size:11px;color:var(--muted);margin:0}
.verb-playground{min-width:0}.verb-instruction{color:var(--muted);margin:0 0 14px}
.verb-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}
.verb-controls label{display:inline-flex;flex:0 0 auto;align-items:center;gap:7px;min-height:36px;padding:7px;border:1px solid var(--line);background:var(--paper);font:12px/1.4 var(--body);white-space:nowrap;overflow-wrap:normal;cursor:pointer}
.verb-controls label:has(input:checked){background:var(--surface);border-color:var(--accent)}
.verb-controls input[type=checkbox]{flex:0 0 16px;accent-color:var(--accent);width:16px;height:16px;min-width:16px;max-width:16px;margin:0;padding:0}
.verb-output{border-left:4px solid var(--accent);padding:10px 12px;margin:14px 0;background:var(--surface);overflow-wrap:anywhere}
.verb-result-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font:11px/1.4 var(--body)}
.verb-result .verb-japanese{display:block;font:28px/2.1 var(--body)}
.verb-result mark{color:var(--ink);background:var(--sand,#e4cd9d);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.verb-result .verb-state{font-size:11px;color:var(--muted);margin:4px 0 0}
.verb-reset{margin:0;padding:4px 8px;font-size:11px;background:var(--paper)}
.explore-panel a{font-size:11px;overflow-wrap:anywhere}
.explore-panel button:focus-visible,.explore-panel input:focus-visible,.explore-toggle:focus-visible,.definition-retry:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.verb-family-label{display:grid;gap:6px;font-size:12px;font-weight:600;margin:14px 0 0}
.verb-family{width:100%;min-width:0;max-width:100%;font:13px/1.5 var(--body);padding:9px;background:var(--paper);color:var(--ink);border:1px solid var(--line)}
.verb-explanation{color:var(--muted);font:12px/1.6 var(--body);margin:12px 0}
.verb-help{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font:11px/1.6 var(--body)}
.verb-help summary{cursor:pointer;font-weight:600}.verb-help p{font-size:11px}
.verb-ambiguity,.verb-base-choices{border:1px solid var(--line);padding:10px;margin:10px 0}
.verb-ambiguity button,.verb-base-choices button{margin:4px 6px 4px 0;max-width:100%;white-space:normal;overflow-wrap:anywhere;text-align:left}
.verb-family:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.verb-playground [hidden]{display:none}
${mimeticStyles}
${meaningForkStyles}
`;
      explorationCleanup = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/playground-browser.ts
  function element3(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function classLabel(base) {
    if (base.verbClass === "\u4E00\u6BB5") return "Ichidan";
    if (base.verbClass.startsWith("\u4E94\u6BB5")) return "Godan";
    if (base.verbClass.startsWith("\u30B5\u5909")) return "\u3059\u308B irregular";
    if (base.verbClass.startsWith("\u30AB\u5909")) return "\u6765\u308B irregular";
    return base.verbClass;
  }
  function renderPlaygroundBrowser(options) {
    const root = element3("section", "playground-browser");
    root.setAttribute("aria-label", "Playgrounds");
    const panelId = `ko-playground-pane-${++browserSequence}`;
    let tab = "verbs", disposed = false, request = 0, controller;
    let catalogScroll = 0, returnFocus;
    const cancel = () => {
      request++;
      controller?.abort();
      controller = void 0;
      form.removeAttribute("aria-busy");
      submit.disabled = false;
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      cancel();
    };
    const verbIntro = "Enter a dictionary-form verb here, or open a word\u2019s playground in Reading view. Everything works offline.";
    const intro = element3("p", "playground-intro", verbIntro);
    const tabs = element3("div", "playground-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Playground type");
    const filters = element3("div", "playground-filters");
    const searchLabel = element3("label", "", "Search expressions");
    const search = element3("input", "playground-search");
    search.type = "search";
    search.maxLength = 80;
    search.setAttribute("aria-label", "Search mimetic expressions");
    search.placeholder = "Japanese, reading, or English";
    searchLabel.append(search);
    const categoryLabel = element3("label", "", "Category");
    const category = element3("select", "playground-category");
    category.setAttribute("aria-label", "Mimetic category");
    const all = element3("option", "", "All categories");
    all.value = "";
    category.append(all);
    for (const [value, label] of categories) {
      const option = element3("option", "", label);
      option.value = value;
      category.append(option);
    }
    categoryLabel.append(category);
    filters.hidden = true;
    filters.append(searchLabel, categoryLabel);
    const form = element3("form", "playground-verb-input");
    form.noValidate = true;
    const inputLabel = element3("label", "", "Dictionary-form verb");
    const input = element3("input", "");
    input.type = "text";
    input.maxLength = 40;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "\u98DF\u3079\u308B or \u52C9\u5F37\u3059\u308B";
    inputLabel.append(input);
    const submit = element3("button", "", "Check verb locally");
    submit.type = "submit";
    const feedback = element3("p", "playground-feedback");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const confirmation = element3("div", "playground-confirmation");
    form.append(inputLabel, submit, feedback, confirmation);
    const count = element3("p", "playground-count");
    count.setAttribute("role", "status");
    count.hidden = true;
    const results = element3("div", "playground-results");
    results.setAttribute("aria-label", "Mimetic expressions");
    results.hidden = true;
    const selection = element3("div", "playground-selection");
    const catalog = element3("div", "playground-catalog");
    catalog.append(intro, form, filters, count, results);
    const detailNav = element3("div", "playground-detail-nav");
    detailNav.hidden = true;
    const back = element3("button", "playground-back", "\u2190 Examples");
    back.type = "button";
    back.setAttribute("aria-label", "Back to examples");
    detailNav.append(back);
    const scroller = element3("div", "playground-scroll");
    const backToExamples = () => {
      selection.replaceChildren();
      catalog.hidden = false;
      detailNav.hidden = true;
      scroller.scrollTop = catalogScroll;
      if (tab === "verbs") {
        confirmation.replaceChildren();
        feedback.textContent = "";
        input.focus({ preventScroll: true });
        input.select();
      } else (returnFocus?.isConnected ? returnFocus : search).focus({ preventScroll: true });
    };
    back.addEventListener("click", backToExamples);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && catalog.hidden) {
        event.preventDefault();
        event.stopPropagation();
        backToExamples();
      }
    });
    const showSelection = (panel, origin) => {
      if (!catalog.hidden) catalogScroll = scroller.scrollTop;
      back.textContent = tab === "verbs" ? "\u2190 Change verb" : "\u2190 Examples";
      back.setAttribute("aria-label", tab === "verbs" ? "Change verb" : "Back to examples");
      returnFocus = origin;
      selection.replaceChildren(panel);
      catalog.hidden = true;
      detailNav.hidden = false;
      scroller.scrollTop = 0;
      Array.from(panel.querySelectorAll("select,button")).find((node) => node.getClientRects().length)?.focus({ preventScroll: true });
    };
    const pane = element3("div", "playground-pane");
    pane.id = panelId;
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", `${panelId}-${tab}`);
    const showVerb = (interpretation, origin) => {
      const panel = element3("div", "explore-panel");
      const label = element3("p", "explore-source-label", "Original phrase");
      const source = element3("p", "explore-source");
      source.append(annotated(interpretation.model.source, interpretation.model.sourceReading));
      const original = element3("div", "playground-original");
      original.append(label, source);
      panel.append(original, renderVerbPlayground(interpretation.model));
      showSelection(panel, origin);
    };
    const confirm = (choices) => {
      confirmation.replaceChildren();
      for (const choice of choices) {
        const button = element3("button", "", `Use ${choice.label}`);
        button.type = "button";
        button.addEventListener("click", () => {
          if (disposed) return;
          cancel();
          feedback.textContent = "";
          showVerb(choice, button);
        });
        confirmation.append(button);
      }
    };
    const check = async (value) => {
      cancel();
      selection.replaceChildren();
      confirmation.replaceChildren();
      feedback.textContent = "";
      if (disposed) return;
      if (!value || Array.from(value).length > 40 || !/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー]+$/u.test(value)) {
        feedback.textContent = "Enter one dictionary-form verb, such as \u98DF\u3079\u308B or \u52C9\u5F37\u3059\u308B (up to 40 characters).";
        return;
      }
      controller = new AbortController();
      const current = controller, id = request;
      form.setAttribute("aria-busy", "true");
      submit.disabled = true;
      feedback.textContent = "Checking the bundled dictionary\u2026";
      try {
        const candidates = dictionaryVerbCandidates(value, (await options.tokenize([value], current.signal))[0] ?? []);
        if (disposed || current.signal.aborted || id !== request) return;
        if (!candidates.length) {
          feedback.textContent = "Use a recognized dictionary-form verb, such as \u98DF\u3079\u308B, \u8AAD\u3080, or \u52C9\u5F37\u3059\u308B. Sentences and conjugated forms cannot be entered here.";
          return;
        }
        const choices = [];
        for (const candidate of candidates) {
          const model2 = createVerbPlayground(candidate);
          const interpretations = await verifiedVerbInterpretations(model2, options.tokenize, current.signal);
          if (disposed || current.signal.aborted || id !== request) return;
          for (const interpretation of interpretations) {
            const base = interpretation.model.base;
            choices.push({ ...interpretation, label: `${interpretation.label} \xB7 ${base.prefixReading ?? ""}${base.reading} \xB7 ${classLabel(base)}` });
          }
        }
        feedback.textContent = !choices.length ? "That derived construction is outside the supported forms. Try its original dictionary verb." : choices.length > 1 ? "Choose the dictionary entry or interpretation you intend." : "Confirm the dictionary form, reading, and class to begin.";
        confirm(choices);
      } catch {
        if (disposed || current.signal.aborted || id !== request) return;
        feedback.textContent = "The local dictionary could not finish. Try again, or click a verb in Reading view to explore it.";
      } finally {
        if (!disposed && !current.signal.aborted && id === request) {
          form.removeAttribute("aria-busy");
          submit.disabled = false;
          controller = void 0;
        }
      }
    };
    const renderResults = () => {
      if (disposed) return;
      results.replaceChildren();
      if (tab === "verbs") {
        count.textContent = "";
        return;
      }
      const query = normalize(search.value);
      let total = 0;
      for (const entry of mimeticEntries) for (const [index, variant] of entry.variants.entries()) {
        if (category.value && entry.category !== category.value) continue;
        const values = [variant.term, ...variant.aliases, entry.sceneUse, variant.gloss, ...entry.keywords];
        if (!matches(normalizeMimetic(query), values)) continue;
        total++;
        const button = element3("button", "playground-entry");
        button.type = "button";
        button.append(element3("span", "playground-term", variant.term), element3("span", "playground-gloss", variant.gloss));
        button.addEventListener("click", () => {
          if (disposed) return;
          cancel();
          confirmation.replaceChildren();
          feedback.textContent = "";
          const panel = element3("div", "explore-panel");
          panel.append(renderMimeticPlayground({ ...entry, initialVariant: index }));
          showSelection(panel, button);
        });
        results.append(button);
      }
      count.textContent = `${total} expressions`;
      if (!total) results.append(element3("p", "", "No matching expressions. Try another spelling, reading, or English word."));
    };
    const tabButtons = /* @__PURE__ */ new Map();
    const changeTab = (next) => {
      if (disposed) return;
      cancel();
      tab = next;
      selection.replaceChildren();
      confirmation.replaceChildren();
      feedback.textContent = "";
      catalog.hidden = false;
      detailNav.hidden = true;
      scroller.scrollTop = 0;
      form.hidden = next !== "verbs";
      filters.hidden = count.hidden = results.hidden = next !== "mimetics";
      intro.textContent = next === "verbs" ? verbIntro : "Choose an expression to compare. Everything works offline.";
      pane.setAttribute("aria-labelledby", `${panelId}-${next}`);
      for (const [key, button] of tabButtons) {
        button.setAttribute("aria-selected", String(key === next));
        button.tabIndex = key === next ? 0 : -1;
      }
      renderResults();
    };
    for (const [id, label] of [["verbs", "Verbs"], ["mimetics", "Mimetics"]]) {
      const button = element3("button", "", label);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(id === tab));
      button.tabIndex = id === tab ? 0 : -1;
      button.id = `${panelId}-${id}`;
      button.setAttribute("aria-controls", panelId);
      button.addEventListener("click", () => changeTab(id));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "verbs" : event.key === "End" ? "mimetics" : tab === "verbs" ? "mimetics" : "verbs";
        changeTab(next);
        tabButtons.get(next)?.focus();
      });
      tabButtons.set(id, button);
      tabs.append(button);
    }
    search.addEventListener("input", renderResults);
    category.addEventListener("change", renderResults);
    input.addEventListener("input", () => {
      cancel();
      feedback.textContent = "";
      confirmation.replaceChildren();
      selection.replaceChildren();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void check(input.value.normalize("NFKC").trim());
    });
    pane.append(catalog, selection);
    scroller.append(pane);
    root.append(tabs, detailNav, scroller);
    renderResults();
    return { element: root, dispose, focus: () => {
      if (!disposed) (tab === "verbs" ? input : search).focus();
    } };
  }
  var playgroundBrowserStyles, categories, normalize, browserSequence, matches;
  var init_playground_browser = __esm({
    "src/playground-browser.ts"() {
      "use strict";
      init_shared();
      init_verb_playground();
      init_mimetic_playground();
      init_exploration();
      playgroundBrowserStyles = `
.playground-browser{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;font:13px/1.5 var(--body);overflow-wrap:break-word}
.playground-tabs{display:flex;flex:none;gap:6px;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--paper)}
.playground-tabs button{flex:1;min-width:0;margin:0;padding:9px;font:700 12px/1.4 var(--mono)}
.playground-tabs [aria-selected=true]{background:var(--accent);color:var(--paper)}
.playground-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px}
.playground-intro{margin:0 0 14px;color:var(--muted);font-size:12px}
.playground-filters{display:grid;gap:10px}
.playground-filters label,.playground-verb-input label{display:grid;gap:5px;font-size:12px;font-weight:600}
.playground-filters input,.playground-filters select,.playground-verb-input input{width:100%;max-width:100%;min-width:0;box-sizing:border-box;font:13px/1.5 var(--body);color:var(--ink);background:var(--paper);border:1px solid var(--line);padding:9px}
.playground-browser button{max-width:100%}
.playground-verb-input{margin:0}.playground-verb-input button{margin:8px 0 0;font-size:12px}
.playground-feedback{color:var(--muted);margin:8px 0;font-size:12px}.playground-feedback:empty{display:none}
.playground-confirmation{display:grid;gap:8px;margin:8px 0}.playground-confirmation:empty{display:none}
.playground-confirmation button{margin:0;text-align:left;font-size:12px;white-space:normal;overflow-wrap:anywhere}
.playground-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;margin:10px 0}
.playground-entry{display:flex;flex-direction:column;gap:3px;margin:0;width:100%;min-width:0;text-align:left;padding:10px;font-size:12px;white-space:normal;overflow-wrap:break-word}
.playground-entry .playground-term{font:20px/1.5 var(--body);color:var(--accent)}
.playground-entry .playground-gloss{font:11px/1.5 var(--body);color:var(--muted)}
.playground-count{font-size:11px;color:var(--muted);margin:14px 0 8px}
.playground-detail-nav{flex:none;padding:8px 16px;border-bottom:1px solid var(--line);background:var(--surface)}
.playground-back{margin:0;padding:4px 0;border:0;background:transparent;color:var(--accent);font-size:12px}.playground-back:hover{background:transparent;text-decoration:underline}
.playground-selection{min-width:0}.playground-selection:empty{display:none}
.playground-selection .explore-panel{margin:0;padding:0;border:0;background:transparent}
.playground-original{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.playground-selection .verb-instruction{display:none}
.playground-selection .explore-source-label{margin:0;color:var(--muted);font:11px/1.4 var(--body)}
.playground-selection .explore-source{margin:0;font:22px/1.9 var(--body)}
.playground-selection .mimetic-playground{border:0;margin:0;padding:0}
.playground-browser button:focus-visible,.playground-browser input:focus-visible,.playground-browser select:focus-visible,.playground-browser summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.playground-browser [hidden]{display:none}
`;
      categories = [["feelings", "Feelings"], ["body", "Body"], ["movement", "Movement"], ["people", "People"], ["texture", "Texture"], ["sounds", "Sound"], ["nature", "Light & Weather"]];
      normalize = (value) => hiragana(value.normalize("NFKC")).toLocaleLowerCase("en").trim();
      browserSequence = 0;
      matches = (query, values) => !query || query.split(/\s+/u).every((part) => values.some((value) => normalize(value).includes(part)));
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
      init_ui_theme();
      init_preferences();
      init_definitions();
      init_exploration();
      init_playground_browser();
      ReadingPanel = class {
        host = document.createElement("ko-reading-view");
        root = this.host.attachShadow({ mode: "closed" });
        content;
        status;
        context = "";
        scrollTop = 0;
        rendered;
        definition;
        lookupVersion = 0;
        selected;
        definitions = /* @__PURE__ */ new Map();
        wordContexts = /* @__PURE__ */ new WeakMap();
        overrides = {};
        resizeHandle;
        resizeStart;
        width = 420;
        saveWidth;
        playground;
        exploration;
        playgroundLauncher;
        setOverrides(values) {
          this.overrides = values;
        }
        constructor(close, saveWidth) {
          this.saveWidth = saveWidth;
          this.root.innerHTML = `<style>${uiTheme}
:host{all:initial!important;position:fixed!important;right:12px!important;top:var(--reader-top,100px)!important;bottom:12px!important;width:min(var(--reader-width,420px),calc(100vw - 24px))!important;z-index:2147483647!important;display:block!important;contain:layout style!important;color-scheme:light!important}
:host(.playground-active){top:12px!important}
.reader{height:100%;display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:2px solid var(--line);overflow:hidden;font:13px/1.5 var(--body)}.reader.high{background:#fff;color:#101010}.header{display:grid;grid-template-columns:minmax(0,1fr) auto 28px;align-items:center;gap:6px 8px;padding:12px;flex:none;border-bottom:4px solid var(--line);background:var(--surface)}.header>div{min-width:0}.header .heading{grid-column:1;grid-row:1}.panel-close{grid-column:3;grid-row:1;justify-self:end;margin:0;width:28px;height:28px;padding:0;font-size:18px}.reader-hint{grid-column:1/-1;grid-row:2;margin:0}.playgrounds-open{grid-column:2;grid-row:1;display:inline-flex;align-items:center;gap:4px;margin:0;min-height:28px;padding:4px 6px;font-size:10px;background:var(--accent);color:var(--paper);white-space:nowrap}.playgrounds-open:hover{background:var(--ink)}.playgrounds-open svg{display:block;flex:none;width:14px;height:14px}.reader.playground-mode .reader-hint,.reader.playground-mode>.content,.reader.playground-mode>.status{display:none}.reader.playground-mode .heading{grid-column:1/3}.reader.playground-mode .playgrounds-open svg{display:none}.reader.playground-mode .playgrounds-open{grid-column:1/-1;grid-row:2;justify-self:start;min-height:0;padding:4px 0;border:0;background:transparent;color:var(--accent)}.heading{display:flex;align-items:center;gap:8px}.brand-mark{display:block;flex:none;width:24px;height:24px}.brand-mark svg{display:block;width:100%;height:100%}h2{font:900 16px/1.2 var(--mono);text-transform:uppercase;letter-spacing:-.5px;margin:0}small{display:block;color:var(--muted);font-size:11px;margin-top:6px}button{margin-left:auto;flex:none;background:var(--paper);border:2px solid var(--line);color:inherit;cursor:pointer;padding:7px 9px;font:700 11px/1.4 var(--mono)}button:hover{background:var(--surface)}.content:focus-visible{outline:3px solid var(--accent);outline-offset:-5px}.content{padding:20px 22px 28px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;font:var(--reader-font,20px) var(--body);user-select:text}.line{margin:0;line-height:var(--reader-spacing,2.8);white-space:pre-wrap;overflow-wrap:anywhere}ruby{ruby-position:over;ruby-align:center}rt{font:var(--reader-ruby,.5em)/1 var(--body)}.empty{font:13px/1.6 var(--body);color:var(--muted)}.status{margin:0;padding:12px 16px;border-top:2px solid var(--line);background:var(--surface);color:var(--muted);font:10px/1.6 var(--mono)}@media print{:host{display:none!important}}
.word{display:inline;margin:0;padding:0;border:0;background:transparent;font:inherit;line-height:inherit;color:inherit;white-space:inherit;user-select:text}.word:hover,.word[aria-pressed=true]{background:var(--surface);color:var(--accent);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px}.word:focus-visible{outline-offset:2px}.definition{flex:none;max-height:44%;overflow:auto;padding:16px;border-top:4px solid var(--line);background:var(--surface)}.high .definition{background:var(--paper)}.definition header{display:flex;align-items:center;gap:8px}.definition h3{font-size:20px;margin:0;overflow-wrap:anywhere}.definition h4{margin:14px 0 6px;font:800 11px/1.4 var(--mono);text-transform:uppercase}.definition p{margin:6px 0;overflow-wrap:anywhere}.definition ol{margin:6px 0;padding-left:20px}.definition a{color:var(--accent);text-underline-offset:3px}.definition .source{font-size:10px;color:var(--muted)}.definition .pronunciation{font-size:12px;color:var(--muted)}.definition .feedback{font-size:12px;color:var(--muted)}
.resize{position:absolute;left:-6px;top:16px;bottom:16px;width:12px;cursor:ew-resize;touch-action:none}.resize:after{content:"";position:absolute;left:5px;top:0;bottom:0;width:3px;background:var(--line)}.resize:hover:after,.resize:focus-visible:after{background:var(--accent)}.resize:focus-visible{outline:3px solid var(--accent);outline-offset:0}.correction-form{margin-top:12px;padding-top:12px;border-top:2px solid var(--line)}.correction-form label{display:block;font-size:11px;font-weight:700;margin:8px 0}.correction-form input{display:block;width:100%;font:14px var(--body);color:var(--ink);background:var(--paper);padding:8px;border:2px solid var(--line);margin-top:6px}.correction-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.correction-actions button{margin:0;font-size:11px}.feedback[data-error=true]{color:var(--ink);font-weight:700;border-left:3px solid var(--line);padding-left:8px}.feedback[data-error=true]:before{content:"! "}
.definition.exploring{max-height:70%}.definition.browsing{flex:1;min-height:0;max-height:none;padding:0;border-top:0;overflow:hidden;background:var(--paper)}.definition>header{position:sticky;top:-16px;z-index:1;padding:8px 0;background:var(--surface)}
${explorationStyles}
${playgroundBrowserStyles}

</style><div class="resize" role="separator" tabindex="0" aria-label="Reading panel width" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="720" aria-valuenow="420"></div><section class="reader" role="region" aria-label="K\u014D reading view"><header class="header"><div class="heading"><span class="brand-mark" aria-hidden="true">${'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="K\u014D \xB7 \u8003 \u2014 think">\n  <title>K\u014D \xB7 \u8003 \u2014 think</title>\n  <rect x="2" y="2" width="124" height="124" fill="#242b2d"/>\n  <rect x="8" y="8" width="112" height="112" fill="#9f3e2d"/>\n  <path fill="#f4ecd8" fill-rule="evenodd" d="M56.07,56.03 L50.88,58.75 L39.25,63.93 L26.54,68.54 L20,70.55 L23.74,75.34 L26.83,80.99 L46.01,72.92 L41.91,82.89 L37.37,91.43 L50.66,93.24 L53.61,87.07 L84.46,87.07 L83.75,91.76 L83.11,93.87 L82.26,95.37 L80.68,96.26 L77.78,96.62 L74.12,96.62 L61.2,95.52 L63.25,101.17 L63.95,107.38 L75.24,107.93 L82.52,107.75 L86.55,107.19 L90.17,105.59 L92.72,102.92 L94.7,98.41 L96.2,91.58 L98.13,76.25 L91.06,76.62 L57.5,76.63 L58.64,73.4 L82.97,71.5 L103.54,68.46 L95.75,58.59 L88.55,60.59 L83.59,61.46 L63.1,63.62 L75.15,56.03 L98.23,56.04 L108,56.6 L108,44.63 L100.93,45.14 L88.92,45.2 L94.84,39.63 L104.49,29.16 L93.38,21.76 L89.49,27.88 L83.89,34.57 L83.89,27.55 L77.33,28.05 L66.61,28.12 L66.72,23.17 L67.18,20.05 L53.98,20.05 L54.55,28.12 L37.64,28.05 L31.2,27.55 L31.2,39.41 L37.5,39.07 L54.55,39.03 L54.55,45.2 L32.19,45.19 L22.28,44.63 L22.28,56.6 L35.09,56.03 Z M66.61,45.2 L66.61,39.03 L79.24,39.13 L72.12,45.2 Z"/>\n</svg>\n'}</span><h2>Reading view</h2></div><button type="button" class="playgrounds-open" aria-expanded="false" title="Open playgrounds"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg><span>Playgrounds</span></button><button type="button" class="panel-close" aria-label="Close reading view" title="Close reading view">\xD7</button><small class="reader-hint">Click a word to see its meaning.</small></header><div class="content" tabindex="0" aria-label="Page reading text" lang="ja"></div><section class="definition" aria-label="Word details" aria-live="polite" hidden></section><p class="status" role="status" aria-live="polite"></p></section>`;
          this.resizeHandle = this.root.querySelector(".resize");
          const finish = () => {
            if (!this.resizeStart) return;
            this.resizeStart = void 0;
            void this.persistWidth();
          };
          this.resizeHandle.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            this.resizeStart = { x: event.clientX, width: this.host.getBoundingClientRect().width };
            this.resizeHandle.setPointerCapture(event.pointerId);
          });
          this.resizeHandle.addEventListener("pointermove", (event) => {
            if (this.resizeStart) this.setWidth(this.resizeStart.width + this.resizeStart.x - event.clientX);
          });
          this.resizeHandle.addEventListener("pointerup", finish);
          this.resizeHandle.addEventListener("pointercancel", finish);
          this.resizeHandle.addEventListener("lostpointercapture", finish);
          this.resizeHandle.addEventListener("keydown", (event) => {
            let width = this.width;
            if (event.key === "ArrowLeft") width += 10;
            else if (event.key === "ArrowRight") width -= 10;
            else if (event.key === "Home") width = 280;
            else if (event.key === "End") width = 720;
            else return;
            event.preventDefault();
            this.setWidth(width);
            void this.persistWidth();
          });
          this.content = this.root.querySelector(".content");
          this.status = this.root.querySelector(".status");
          this.definition = this.root.querySelector(".definition");
          this.root.querySelector('[aria-label="Close reading view"]').addEventListener("click", close);
          this.playgroundLauncher = this.root.querySelector(".playgrounds-open");
          this.playgroundLauncher.addEventListener("click", () => {
            if (this.playground) this.dismissDefinition(true);
            else this.openPlaygrounds();
          });
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
        setWidth(value) {
          this.width = Math.max(Math.min(280, innerWidth - 24), Math.min(720, innerWidth - 24, value));
          this.host.style.setProperty("--reader-width", `${this.width}px`);
          this.resizeHandle.setAttribute("aria-valuemin", String(Math.min(280, innerWidth - 24)));
          this.resizeHandle.setAttribute("aria-valuemax", String(Math.min(720, innerWidth - 24)));
          this.resizeHandle.setAttribute("aria-valuenow", String(Math.round(this.width)));
        }
        async persistWidth() {
          try {
            await this.saveWidth(Math.max(280, this.width));
          } catch {
            this.status.textContent = "Could not save the panel width. Try resizing again.";
          }
        }
        appearance(settings, appearance2) {
          if (!this.resizeStart) this.setWidth(settings.width);
          this.host.style.setProperty("--reader-font", `${settings.fontSize}px`);
          this.host.style.setProperty("--reader-spacing", String(settings.spacing));
          this.host.style.setProperty("--reader-ruby", `${0.5 * appearance2.scale}em`);
          this.root.querySelector(".reader").classList.toggle("high", appearance2.contrast === "high");
        }
        ownsNode(node) {
          return node === this.host || this.host.contains(node);
        }
        owns(event) {
          return event.composedPath().includes(this.host);
        }
        loading(show, text, keepContent = false) {
          if (show && keepContent && this.rendered !== void 0) return;
          this.rendered = void 0;
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
          this.status.textContent = "Only visible page text is processed.";
        }
        display(runs, context, settings, appearance2, top, limited) {
          this.host.style.setProperty("--reader-top", `${Math.max(12, Math.min(top, innerHeight - 180))}px`);
          this.appearance(settings, appearance2);
          const lines = context === "web" ? runs.map((run) => ({ text: run.text, readings: run.readings, words: run.words })) : readingLines(runs), rendered = JSON.stringify([context, lines]);
          const status = `${context === "web" ? "Visible webpage text" : context === "pageless" ? "Visible document text" : "Active page \xB7 visible text"} \xB7 Text-only view${limited ? " \xB7 View limit reached" : ""}.`;
          if (this.status.textContent !== status) this.status.textContent = status;
          if (rendered === this.rendered) return;
          if (this.rendered !== void 0) this.scrollTop = this.content.scrollTop;
          if (this.rendered !== void 0 || !this.playground) this.dismissDefinition();
          this.rendered = rendered;
          const fragment = document.createDocumentFragment();
          for (const line of lines) {
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
              let pronunciation = "", position = word.start, unknown = false;
              for (const part of line.readings) {
                if (part.start < position || part.end > word.end) continue;
                pronunciation += line.text.slice(position, part.start) + part.reading;
                position = part.end;
                if (!part.reading) unknown = true;
              }
              pronunciation += line.text.slice(position, word.end);
              if (unknown || /[\p{Script=Han}々]/u.test(pronunciation)) pronunciation = word.reading === "*" ? "" : word.reading;
              button.dataset.word = word.lemma;
              button.dataset.surface = surface;
              button.dataset.reading = pronunciation;
              const originalIndex = (line.words ?? []).findIndex((entry) => entry.start === word.start);
              if (originalIndex >= 0) this.wordContexts.set(button, { text: line.text, words: line.words, index: originalIndex });
              button.setAttribute("aria-label", `Open details for ${surface}`);
              button.setAttribute("aria-pressed", "false");
              button.title = `${surface} \xB7 Word details`;
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
        }
        unavailable(text) {
          this.loading(true, text);
        }
        dismissDefinition(focus = false) {
          const returnFocus = this.selected ?? (this.playground ? this.playgroundLauncher : void 0);
          if (this.exploration) disposeExplorations(this.exploration);
          this.exploration = void 0;
          this.playground?.dispose();
          this.playground = void 0;
          this.playgroundLauncher.setAttribute("aria-expanded", "false");
          this.playgroundLauncher.querySelector("span").textContent = "Playgrounds";
          this.playgroundLauncher.title = "Open playgrounds";
          this.playgroundLauncher.removeAttribute("aria-label");
          this.host.classList.remove("playground-active");
          this.root.querySelector(".reader").classList.remove("playground-mode");
          this.root.querySelector("h2").textContent = "Reading view";
          this.definition.setAttribute("aria-label", "Word details");
          this.definition.setAttribute("aria-live", "polite");
          this.lookupVersion++;
          this.definition.hidden = true;
          this.definition.classList.remove("exploring", "browsing");
          this.definition.replaceChildren();
          this.selected?.setAttribute("aria-pressed", "false");
          if (focus) returnFocus?.focus();
          this.selected = void 0;
        }
        async tokenizePlayground(texts, signal) {
          if (signal.aborted) throw new DOMException("Analysis cancelled", "AbortError");
          const requestId = crypto.randomUUID();
          let abort = () => {
          };
          try {
            const reply = await new Promise((resolve, reject) => {
              abort = () => {
                try {
                  void Promise.resolve(chrome.runtime.sendMessage({ type: "cancel-tokenize", purpose: "playground", requestId })).catch(() => {
                  });
                } catch {
                }
                reject(new DOMException("Analysis cancelled", "AbortError"));
              };
              signal.addEventListener("abort", abort, { once: true });
              try {
                Promise.resolve(chrome.runtime.sendMessage({ type: "tokenize", purpose: "playground", requestId, texts, includeWords: true })).then(resolve, reject);
              } catch (error) {
                reject(error);
              }
            });
            if (signal.aborted || reply?.cancelled) throw new DOMException("Analysis cancelled", "AbortError");
            if (reply?.error || !Array.isArray(reply?.words) || reply.words.length !== texts.length || reply.words.some((words) => !Array.isArray(words))) throw new Error("Could not analyze this verb offline. Try again.");
            return reply.words;
          } finally {
            signal.removeEventListener("abort", abort);
          }
        }
        openPlaygrounds() {
          this.dismissDefinition();
          this.definition.hidden = false;
          this.definition.classList.add("browsing");
          this.definition.scrollTop = 0;
          this.definition.setAttribute("aria-label", "Learning playground browser");
          this.definition.setAttribute("aria-live", "off");
          this.playgroundLauncher.setAttribute("aria-expanded", "true");
          this.playgroundLauncher.querySelector("span").textContent = "\u2190 Reading view";
          this.playgroundLauncher.title = "Back to reading view";
          this.playgroundLauncher.setAttribute("aria-label", "Back to reading view");
          this.host.classList.add("playground-active");
          this.root.querySelector(".reader").classList.add("playground-mode");
          this.root.querySelector("h2").textContent = "Playgrounds";
          this.playground = renderPlaygroundBrowser({ tokenize: (texts, signal) => this.tokenizePlayground(texts, signal) });
          this.definition.append(this.playground.element);
          this.playground.focus();
        }
        correctionControls(surface, reading) {
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.textContent = "Correct reading";
          toggle.style.margin = "8px 0 0";
          const form = document.createElement("form");
          form.className = "correction-form";
          form.hidden = true;
          const wordLabel = document.createElement("label");
          wordLabel.textContent = "Word or name";
          const word = document.createElement("input");
          word.value = surface;
          word.maxLength = 80;
          word.required = true;
          word.autocomplete = "off";
          wordLabel.append(word);
          const readingLabel = document.createElement("label");
          readingLabel.textContent = "Reading";
          const kana2 = document.createElement("input");
          kana2.value = reading;
          kana2.maxLength = 80;
          kana2.required = true;
          kana2.autocomplete = "off";
          readingLabel.append(kana2);
          const actions = document.createElement("div");
          actions.className = "correction-actions";
          const save = document.createElement("button");
          save.type = "submit";
          save.className = "primary";
          save.textContent = "Save correction";
          const restore = document.createElement("button");
          restore.type = "button";
          restore.textContent = "Restore automatic reading";
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.textContent = "Cancel";
          const feedback = document.createElement("p");
          feedback.className = "feedback";
          feedback.setAttribute("role", "status");
          const report = (text, error = false) => {
            feedback.textContent = text;
            feedback.dataset.error = String(error);
          };
          const sync = () => {
            restore.hidden = !Object.hasOwn(this.overrides, word.value.trim().normalize("NFC"));
          };
          sync();
          word.oninput = sync;
          toggle.onclick = () => {
            form.hidden = !form.hidden;
            toggle.setAttribute("aria-expanded", String(!form.hidden));
            if (!form.hidden) kana2.focus();
          };
          toggle.setAttribute("aria-expanded", "false");
          cancel.onclick = () => {
            form.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.focus();
          };
          form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
              this.overrides = await saveCorrection(word.value, kana2.value);
              report("Saved. Readings update automatically.");
              sync();
            } catch (error) {
              report(error instanceof Error ? error.message : "Could not save. Try again.", true);
            } finally {
              save.disabled = false;
            }
          };
          restore.onclick = async () => {
            restore.disabled = true;
            try {
              this.overrides = await removeCorrection(word.value.trim().normalize("NFC"));
              report("Automatic reading restored.");
              sync();
            } catch {
              report("Could not restore the reading. Try again.", true);
            } finally {
              restore.disabled = false;
            }
          };
          actions.append(save, restore, cancel);
          form.append(wordLabel, readingLabel, actions, feedback);
          this.definition.append(toggle, form);
        }
        define(button) {
          this.dismissDefinition();
          const version = this.lookupVersion;
          this.selected = button;
          button.setAttribute("aria-pressed", "true");
          const word = button.dataset.word, surface = button.dataset.surface;
          this.definition.hidden = false;
          this.definition.scrollTop = 0;
          const header = document.createElement("header"), title = document.createElement("h3");
          title.lang = "ja";
          title.textContent = surface;
          const close = document.createElement("button");
          close.type = "button";
          close.textContent = "\xD7";
          close.setAttribute("aria-label", "Close word details");
          close.addEventListener("click", () => this.dismissDefinition(true));
          header.append(title, close);
          this.definition.append(header);
          const pronunciation = document.createElement("p");
          pronunciation.className = "pronunciation";
          pronunciation.lang = "ja";
          pronunciation.textContent = [button.dataset.reading, word !== surface ? `\u8F9E\u66F8\u5F62: ${word}` : ""].filter(Boolean).join(" \xB7 ");
          this.definition.append(pronunciation);
          const context = this.wordContexts.get(button);
          if (context) {
            const models = wordExplorations(context.text, context.words, context.index, surface, this.overrides);
            if (models.verb || models.mimetic || models.meaning) {
              const explore = document.createElement("button");
              explore.type = "button";
              explore.className = "explore-toggle";
              explore.textContent = models.verb && !models.mimetic && !models.meaning ? "Try verb forms" : "Open playgrounds";
              explore.setAttribute("aria-expanded", "false");
              const panel = renderExplorations(models, { tokenize: (texts, signal) => this.tokenizePlayground(texts, signal) });
              this.exploration = panel;
              explore.addEventListener("click", () => {
                panel.hidden = !panel.hidden;
                explore.setAttribute("aria-expanded", String(!panel.hidden));
                this.definition.classList.toggle("exploring", !panel.hidden);
                this.definition.scrollTop = 0;
              });
              this.definition.append(explore, panel);
            }
          }
          if (/[\p{Script=Han}々]/u.test(surface)) this.correctionControls(surface, button.dataset.reading ?? "");
          const body = document.createElement("div");
          body.className = "definition-body";
          this.definition.append(body);
          void this.lookupDefinitions(word, body, version);
        }
        async lookupDefinitions(word, body, version) {
          body.setAttribute("aria-busy", "true");
          const loading = document.createElement("p");
          loading.className = "feedback";
          loading.textContent = "Looking up English and Japanese definitions\u2026";
          body.replaceChildren(loading);
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
          const failed = result.en.page.status === "error" || result.ja.page.status === "error";
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
              message.textContent = page.status === "error" ? language === "en" ? "Could not load definitions. Check your connection and choose Retry definitions online." : "\u5B9A\u7FA9\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u3001\u30AA\u30F3\u30E9\u30A4\u30F3\u691C\u7D22\u3092\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : language === "en" ? "No English definition found for this Japanese word." : "\u3053\u306E\u5358\u8A9E\u306E\u65E5\u672C\u8A9E\u306E\u5B9A\u7FA9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
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
          if (failed) {
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "definition-retry";
            retry.textContent = "Retry definitions online";
            retry.addEventListener("click", () => void this.lookupDefinitions(word, body, version));
            body.append(retry);
          }
          const notice = document.createElement("p");
          notice.className = "source";
          notice.textContent = "Wiktionary \xB7 CC BY-SA \xB7 Only this word is sent for lookup.";
          body.append(notice);
        }
      };
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
          for (let y2 = Math.floor(box.top / 64); y2 <= Math.floor(box.bottom / 64); y2++)
            for (let x = Math.floor(box.left / 64); x <= Math.floor(box.right / 64); x++) yield `${x}:${y2}`;
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
        const init = () => window.dispatchEvent(new CustomEvent("ko-docs-init", { detail: chrome.runtime.id }));
        init();
        setTimeout(init, 0);
      }
      var host = document.createElement("ko-overlay");
      var shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `<style>:host{all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;overflow:hidden!important;contain:strict!important}span{position:absolute;white-space:nowrap;line-height:1;font-family:system-ui,sans-serif;color:var(--ko-color,#15232b);text-shadow:0 0 2px var(--ko-bg,white);pointer-events:none;user-select:none}@media print{:host{display:none!important}}</style><div aria-hidden="true"></div>`;
      var layer = shadow.querySelector("div");
      var mutationObserver;
      var watchedShadows = /* @__PURE__ */ new WeakSet();
      var observerOptions = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden", "open", "aria-label", "data-font-css", "width", "height", "transform"] };
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
      var toolbarAvailability = "unavailable";
      var contextInvalidated = false;
      function invalidateContext() {
        if (contextInvalidated) return;
        contextInvalidated = true;
        revision++;
        window.clearTimeout(timer);
        activeRequest = void 0;
        mutationObserver?.disconnect();
        pageObserver.disconnect();
        clear();
        host.remove();
        reader?.loading(false, "");
        message = "Extension updated or reloaded. Reload this page to restore readings.";
        statusState = "unavailable";
        toolbarAvailability = "unavailable";
      }
      function extensionAvailable() {
        if (contextInvalidated) return false;
        try {
          if (chrome.runtime.id) return true;
        } catch {
        }
        invalidateContext();
        return false;
      }
      async function sendToExtension(request) {
        if (!extensionAvailable()) throw new Error("Extension context invalidated.");
        try {
          return await chrome.runtime.sendMessage(request);
        } catch (error) {
          if (/extension context invalidated/i.test(String(error))) invalidateContext();
          throw error;
        }
      }
      function setToolbarAvailability(value) {
        if (!extensionAvailable()) return;
        if (toolbarAvailability === value) return;
        toolbarAvailability = value;
        if (window === window.top) void sendToExtension({ type: "toolbar-status-changed" }).catch(() => {
        });
      }
      var readingAppearance = appearance(void 0);
      var overrides = {};
      var legacyView;
      var rawView;
      var viewSettings = readingViewPreferences(void 0);
      var topFrame = window === window.top;
      var readingModeEnabled = () => topFrame && panelEnabled(viewSettings, hostname);
      var reader;
      function ensureReader() {
        if (reader || !readingModeEnabled()) return;
        reader = new ReadingPanel(() => {
          void updateReadingView({}, { hostname, enabled: false }).catch(() => reader?.unavailable("Could not close the reading view. Try again."));
        }, (width) => updateReadingView({ width }));
        reader.setOverrides(overrides);
        reader.appearance(viewSettings, readingAppearance);
      }
      var activeRequest;
      var pacer = new AdaptivePacer();
      var nextScanAt = 0;
      var activePage;
      var inputDocuments = /* @__PURE__ */ new WeakSet();
      function watchInput(target) {
        if (inputDocuments.has(target)) return;
        inputDocuments.add(target);
        target.addEventListener("compositionstart", (event) => {
          if (reader?.owns(event)) return;
          composing = true;
          schedule();
        }, true);
        target.addEventListener("compositionend", (event) => {
          if (reader?.owns(event)) return;
          composing = false;
          schedule();
        }, true);
        target.addEventListener("input", (event) => {
          if (!reader?.owns(event)) schedule(150, "edit");
        }, true);
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
        return extensionAvailable() && enabled && !excluded.includes(hostname) && !document.hidden && !composing;
      }
      function clear() {
        layer.replaceChildren();
      }
      function schedule(delay = 150, activity) {
        if (!extensionAvailable()) return;
        ensureReader();
        revision++;
        clear();
        window.clearTimeout(timer);
        if (activeRequest) {
          void sendToExtension({ type: "cancel-tokenize", requestId: activeRequest }).catch(() => {
          });
          activeRequest = void 0;
        }
        if (contextInvalidated) return;
        if (activity) delay = pacer.mark(activity);
        if (readingModeEnabled() && delay > 0) delay = Math.max(400, delay);
        statusState = allowed() ? "loading" : "paused";
        message = !enabled || excluded.includes(hostname) ? "Readings are paused for this page." : document.hidden ? "Paused while this tab is in the background." : composing ? "Waiting for text composition to finish." : activity === "scroll" ? "Waiting for scrolling to settle\u2026" : activity === "edit" ? "Waiting for editing to settle\u2026" : "Updating visible readings\u2026";
        reader?.loading(readingModeEnabled() && enabled && !excluded.includes(hostname) && !document.hidden, message, allowed());
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
          for (let y2 = 8; y2 < innerHeight; y2 += Math.max(32, Math.ceil(innerHeight / 64))) {
            const range = doc.caretRangeFromPoint?.(Math.max(1, parent.getBoundingClientRect().left + 2), y2);
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
          sourceOffset: offset,
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
      function* visibleTextSources(node) {
        const base = textSource(node);
        if (!base) return;
        const origin = base.sourceOffset ?? 0, range = document.createRange();
        const pending = [[0, base.text.length]], parts = [];
        while (pending.length) {
          const [start2, end] = pending.pop();
          range.setStart(node, origin + start2);
          range.setEnd(node, origin + end);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
          yield void 0;
          const shown = rects.filter(visible);
          if (!shown.length) continue;
          if (shown.length === rects.length || end - start2 <= 1) {
            parts.push({ start: start2, end, box: range.getBoundingClientRect() });
            continue;
          }
          let mid = start2 + Math.floor((end - start2) / 2);
          if (mid > start2 && /[\uDC00-\uDFFF]/.test(base.text[mid])) mid--;
          if (mid === start2) mid = Math.min(end, start2 + 2);
          if (mid === end) {
            parts.push({ start: start2, end, box: range.getBoundingClientRect() });
            continue;
          }
          pending.push([mid, end], [start2, mid]);
        }
        const merged = [];
        for (const part of parts) {
          const previous = merged.at(-1);
          if (previous?.end === part.start) previous.end = part.end;
          else merged.push({ ...part });
        }
        for (const part of merged) {
          const text = base.text.slice(part.start, part.end);
          if (!text.trim()) continue;
          yield { ...base, text, sourceOffset: origin + part.start, orderBox: part.box, rect: () => part.box };
        }
      }
      var measure = document.createElement("canvas").getContext("2d");
      function docsSource(element4) {
        const text = element4.getAttribute("aria-label") ?? "";
        if (!text || text.length > 2e3) return;
        const box = element4.getBoundingClientRect();
        if (!visible(box)) return;
        const font = element4.closest("[data-font-css]")?.getAttribute("data-font-css");
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
        const localHeight = element4 instanceof SVGRectElement ? element4.height.baseVal.value : box.height;
        const scaleY = localHeight > 0 ? box.height / localHeight : 1;
        const clip = editorClip;
        const svg = element4.closest("svg")?.getBoundingClientRect();
        if (clip && (box.bottom <= clip.top || box.top >= clip.bottom || box.right <= clip.left || box.left >= clip.right)) return;
        if (svg && (box.bottom <= svg.top || box.top >= svg.bottom)) return;
        return { text, orderBox: box, fontSize: size * scaleY, color: "#15232b", background: "white", rect(start2, end) {
          if (!element4.isConnected) return;
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
      function* sources(root, panelMode = false) {
        let node = root;
        while (node) {
          let descend = true;
          let source;
          if (node instanceof Element) {
            if (node === host || reader?.ownsNode(node) || node.matches('script,style,noscript,ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) descend = false;
            else if (node !== root) {
              const r = node.getBoundingClientRect();
              const style = getComputedStyle(node);
              if (style.display === "none" || style.visibility === "hidden" || r.width > 0 && r.height > 0 && !visible(r)) descend = false;
            }
            if (descend && !docs && node instanceof HTMLDetailsElement && !node.open) {
              descend = false;
              let summary = node.firstElementChild;
              while (summary && !(summary instanceof HTMLElement && summary.localName === "summary")) {
                yield void 0;
                summary = summary.nextElementSibling;
              }
              if (summary) yield* sources(summary, panelMode);
            }
            if (descend && docs && node.matches("svg rect[aria-label]")) {
              source = docsSource(node);
              descend = false;
            }
            if (descend && !docs && node.shadowRoot) {
              observeShadow(node.shadowRoot);
              yield* sources(node.shadowRoot, panelMode);
            }
          } else if (!docs && node instanceof Text && node.parentElement) {
            if (panelMode) yield* visibleTextSources(node);
            else source = textSource(node);
          }
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
      function* webSources(panelMode = false) {
        const seeds = /* @__PURE__ */ new Set(), seen = /* @__PURE__ */ new Map();
        let inspected = 0;
        const dx = Math.max(64, Math.ceil(innerWidth / 16)), dy = Math.max(16, Math.ceil(innerHeight / 100));
        for (let y2 = 4; y2 < innerHeight; y2 += dy) for (let x = 4; x < innerWidth; x += dx) {
          let element4 = panelMode ? document.elementsFromPoint(x, y2).find((element5) => element5 !== host && !reader?.ownsNode(element5)) ?? null : document.elementFromPoint(x, y2);
          while (element4?.shadowRoot) {
            observeShadow(element4.shadowRoot);
            const inner = element4.shadowRoot.elementFromPoint(x, y2);
            if (!inner || inner === element4) break;
            element4 = inner;
          }
          yield void 0;
          if (!element4 || element4 === host || seeds.has(element4) || seeds.size >= 512) continue;
          if (element4.closest('ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) continue;
          seeds.add(element4);
          let local = 0;
          for (const source of sources(element4, panelMode)) {
            if (++local > 128 || ++inspected > 4096) break;
            if (source?.identity) {
              let offsets = seen.get(source.identity);
              if (!offsets) {
                offsets = /* @__PURE__ */ new Set();
                seen.set(source.identity, offsets);
              }
              const offset = source.sourceOffset ?? 0;
              if (offsets.has(offset)) {
                yield void 0;
                continue;
              }
              offsets.add(offset);
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
        const readingMode = readingModeEnabled();
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
          if (readingMode && !docs) {
            prepared = [];
            let started = performance.now();
            const discovered = [];
            for (const source of webSources(true)) {
              if (performance.now() - started >= pacer.budget()) {
                await frame();
                started = performance.now();
                if (version !== revision || !allowed()) return;
              }
              if (!source) continue;
              discovered.push(source);
              if (discovered.length >= 2e3) {
                panelLimited = true;
                break;
              }
            }
            const paths = /* @__PURE__ */ new Map();
            const path = (node) => {
              let result = paths.get(node);
              if (result) return result;
              result = [];
              let current = node;
              while (current) {
                result.unshift(current);
                current = current instanceof ShadowRoot ? current.host : current.parentNode;
              }
              paths.set(node, result);
              return result;
            };
            discovered.sort((a, b) => {
              if (a.identity === b.identity) return (a.sourceOffset ?? 0) - (b.sourceOffset ?? 0);
              const first = path(a.identity), second = path(b.identity);
              let i = 0;
              while (i < first.length && i < second.length && first[i] === second[i]) i++;
              if (i === first.length) return -1;
              if (i === second.length) return 1;
              const order = first[i].compareDocumentPosition(second[i]);
              return order & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : order & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
            });
            let previousSource;
            for (const source of discovered) {
              if (panelCharacters + source.text.length > 16e3) {
                panelLimited = true;
                break;
              }
              panelCharacters += source.text.length;
              const previous = prepared.at(-1);
              if (previous && previous.block === source.block && previous.text.length + source.text.length < 2e3) {
                const contiguous2 = !previousSource || previousSource.identity !== source.identity || (previousSource.sourceOffset ?? 0) + previousSource.text.length === source.sourceOffset;
                let hardBreak = false, node = previousSource?.identity ?? null, steps = 0;
                if (node?.getRootNode() === source.identity?.getRootNode() && node !== source.identity) while (node && node !== source.identity && steps++ < 32) {
                  if (node.firstChild) node = node.firstChild;
                  else {
                    while (node && !node.nextSibling && node !== source.block) node = node.parentNode;
                    node = node === source.block ? null : node?.nextSibling ?? null;
                  }
                  if (node instanceof HTMLBRElement) hardBreak = true;
                }
                if (!contiguous2 || hardBreak) {
                  if (++panelCharacters > 16e3) {
                    panelLimited = true;
                    break;
                  }
                  previous.text += "\n";
                }
                previous.text += source.text;
              } else prepared.push({ ...source });
              previousSource = source;
            }
            for (const source of prepared) {
              const box = source.orderBox;
              const run = { text: source.text, top: box.top, left: box.left, right: box.right, readings: [] };
              readingRuns.push(run);
              runMap.set(source, run);
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
          if (readingMode && (!docs || prepared?.length)) {
            reader?.display(readingRuns, !docs ? "web" : activePage ? String([...pages].indexOf(activePage)) : "pageless", viewSettings, readingAppearance, (docs ? editorClip?.top : 12) ?? 100, panelLimited || attempted >= 500);
            message = `Reading view \u2014 ${count} readings in ${!docs ? "the visible webpage text" : activePage ? "the active page\u2019s visible text" : "the editor viewport"}.${unknown ? ` Unknown words: ${unknown}. Add a local correction in the menu.` : ""}${panelLimited || attempted >= 500 ? " View limit reached; scroll to reveal more." : ""}`;
          }
          async function process(batch) {
            if (!batch.length || version !== revision || !allowed()) return;
            const requestId = crypto.randomUUID();
            activeRequest = requestId;
            let response;
            try {
              response = await sendToExtension({ type: "tokenize", requestId, texts: batch.map((s) => s.text), overrides, includeWords: readingMode });
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
              let x = 0, y2 = 0, width = 0, box;
              while (fontSize >= minimum) {
                measure.font = `${fontSize}px system-ui`;
                const metrics = measure.measureText(part.reading);
                width = metrics.width;
                x = rect.left + (rect.width - width) / 2;
                if (docs) {
                  const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
                  const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
                  const baseline = (fontSize - ascent - descent) / 2 + ascent;
                  y2 = rect.top - 0.5 - baseline - metrics.actualBoundingBoxDescent;
                  box = new DOMRect(x, y2 + baseline - metrics.actualBoundingBoxAscent, width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
                } else {
                  y2 = rect.top - fontSize - 1;
                  box = new DOMRect(x, y2, width, fontSize);
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
              const probe = document.elementFromPoint(x + width / 2, y2 + fontSize / 2);
              if (!docs && probe) {
                const doc = document;
                const caret = doc.caretRangeFromPoint?.(x + width / 2, y2 + fontSize / 2);
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
              span.style.cssText = `left:${x}px;top:${y2}px;font-size:${fontSize}px;--ko-color:${readingAppearance.contrast === "high" ? "#101010" : source.color};--ko-bg:${readingAppearance.contrast === "high" ? "white" : source.background === "rgba(0, 0, 0, 0)" ? "white" : source.background}${readingAppearance.contrast === "high" ? ";text-shadow:0 0 2px white,1px 0 white,-1px 0 white,0 1px white,0 -1px white" : ""}`;
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
          if (version === revision && allowed()) setToolbarAvailability(statusState === "unavailable" ? "unavailable" : "ready");
          running = false;
          if (revision !== version && allowed()) {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void scan(), Math.max(0, nextScanAt - performance.now()));
          }
        }
      }
      chrome.runtime.onMessage.addListener((request, _sender, respond) => {
        if (request?.type === "status") respond({ message, state: statusState, toolbarAvailability });
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !["enabled", "excluded", "siteAppearance", "readingOverrides", "docsReadingView", "readingView"].some((key) => key in changes)) return;
        const wasReading = readingModeEnabled();
        if (changes.enabled) enabled = changes.enabled.newValue !== false;
        if (changes.excluded) excluded = Array.isArray(changes.excluded.newValue) ? changes.excluded.newValue : [];
        if (changes.siteAppearance) readingAppearance = appearanceForSite(changes.siteAppearance.newValue, hostname);
        if (changes.readingOverrides) {
          overrides = validOverrides(changes.readingOverrides.newValue);
          reader?.setOverrides(overrides);
        }
        if (changes.docsReadingView) legacyView = changes.docsReadingView.newValue;
        if (changes.readingView) rawView = changes.readingView.newValue;
        viewSettings = readingViewPreferences(rawView, legacyView);
        if (wasReading === readingModeEnabled() && !changes.enabled && !changes.excluded && !changes.readingOverrides && (readingModeEnabled() || !changes.siteAppearance)) {
          reader?.appearance(viewSettings, readingAppearance);
          return;
        }
        schedule(0);
      });
      async function start() {
        const state = await chrome.storage.local.get({ enabled: true, excluded: [], siteAppearance: {}, readingOverrides: {}, docsReadingView: {}, readingView: null });
        enabled = state.enabled !== false;
        excluded = Array.isArray(state.excluded) ? state.excluded : [];
        readingAppearance = appearanceForSite(state.siteAppearance, hostname);
        overrides = validOverrides(state.readingOverrides);
        legacyView = state.docsReadingView;
        rawView = state.readingView;
        viewSettings = readingViewPreferences(rawView, legacyView);
        reader?.setOverrides(overrides);
        reader?.appearance(viewSettings, readingAppearance);
        if (docs) {
          registerPages(document);
          watchDocsInputs(document);
        }
        watchInput(document);
        const observer = new MutationObserver((records) => {
          let relevant = false;
          for (const record of records) {
            if (record.target === host || host.contains(record.target) || reader?.ownsNode(record.target)) continue;
            const element4 = record.target instanceof Element ? record.target : record.target.parentElement;
            if (docs && element4?.closest(".kix-cursor,.kix-selection-overlay,.kix-selection-overlay-content")) continue;
            if (docs && record.type !== "childList" && element4?.closest(".kix-page") && element4.closest(".kix-page") !== activePage) continue;
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
        document.addEventListener("load", (event) => {
          if (!reader?.owns(event)) schedule();
        }, true);
        window.addEventListener("resize", () => schedule(100));
        window.visualViewport?.addEventListener("resize", () => schedule(100));
        document.addEventListener("visibilitychange", () => schedule(0));
        document.fonts.addEventListener("loadingdone", () => schedule());
        if (!allowed()) message = "Disabled for this page.";
        setToolbarAvailability("ready");
        schedule(0);
      }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
      else void start();
    }
  });
  require_content();
})();
//# sourceMappingURL=content.js.map
