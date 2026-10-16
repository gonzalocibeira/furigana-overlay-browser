import {build} from 'esbuild';
import {buildIcons} from './icons.mjs';
import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {prepareReleaseNotes} from './release-notes.mjs';
const {version}=JSON.parse(await readFile('public/manifest.json','utf8'));
const releaseNotes=prepareReleaseNotes(await readFile('docs/release-notes.md','utf8'),version);
const aboutTemplate=await readFile('public/about.html','utf8');
if(aboutTemplate.split('<!-- KO_RELEASE_NOTES -->').length!==2)throw new Error('About page must contain one release-notes placeholder');
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
// Embed the shared logo in the panel without exposing extension resources to pages.
const panelLogo=await readFile('public/icons/logo.svg','utf8');
await build({entryPoints:['src/background.ts','src/content.ts','src/docs-bridge.ts','src/offscreen.ts','src/tokenizer.ts','src/popup.ts','src/about.ts'],outdir:'dist',bundle:true,platform:'browser',target:'chrome116',format:'iife',sourcemap:true,alias:{path:'./src/path-shim.ts'},define:{__KO_LOGO_SVG__:JSON.stringify(panelLogo)},plugins:[{
  name:'csp-safe-async-global',setup(build) {
    // async 2 embeds a legacy lodash global-object fallback. Chrome 116 has
    // globalThis; remove string compilation without modifying node_modules.
    build.onLoad({filter:/\/async\/dist\/async\.js$/},async ({path})=>{
      const source=await readFile(path,'utf8');
      const legacy="freeGlobal || freeSelf || Function('return this')()";
      if(source.split(legacy).length!==2)throw new Error('Review async global-object fallback after dependency changes.');
      return {contents:source.replace(legacy,'globalThis'),loader:'js'};
    });
  }
}]});
await cp('public','dist',{recursive:true});
await writeFile('dist/about.html',aboutTemplate.replace('<!-- KO_RELEASE_NOTES -->',releaseNotes.about));
await writeFile('dist/release-notes.html',releaseNotes.history);
// The bundled policy and public repository policy use one source.
const policy=await readFile('docs/privacy-policy.md','utf8');
const escapeHTML=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const policyBody=policy.trim().split(/\n\n+/).map(block=>{
  const heading=block.match(/^(#{1,2}) (.*)$/s);
  const tag=heading?`h${heading[1].length}`:'p';
  const text=escapeHTML(heading?heading[2]:block).replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return `<${tag}>${text}</${tag}>`;
}).join('\n');
await writeFile('dist/privacy.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kō Privacy Policy</title><style>body{max-width:760px;margin:40px auto;padding:0 24px;font:17px/1.65 system-ui;color:#242b2d;background:#f4ecd8}h1{line-height:1.2}h2{margin-top:32px}a{color:#294c66}</style><main>${policyBody}</main></html>`);
await buildIcons('dist/icons');
await writeFile('dist/README.md',(await readFile('README.md','utf8')).replaceAll('public/icons/logo.svg','icons/logo.svg').replaceAll('](dist/)','](.)').replaceAll('](dist/','](').replaceAll('**`dist` folder**','**extension folder**'));
await cp('docs','dist/docs',{recursive:true});
await writeFile(`dist/docs/github-release-${version}.md`,releaseNotes.github);
await cp('LICENSE','dist/LICENSE');
await cp('node_modules/kuromoji/dict','dist/dict',{recursive:true});
await mkdir('dist/licenses',{recursive:true});
for (const name of ['LICENSE-2.0.txt','NOTICE.md']) await cp(`node_modules/kuromoji/${name}`,`dist/licenses/kuromoji-${name}`);
for (const [pkg,license] of [['async','LICENSE'],['doublearray','LICENSE.txt'],['zlibjs','LICENSE'],['lodash','LICENSE']]) {
  await cp(`node_modules/${pkg}/${license}`,`dist/licenses/${pkg}-LICENSE`);
}
await cp('node_modules/kamiya-codec/UNLICENSE','dist/licenses/kamiya-codec-UNLICENSE');
// The bridge and isolated initialization run at document_start, before Docs initializes.
console.log('Built load-unpacked extension in dist/');
