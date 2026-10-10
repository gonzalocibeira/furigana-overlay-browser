import {build} from 'esbuild';
import {buildIcons} from './icons.mjs';
import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/background.ts','src/content.ts','src/docs-bridge.ts','src/offscreen.ts','src/tokenizer.ts','src/popup.ts'],outdir:'dist',bundle:true,platform:'browser',target:'chrome116',format:'iife',sourcemap:true,alias:{path:'./src/path-shim.ts'}});
await cp('public','dist',{recursive:true});
await buildIcons('dist/icons');
await writeFile('dist/README.md',(await readFile('README.md','utf8')).replaceAll('public/icons/logo.svg','icons/logo.svg').replaceAll('](dist/','](').replaceAll('**`dist` folder**','**extension folder**'));
await cp('docs','dist/docs',{recursive:true});
await cp('LICENSE','dist/LICENSE');
await cp('node_modules/kuromoji/dict','dist/dict',{recursive:true});
await mkdir('dist/licenses',{recursive:true});
for (const name of ['LICENSE-2.0.txt','NOTICE.md']) await cp(`node_modules/kuromoji/${name}`,`dist/licenses/kuromoji-${name}`);
for (const [pkg,license] of [['async','LICENSE'],['doublearray','LICENSE.txt'],['zlibjs','LICENSE'],['lodash','LICENSE']]) {
  await cp(`node_modules/${pkg}/${license}`,`dist/licenses/${pkg}-LICENSE`);
}
// The bridge and isolated initialization run at document_start, before Docs initializes.
console.log('Built load-unpacked extension in dist/');
