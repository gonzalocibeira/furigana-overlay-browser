# Kō 1.1.0 release QA

## Resolution · 17 October 2026

**All three confirmed bugs are fixed.** Build and typecheck pass, all **147 full-suite tests pass**, and all **three original audit reproductions pass**. The unchanged native-toolbar-popup regression also passed, including height and wheel scrolling. Validation includes the newer automatic word-definition lookup changes.

- A [single service-worker writer](../../src/preference-writer.ts) serializes correction saves, renames, removals and imports, panel preferences, site pauses and appearance patches. The browser regression now uses two independent popup clients; both correction and site changes persisted in all ten trials. Unit tests additionally cover a popup and webpage client, capacity, invalid imports, storage failures, and sender validation.
- [Content extraction](../../src/content.ts) observes `hidden` and `open` changes and prunes closed disclosures to their first direct summary. Nested disclosures, open shadow roots, and overlay/reading-panel modes are covered.
- [Verb verification](../../src/verb-playground.ts) retains lexical いれる and avoids falsely restricting あれる through existential ある. Genuine unsupported shortened potentials remain declined.

[Validation record](evidence/fixed/validation.json) · [Concurrent-save results](evidence/fixed/concurrent-save-results.json) · [Visibility results](evidence/fixed/visibility-results.json) · [Verb results](evidence/fixed/verb-results.json) · [Fixed verb screenshot](evidence/fixed/ireru-fixed.png) · [Native popup](evidence/fixed/native-popup-footer.png)

The regenerated 1.1 store ZIP contains 51 files and matches final `dist` byte-for-byte. Its executable bundles also match the tested build. SHA-256: `e16b4343b7a6b3cd73dd9209b49e229e5cf10f2f08d8a2f253f0ec2dde0cb767`. [Package verification](evidence/fixed/package-verification.json)

The following sections preserve the original findings and before-fix evidence.

## Original audit · before fixes

17 October 2026 · candidate revision `7b9facc819472722b8888cb10c1fe37b95b137b8`

Three confirmed P2 (medium-priority) bugs affected the originally tested candidate. The initial audit changed no application source or existing tests. This folder contains the before/after evidence and three regression reproductions.

The original results below apply to the older packaged runtime identified below. Automatic word-definition lookup changes appeared near the end of that audit; the subsequent fix-validation run now includes them.

## 1. Concurrent saves silently lose corrections and panel preferences

