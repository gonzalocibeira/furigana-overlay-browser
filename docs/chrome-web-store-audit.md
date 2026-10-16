# Chrome Web Store release audit

## 1.1.0 expanded local candidate · 17 October 2026

Expanded Verb Playground to reviewed core and everyday constructions, Mimetic Playground to 60 canonical expressions in 30 illustrated comparisons, and added direct offline verb input and a searchable mimetic browser. Verb Playground also accepts clicked words from the reading panel; it has no preset verb list. Meaning Forks retains its prior scope. No permissions, network origins, external services, account requirements, or persistent learning data were added. kamiya-codec remains pinned to 4.16.1; only verified elementary operations are used alongside class-aware recipes. The package includes its Unlicense text.

Typed-input and possible-base analysis use a bounded playground-purpose channel (four strings, forty characters each), separated from reading cancellation and cache keys. Searches and typed verbs remain in memory. Word definitions still require the explicit online lookup button. The privacy policy describes local browser queries and cache retention.

Independent linguistic and code review found and corrected canonical-output/source-alias handling, inappropriate restrictions on ordinary typed verbs, derived-potential fallback, godan readings that collide with irregular spellings, shortened-potential handling, and three publisher reference URL slugs. All sixty original SVG illustrations were visually inspected. Production dependency audit reports zero known vulnerabilities.

Live Google Docs smoke verification passed in a disposable browser on the public, read-only Google文書の概要 document: 28 extracted lines, 84 ruby annotations, Japanese source text, potential transformation 食べられる, all 60 browser expressions, unchanged source annotation labels, and no page errors. No Google account was used and no document was edited. This verifies live viewing and playground integration; live editing was not exercised. A screenshot and machine-readable report were retained during verification.

Native toolbar-popup verification is currently blocked by macOS window activation. The unchanged native test passed twice on the preceding UI candidate on 17 October, verifying a 580 px popup and wheel access to footer links, but failed again in the final run after removing preset verbs and in one standalone retry: chrome.action.openPopup reports “Could not find an active browser window.” No popup assertions were skipped or weakened. Popup code is unchanged; current native verification remains outstanding.

Final build, typecheck, and diff checks pass. The full 137-test run passes 136 checks with no skips; the only failure is the native-popup environment limitation above. Coverage includes every form family, all sixty illustrations, actual dictionary segmentation, offline typed input, cancellation isolation, keyboard and reduced-motion behavior, unchanged source/layout, existing settings and definitions, and large-page/Docs fixtures. Three existing integration checks now target the named Close reading view button instead of assuming the first header button is Close. This candidate is not uploaded. Before submission, publish the updated public privacy policy and repeat native-popup verification in an active desktop browser. Store packaging retains the runtime allowlist; documentation, source maps, screenshots, and the user's untracked store artwork are excluded.

Playground UI revision · 17 October 2026: Playgrounds uses the full panel height, with separate input/examples and selected-tool views, one scrolling area, persistent navigation, and restored scroll/focus when returning. The Verbs tab now shows free input directly; preset verb examples and verb search were removed. Change verb returns to the retained input, while Examples returns to mimetic browsing. Reviewed verb examples remain only as conjugation test fixtures, outside the shipped source. Text-field selectors no longer affect checkboxes; all switches retain fixed 16 px inputs and unbroken labels. Integrated layouts were visually inspected and tested at 280, 320, 420, and 720 px, plus a 500 px-high viewport. Initial reading analysis preserves an already-open local browser. The 24 repeated layout checks passed during the initial UI redesign. After removing preset verbs, all 36 targeted verb/browser/integration checks passed; the final complete run is recorded above. The public read-only Google Doc smoke check passed again with the redesigned panel: 28 lines, 84 ruby annotations, 食べられる, all sixty mimetics, unchanged source annotation labels, and no page errors. Updated direct-input, verb, and mimetic panel previews are retained in docs/screenshots/.

