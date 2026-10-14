<p align="center">
  <img src="public/icons/logo.svg" alt="Kō · 考 — think" width="88">
</p>

<h1 align="center">Kō — Japanese Reading Companion</h1>
<p align="center"><strong>Japanese reading companion.</strong></p>
<p align="center">Automatic Japanese readings for webpages and Google Docs.<br>Furigana runs on your device. Optional word definitions use Wiktionary online.</p>
<p align="center">Version <strong>0.5.0</strong> · 14 October 2026</p>
<p align="center">
  <a href="#install-in-chrome">Install in Chrome</a> ·
  <a href="#see-it-in-action">See it in action</a> ·
  <a href="#make-it-yours">Make it yours</a> ·
  <a href="#help-and-compatibility">Get help</a> ·
  <a href="#release-notes">Release notes</a>
</p>

![Furigana above Japanese text on Wikipedia, with the extension menu showing automatic readings enabled](docs/screenshots/webpage-live.png)

<p align="center"><em>Read Japanese where you already browse. Readings appear automatically above the kanji.</em></p>

| Read as you browse | Keep your work intact | Stay in control |
| --- | --- | --- |
| Furigana appears automatically on visible Japanese text. | Original webpage text and Google Docs formatting stay unchanged. | Pause a site, adjust the appearance, or save your own readings. |
| **Offline furigana** uses bundled reading dictionaries. | **Reading panel for webpages and Google Docs** adds extra spacing and optional online word definitions. | **No extension account or API key** needed. Settings and corrections are saved on this device. |

## Release notes

### Current working build

- **Kō — Japanese Reading Companion.** The new name and vermilion 考 seal share the same identity. The interface uses warm paper, ink, indigo, and vermilion inspired by ukiyo-e prints.

- **Brutalist interface.** Square controls, bold headings, ink borders, and an ukiyo-e-inspired palette across the popup, reading panel, definitions, and corrections.
- **Per-tab 考 icon.** See whether readings are active, paused, or unavailable without opening the menu. Hover over the icon for details.

### 0.5.0 · 14 October 2026

- **Reading view on webpages and Google Docs.** Enable the panel per website. It follows visible text after scrolling settles, including wrapped webpage paragraphs and kana-only words.
- **Choose your reading size and panel width.** Select 16–32 px text in the popup, or drag the panel’s left edge to resize. Text size, spacing, and width are remembered across sites.
- **Correct readings where you read.** Open a word’s detail card, choose **Correct reading**, and save its preferred pronunciation—even when online definitions fail. Restore the automatic reading from the same form.
- **Find and back up corrections.** Search by word or reading, export a JSON backup, and import it on another installation. Imports keep existing readings when words match and validate the entire backup before saving.

Read the [full release notes](docs/release-notes.md) for details and update instructions. After updating, reload the extension and your open tabs.

## Install in Chrome

**Download → Extract → Load `dist` → Start reading.** No Node.js, npm, or build step needed.

The ready-to-load **Kō — Japanese Reading Companion** extension is included in [`dist/`](dist/). It is distributed through GitHub, not the Chrome Web Store.

