import {validOverrides} from './preferences';
import './dictionary';
import './action';
import './preference-writer';
let creating: Promise<void> | undefined;
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]});
  if (contexts.length) return;
  if (!creating) creating = chrome.offscreen.createDocument({url: 'offscreen.html', reasons: [chrome.offscreen.Reason.WORKERS], justification: 'Run the bundled offline Japanese tokenizer in a worker.'}).finally(() => { creating = undefined; });
  await creating;
}
type TokenizePurpose = 'readings' | 'playground';
interface Job { overrides:Record<string,string>; texts:string[]; includeWords:boolean; requestId:string; owner:string; purpose:TokenizePurpose; jobId:string; cancelled:boolean; dispatched:boolean; respond:(result:unknown)=>void }
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
        const result=await chrome.runtime.sendMessage({type:'worker-job',jobId:job.jobId,key:`${tabId}:${job.purpose}`,texts:job.texts,overrides:job.overrides,includeWords:job.includeWords});
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
  if(message.purpose!==undefined && message.purpose!=='readings' && message.purpose!=='playground') {respond({error:'Invalid analysis purpose'});return;}
  const purpose:TokenizePurpose=message.purpose ?? 'readings';
  const tabId=sender.tab.id,owner=sender.documentId ?? `frame:${sender.frameId ?? 0}`;
  let queue=queues.get(tabId);
  if(message.type==='cancel-tokenize') {
    if(queue) {
      for(const job of queue.jobs) if(job.owner===owner && job.purpose===purpose && job.requestId===message.requestId)cancel(job);
      queue.jobs=queue.jobs.filter(job=>!job.cancelled);
      if(queue.active?.owner===owner && queue.active.purpose===purpose && queue.active.requestId===message.requestId)cancel(queue.active);
    }
    respond({ok:true});return;
  }
  if (typeof message.requestId!=='string' || !Array.isArray(message.texts) || message.texts.length>2000 || message.texts.some((s: unknown) => typeof s !== 'string') || message.texts.join('').length > 2000) { respond({error:'Invalid batch'}); return; }
  if(purpose==='playground' && (!message.texts.length || message.texts.length>4 || message.texts.some((text:string)=>!text.length || text.length>40))) {respond({error:'Playground analysis accepts up to four verbs of 40 characters each'});return;}
  if (!queue) { queue={jobs:[],running:false,closed:false}; queues.set(tabId,queue); }
  // Replacing a playground query must not cancel the same document's readings.
  for(const job of queue.jobs) if(job.owner===owner && job.purpose===purpose)cancel(job);
  queue.jobs=queue.jobs.filter(job=>!job.cancelled);
  if(queue.active?.owner===owner && queue.active.purpose===purpose)cancel(queue.active);
  if (queue.jobs.length >= 32) { respond({error:'Too many active frames. Try scrolling after other frames settle.'}); return; }
  queue.jobs.push({overrides:purpose==='playground'?{}:validOverrides(message.overrides),texts:message.texts,includeWords:purpose==='playground' || message.includeWords===true,requestId:message.requestId,owner,purpose,jobId:crypto.randomUUID(),cancelled:false,dispatched:false,respond});
  if (!queue.running) void drain(tabId,queue);
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => {
  const queue=queues.get(tabId);
  if(queue) {queue.closed=true;for(const job of queue.jobs.splice(0))cancel(job);if(queue.active)cancel(queue.active);queues.delete(tabId);}
  chrome.runtime.sendMessage({type:'worker-release',tabId}).catch(()=>{});
});
