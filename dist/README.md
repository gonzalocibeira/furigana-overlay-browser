<p align="center">
  <img src="icons/logo.svg" alt="字 with じ furigana" width="88">
</p>

<h1 align="center">Furigana Overlay Browser</h1>
<p align="center"><strong>A little help above the kanji.</strong></p>
<p align="center">Automatic Japanese readings for webpages and Google Docs.<br>Processed on your device, with the dictionary included.</p>
<p align="center">
  <a href="#install-in-chrome">Install in Chrome</a> ·
  <a href="#see-it-in-action">See it in action</a> ·
  <a href="#make-it-yours">Make it yours</a> ·
  <a href="#help-and-compatibility">Get help</a>
</p>

![Furigana above Japanese text on Wikipedia, with the extension menu showing automatic readings enabled](docs/screenshots/webpage-live.png)

<p align="center"><em>Read Japanese where you already browse. Readings appear automatically above the kanji.</em></p>

| Read as you browse | Keep your work intact | Stay in control |
| --- | --- | --- |
| Furigana appears automatically on visible Japanese text. | Original webpage text and Google Docs formatting stay unchanged. | Pause a site, adjust the appearance, or save your own readings. |
| **Offline processing** with a bundled dictionary. | **Google Docs support** with an optional extra-space reading panel. | **No account or API key** needed. Settings and corrections stay on this device. |

## Install in Chrome

**Download → Extract → Load `dist` → Start reading.** No Node.js, npm, or build step needed.

The ready-to-load **Furigana Overlay Browser** extension is included in [`dist/`](). It is distributed through GitHub, not the Chrome Web Store.

1. **Download this repository.** Click **Code → Download ZIP** at the top of the GitHub page. For a private repository, sign in with an account that has access.
2. **Extract and keep the folder.** Put it somewhere permanent, such as `Documents/Furigana`.
3. **Open Chrome's extensions page.** Enter `chrome://extensions` in the address bar and turn on **Developer mode**.
4. **Load the extension.** Click **Load unpacked** and select the **extension folder** inside the extracted repository. It contains `manifest.json`.
5. **Reload your tabs and read.** Furigana starts automatically. The first page may take a moment while the local dictionary loads.

**Tip:** Pin **Furigana Overlay Browser** from Chrome's puzzle-piece **Extensions** menu. Look for **字** with **じ** above it.

<details>
<summary><strong>Which folder should I select?</strong></summary>

