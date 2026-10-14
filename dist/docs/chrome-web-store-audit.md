# Chrome Web Store release audit

Audit date: 15 October 2026. Version: 1.0.0. Scope: source, bundled dependencies, generated JavaScript, manifest, data flows, Docs bridge, and store packaging. This audit reduces known review risks; Google makes the approval decision.

## Release status and findings

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

## Public privacy policy URL

The policy is published on the repository's public `master` branch. Use this dedicated policy page in the dashboard:

https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/privacy-policy.md

Published in commit `0d5775443de22500d13dbeee1ad293aeebc4b7c5` on 15 October 2026. Before submission, confirm that the complete current policy remains accessible without authentication. The bundled chrome-extension:// policy URL cannot serve as the dashboard's public link. If you prefer your own domain or GitHub Pages, publish the generated `dist/privacy.html` there and use its public HTTPS URL instead. The privacy policy was published separately after user approval, ahead of the extension release.

## Dashboard text

### Single purpose

Help users read Japanese on webpages and Google Docs by automatically displaying locally generated furigana, with a companion reading panel, saved pronunciation corrections, and user-requested word definitions.

### Host access: http://*/* and https://*/*

Kō automatically adds Japanese readings to visible text on websites the user visits, including embedded frames. The feature must work on arbitrary HTTP/HTTPS websites, so a fixed domain list would exclude user-selected reading material. Content scripts run only where Chrome grants site access. Broad host permissions also allow the popup and per-tab toolbar to identify the current website and apply hostname-specific settings without requesting the tabs permission. Users can pause readings globally or by site and restrict access through Chrome's site-access controls. Page text is processed locally with bundled dictionaries. Only when the user opens a word definition is that term sent to English and Japanese Wiktionary over HTTPS; no surrounding sentence, full document, or page URL is sent.

activeTab would require a per-page action and cannot provide automatic readings on navigation. Embedded-frame and about:blank matching support permitted pages' embedded text. No file:// or browser-internal page access is requested. The Docs MAIN-world script is separately scoped to https://docs.google.com/document/* and the top frame.

### storage

Save the user's enabled/paused state, hostname-specific reading appearance and panel preferences, panel dimensions, and user-entered pronunciation corrections in chrome.storage.local. No full document text or definition cache is persisted and chrome.storage.sync is not used.

### offscreen

Create a local offscreen document solely to run a worker containing the bundled Japanese tokenizer and reading dictionaries. This allows offline text analysis without a long-running worker in every webpage and without a remote service. The declared offscreen reason is WORKERS.

### Remote code

No. All executable JavaScript and reading dictionaries are included in the submitted package. The extension does not download or evaluate scripts, WebAssembly, remote feature logic, or remote configuration. Optional Wiktionary requests retrieve dictionary data, which is reduced to text for display. Kuromoji's XMLHttpRequest reads only bundled chrome-extension:// dictionary files resolved relative to the packaged tokenizer worker.

### Suggested listing privacy paragraph

Kō reads visible webpage and Google Docs text to display Japanese readings. Furigana is generated on your device using bundled dictionaries. Settings, site preferences, and pronunciation corrections are stored locally. Opening a word definition sends that word's dictionary form to English and Japanese Wiktionary, which also receives your IP address; surrounding sentences and documents are not uploaded. No account, analytics, or advertising. See the privacy policy for details and controls.

### Data-use disclosures

Do not certify that Kō handles no user data. Its purpose requires access to website content, URLs/hostnames, and user-entered corrections, even though most processing is local. The online lookup transmits a selected piece of website content to Wikimedia and exposes the connection IP. Disclose Website content; account for locally used Web history/URLs and potentially personally identifiable terms (names) in the current dashboard definitions. This is a conservative mapping of the behavior to Google's categories, not a claim of browsing-history logging. No payment, health, authentication, or personal-communications service is implemented; arbitrary page content can still be sensitive, so the policy covers page text generally. Confirm the dashboard's live definitions when completing the form. Certify the Limited Use statements only after reading them: data is not sold, used outside the single purpose, or used for credit/lending decisions. The policy includes the affirmative Limited Use commitment.

## Reviewer instructions

