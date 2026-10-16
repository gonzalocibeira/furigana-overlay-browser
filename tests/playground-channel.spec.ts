import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

async function harness() {
  let listener:Function=()=>{},removed:Function=()=>{},uuid=0;
  const sent:any[]=[],pending=new Map<string,Function>();
  const event={addListener:()=>{}};
  const chrome={runtime:{ContextType:{OFFSCREEN_DOCUMENT:'offscreen'},getContexts:async()=>[{}],
    onMessage:{addListener:(fn:Function)=>listener=fn},onInstalled:event,onStartup:event,
    sendMessage:(message:any)=>{
      sent.push(message);
      if(message.type==='worker-job')return new Promise(resolve=>pending.set(message.jobId,resolve));
      if(message.type==='worker-cancel') {pending.get(message.jobId)?.({cancelled:true});pending.delete(message.jobId);}
      return Promise.resolve({ok:true});
    }},tabs:{onRemoved:{addListener:(fn:Function)=>removed=fn},onActivated:event,onUpdated:event,query:async()=>[]},storage:{onChanged:event}};
  const bundle=await build({entryPoints:['src/background.ts'],bundle:true,write:false,platform:'browser',format:'iife'});
  runInNewContext(bundle.outputFiles[0].text,{chrome,crypto:{randomUUID:()=>`job-${++uuid}`}});
  const send=(message:any,document='a')=>new Promise<any>(resolve=>listener(message,{tab:{id:1},documentId:document,frameId:0},resolve));
  const jobs=()=>sent.filter(message=>message.type==='worker-job');
  return {send,sent,pending,jobs,remove:()=>removed(1)};
}

test('playground analysis and page readings cannot replace or cancel one another',async()=>{
  const h=await harness();
  const reading=h.send({type:'tokenize',requestId:'same',texts:['日本語']});
  await expect.poll(()=>h.jobs().length).toBe(1);
  const playground=h.send({type:'tokenize',purpose:'playground',requestId:'same',texts:['読む'],overrides:{'読む':'bogus'}});
  expect(h.sent.filter(message=>message.type==='worker-cancel')).toHaveLength(0);
  await h.send({type:'cancel-tokenize',purpose:'playground',requestId:'same'});
  expect(await playground).toEqual({cancelled:true});
  expect(h.sent.filter(message=>message.type==='worker-cancel')).toHaveLength(0);
  h.pending.get(h.jobs()[0].jobId)!({results:[[]]});
  expect(await reading).toEqual({results:[[]]});
  const next=h.send({type:'tokenize',purpose:'playground',requestId:'next',texts:['食べる'],overrides:{'食べる':'bogus'}});
  await expect.poll(()=>h.jobs().length).toBe(2);
  const job=h.jobs()[1];
  expect(job.key).toBe('1:playground');expect(job.includeWords).toBe(true);expect(job.overrides).toEqual({});
  await h.send({type:'cancel-tokenize',requestId:'next'});
  expect(h.sent.filter(message=>message.type==='worker-cancel')).toHaveLength(0);
  h.pending.get(job.jobId)!({words:[[]],results:[[]]});
  expect(await next).toEqual({words:[[]],results:[[]]});
});

test('only stale requests in the same document and purpose are replaced',async()=>{
  const h=await harness();
  const old=h.send({type:'tokenize',purpose:'playground',requestId:'old',texts:['読む']});
  await expect.poll(()=>h.jobs().length).toBe(1);
  const reading=h.send({type:'tokenize',requestId:'reading',texts:['日本語']});
  const fresh=h.send({type:'tokenize',purpose:'playground',requestId:'fresh',texts:['書く']});
  expect(await old).toEqual({cancelled:true});
  await expect.poll(()=>h.jobs().length).toBe(2);
  expect(h.jobs()[1].key).toBe('1:readings');
  h.pending.get(h.jobs()[1].jobId)!({results:[[]]});expect(await reading).toEqual({results:[[]]});
  await expect.poll(()=>h.jobs().length).toBe(3);
  await h.send({type:'cancel-tokenize',purpose:'playground',requestId:'fresh'},'other');
  expect(h.sent.filter(message=>message.type==='worker-cancel')).toHaveLength(1);
  h.pending.get(h.jobs()[2].jobId)!({words:[[]]});expect(await fresh).toEqual({words:[[]]});
});

test('malformed playground batches are rejected before they can cancel valid work',async()=>{
  const h=await harness();
  const reading=h.send({type:'tokenize',requestId:'active',texts:['日本語']});
  await expect.poll(()=>h.jobs().length).toBe(1);
  for(const texts of [[],[''],['読'.repeat(41)],Array(5).fill('読む'),[7]]) {
    expect(await h.send({type:'tokenize',purpose:'playground',requestId:'bad',texts})).toHaveProperty('error');
  }
  expect(await h.send({type:'tokenize',purpose:'unknown',requestId:'bad',texts:['読む']})).toHaveProperty('error');
  expect(await h.send({type:'cancel-tokenize',purpose:'unknown',requestId:'active'})).toHaveProperty('error');
  expect(h.jobs()).toHaveLength(1);expect(h.sent.filter(message=>message.type==='worker-cancel')).toHaveLength(0);
  h.pending.get(h.jobs()[0].jobId)!({results:[[]]});expect(await reading).toEqual({results:[[]]});
});

test('closing the tab cancels both purposes and releases their local caches',async()=>{
  const h=await harness();
  const reading=h.send({type:'tokenize',requestId:'read',texts:['日本語']});
  await expect.poll(()=>h.jobs().length).toBe(1);
  const playground=h.send({type:'tokenize',purpose:'playground',requestId:'play',texts:['読む']});
  h.remove();
  expect(await reading).toEqual({cancelled:true});expect(await playground).toEqual({cancelled:true});
  expect(h.sent.some(message=>message.type==='worker-release' && message.tabId===1)).toBe(true);
});
