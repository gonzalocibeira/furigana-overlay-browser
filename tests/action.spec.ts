import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {toolbarPresentation,type PageStatus} from '../src/action-state';

const ready:PageStatus={message:'No visible kanji in this view.',state:'active',toolbarAvailability:'ready'};
test('toolbar stays active without kanji and during processing or background suspension',()=>{
  for(const state of ['active','loading','paused'] as const) {
    expect(toolbarPresentation('https://example.com/read',{}, {...ready,state})).toEqual({state:'active',title:'Kō — active on example.com'});
  }
});
test('toolbar distinguishes preference pauses from unsupported pages and processing failures',()=>{
  expect(toolbarPresentation('chrome://settings',{enabled:false}).title).toContain('paused everywhere');
  expect(toolbarPresentation('https://example.com',{excluded:['example.com']}).title).toContain('paused on example.com');
  expect(toolbarPresentation('chrome://settings',{}).state).toBe('unavailable');
  expect(toolbarPresentation('https://example.com',{}).title).toContain('reload');
  expect(toolbarPresentation('https://docs.google.com/document/d/test',{}, {...ready,state:'unavailable',toolbarAvailability:'unavailable',message:'Docs text is unavailable.'})).toEqual({state:'unavailable',title:'Kō — Docs text is unavailable.'});
});

class Event {
  listeners:Function[]=[];
  addListener=(fn:Function)=>this.listeners.push(fn);
  emit=(...args:unknown[])=>this.listeners.forEach(fn=>fn(...args));
}
async function toolbarHarness() {
  const messages=new Event(),updates=new Event(),activated=new Event(),removed=new Event(),changed=new Event(),installed=new Event(),startup=new Event();
  const icons:any[]=[],titles:any[]=[];
  const preferences:{enabled:boolean;excluded:string[]}={enabled:true,excluded:[]};
  const tab={id:1,url:'https://example.com'};
  let status=async()=>ready;
  const chrome={
    runtime:{onMessage:messages,onInstalled:installed,onStartup:startup,sendMessage:async()=>({})},
    storage:{onChanged:changed,local:{get:async()=>({...preferences})}},
    tabs:{query:async()=>[{...tab}],get:async()=>({...tab}),sendMessage:()=>status(),onUpdated:updates,onActivated:activated,onRemoved:removed},
    action:{setIcon:async(value:unknown)=>{icons.push(value);},setTitle:async(value:unknown)=>{titles.push(value);}}
  };
  const source=await readFile('dist/background.js','utf8');
  const restart=()=>runInNewContext(source,{chrome,URL});
  restart();
  await expect.poll(()=>titles.at(-1)?.title).toContain('active on example.com');
  return {messages,updates,activated,removed,changed,installed,startup,icons,titles,preferences,tab,restart,setStatus:(fn:()=>Promise<PageStatus>)=>{status=fn;}};
}
test('toolbar controller restores icons on worker startup and responds only to top-frame notifications',async()=>{
  const h=await toolbarHarness();
  expect(h.icons.at(-1).path[16]).toBe('icons/icon-active-16.png');
  const beforeHash=h.titles.length;
  h.tab.url='https://example.com/#reading';h.updates.emit(1,{url:h.tab.url},{status:'complete'});
  await expect.poll(()=>h.titles.length).toBeGreaterThan(beforeHash);
  expect(h.titles.at(-1).title).toContain('active on example.com');
  h.setStatus(async()=>({...ready,toolbarAvailability:'unavailable',message:'Docs text is unavailable.'}));
  const count=h.titles.length;
  h.messages.emit({type:'toolbar-status-changed'},{tab:{id:1},frameId:3},()=>{});
  await Promise.resolve();expect(h.titles).toHaveLength(count);
  h.messages.emit({type:'toolbar-status-changed'},{tab:{id:1},frameId:0},()=>{});
  await expect.poll(()=>h.titles.at(-1)?.title).toContain('Docs text is unavailable');
  expect(h.icons.at(-1).path[32]).toBe('icons/icon-unavailable-32.png');
  h.setStatus(async()=>ready);h.restart();
  await expect.poll(()=>h.titles.at(-1)?.title).toContain('active on example.com');
  h.preferences.enabled=false;h.changed.emit({enabled:{newValue:false}},'local');
  await expect.poll(()=>h.titles.at(-1)?.title).toContain('paused everywhere');
  expect(h.icons.at(-1).path[16]).toBe('icons/icon-paused-16.png');
  h.preferences.enabled=true;h.preferences.excluded=['example.com'];h.changed.emit({excluded:{newValue:['example.com']}},'local');
  await expect.poll(()=>h.titles.at(-1)?.title).toContain('paused on example.com');
});
test('newer tab updates win over stale probes and closed tabs cannot receive late results',async()=>{
  const h=await toolbarHarness();
  let finish!:(value:PageStatus)=>void,started=false;
  h.setStatus(()=>{started=true;return new Promise(resolve=>{finish=resolve;});});
  h.activated.emit({tabId:1});await expect.poll(()=>started).toBe(true);
  h.tab.url='chrome://settings';h.updates.emit(1,{status:'loading'});
  await expect.poll(()=>h.titles.at(-1)?.title).toContain('unavailable on this page');
  finish(ready);await Promise.resolve();await Promise.resolve();
  expect(h.titles.at(-1).title).toContain('unavailable on this page');
  h.tab.url='https://example.com';started=false;h.activated.emit({tabId:1});
  await expect.poll(()=>started).toBe(true);
  const count=h.titles.length;h.removed.emit(1);finish(ready);
  await Promise.resolve();await Promise.resolve();expect(h.titles).toHaveLength(count);
});