Documentation sync · 17 October 2026: updated About with the expanded tools/browser, clarified explicit online lookup and local query retention, added the missing kamiya-codec notices, checked all 48 local Markdown links/assets, corrected the generated README's extension-folder link, and separated current submission guidance from historical 1.0 records. Offline About/privacy checks passed at 1280, 700, 390, and 320 px, including local artwork, version, safe links, scrolling/footer access, and no horizontal overflow. About/privacy HTML changed during that documentation pass; executable code, dictionaries, permissions, and popup remained unchanged.

Release-notes integration · 17 October 2026: docs/release-notes.md now supplies the current About What’s new disclosure, a bundled release-notes.html history, and a GitHub-ready dist/docs/github-release-1.1.0.md draft. Build-time version matching prevents a missing or duplicate current entry; rendered text is escaped and reference links require HTTPS. No runtime fetch, dependency, script, permission, or storage was added. Offline browser checks passed at 1280, 700, 390, and 320 px, including keyboard expansion, full history, back navigation, version/status, no horizontal overflow, and zero remote requests. All 50 local links/assets across 13 Markdown documents were checked. The release-note draft has not been posted to GitHub.

Word-action wording · 17 October 2026: replaced the generic Explore button with Try verb forms for a verb-only action and Open playgrounds for other available tools. Updated instructions, About, privacy wording, release notes, and UI previews. Build/typecheck and all twelve existing playground integration tests pass, including the single-verb, mimetic, and multiple-tool labels. The public read-only Docs smoke check and unchanged source annotations were verified again. Other executable bundles remain unchanged from the preceding tested candidate; the native-popup limitation above remains outstanding.

Final archive: `ko-japanese-reading-companion-1.1.0-chrome-web-store.zip`, 15,579,298 bytes, SHA-256 `75c645889a08aca01485d127f474b06646c50caf185951c37edb4979fd36d6db`. All 51 packaged files match the verified dist byte-for-byte. The wording revision passed the twelve playground integration tests and live read-only Docs smoke check; the preceding full-suite result and native-popup limitation are recorded above. Documentation, source maps, screenshots, and test fixtures are excluded. Nothing was published.

## Current 1.1 submission guidance

The local README, About page, exploration notes, release notes, technical notes, and bundled privacy policy describe the 1.1 candidate. Use dist/docs/github-release-1.1.0.md as the prepared GitHub release body; About and the offline history are generated from the same changelog. Public GitHub documentation and the store listing must be updated separately when the release is approved; rebuilding does not publish them. The README's four inline real-use screenshots show 1.0 and are explicitly labeled. Linked direct-input, verb, and mimetic previews show the redesigned 1.1 playground interface, captured during the public read-only Docs smoke test.

- Use the current `ko-japanese-reading-companion-1.1.0-chrome-web-store.zip`, with `manifest.json` at its root. Source/repository downloads instead keep the extension in `dist/`. Do not submit the old 1.0 archive.
- Repeat native-popup verification in an active desktop browser. A public read-only Google Docs smoke check passed; exercise editing in a disposable Doc before claiming live editing validation.
- Publish the updated [privacy policy](privacy-policy.md) at the [public policy URL](https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/privacy-policy.md). The bundled `privacy.html` comes from that local source. Confirm the public version includes explicit online lookup and local typed-verb processing before submission.
- Describe the single purpose as helping users read and understand Japanese on webpages and Google Docs, with offline readings, local exploration, pronunciation corrections, and optional user-requested definitions. Broad host access, storage, and offscreen permissions are unchanged; the historical permission explanations below still describe those APIs.
- Update reviewer instructions: enable Reading view, choose Playgrounds, type a dictionary-form verb, confirm its analysis, then compare mimetics offline. For selected words, Try verb forms and Open playgrounds stay local; only Look up definitions online contacts English and Japanese Wiktionary. Reference links open only when followed.
- Align dashboard text, listing, screenshots, About, and privacy disclosures with the candidate. No account, API key, remote assets, new permission, or saved exploration history is introduced. Nothing has been uploaded or published by this task.

