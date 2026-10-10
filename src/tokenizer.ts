import {readWithOverrides} from './preferences';
import kuromoji from 'kuromoji';
import { align, ReadingCache, type Reading } from './shared';
const caches = new Map<string, ReadingCache>();
const ready = new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) => {
  kuromoji.builder({dicPath: new URL('dict/', self.location.href).href}).build((error, tokenizer) => error ? reject(error) : resolve(tokenizer));
});
const cancelled = new Set<number>();
const known = new Set<number>();
let chain=Promise.resolve();
self.onmessage = event => {
  if(event.data.type==='worker-cancel') {if(known.has(event.data.id))cancelled.add(event.data.id);return;}
  if(typeof event.data.id==='number')known.add(event.data.id);
  chain=chain.then(()=>run(event.data));
};
async function run(data: any) {
  const {id, key, texts} = data;
  if (data.type === 'worker-release') { for (const name of caches.keys()) if (name.startsWith(`${data.tabId}:`)) caches.delete(name); return; }
  try {
    const tokenizer = await ready;
    let cache = caches.get(key); if (!cache) { cache = new ReadingCache(); caches.set(key, cache); }
    const results: Reading[][]=[];
    let started=performance.now();
    for(const text of texts as string[]) {
      if(cancelled.has(id))return;
      const result=(text:string)=>{
      const hit = cache!.get(text); if (hit) return hit;
      const out: Reading[] = [];
      let offset = 0;
      for (const token of tokenizer.tokenize(text)) {
        // Locate sequential surfaces rather than relying on code-point positions.
        const start = text.indexOf(token.surface_form, offset);
        if (start < 0) continue;
        offset = start + token.surface_form.length;
        const parts=align(token.surface_form, token.reading ?? '');
        if (!parts.length && /[\p{Script=Han}々]/u.test(token.surface_form)) out.push({start,end:offset,reading:''});
        for (const part of parts) out.push({start:start + part.start, end:start + part.end, reading:part.reading});
      }
      cache!.set(text, out); return out;
      };
      results.push(readWithOverrides(text,data.overrides ?? {},result));
      // Each individual tokenize call is bounded to 2,000 characters. Yield between texts
      // so queued cancellation messages can interrupt the remainder of the batch.
      if(performance.now()-started>=4) {await new Promise<void>(resolve=>setTimeout(resolve,0));started=performance.now();}
    }
    if(cancelled.has(id))return;
    self.postMessage({id, results});
  } catch (error) { self.postMessage({id, error:String(error)}); }
  finally {cancelled.delete(id);known.delete(id);}
}
