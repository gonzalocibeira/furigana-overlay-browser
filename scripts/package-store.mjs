import {execFileSync} from 'node:child_process';
import {readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
await import('./build.mjs');
const {version}=JSON.parse(await readFile('dist/manifest.json','utf8'));
const output=resolve(`ko-japanese-reading-companion-${version}-chrome-web-store.zip`);
await rm(output,{force:true});
// Explicit allowlist: exclude source maps, screenshots, development notes, and
// previous archives. Chrome expects manifest.json at the ZIP root.
execFileSync('zip',['-q','-r',output,'manifest.json','background.js','content.js','docs-bridge.js','offscreen.js','tokenizer.js','popup.js','popup.html','offscreen.html','privacy.html','about.html','about.js','art','icons','dict','licenses','LICENSE'],{cwd:resolve('dist')});
console.log(`Chrome Web Store package: ${output}`);