## Historical 1.0.0 audit and release records

The following dated records describe 1.0.0. Their test counts, archive hashes, older lookup interaction, and submission filename are historical, not instructions for the current candidate. Use the 1.1 status and guidance above for this release.


Audit date: 15 October 2026. Version: 1.0.0. Scope: source, bundled dependencies, generated JavaScript, manifest, data flows, Docs bridge, and store packaging. This audit reduces known review risks; Google makes the approval decision.

### Release status and findings

| Area | Finding and resolution |
| --- | --- |
| Privacy policy | Added `docs/privacy-policy.md`, with a bundled HTML version generated from the same source and linked from the popup. Published on the public repository on 15 October 2026. |
| String compilation | The bundled async 2 dependency included `Function('return this')()` as a legacy global fallback. The worker normally used `self`, but the build now replaces this exact dependency expression with `globalThis` and fails if it changes unexpectedly. No dynamic string compilation remains in executable bundles. |
| Internal worker messages | Offscreen commands previously accepted any internal runtime sender, allowing a content script to bypass background validation/cancellation or release another tab's caches. The handler now accepts only this extension's service worker URL, with its own extension ID and no tab sender. Websites cannot directly use runtime.onMessage; no external-message listener is declared. |
| Network redirects | Definition requests now reject redirects, preserving the two-host network boundary even if an endpoint redirects. Requests omit credentials and referrers and have an eight-second timeout and a 1 MB response cap. |
| Broad access | Retained because automatic readings and toolbar URL-based state are existing features. See the exact justification below. No unused tabs, scripting, activeTab, identity, cookies, history, downloads, or webRequest permission is requested. |
| Docs bridge | MAIN-world code only validates the public extension ID, sets Google's annotation flag, and removes its listener after initialization. It provides no privileged API or document-content message channel. The annotation surface is page DOM, visible to scripts already running on Docs; do not describe it as private or as preventing all page-script access. |
| Remote markup | Wiktionary HTML is parsed in an inert template, converted to bounded plain-text definitions, and displayed using textContent. Scripts, image trackers, event handlers, and javascript links from the response are not inserted into the live document. Source links are constructed on fixed Wiktionary HTTPS hosts. |
| Packaging | A new store ZIP has manifest.json at its root. Only runtime assets, local dictionaries, privacy policy, icons, and licenses are included. Source maps and screenshots are excluded. Do not upload the older `furigana-overlay-browser.zip` or GitHub source archive. |

### Public privacy policy URL

The policy is published on the repository's public `master` branch. Use this dedicated policy page in the dashboard:

https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/privacy-policy.md

Published in commit `0d5775443de22500d13dbeee1ad293aeebc4b7c5` on 15 October 2026. Before submission, confirm that the complete current policy remains accessible without authentication. The bundled chrome-extension:// policy URL cannot serve as the dashboard's public link. If you prefer your own domain or GitHub Pages, publish the generated `dist/privacy.html` there and use its public HTTPS URL instead. The privacy policy was published separately after user approval, ahead of the extension release.

### Dashboard text

#### Single purpose

Help users read Japanese on webpages and Google Docs by automatically displaying locally generated furigana, with a companion reading panel, saved pronunciation corrections, and user-requested word definitions.

#### Host access: http://*/* and https://*/*

Kō automatically adds Japanese readings to visible text on websites the user visits, including embedded frames. The feature must work on arbitrary HTTP/HTTPS websites, so a fixed domain list would exclude user-selected reading material. Content scripts run only where Chrome grants site access. Broad host permissions also allow the popup and per-tab toolbar to identify the current website and apply hostname-specific settings without requesting the tabs permission. Users can pause readings globally or by site and restrict access through Chrome's site-access controls. Page text is processed locally with bundled dictionaries. Only when the user opens a word definition is that term sent to English and Japanese Wiktionary over HTTPS; no surrounding sentence, full document, or page URL is sent.

