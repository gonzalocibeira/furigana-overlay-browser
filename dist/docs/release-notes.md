# Release notes

## 0.5.0 · 14 October 2026

- The reading panel now works on supported HTTP/HTTPS webpages as well as Google Docs, following visible text with bounded discovery and the existing quiet-period debounce. Activation is remembered per hostname. Existing Docs preferences migrate without enabling other websites.
- Choose 16–32 px panel text, or resize the panel from its left edge using a pointer or keyboard. Font size, spacing, and width are saved across sites. Appearance updates preserve panel content, selection, and definitions without retokenizing.
- Correct a kanji word directly in its detail card, including while definitions are unavailable. Restore automatic readings from the same form. Saved readings are reflected in pronunciation metadata, including multi-token corrections.
- Search corrections by word or reading. Export a version 1 JSON backup or import one up to 256 KiB. Imports keep existing readings on conflicts and reject malformed or over-capacity backups without partial changes.
- No new dependencies or permissions. Furigana stays offline; explicit word definitions use the same Wiktionary services on webpages and Docs.

Reload the extension from the rebuilt `dist/` folder, then reload open tabs. The panel still uses text-only extraction; browser-protected pages, images, PDFs, unsupported canvas editors, and cross-frame aggregation remain unsupported. Live Google Docs compatibility remains experimental.

## 0.4.0 · 14 October 2026

This release adds bilingual word definitions, steadier Google Docs reading-panel updates, and better readings for vocabulary entries. It includes all code changes made on 14 October 2026.

### Word definitions in the Docs reading panel

- Click a word to see English and Japanese definitions from Wiktionary, its reading, and its dictionary form when inflected. Kana-only words are also selectable.
- Use Tab to focus words, Enter or Space to open a definition, and Escape to dismiss it and return focus to the word.
- English and Japanese results have separate missing-entry and connection-error messages. Click again to retry failed requests; source links open the original entries.
- Successful and missing lookups are cached in panel memory for up to 100 words. Concurrent requests for the same word are shared, and late responses cannot replace a newer selection or reopen a closed card.
- Lookups happen only when requested. Only the clicked word's dictionary form is sent to the English and Japanese Wiktionary APIs, without credentials or a referrer. Definitions are rendered as text; remote markup is not attached to the panel. Furigana processing remains offline.

### Steadier Docs reading-panel updates

- Routine updates wait for at least 400 ms of quiet after activity. The current text and open definition stay visible while the next snapshot is prepared.
- Identical text and readings do not rebuild the panel, preserving selection, keyboard focus, scroll position, and open definitions across Docs redraws.
- Actual text changes update the panel after the quiet period. IME composition and unavailable text still clear it; disabling the panel or hiding the tab removes it immediately.

### Vocabulary-reading fixes

- Isolated Japanese headwords and translation lines such as `出口 = salida` prefer an exact common-noun dictionary alternative when normal analysis chooses a proper name. `出口` now receives `でぐち` in this context instead of the surname reading `いでぐち`.
- Translation-line detection supports `=`, `＝`, `:`, and `：` with a Latin-script gloss, including leading whitespace and multiple lines. The rule consults the bundled dictionary rather than a list of word-specific corrections.
- Sentences and names with surrounding context keep normal analysis. Saved corrections take priority, and their uncorrected fragments retain the original context. Cached readings also distinguish source context.
- The same reading choice reaches in-document overlays and the reading panel's word metadata.

### Validation

The release is checked with `npm run build`, `npm run typecheck`, and all 27 Playwright tests. Tests include the actual bundled dictionary, Docs overlays and word metadata, name and sentence readings, saved corrections, definition lookups, refresh behavior, and existing large-document and IME fixtures. Browser tests use a temporary profile and synthetic documents; live Google Docs compatibility remains experimental.

### Updating

Replace the contents of your existing extension folder with the updated `dist/` build. Click **Reload** for Furigana Overlay Browser on `chrome://extensions`, then reload open webpages and Google Docs tabs. Keeping the same extension folder helps retain preferences and saved corrections. No npm installation is needed to use the packaged extension.

Standalone names can still be ambiguous and may need a local correction. Definitions require internet access, and the Docs adapter still depends on Google's undocumented text geometry.
