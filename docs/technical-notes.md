# Technical notes

For installation and screenshots, see the [project README](../README.md).

## Reading customization

Open **Reading appearance** in the popup to choose Small, Default, Large, or Extra large readings and page colors or high contrast. These choices are saved per hostname. Readings still shrink or disappear where necessary to preserve the original layout.

Open **Local reading corrections** to save, edit, or remove a word and its reading. Hiragana and katakana input are accepted; readings display in hiragana. Corrections apply automatically across sites and persist on this device. Longest matches take priority, including names spanning several dictionary tokens. Up to 200 corrections are supported; words and readings are limited to 80 characters each. Corrected phrases are separated before dictionary analysis so neighboring words retain their own readings.

The status distinguishes tight spacing, unknown dictionary words, unavailable Docs geometry, no visible kanji, waiting during editing/scrolling, and the view limit. It describes the bounded text discovered in the current view, not every word in the full document.

## Extra-space Google Docs reading view

On a Google Doc, open **Google Docs reading view** in the popup and enable **Extra-space reading view**. Choose Comfortable, Roomy, or Spacious line spacing. The preference is saved for Google Docs and starts automatically while the extension is enabled. Use **Close** on the panel or turn off the option to return to overlays. Global pause and the site exclusion also hide the panel.

This is a separate, selectable text-only reading panel with native ruby. It replaces the extension's in-document overlays while active, and does not resize, restyle, or edit the original editor. Continue editing in Docs; the panel updates after scrolling and editing settle. Only the active page's visible text is extracted (the editor viewport in pageless documents), up to 16,000 characters / 2,000 runs and 500 reading candidates. Panel scrolling is independent. Inactive pages are never tokenized. Text without kanji remains visible. Existing appearance preferences and local corrections also apply.

The panel simplifies formatting and tables, omits images, and depends on the same annotated Docs text geometry as overlays. It cannot recover unavailable geometry. It clears stale text during updates, is hidden during printing, and is removed when disabled. The reading view preference and spacing are stored locally; extracted document text stays in memory.

Panel words are click targets using Kuromoji token boundaries and base forms, including kana-only words. Corrections spanning multiple tokens keep their ruby and click target together. Click or use Tab and Enter/Space to open a definition card; Escape or its close button dismisses it. The card shows English and Japanese definitions separately, with source links and Wiktionary attribution. Missing entries and network errors are reported per language; clicking again retries errors. Updates and closing invalidate pending UI results.

Only an explicit word click sends a `define-word` message. The service worker accepts these messages only from Google Docs content scripts and requests the English and Japanese Wiktionary Action APIs with that dictionary form, omitted credentials, no referrer, and an eight-second timeout. Concurrent requests are deduplicated and capped at eight words; each response is capped at 1 MB. Parsing uses an inert template, selects only the Japanese language section and definition lists, removes examples/references, and renders at most four definitions of 600 characters per language using text nodes. Remote HTML is never attached to the panel. Up to 100 successful/missing lookup results are cached only in panel memory; errors are retried. The surrounding sentence and document are never sent to the dictionary service. Furigana remains offline.

## Google Docs compatibility

**The Docs adapter is experimental. Live inspection identified padded text rectangles and overlapping tiles in a signed-in pageless editor. Version 0.1.1 corrects these cases and passes browser regression fixtures; the revised build still needs verification in the live editor.**

Docs renders text on canvas, so ordinary webpage text extraction does not work there. The adapter sets `_docs_annotate_canvas_by_ext` to its own extension ID at document start and reads annotated SVG rectangles, their `aria-label` text, and `data-font-css` font metadata. These are undocumented Google internals and can change or be unavailable. If text geometry is unavailable, the toolbar status says so; the extension never substitutes guessed text or remotely processes a document. It does not impersonate another extension.

Only **one active page** is annotated: the page with the largest visible area in the browser viewport, retaining the current page on ties. IntersectionObserver tracks page visibility; inactive page text never goes to the tokenizer. In pageless documents, only visible text in the editor region is processed. Glyph ink measurements, rather than padded line boxes, determine free space for readings. Duplicate tile runs are suppressed and readings are clipped to the editor region. Scrolling clears old annotations immediately and rebuilds them once scrolling stops. The adapter watches the hidden same-origin Docs input iframe for IME composition and input events.

To verify live compatibility, load the extension, reload a Japanese Google Doc, and check the popup status. Exercise editing/viewing, IME input, undo/redo, tables, browser zoom, Docs zoom, and paged/pageless layouts. Confirm readings stay on the visible active page, selection/copying work normally, and no text or formatting edits appear in document history. A compatible annotated SVG surface and font metadata are required.