activeTab would require a per-page action and cannot provide automatic readings on navigation. Embedded-frame and about:blank matching support permitted pages' embedded text. No file:// or browser-internal page access is requested. The Docs MAIN-world script is separately scoped to https://docs.google.com/document/* and the top frame.

#### storage

Save the user's enabled/paused state, hostname-specific reading appearance and panel preferences, panel dimensions, and user-entered pronunciation corrections in chrome.storage.local. No full document text or definition cache is persisted and chrome.storage.sync is not used.

#### offscreen

Create a local offscreen document solely to run a worker containing the bundled Japanese tokenizer and reading dictionaries. This allows offline text analysis without a long-running worker in every webpage and without a remote service. The declared offscreen reason is WORKERS.

#### Remote code

No. All executable JavaScript and reading dictionaries are included in the submitted package. The extension does not download or evaluate scripts, WebAssembly, remote feature logic, or remote configuration. Optional Wiktionary requests retrieve dictionary data, which is reduced to text for display. Kuromoji's XMLHttpRequest reads only bundled chrome-extension:// dictionary files resolved relative to the packaged tokenizer worker.

#### Suggested listing privacy paragraph

Kō reads visible webpage and Google Docs text to display Japanese readings. Furigana is generated on your device using bundled dictionaries. Settings, site preferences, and pronunciation corrections are stored locally. Opening a word definition sends that word's dictionary form to English and Japanese Wiktionary, which also receives your IP address; surrounding sentences and documents are not uploaded. No account, analytics, or advertising. See the privacy policy for details and controls.

#### Data-use disclosures

Do not certify that Kō handles no user data. Its purpose requires access to website content, URLs/hostnames, and user-entered corrections, even though most processing is local. The online lookup transmits a selected piece of website content to Wikimedia and exposes the connection IP. Disclose Website content; account for locally used Web history/URLs and potentially personally identifiable terms (names) in the current dashboard definitions. This is a conservative mapping of the behavior to Google's categories, not a claim of browsing-history logging. No payment, health, authentication, or personal-communications service is implemented; arbitrary page content can still be sensitive, so the policy covers page text generally. Confirm the dashboard's live definitions when completing the form. Certify the Limited Use statements only after reading them: data is not sold, used outside the single purpose, or used for credit/lending decisions. The policy includes the affirmative Limited Use commitment.

### Reviewer instructions

1. Install the submitted extension in Chrome 116 or later. Open a Japanese webpage with selectable text (for example Japanese Wikipedia); readings appear without a per-page click. No extension account is needed and furigana works offline.
2. Use the popup to pause the hostname, resume, change appearance, and enable the extra-space reading view. Save and delete a correction; it persists locally. The popup links to the complete privacy policy and discloses online word lookups.
3. Click a word in the reading panel. Only that word's dictionary form is sent to both Wiktionary editions. With networking disabled, furigana and corrections still work; definition requests show an unavailable message.
4. To test Google Docs, use your own disposable Doc with a Japanese sentence such as 日本語を勉強する。 Reload it after installing. Readings overlay existing text without changing the document. The reading panel uses the same annotated geometry. The extension does not require OAuth or Google Docs API credentials; Google's own editor may require a Google login.
5. PDFs, images, other canvas editors, browser settings pages, and some rotated/vertical text are unsupported. Google Docs uses an undocumented annotation surface; live compatibility may change. Pausing analysis does not undo a bridge flag that Docs already consumed at document_start. To prevent the bridge, restrict Docs site access and reload.

### Validation and submission checklist