1. **Download [this repository](https://github.com/gonzalocibeira/ko-japanese-reading-companion).** Click **Code → Download ZIP** at the top of the GitHub page. For a private repository, sign in with an account that has access.
2. **Extract and keep the folder.** Put it somewhere permanent, such as `Documents/Ko`.
3. **Open Chrome's extensions page.** Enter `chrome://extensions` in the address bar and turn on **Developer mode**.
4. **Load the extension.** Click **Load unpacked** and select the **`dist` folder** inside the extracted repository. It contains `manifest.json`.
5. **Reload your tabs and read.** Furigana starts automatically. The first page may take a moment while the bundled reading dictionary loads.

**Tip:** Pin **Kō — Japanese Reading Companion** from Chrome's puzzle-piece **Extensions** menu. Look for the warm-paper **考** (think) on a vermilion seal.

<details>
<summary><strong>Which folder should I select?</strong></summary>

```text
ko-japanese-reading-companion-<branch>/
├── README.md
├── src/
└── dist/                  ← Select this folder in “Load unpacked”
    ├── manifest.json
    ├── content.js
    ├── background.js
    ├── dict/
    └── icons/
```

Select the extracted folder containing `manifest.json`, not the ZIP or repository root. Keep that folder in place and leave Developer mode enabled. Managed work or school browsers may restrict unpacked extensions.

See [Chrome's official instructions for loading unpacked extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

</details>

## See it in action

### New interface and toolbar status

The popup and reading panel use square controls, ink borders, warm paper surfaces, indigo, and vermilion accents. All reading settings, corrections, and backups remain available in the expandable sections.

![The redesigned brutalist extension popup with indigo active status and square controls](docs/screenshots/popup.png)

| Toolbar icon | Meaning |
| --- | --- |
| **Vermilion 考** | Readings are enabled and available on this tab, even with no visible kanji. |
| **Sand-colored 考 with pause bars** | Readings are paused globally or for this hostname. |
| **Outlined 考 with a slash** | The page is unavailable, processing failed, or the tab needs a reload. Hover over the icon for the reason. |

Scrolling, typing, and background-tab suspension do not change an otherwise active icon. Click any icon state to open the menu.

![The redesigned reading panel beside a Google Docs browser fixture](docs/screenshots/docs-reading-view.png)

These new screenshots use browser fixtures. The live captures below show the earlier interface and are retained to illustrate real webpage and Google Docs use.

### On the web

The Wikipedia example above shows furigana added directly above Japanese text. Open the extension menu to pause a site, customize readings, or check the page status.

### In Google Docs

Readings appear over the visible document text while you keep working in the original editor.

![A live Google Doc with furigana above Japanese sentences and the extension menu open](docs/screenshots/google-docs-live.png)

### More room to read

Open the optional **Extra-space reading view** for a separate, selectable panel with roomier spacing. Your document keeps its original layout.

![Google Docs beside the extension's reading panel, showing larger Japanese text and furigana with extra line spacing](docs/screenshots/google-docs-reading-view-live.png)

1. Open a webpage or Google Doc and click the extension icon.
2. Expand **Reading view** and enable **Extra-space reading view**.
3. Choose **Comfortable**, **Roomy**, or **Spacious** line spacing and your preferred **Text size**.
4. Drag the panel’s left edge to resize it, or focus the edge with Tab and use the arrow keys.

The panel follows visible webpage text, or the active Docs page, after scrolling or editing settles, keeping the current text visible while an update waits. Unchanged document redraws preserve your selection, reading position, and open definition. Continue editing in Docs; click **Close** on the panel to return to overlay readings. Panel activation is saved per hostname. Text size, spacing, and width apply across sites. Existing Google Docs panel preferences are preserved when upgrading.

### Look up a word

Click a word in the reading panel to see its reading and definitions in English and Japanese. For inflected words, the card also shows the dictionary form used for lookup.

![Google Docs beside the reading panel, with 海賊 selected and its reading かいぞく, English and Japanese definitions, and Wiktionary source links visible](docs/screenshots/google-docs-dictionary-live.png)

Here, selecting **海賊** opens its reading **かいぞく** and the meaning **pirate**, with definitions in both languages below the reading text. The original Google Doc stays visible beside the panel. Follow either Wiktionary source link to read the full entry.

Definitions come from the English and Japanese editions of Wiktionary and require an internet connection. Only the selected word's dictionary form is sent for lookup; furigana readings run on your device. Each language shows its own unavailable or missing-entry message when necessary.

You can also focus a word with Tab and open it with Enter or Space. Press Escape or the definition card's **×** button to dismiss it and return to reading.

These screenshots show real use on Japanese Wikipedia and in Google Docs. **Google Docs support is experimental**; compatibility can vary as Google's editor changes. The reading panel is text-only: tables and formatting may be simplified, and images are omitted.

## Make it yours

| In the extension menu | What you can do |
| --- | --- |
| **Automatic readings** | Turn readings on or pause them everywhere. |
| **Pause on this site** | Pause the current hostname while keeping other sites active. |
| **Reading appearance** | Choose Small, Default, Large, or Extra large readings, with page colors or high contrast. Preferences are saved per hostname. |
| **Reading view** | Open a panel for this website, choose line spacing and text size, and drag its left edge to resize. |
| **Local reading corrections** | Save, search, edit, remove, export, or import preferred readings. Up to 200 corrections apply across sites. |
| **On this page** | Check reading status, including tight spacing or unavailable Docs text. |

To correct a reading directly, click a kanji word in the panel and choose **Correct reading**. The word and current reading are filled in; both can be edited. A saved correction offers **Restore automatic reading**. Corrections work offline even if word definitions cannot load.

Under **Local reading corrections**, search by word or hiragana/katakana reading. **Export backup** downloads only your corrections as JSON; **Import backup** merges a version 1 backup, keeping existing readings on conflicts. Invalid backups or imports exceeding 200 corrections make no changes.

For isolated vocabulary and translation lines such as `出口 = salida`, readings prefer a matching common-noun dictionary entry when the tokenizer selects a proper name. Saved corrections take priority; add one when you intend a standalone surname or another preferred reading.

Readings shrink or are omitted when space is tight to preserve the original line spacing. Try a smaller reading size or the extra-space reading panel when you need more room.

## Privacy and online lookups

**Furigana readings run on your device.** The extension uses bundled Kuromoji/IPADIC reading dictionaries and sends no text to an external service to generate furigana.

**Word definitions use Wiktionary online.** Opening a definition in the reading panel sends that word's dictionary form to the English and Japanese Wiktionary services. Wiktionary receives the lookup word and normal connection information, including your IP address. The extension does not send the surrounding sentence or full document. Lookups require an internet connection; cached definitions stay in extension memory.

The extension has no analytics or account requirement. It saves only your settings and reading corrections to local storage.

<details>
<summary><strong>Permissions and local storage explained</strong></summary>

Japanese readings are processed locally with bundled Kuromoji/IPADIC dictionaries in an extension worker. No runtime dictionary download is needed for readings. Clicking a word in the panel requests definitions from `en.wiktionary.org` and `ja.wiktionary.org`, without credentials or a referrer. Definitions are cached in memory for up to 100 words per panel and are not saved to local storage. Wiktionary receives the requested word and the normal connection information, including your IP address.

- The extension needs access to HTTP/HTTPS pages to add readings automatically without a per-page click. You can narrow access using Chrome's extension site-access controls; it will only run on permitted sites.
- It requests local storage for preferences and user-entered corrections, plus an offscreen document for the tokenizer worker.
- Extracted text, reading caches, and definition caches stay in extension memory. Only settings and the corrections you enter are persisted in `chrome.storage.local`.
- It does not request access to your Google account or the Google Docs API.
- The website or Google Docs itself continues using its normal network connection.

Original text nodes, editor values, and document formatting remain unchanged. Overlays ignore mouse input and are hidden during printing. The separate reading panel allows text selection and is also hidden in print.

</details>

## Help and compatibility

<details>
<summary><strong>Missing readings, incorrect names, or installation trouble?</strong></summary>

| Symptom | What to check |
| --- | --- |
| “Manifest file is missing or unreadable” | Extract the ZIP first, then select the `dist` folder containing `manifest.json`. |
| No furigana after installation or an update | Reload the extension and the webpage. Check the main switch, site pause, Chrome site access, and popup status. |
| Some words have no readings | The dictionary may not know the word, or there may be insufficient space. Add a local correction, reduce the reading size, or try the reading view. |
| A name is read incorrectly | Add its preferred reading under **Local reading corrections**. |
| Google Docs text is unavailable | Reload the document. If the status persists, that editor version may not expose compatible text geometry. |
| No readings in a PDF, image, browser settings page, or another canvas app | These surfaces are unsupported. Google Docs has a dedicated experimental adapter. |
| Cannot find **Load unpacked** | Enable Developer mode. If the control is unavailable, check whether your browser is managed. |

Webpage text inside editable controls or existing ruby is skipped. Vertical writing, rotated text, and closed shadow roots are unsupported. Overlay readings skip words fragmented across lines; the reading panel can reflow wrapped webpage text. The panel reads the top-level page, without combining embedded-frame text. Very dense or complex viewports can exceed discovery limits.

</details>

<details>
<summary><strong>How Google Docs support works</strong></summary>

The overlay processes only the active page's visible text, or the editor viewport in pageless documents. It does not analyze every page in a long document. The reading panel replaces overlays while active and does not change document formatting or line spacing.

Docs support depends on undocumented annotated SVG text geometry supplied by Google's canvas editor. Google can change or omit that surface. The reading panel and overlays use the same extraction method, so the panel cannot recover text when that geometry is unavailable.

Browser tests cover paged and pageless fixtures, editing, IME input, and page switching; they do not guarantee compatibility with every live Google Doc.

</details>

<details>
<summary><strong>Update or uninstall</strong></summary>

There are no automatic Web Store updates.

**To update:** Download and extract the latest repository ZIP, replace the contents of your existing extension folder, then click the extension's **Reload** icon on `chrome://extensions`. Reload open webpages and Google Docs tabs too. Keeping the same folder and reloading the existing installation helps retain preferences and corrections.

**To uninstall:** Click **Remove** on the extension's card in `chrome://extensions`. You can then delete its local folder.

</details>

## Why I built this

I couldn't find a good option for adding furigana in Google Docs. I wanted readings to appear automatically, work offline, and leave the original document unchanged. That grew into this extension: a little help while browsing, with extra room to read when you need it. The reading panel works on webpages and also offers optional online word definitions from Wiktionary.

## For developers

<details>
<summary><strong>Build and test</strong></summary>

Run these commands from the repository root if you want to develop the extension:

```sh
npm ci
npm run build
npm run typecheck
npm test
```

`npm run build` regenerates the included `dist/` folder. Development dependency installation requires internet access. Furigana readings require no external service; optional word definitions contact Wiktionary and require an internet connection.

The test suite has **42 tests**, including automatic annotations, unchanged source/layout, a 100,000-node webpage, a 100-page Docs fixture, cancellation, IME handling, settings, corrections, vocabulary/name disambiguation, the reading panel, debounced refreshes, bilingual word definitions, toolbar state and lifecycle, and expanded popup forms. Browser integration tests use a temporary profile and localhost server. They default to Brave's standard macOS executable; set `CHROMIUM_PATH` to an extension-capable Chromium executable elsewhere. Chrome distributions that disable command-line extension loading cannot run these integration tests. Your normal browser profile and Google account are not used.

The README uses real-use screenshots supplied by the project owner. Earlier fixture captures are also preserved in [`docs/screenshots/`](docs/screenshots/). Regenerated browser captures are written to `test-results/` during tests.

</details>

<details>
<summary><strong>Performance and architecture</strong></summary>

Furigana work is bounded to visible content. Reading analysis pauses in background tabs, waits for scrolling/editing to settle, and cancels stale queued work. Docs measurements are cached within each scan; collision checks inspect nearby glyphs. Reading caches and analysis batches have fixed limits. The reading panel is capped at 16,000 characters / 2,000 runs and 500 reading candidates. Online definition requests happen only when you open a word's definition, with up to 100 lookup results cached in panel memory.

See [technical notes](docs/technical-notes.md) for the architecture, exact budgets, and compatibility details.

</details>

## License

Project code is licensed under the [MIT License](LICENSE). You can use, modify, and redistribute it under those terms.

### Third-party notices

Bundled dependency licenses are included in [`dist/licenses/`](dist/licenses/), including Kuromoji (Apache 2.0), IPADIC's notice, async, doublearray, zlibjs, and lodash. These dependencies retain their own licenses; the project MIT license does not replace them.