## Performance and behavior

- Webpage discovery uses viewport hit-testing, with at most 512 seed elements, 128 traversal steps per seed, and 4,096 total traversal steps per pass. It does not walk every offscreen sibling in a huge flat document.
- Docs discovers page containers once and incrementally observes new containers. It measures only visible page candidates and extracts only the active page's visible text.
- Maximum 2,000 characters per tokenizer batch and one in-flight tokenizer batch per tab (with at most 32 queued frame requests); maximum 500 annotation candidates per frame. Cross-origin frames have independent controllers. Dictionary caches are shared per tab and capped at 2,000 entries / 200,000 retained characters (including readings).
- Docs geometry is measured once per scan; repeated prefix widths and glyph measurements are cached within that scan. A screen-cell collision index checks nearby glyphs instead of comparing every annotation against all visible text.
- Geometry/discovery cooperatively yields at a 4 ms target, reduced to 2 ms during activity bursts; individual browser layout operations may exceed that budget. Initial layout of an enormous page is still the browser's responsibility.
- Content changes wait for at least 150 ms of quiet and scrolling for at least 100 ms. Rapid activity extends these waits up to 500 ms for edits / 450 ms for scrolling, then returns to normal. New activity cancels pending work for the originating document; canceled queued jobs never reach the worker. In-progress batches stop between dictionary calls; a single synchronous call (at most 2,000 characters) and initial dictionary loading cannot be interrupted. Stale results are discarded; background tabs stop scheduling work. No polling loop runs while idle.
- Original text nodes, line spacing, editor values, and document formatting are never changed. Added overlay elements live outside the editor. They ignore mouse input, are excluded from selection and the accessibility tree, and are hidden in print output.
- Readings are hiragana. Kana endings are aligned where unambiguous; ambiguous alignment uses a whole-word reading. Unknown readings are omitted. Names and ambiguous words may be read incorrectly.
- Furigana shrinks to fit available width and spacing, down to 6 px in Docs and 7 px on webpages, then is omitted if too small or colliding. Tight line spacing can prevent annotations from appearing. No reflow is introduced.
- Bounded discovery can omit text in exceptionally dense/complex viewports. Word fragments spanning multiple lines are skipped. Vertical writing, rotated text, images, PDFs, arbitrary canvas apps, browser-protected pages, and closed shadow roots are unsupported. Webpage editable controls and existing ruby are skipped.

Enabled/excluded-site preferences, per-hostname appearance, Google Docs reading-view settings, and user-entered reading corrections are persisted in `chrome.storage.local`. Automatically extracted source text, reading caches, and clicked-word definition caches stay in memory. The extension-page CSP allows packaged resources and the two Wiktionary origins used for explicit definition lookups. Google Docs itself still uses its normal network connection.

## Develop and test

```sh
npm ci
npm run build
npm run typecheck
npm test
```

Build output is `dist/`, including the approximately 20 MB bundled dictionaries/bundles and third-party notices. No CDN assets are needed at runtime. Dependency downloads occur only during development installation.

Integration tests run the actual extension in a temporary Chromium profile and use a localhost fixture server. By default they use Brave at its standard macOS path; set `CHROMIUM_PATH` to an extension-capable Chromium executable on other machines. Chrome distributions that disable command-line extension loading cannot run these tests. Tests do not use or modify your normal browser profile or Google account.

Coverage includes automatic readings, mixed inline markup, unchanged source/layout, dynamic updates, toggles/exclusions, print hiding, IME suspension, a 100,000-node webpage, a 100-page synthetic Docs document, dense pageless Docs lines, duplicate tile suppression, editor clipping, reading alignment, cache eviction, cancellation isolation, adaptive pacing, correction validation, automatic corrections, per-site appearance, diagnostic states, and the optional Docs reading panel (spacing, editing updates, active-page switching, source preservation, and closing). Bilingual definition fixtures cover explicit requests, base forms, kana-only words, language filtering, unsafe markup, keyboard access, cache reuse, per-language errors, missing entries, retries, and stale lookups. Live Google Docs validation remains separate.

Project code is licensed under the [MIT License](../LICENSE). Third-party licenses are included in `dist/licenses/`: Kuromoji (Apache 2.0), IPADIC (its own notice), async, doublearray, zlibjs, and lodash. The URL-safe dictionary path adapter is local project code; upstream dependency sources are not modified.