Completed for this build: typecheck passed; all 52 tests passed in Brave's Chromium engine using a disposable profile and localhost fixtures; `npm audit --omit=dev --json` reported zero known production dependency vulnerabilities. Every file in the store archive was byte-compared with the tested dist build; the root manifest and exclusions were verified. The ZIP is 15,529,934 bytes, SHA-256 `69cc5d4ad1b4f4935b082948bdd1967841183519c2027d057c34f1f5c57bfd4e`. Browser tests initially required a sandbox escalation for browser launch and the local test server, then completed successfully. Live Google Docs and Chrome Web Store dashboard submission were not performed.

- Run `npm run build`, `npm run typecheck`, and `npm test`. Security regression tests cover worker sender boundaries, bridge input/one-time initialization, and executable bundle string-compilation/loader checks. Browser integration tests also cover hostile remote HTML, lemma-only definition requests, offline corrections, cancellation, and Docs fixtures.
- Run `npm run package:store` (requires the system `zip` command). Upload `ko-japanese-reading-companion-1.0.0-chrome-web-store.zip`. Rebuild and retest after any code or disclosure changes.
- Publish and verify the public privacy policy URL, then enter it in the dashboard. Ensure dashboard, store listing, popup, and policy agree.
- Use accurate real screenshots and the supplied icons. The repository's screenshots include private-owner examples: confirm they are approved for public use and contain no sensitive document text before uploading them.
- Verify current live Google Docs with the final package; automated tests use representative fixtures and cannot certify every live Docs version. Verify Chrome site-access restrictions and a definition lookup with the release package.
- Supply support/contact information, complete the category and data-use fields, and ensure the developer account has 2-Step Verification. Follow Chrome Web Store publishing guidance for the required store artwork.

### Policy references

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies): privacy disclosure, Limited Use, narrow permissions, and truthful metadata.
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq): privacy policy required for local user-data handling too.
- [Privacy dashboard fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy): single purpose, permission explanations, remote code, and data-use declarations.
- [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements): packaged and reviewable executable logic.
- [Offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen): WORKERS reason and extension messaging.

### About page update

Added an About Kō options page with project summary, privacy policy (public and offline), developer GitHub, repository, and issue links. Available from the popup and Chrome extension options. No new permissions. Rebuilt the store ZIP; typecheck, five existing popup/security checks, and temporary-browser checks of version, options registration, safe external links, popup navigation, offline policy, and desktop/mobile layout passed. Visually inspected the desktop page.

### Ukiyo-e About page styling

Added an original, local SVG landscape inspired by the README's indigo mountains, vermilion sun, flowering branches, and lake. The README banner itself is not used by the About page or included in the store ZIP. Retained paper textures, serif headings, vermilion seals, Japanese chapter numerals, and responsive panels. The logo and title share the same top edge, verified in-browser at 1280, 700, 390, and 320 px. Typecheck passed; no horizontal overflow; images loaded locally. Desktop/mobile previews were visually inspected. Rebuilt and byte-verified the store archive including the original artwork.

### Popup scrolling fix

Prevented body overflow from propagating to the document root. The popup body now scrolls within the smaller of 580 px and the available viewport height, so footer links and expanded controls remain reachable. The browser regression reproduced the old failure with wheel input, then passed after the fix at both 580 px and 400 px heights, including opening About Kō from the scrolled footer. Rebuilt and byte-verified the store ZIP; typecheck passed.

### Native popup sizing correction

The prior viewport-based cap collapsed the actual toolbar popup to 25 px even though tab-based checks passed. Give the root an explicit 580 px preferred height, independent of its initial viewport, and size the scrolling body within that viewport. Added a native toolbar-popup regression using chrome.action.openPopup and its actual browser target, rather than a normal tab. It verifies full-height opening and wheel access to every footer link before and after expanding all settings. The native popup now measures 580 px; both native and constrained-height scrolling regressions pass.

The collapsed native popup is compact enough to show About Kō and Privacy policy without scrolling. The native regression checks that every footer link starts inside the viewport and that the collapsed body has no vertical overflow, then expands all settings and verifies real wheel scrolling to the footer. The suite now has 53 tests, including this visible-browser check.