1. Install the submitted extension in Chrome 116 or later. Open a Japanese webpage with selectable text (for example Japanese Wikipedia); readings appear without a per-page click. No extension account is needed and furigana works offline.
2. Use the popup to pause the hostname, resume, change appearance, and enable the extra-space reading view. Save and delete a correction; it persists locally. The popup links to the complete privacy policy and discloses online word lookups.
3. Click a word in the reading panel. Only that word's dictionary form is sent to both Wiktionary editions. With networking disabled, furigana and corrections still work; definition requests show an unavailable message.
4. To test Google Docs, use your own disposable Doc with a Japanese sentence such as 日本語を勉強する。 Reload it after installing. Readings overlay existing text without changing the document. The reading panel uses the same annotated geometry. The extension does not require OAuth or Google Docs API credentials; Google's own editor may require a Google login.
5. PDFs, images, other canvas editors, browser settings pages, and some rotated/vertical text are unsupported. Google Docs uses an undocumented annotation surface; live compatibility may change. Pausing analysis does not undo a bridge flag that Docs already consumed at document_start. To prevent the bridge, restrict Docs site access and reload.

## Validation and submission checklist

Completed for this build: typecheck passed; all 52 tests passed in Brave's Chromium engine using a disposable profile and localhost fixtures; `npm audit --omit=dev --json` reported zero known production dependency vulnerabilities. Every file in the store archive was byte-compared with the tested dist build; the root manifest and exclusions were verified. The ZIP is 15,529,867 bytes, SHA-256 `bb01e6749dbd7dd0439bf32eb6d4a2e031b8ca7159debb723e46504c8c38db74`. Browser tests initially required a sandbox escalation for browser launch and the local test server, then completed successfully. Live Google Docs and Chrome Web Store dashboard submission were not performed.

- Run `npm run build`, `npm run typecheck`, and `npm test`. Security regression tests cover worker sender boundaries, bridge input/one-time initialization, and executable bundle string-compilation/loader checks. Browser integration tests also cover hostile remote HTML, lemma-only definition requests, offline corrections, cancellation, and Docs fixtures.
- Run `npm run package:store` (requires the system `zip` command). Upload `ko-japanese-reading-companion-1.0.0-chrome-web-store.zip`. Rebuild and retest after any code or disclosure changes.
- Publish and verify the public privacy policy URL, then enter it in the dashboard. Ensure dashboard, store listing, popup, and policy agree.
- Use accurate real screenshots and the supplied icons. The repository's screenshots include private-owner examples: confirm they are approved for public use and contain no sensitive document text before uploading them.
- Verify current live Google Docs with the final package; automated tests use representative fixtures and cannot certify every live Docs version. Verify Chrome site-access restrictions and a definition lookup with the release package.
- Supply support/contact information, complete the category and data-use fields, and ensure the developer account has 2-Step Verification. Follow Chrome Web Store publishing guidance for the required store artwork.

## Policy references

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies): privacy disclosure, Limited Use, narrow permissions, and truthful metadata.
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq): privacy policy required for local user-data handling too.
- [Privacy dashboard fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy): single purpose, permission explanations, remote code, and data-use declarations.
- [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements): packaged and reviewable executable logic.
- [Offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen): WORKERS reason and extension messaging.

## About page update

Added an About Kō options page with project summary, privacy policy (public and offline), developer GitHub, repository, and issue links. Available from the popup and Chrome extension options. No new permissions. Rebuilt the store ZIP; typecheck, five existing popup/security checks, and temporary-browser checks of version, options registration, safe external links, popup navigation, offline policy, and desktop/mobile layout passed. Visually inspected the desktop page.

## Ukiyo-e About page styling

Added an original, local SVG landscape inspired by the README's indigo mountains, vermilion sun, flowering branches, and lake. The README banner itself is not used by the About page or included in the store ZIP. Retained paper textures, serif headings, vermilion seals, Japanese chapter numerals, and responsive panels. The logo and title share the same top edge, verified in-browser at 1280, 700, 390, and 320 px. Typecheck passed; no horizontal overflow; images loaded locally. Desktop/mobile previews were visually inspected. Rebuilt and byte-verified the store archive including the original artwork.