```text
furigana-overlay-browser-<branch>/
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

### On the web

The Wikipedia example above shows furigana added directly above Japanese text. Open the extension menu to pause a site, customize readings, or check the page status.

### In Google Docs

Readings appear over the visible document text while you keep working in the original editor.

![A live Google Doc with furigana above Japanese sentences and the extension menu open](docs/screenshots/google-docs-live.png)

### More room to read

Open the optional **Extra-space reading view** for a separate, selectable panel with roomier spacing. Your document keeps its original layout.

![Google Docs beside the extension's reading panel, showing larger Japanese text and furigana with extra line spacing](docs/screenshots/google-docs-reading-view-live.png)

1. Open a Google Doc and click the extension icon.
2. Expand **Google Docs reading view** and enable **Extra-space reading view**.
3. Choose **Comfortable**, **Roomy**, or **Spacious** line spacing.

The panel follows the active page after scrolling or editing settles, keeping the current text visible while an update waits. Unchanged document redraws preserve your selection, reading position, and open definition. Continue editing in Docs; click **Close** on the panel to return to overlay readings. The setting is saved across your Google Docs documents.

**Click a word for its meaning.** The panel shows English and Japanese definitions, the reading, and the dictionary form for inflected words. Words can also be focused with Tab and opened with Enter or Space; press Escape to dismiss the definition. Definitions come from the English and Japanese editions of Wiktionary and require an internet connection. Only the clicked word's dictionary form is sent for lookup. Each language shows its own unavailable or missing-entry message when necessary; source links let you open the full entry.

These screenshots show real use on Japanese Wikipedia and in Google Docs. **Google Docs support is experimental**; compatibility can vary as Google's editor changes. The reading panel is text-only: tables and formatting may be simplified, and images are omitted.

## Make it yours

| In the extension menu | What you can do |
| --- | --- |
| **Automatic readings** | Turn readings on or pause them everywhere. |
| **Pause on this site** | Pause the current hostname while keeping other sites active. |
| **Reading appearance** | Choose Small, Default, Large, or Extra large readings, with page colors or high contrast. Preferences are saved per hostname. |
| **Local reading corrections** | Save, edit, or remove preferred readings for names and words. Enter hiragana or katakana; readings display in hiragana. Up to 200 corrections apply across sites. |
| **On this page** | Check reading status, including tight spacing or unavailable Docs text. |

Readings shrink or are omitted when space is tight to preserve the original line spacing. Try a smaller reading size or the extra-space Docs panel when you need more room.

## Private by design

**Furigana is processed on your device.** Readings use bundled Kuromoji/IPADIC dictionaries. Optional word definitions in the Google Docs reading panel contact Wiktionary only when you click a word, sending its dictionary form. No full document or surrounding sentence is sent. There are no analytics or accounts. Only your settings and saved corrections are persisted.

<details>
<summary><strong>Permissions and local storage explained</strong></summary>

Japanese readings are processed locally with bundled Kuromoji/IPADIC dictionaries in an extension worker. No runtime dictionary download is needed for readings. Clicking a word in the Docs panel requests definitions from `en.wiktionary.org` and `ja.wiktionary.org`, without credentials or a referrer. Definitions are cached in memory for up to 100 words per panel and are not saved to local storage. Wiktionary receives the requested word and the normal connection information, including your IP address.

- The extension needs access to HTTP/HTTPS pages to add readings automatically without a per-page click. You can narrow access using Chrome's extension site-access controls; it will only run on permitted sites.
- It requests local storage for preferences and user-entered corrections, plus an offscreen document for the tokenizer worker.
- Extracted text and dictionary caches stay in memory. Only settings and the corrections you enter are persisted in `chrome.storage.local`.
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
| Some words have no readings | The dictionary may not know the word, or there may be insufficient space. Add a local correction, reduce the reading size, or try the Docs reading view. |
| A name is read incorrectly | Add its preferred reading under **Local reading corrections**. |
| Google Docs text is unavailable | Reload the document. If the status persists, that editor version may not expose compatible text geometry. |
| No readings in a PDF, image, browser settings page, or another canvas app | These surfaces are unsupported. Google Docs has a dedicated experimental adapter. |
| Cannot find **Load unpacked** | Enable Developer mode. If the control is unavailable, check whether your browser is managed. |

Webpage text inside editable controls or existing ruby is skipped. Vertical writing, rotated text, closed shadow roots, and words fragmented across lines are unsupported. Very dense or complex viewports can exceed discovery limits.

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

I couldn't find a good option for adding furigana in Google Docs. I wanted readings to appear automatically, work offline, and leave the original document unchanged. That grew into this extension: a little help while browsing, with extra room to read when you need it.

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

`npm run build` regenerates the included `dist/` folder. Development dependency installation requires internet access; the installed extension works without an external processing service.

The test suite has **22 tests**, including automatic annotations, unchanged source/layout, a 100,000-node webpage, a 100-page Docs fixture, cancellation, IME handling, settings, corrections, the reading panel, debounced refreshes, and bilingual word definitions. Browser integration tests use a temporary profile and localhost server. They default to Brave's standard macOS executable; set `CHROMIUM_PATH` to an extension-capable Chromium executable elsewhere. Chrome distributions that disable command-line extension loading cannot run these integration tests. Your normal browser profile and Google account are not used.

The README uses real-use screenshots supplied by the project owner. Earlier fixture captures are also preserved in [`docs/screenshots/`](docs/screenshots/). Regenerated browser captures are written to `test-results/` during tests.

</details>

<details>
<summary><strong>Performance and architecture</strong></summary>

Work is bounded to visible content. Processing pauses in background tabs, waits for scrolling/editing to settle, and cancels stale queued work. Docs measurements are cached within each scan; collision checks inspect nearby glyphs. Dictionary caches and analysis batches have fixed limits. The reading panel is capped at 16,000 characters / 2,000 runs and 500 reading candidates.

See [technical notes](docs/technical-notes.md) for the architecture, exact budgets, and compatibility details.

</details>

## License

Project code is licensed under the [MIT License](LICENSE). You can use, modify, and redistribute it under those terms.

### Third-party notices

Bundled dependency licenses are included in [`dist/licenses/`](licenses/), including Kuromoji (Apache 2.0), IPADIC's notice, async, doublearray, zlibjs, and lodash. These dependencies retain their own licenses; the project MIT license does not replace them.
