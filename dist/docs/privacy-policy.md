# Kō — Japanese Reading Companion: Privacy Policy

Effective date: 17 October 2026. Developer: Gonzalo Cibeira.

Kō adds Japanese readings to webpages and Google Docs, with an optional reading panel, local exploration tools, and online word definitions. It has no account system, advertising, analytics, telemetry, or developer-operated data server.

## Text and browsing information

Kō reads text and layout information from permitted HTTP/HTTPS pages, including embedded frames, to display readings. In Google Docs it reads annotated text geometry for the active visible page or editor viewport. Text is processed on your device using the reading dictionary bundled with the extension. Kō does not upload page text, surrounding sentences, full documents, document identifiers, or browsing history to the developer or to a reading service.

Page URLs and hostnames are used locally to determine compatibility, toolbar status, and site preferences. Kō does not record a browsing history. Hostnames for sites where you save preferences are stored on your device.

The Google Docs bridge sets Google's canvas annotation flag using the extension's public ID so Docs can expose text geometry in the page DOM. This surface is accessible to scripts already running on that document page; it is not a private channel. The bridge does not grant those scripts access to extension APIs, local preferences, or reading corrections. Kō does not request Google account authorization or use the Google Docs API. Google Docs and other websites continue their own normal data processing.

## Optional online word definitions

Clicking a word in the reading panel, or activating it with Enter or Space, automatically requests its definitions by sending the selected word's dictionary form to both English Wiktionary (en.wiktionary.org) and Japanese Wiktionary (ja.wiktionary.org), operated by the Wikimedia Foundation. A selected word may itself contain personal information, such as a name. Only that lookup term is sent by Kō; the surrounding text and page URL are not sent. Requests use HTTPS, omit credentials and cookies, omit the referrer, and do not follow redirects. Wikimedia receives the term and normal connection information, including your IP address. Its handling of this information is governed by the [Wikimedia Foundation Privacy Policy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy).

Furigana and exploration do not require these requests. Definitions are requested only when you activate a reading-panel word or retry a failed lookup; cached results may avoid another request. Opening the Playgrounds browser and using exploration controls makes no definition requests. Following a Wiktionary source link, an exploration reference link, or another external link opens that website in a new tab, where its own privacy practices and your browser settings apply.

## Local exploration

Verb Playground, Mimetic Playground, and Meaning Forks use the extracted text snapshot, packaged conjugation code, and authored local examples and artwork. The Mimetic browser searches bundled expressions. Verb Playground checks explicitly typed dictionary-form verbs using the same on-device tokenizer, or explores a clicked verb in the reading panel. Search queries, typed verbs, experiments, and selected interpretations remain in memory. These tools make no service requests and download no models or remote assets. Kō does not save an exploration history or upload queries, typed verbs, generated forms, selected interpretations, or surrounding sentences.

## Storage, retention, and deletion

Settings, site preferences, and up to 200 word/reading corrections are saved in chrome.storage.local on this device. Kō does not sync them through chrome.storage.sync or upload them. Corrections can include names or other personal text you choose to save.

Extracted text, typed verbs, tokenizer reading caches, and definition caches remain in memory, subject to cache limits and component lifetimes. Panel definitions are cached for up to 100 terms. Tab-specific reading and playground-analysis caches are released when their tab closes or the tokenizer/offscreen context ends; entries can also be evicted earlier. A shared cache of dictionary-form readings holds at most 256 verbs until eviction or the tokenizer context ends. Kō does not persist full page text, typed queries, or definitions to disk through its storage API.

You can remove corrections in the extension popup and change site preferences there. Uninstalling the extension removes its extension-local saved data. Exporting corrections creates a JSON file at your request; Kō does not upload it. You control that file and any copies or backups, which must be deleted separately. Import reads the correction file you select and stores validated corrections locally.

## Permissions and control

HTTP/HTTPS site access allows automatic readings without clicking the extension on every page and supports readings in embedded frames. The storage permission saves preferences and corrections. The offscreen permission runs the bundled tokenizer in a worker. You can pause readings globally or by hostname in the popup, and restrict site access using Chrome's extension controls. The Docs initialization bridge can run before the saved pause setting is loaded; pausing stops Kō's reading analysis and display, but does not undo Google's already-initialized annotation surface. Restrict Docs site access and reload the document to prevent the bridge from running.

## Use and sharing commitments

Kō uses user data only to provide its Japanese reading features. The developer does not receive, sell, rent, or use it for advertising, credit decisions, profiling, or unrelated purposes, and does not allow humans to read it through the extension. The only third-party data requests made by Kō are the word-definition lookups you explicitly request, as described above. Kō's use of user data complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Changes and contact

This policy will be updated when Kō's data practices change, with an updated effective date. Material changes will also be disclosed in the extension or release information as appropriate. Contact the developer through the [project support page](https://github.com/gonzalocibeira/ko-japanese-reading-companion/issues). Support reports are public; do not include private documents, passwords, or sensitive information.
