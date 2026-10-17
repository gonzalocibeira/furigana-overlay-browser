import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
// Rebuild once, then package the same runtime allowlist in both layouts.
import {packageFiles} from './package-store.mjs';

const {version}=JSON.parse(await readFile('dist/manifest.json','utf8'));
const manual=`ko-japanese-reading-companion-${version}.zip`;
const store=`ko-japanese-reading-companion-${version}-chrome-web-store.zip`;
await rm(manual,{force:true});
execFileSync('zip',['-q','-r',resolve(manual),...packageFiles.map(path=>`dist/${path}`)]);
const checksums=[];
for(const name of [manual,store])checksums.push(`${createHash('sha256').update(await readFile(name)).digest('hex')}  ${name}`);
await writeFile('SHA256SUMS',checksums.join('\n')+'\n');
console.log(`GitHub release assets: ${manual}, ${store}, SHA256SUMS`);