**Location:** [preferences.ts:55](../../src/preferences.ts#L55), [preferences.ts:61](../../src/preferences.ts#L61).

The save helpers read an entire storage record, change their local copy, and replace the entire record. Two concurrent operations can both read the same old value and overwrite each other. Both calls resolve successfully.

**Reproduction:** Seed the corrections with `学校 → がっこう`, then run these actual helpers concurrently against `chrome.storage.local` in a disposable extension profile:

```ts
await Promise.all([
  saveCorrection('東京', 'とうきょう'),
  saveCorrection('大阪', 'おおさか'),
]);
```

Both replies include their respective new correction, but persisted storage contains only `学校` and `大阪`. `東京` is lost. This reproduced in **10 of 10 trials using real Chrome storage**, without a mocked delay or gated reads.

The same test with concurrent `updateReadingView` calls enabling `one.test` and `two.test` retained only `two.test`, again in **10 of 10 trials**. Overlapping changes from different reading panels or extension windows can therefore erase another successful change.

**Expected:** Both nonconflicting changes persist. Serialize record updates through one extension writer, including save, remove, and import operations; a separate queue in each panel would not coordinate different tabs.

[Machine-readable evidence](evidence/concurrent-save-results.json) · [Regression reproduction](release-audit.spec.ts#L72)

## 2. Hidden and collapsed content produces stray furigana

**Location:** [content.ts:19](../../src/content.ts#L19), [content.ts:142](../../src/content.ts#L142), [content.ts:254](../../src/content.ts#L254).

Two visibility failures reproduced in the installed extension:

- A visible `日本語` paragraph receives `にほんご`. Setting the paragraph's `hidden` property to `true` removes the source text, but its furigana remains at the old position after 900 ms. A resize triggers a rescan and removes this stale reading.
- A closed native `<details>` element containing `図書館` produces `としょかん` even before the disclosure is opened. The reading appears against otherwise blank space.

**Reproduction fixture:** Open an HTTP page with the following content, using normal overlay mode:

```html
<p id="target">日本語</p>
<details><summary>More</summary><p>図書館</p></details>
<p>学校で本を読む。</p>
```

After initial readings appear, run `document.querySelector('#target').hidden = true`. Observe the leftover reading and the reading for the still-collapsed details content.

**Expected:** Readings follow rendered, visible source text. The observer currently excludes `hidden` and `open`; the source visibility checks also admit content hidden by closed native details. Watch those visibility changes and exclude collapsed disclosure content while keeping its summary eligible.

[Screenshot](evidence/hidden-stale-overlay.png) · [State snapshots](evidence/visibility-results.json) · [Regression reproduction](release-audit.spec.ts#L48)

## 3. A valid kana dictionary verb is rejected

**Location:** [verb-playground.ts:266](../../src/verb-playground.ts#L266), [exploration.ts:181](../../src/exploration.ts#L181), [playground-browser.ts:134](../../src/playground-browser.ts#L134).

**Reproduction:** Open Reading view → Playgrounds → Verbs. Enter `いれる` and choose **Check verb locally**.

**Actual:** No confirmation choice appears. The UI says: “That derived construction is outside the supported forms. Try its original dictionary verb.” Entering `入れる` instead succeeds and offers `Use 入れる · いれる · Ichidan`.

The bundled dictionary recognizes `いれる` as an independent ichidan verb in dictionary form, and `dictionaryVerbCandidates` accepts it. The subsequent verification probes `いる`, mechanically matches its existence sense plus `れる`, and treats that as conclusive evidence of a shortened potential. It discards the valid lexical entry.

**Expected:** Preserve the recognized lexical verb. A possible homographic derived form should not eliminate it; offer an explicit choice where necessary.

[Screenshot](evidence/ireru-rejected.png) · [UI results](evidence/verb-results.json) · [Regression reproduction](release-audit.spec.ts#L93)

## Original verification results

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run typecheck` | Passed |
| Existing 137-test suite | 136 passed; native popup could not open because macOS reported no active browser window |
| New regression reproductions | Each of the three desired-behavior checks failed on the corresponding confirmed bug |
| Live bilingual definition lookup for `学校` | Passed; English and Japanese definitions loaded, zero page errors |
| Offline/local exploration, all 60 mimetics, keyboard/reduced motion, panel widths, source preservation, Docs fixtures | Covered by passing existing checks |
| Release ZIP structure and assets | Manifest at root, runtime assets/dictionaries/licenses present, development files excluded |
| Release ZIP versus current `dist` | All 51 packaged files match byte for byte |

Original archive SHA-256: `75c645889a08aca01485d127f474b06646c50caf185951c37edb4979fd36d6db`.

Tested `dist/content.js` SHA-256: `ea43d268f65dc18774753ddfd7dc6cc53a46030fcb000810c7cc5e6e6eb26dac`.

[Live lookup and native-popup smoke results](evidence/root-smoke-results.json) · [Live lookup screenshot](evidence/live-definitions.png)

Tests used Brave's Chromium engine with disposable profiles and local fixtures. No normal browser profile or Google account was used. The original suite was rerun outside the filesystem sandbox after browser-launch restrictions blocked the first attempt.

## Outstanding manual checks

- **Native toolbar popup — resolved:** The original audit hit a macOS browser-activation restriction before assertions. The unchanged test subsequently passed in the final full suite; popup height and native wheel scrolling are now verified.
- **Playground state across real tab switches:** Automated tab activation kept reporting `document.visibilityState === 'visible'`, even with a real window and focus emulation disabled. Therefore a real hidden-to-visible transition was not exercised. Code inspection suggests that the hidden path can dispose the playground session (`content.ts:113`, `reading-panel.ts:116`). Manually enter a verb, change its form, switch tabs, and return without changing the source page. This concern is not included in the three confirmed findings.
- **Live Google Docs editing:** The automated Docs fixtures passed, but this audit did not edit a live Google Doc.

## Rerun the confirmed regressions

From the repository root:

```sh
npm test -- --config qa/release-1.1/playwright.config.ts
```

These tests assert the correct behavior and now pass on the fixed build. They use disposable profiles, a localhost fixture, and two independent popup clients for concurrent saves; they do not modify a user's corrections. Set `CHROMIUM_PATH` if the extension-capable browser is installed elsewhere. Fresh screenshots and JSON snapshots go to `test-results/release-1.1-audit/`; the evidence in this folder preserves the original and fixed results.
