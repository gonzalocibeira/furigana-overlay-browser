import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
test('cancelled queued jobs never reach the worker; active cancellation stays isolated by document',async()=>{
  let listener:Function=()=>{},uuid=0;
  const sent:any[]=[],pending=new Map<string,Function>();
  const chrome={
    runtime:{ContextType:{OFFSCREEN_DOCUMENT:'offscreen'},getContexts:async()=>[{}],
      onMessage:{addListener:(fn:Function)=>listener=fn},
      sendMessage:(message:any)=>{
        sent.push(message);
        if(message.type==='worker-job')return new Promise(resolve=>pending.set(message.jobId,resolve));
        if(message.type==='worker-cancel'){pending.get(message.jobId)?.({cancelled:true});pending.delete(message.jobId);}
        return Promise.resolve({ok:true});
      }},tabs:{onRemoved:{addListener:()=>{}}}
  };
  runInNewContext(await readFile('dist/background.js','utf8'),{chrome,crypto:{randomUUID:()=>`job-${++uuid}`}});
  const sender=(id:string)=>({tab:{id:1},documentId:id,frameId:0});
  const send=(message:any,document='a')=>new Promise<any>(resolve=>listener(message,sender(document),resolve));
  const a=send({type:'tokenize',requestId:'a',texts:['日本語']});
  await expect.poll(()=>sent.filter(m=>m.type==='worker-job').length).toBe(1);
  const b=send({type:'tokenize',requestId:'b',texts:['図書館']},'b');
  await send({type:'cancel-tokenize',requestId:'b'},'b');
  expect(await b).toEqual({cancelled:true});expect(sent.filter(m=>m.type==='worker-job')).toHaveLength(1);
  await send({type:'cancel-tokenize',requestId:'a'},'other');
  expect(sent.filter(m=>m.type==='worker-cancel')).toHaveLength(0);
  await send({type:'cancel-tokenize',requestId:'a'});
  expect(await a).toEqual({cancelled:true});expect(sent.filter(m=>m.type==='worker-cancel')).toHaveLength(1);
  const fresh=send({type:'tokenize',requestId:'fresh',texts:['病気']});
  await expect.poll(()=>sent.filter(m=>m.type==='worker-job').length).toBe(2);
  const last=sent.filter(m=>m.type==='worker-job').at(-1);pending.get(last.jobId)!({results:[[]]});
  expect(await fresh).toEqual({results:[[]]});
});
