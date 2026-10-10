import {validOverrides} from './preferences';
let creating: Promise<void> | undefined;
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]});
  if (contexts.length) return;
  if (!creating) creating = chrome.offscreen.createDocument({url: 'offscreen.html', reasons: [chrome.offscreen.Reason.WORKERS], justification: 'Run the bundled offline Japanese tokenizer in a worker.'}).finally(() => { creating = undefined; });
  await creating;
}
interface Job { overrides:Record<string,string>; texts:string[]; requestId:string; owner:string; jobId:string; cancelled:boolean; dispatched:boolean; respond:(result:unknown)=>void }
interface Queue { jobs:Job[]; running:boolean; closed:boolean; active?:Job }
const queues = new Map<number, Queue>();
function cancel(job:Job) {
  if(job.cancelled)return;
  job.cancelled=true;job.respond({cancelled:true});
  if(job.dispatched) chrome.runtime.sendMessage({type:'worker-cancel',jobId:job.jobId}).catch(()=>{});
}
async function drain(tabId: number, queue: Queue) {
  queue.running = true;
  try {
    while (queue.jobs.length && !queue.closed) {
      const job = queue.jobs.shift()!;queue.active=job;
      try {
        if(job.cancelled)continue;
        await ensureOffscreen();
        if(job.cancelled || queue.closed)continue;
        job.dispatched=true;
        const result=await chrome.runtime.sendMessage({type:'worker-job',jobId:job.jobId,key:`${tabId}:readings`,texts:job.texts,overrides:job.overrides});
        if(!job.cancelled)job.respond(result);
      } catch (error) { if(!job.cancelled)job.respond({error:String(error)}); }
      finally {queue.active=undefined;}
    }
  } finally {
    queue.running = false;
    if (!queue.jobs.length && queues.get(tabId)===queue) queues.delete(tabId);
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['tokenize','cancel-tokenize'].includes(message?.type) || sender.tab?.id === undefined) return;
  const tabId=sender.tab.id,owner=sender.documentId ?? `frame:${sender.frameId ?? 0}`;
  let queue=queues.get(tabId);
  if(message.type==='cancel-tokenize') {
    if(queue) {
      for(const job of queue.jobs) if(job.owner===owner && job.requestId===message.requestId)cancel(job);
      queue.jobs=queue.jobs.filter(job=>!job.cancelled);
      if(queue.active?.owner===owner && queue.active.requestId===message.requestId)cancel(queue.active);
    }
    respond({ok:true});return;
  }
  if (typeof message.requestId!=='string' || !Array.isArray(message.texts) || message.texts.length>2000 || message.texts.some((s: unknown) => typeof s !== 'string') || message.texts.join('').length > 2000) { respond({error:'Invalid batch'}); return; }
  if (!queue) { queue={jobs:[],running:false,closed:false}; queues.set(tabId,queue); }
  // New requests from the same document replace stale queued requests.
  for(const job of queue.jobs) if(job.owner===owner)cancel(job);
  queue.jobs=queue.jobs.filter(job=>!job.cancelled);
  if(queue.active?.owner===owner)cancel(queue.active);
  if (queue.jobs.length >= 32) { respond({error:'Too many active frames. Try scrolling after other frames settle.'}); return; }
  queue.jobs.push({overrides:validOverrides(message.overrides),texts:message.texts,requestId:message.requestId,owner,jobId:crypto.randomUUID(),cancelled:false,dispatched:false,respond});
  if (!queue.running) void drain(tabId,queue);
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => {
  const queue=queues.get(tabId);
  if(queue) {queue.closed=true;for(const job of queue.jobs.splice(0))cancel(job);if(queue.active)cancel(queue.active);queues.delete(tabId);}
  chrome.runtime.sendMessage({type:'worker-release',tabId}).catch(()=>{});
});
