import {test,expect} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('internal tokenizer commands accept only the extension service worker',async()=>{
  let listener:Function=()=>{};
  const forwarded:unknown[]=[];
  const id='a'.repeat(32),url=`chrome-extension://${id}/`;
  const chrome={runtime:{id,getURL:(path:string)=>url+path,onMessage:{addListener:(fn:Function)=>listener=fn}}};
  class Worker {onmessage?:Function;onerror?:Function;postMessage(message:unknown){forwarded.push(message);}}
  runInNewContext(await readFile('dist/offscreen.js','utf8'),{chrome,Worker});
  const job={type:'worker-job',jobId:'one',key:'1:readings',texts:['日本語']};
  for(const sender of [
    {id,tab:{id:1},url:'https://example.com/'},
    {id,url:url+'popup.html'},
    {id:'b'.repeat(32),url:url+'background.js'},
    {id},
    {id,tab:{id:1},url:url+'background.js'}
  ])for(const type of ['worker-job','worker-cancel','worker-release'])listener({...job,type},sender,()=>{});
  expect(forwarded).toEqual([]);
  expect(listener(job,{id,url:url+'background.js'},()=>{})).toBe(true);
  expect(forwarded).toEqual([{id:1,key:'1:readings',texts:['日本語'],overrides:undefined,includeWords:undefined}]);
});

test('Docs initialization rejects malformed IDs and stops accepting page events after initialization',async()=>{
  const listeners=new Map<string,Function>();
  const window:any={addEventListener:(type:string,fn:Function)=>listeners.set(type,fn),removeEventListener:(type:string)=>listeners.delete(type)};
  runInNewContext(await readFile('dist/docs-bridge.js','utf8'),{window});
  for(const detail of [undefined,{},'https://attacker.example', 'z'.repeat(32)])listeners.get('ko-docs-init')!({detail});
  expect(window._docs_annotate_canvas_by_ext).toBeUndefined();
  listeners.get('ko-docs-init')!({detail:'a'.repeat(32)});
  expect(window._docs_annotate_canvas_by_ext).toBe('a'.repeat(32));
  expect(listeners.size).toBe(0);
});

test('packaged executable JavaScript contains no string compilation or remote script loaders',async()=>{
  for(const name of (await readdir('dist')).filter(name=>name.endsWith('.js'))) {
    const code=await readFile(`dist/${name}`,'utf8');
    expect(code,name).not.toMatch(/\b(?:eval|Function|importScripts)\s*\(/);
    expect(code,name).not.toMatch(/\b(?:WebSocket|EventSource)\s*\(/);
    expect(code,name).not.toContain('sendBeacon');
  }
});
