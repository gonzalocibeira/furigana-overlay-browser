# Kō 1.1.0 · 17 October 2026

Kō 1.1 adds offline ways to explore Japanese while you read. This version is released on GitHub; Chrome Web Store submission and availability are managed separately.

- **Verb Playground:** explore potential, passive, causative, desire, conditionals, requests, commands, and everyday ～て constructions. Applicable tense, negative, polite, and spoken-shortening controls update the form and furigana. Changes are highlighted, Reset restores the exact original, and ambiguous forms offer explicit choices.
- **Mimetic Playground:** compare **60 expressions in 30 illustrated scenes**, covering feelings, movement, bodily states, textures, sound, and weather. Each expression has a Japanese example, translation, explanation, and reference. Replay runs a short animation; reduced-motion mode stays static. Hiragana and full-/half-width katakana work, including ザーザー for rain.
- **Offline playground workspace:** choose **Playgrounds** to enter a dictionary-form verb directly and confirm its local analysis, or click a verb in the reading panel and choose **Try verb forms** or **Open playgrounds**. The Mimetic tab searches all 60 expressions by Japanese, reading, or English. The full-height workspace opens one tool at a time, keeps controls readable at narrow widths, and restores your position when going back.
- **Meaning Forks:** compare common potential/passive/honorific functions of supported ～られる forms, or make/let functions of causatives. The diagrams show possibilities; context determines the interpretation.
- **One-click word meanings:** clicking a word in the reading panel automatically shows English and Japanese Wiktionary definitions alongside its reading, corrections, and local exploration tools. No separate lookup button is needed. Loaded definitions stay in memory; failed lookups offer a retry button. Readings and exploration still work offline.
- **Reading reliability:** hidden text and closed disclosures no longer produce stray furigana. Concurrent saves preserve corrections and site settings, and lexical kana verbs such as いれる remain available in the playground.
- No new browser permissions, runtime services, accounts, API keys, remote assets, or learning-history storage. Existing settings and correction backups remain compatible.

### Downloads

- **Manual installation:** download [ko-japanese-reading-companion-1.1.0.zip](https://github.com/gonzalocibeira/ko-japanese-reading-companion/releases/download/v1.1.0/ko-japanese-reading-companion-1.1.0.zip), extract it, and load its `dist` folder using **Load unpacked** on `chrome://extensions` with Developer mode enabled. No build step is required.
- **Chrome Web Store package:** [ko-japanese-reading-companion-1.1.0-chrome-web-store.zip](https://github.com/gonzalocibeira/ko-japanese-reading-companion/releases/download/v1.1.0/ko-japanese-reading-companion-1.1.0-chrome-web-store.zip) contains `manifest.json` at its root for store submission.
- Verify either ZIP with the release's [SHA256SUMS](https://github.com/gonzalocibeira/ko-japanese-reading-companion/releases/download/v1.1.0/SHA256SUMS) file.

### Verification

Build and typecheck pass. All 147 automated tests and the three original release-audit regressions pass, including native toolbar-popup height and scrolling, concurrent saves, hidden and collapsed content, and lexical kana verbs. Automated Google Docs fixtures pass; live Google Docs editing was not exercised. See the [release audit](https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/chrome-web-store-audit.md) for scope and compatibility limits.

### Updating

Reload the extension, then reload open webpages and Google Docs tabs. Keep the existing installation to retain settings and pronunciation corrections. Experiments stay in Kō's panel and never rewrite the original webpage or document.

Open **About Kō → What’s new** for these notes and the full offline release history. See the [exploration notes](https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/exploration-notes.md) for supported forms and limitations; online definitions and external reference links require an internet connection.
