const worker = new Worker(chrome.runtime.getURL('tokenizer.js'));
let next = 0;
const pending = new Map<number, {jobId:string; resolve:(result:unknown)=>void}>();
worker.onmessage = event => { pending.get(event.data.id)?.resolve(event.data); pending.delete(event.data.id); };
worker.onerror = () => { for (const {resolve} of pending.values()) resolve({error:'Tokenizer worker failed'}); pending.clear(); };
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Only the service worker may dispatch internal jobs. Content scripts must go
  // through background.ts's batch limits and per-document cancellation queue.
  if (sender.id !== chrome.runtime.id || sender.tab || sender.url !== chrome.runtime.getURL('background.js')) return;
  if (message?.type === 'worker-release') { worker.postMessage(message); return; }
  if (message?.type === 'worker-cancel') {
    for(const [id,job] of pending) if(job.jobId===message.jobId) {
      worker.postMessage({type:'worker-cancel',id});job.resolve({cancelled:true});pending.delete(id);
    }
    respond({ok:true});return;
  }
  if (message?.type !== 'worker-job') return;
  const id = ++next;
  pending.set(id, {jobId:message.jobId,resolve:respond});
  worker.postMessage({id, key:message.key, texts:message.texts,overrides:message.overrides,includeWords:message.includeWords});
  return true;
});
