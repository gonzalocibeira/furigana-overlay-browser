# Release notes

## 1.1.0 · Release candidate

Kō 1.1 adds offline ways to explore Japanese while you read. This is a release candidate; it has not been published to the Chrome Web Store.

- **Verb Playground:** explore potential, passive, causative, desire, conditionals, requests, commands, and everyday ～て constructions. Applicable tense, negative, polite, and spoken-shortening controls update the form and furigana. Changes are highlighted, Reset restores the exact original, and ambiguous forms offer explicit choices.
- **Mimetic Playground:** compare **60 expressions in 30 illustrated scenes**, covering feelings, movement, bodily states, textures, sound, and weather. Each expression has a Japanese example, translation, explanation, and reference. Replay runs a short animation; reduced-motion mode stays static. Hiragana and full-/half-width katakana work, including ザーザー for rain.
- **Offline playground workspace:** choose **Playgrounds** to enter a dictionary-form verb directly and confirm its local analysis, or click a verb in the reading panel and choose **Try verb forms** or **Open playgrounds**. The Mimetic tab searches all 60 expressions by Japanese, reading, or English. The full-height workspace opens one tool at a time, keeps controls readable at narrow widths, and restores your position when going back.
- **Meaning Forks:** compare common potential/passive/honorific functions of supported ～られる forms, or make/let functions of causatives. The diagrams show possibilities; context determines the interpretation.
- **Local word details:** opening a word shows its reading, corrections, and exploration tools offline. Only **Look up definitions online** requests English and Japanese Wiktionary definitions. Loaded definitions stay in memory, and failed lookups can be retried.
- No new browser permissions, runtime services, accounts, API keys, remote assets, or learning-history storage. Existing settings and correction backups remain compatible.

### Updating

Reload the extension, then reload open webpages and Google Docs tabs. Keep the existing installation to retain settings and pronunciation corrections. Experiments stay in Kō's panel and never rewrite the original webpage or document.

Open **About Kō → What’s new** for these notes and the full offline release history. See the [exploration notes](exploration-notes.md) for supported forms and limitations; online definitions and external reference links require an internet connection.

## 1.0.0 · 14 October 2026

The first 1.0 release of **Kō — Japanese Reading Companion** brings automatic offline furigana to webpages and Google Docs, with a spacious reading panel and optional bilingual word definitions.

- Renamed the extension **Kō — Japanese Reading Companion**, aligning its name with the 考 mark. Warm paper, ink, muted indigo, and a vermilion seal replace the cobalt-and-gray palette. Repository, npm package, downloads, and internal UI identifiers now use `ko-japanese-reading-companion` / `ko-`. Existing saved settings, corrections, and version 1 backups are retained.
- Redesigned the popup, reading panel, definition cards, and correction forms with square controls, bold monospace headings, ink borders, warm paper surfaces, indigo, and vermilion accents. Japanese reading text keeps a readable system font. The popup is 380 px wide with expandable settings and keyboard focus indicators.
- The new 考 (think) mark appears in the popup, reading-panel header, and toolbar. A vermilion icon means readings are enabled and available on this tab; a sand-colored icon with a pause indicator means global or site pause; an outlined icon with a slash means unavailable or a reload is needed. Hover for the reason. The popup remains accessible in all states.
- The toolbar stays active without visible kanji and during scrolling, typing, or background-tab processing pauses. State updates follow navigation, tab activation, preferences, availability recovery, and service-worker restarts. Embedded frames cannot set the top-level icon.
- The reading panel supports 16–32 px text, adjustable line spacing, and pointer or keyboard resizing. Click words for English and Japanese definitions, or save a preferred reading directly in the panel.
- Search, export, and import local reading corrections. Existing settings, corrections, backup formats, overlay appearance, and permissions are preserved.

Reload the extension, then reload open webpages and Google Docs tabs. The README now uses four current screenshots of real webpage and Google Docs use. Download the ready-to-load extension ZIP from the [1.0.0 release](https://github.com/gonzalocibeira/ko-japanese-reading-companion/releases/tag/v1.0.0).

## 0.5.0 · 14 October 2026

- The reading panel now works on supported HTTP/HTTPS webpages as well as Google Docs, following visible text with bounded discovery and the existing quiet-period debounce. Activation is remembered per hostname. Existing Docs preferences migrate without enabling other websites.
- Choose 16–32 px panel text, or resize the panel from its left edge using a pointer or keyboard. Font size, spacing, and width are saved across sites. Appearance updates preserve panel content, selection, and definitions without retokenizing.
- Correct a kanji word directly in its detail card, including while definitions are unavailable. Restore automatic readings from the same form. Saved readings are reflected in pronunciation metadata, including multi-token corrections.
- Search corrections by word or reading. Export a version 1 JSON backup or import one up to 256 KiB. Imports keep existing readings on conflicts and reject malformed or over-capacity backups without partial changes.
- No new dependencies or permissions. Furigana stays offline; explicit word definitions use the same Wiktionary services on webpages and Docs.

Reload the extension from the rebuilt `dist/` folder, then reload open tabs. The panel still uses text-only extraction; browser-protected pages, images, PDFs, unsupported canvas editors, and cross-frame aggregation remain unsupported.

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

The release is checked with `npm run build`, `npm run typecheck`, and all 27 Playwright tests. Tests include the actual bundled dictionary, Docs overlays and word metadata, name and sentence readings, saved corrections, definition lookups, refresh behavior, and existing large-document and IME fixtures. Browser tests use a temporary profile and synthetic documents.

### Updating

Replace the contents of your existing extension folder with the updated `dist/` build. Click **Reload** for Kō — Japanese Reading Companion on `chrome://extensions`, then reload open webpages and Google Docs tabs. Keeping the same extension folder helps retain preferences and saved corrections. No npm installation is needed to use the packaged extension.

Standalone names can still be ambiguous and may need a local correction. Definitions require internet access, and the Docs adapter still depends on Google's undocumented text geometry.
