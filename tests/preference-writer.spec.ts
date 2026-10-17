import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

async function harness(initial:Record<string,any>={}) {
  let state=structuredClone(initial),listener:Function=()=>{},failNextWrite=false;
  const id='a'.repeat(32),root=`chrome-extension://${id}/`;
  const chrome={runtime:{id,getURL:(path:string)=>root+path,onMessage:{addListener:(fn:Function)=>listener=fn}},storage:{local:{
    get:async()=>structuredClone(state),
    set:async(values:Record<string,unknown>)=>{if(failNextWrite){failNextWrite=false;throw new Error('Storage failed');}state={...state,...structuredClone(values)};}
  }}};
  const [writer,client]=await Promise.all([
    build({entryPoints:['src/preference-writer.ts'],bundle:true,write:false,platform:'browser',format:'iife'}),
    build({entryPoints:['src/preferences.ts'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'preferences'})
  ]);
  runInNewContext(writer.outputFiles[0].text,{chrome,URL,TextEncoder});
  const popup={id,url:root+'popup.html'},web={id,tab:{id:1},frameId:0,url:'https://example.com/'};
  const send=(mutation:unknown,sender:unknown=web)=>new Promise<any>(resolve=>listener({type:'mutate-preferences',mutation},sender,resolve));
  const clients=[popup,web].map(sender=>runInNewContext(client.outputFiles[0].text+';preferences',{chrome:{runtime:{sendMessage:(message:any)=>send(message.mutation,sender)}}}));
  return {a:clients[0],b:clients[1],state:()=>state,send,id,root,fail:()=>{failNextWrite=true;}};
}

test('independent popup and webpage clients retain concurrent corrections and panel changes',async()=>{
  const h=await harness({readingOverrides:{'学校':'がっこう'},docsReadingView:{enabled:true,spacing:3.4}});
  await Promise.all([h.a.saveCorrection('東京','とうきょう'),h.b.saveCorrection('大阪','おおさか')]);
  expect(h.state().readingOverrides).toEqual({'学校':'がっこう','東京':'とうきょう','大阪':'おおさか'});
  await Promise.all([
    h.a.updateReadingView({width:640}),h.b.updateReadingView({fontSize:28}),
    h.a.updateReadingView({},{hostname:'one.test',enabled:true}),h.b.updateReadingView({},{hostname:'two.test',enabled:true})
  ]);
  expect(h.state().readingView).toEqual({sites:{'docs.google.com':true,'one.test':true,'two.test':true},spacing:3.4,fontSize:28,width:640});
});

test('imports, deletions, and saves share the same correction transaction queue',async()=>{
  const h=await harness({readingOverrides:{'学校':'がっこう','東京':'とうきょう'}});
  const [imported]=await Promise.all([
    h.a.importCorrections(JSON.stringify({version:1,corrections:{'学校':'がくこう','大阪':'おおさか'}})),
    h.b.removeCorrection('東京'),h.a.saveCorrection('京都','きょうと'),h.b.saveCorrection('学校','がくこう')
  ]);
  expect(imported.added).toBe(1);expect(imported.skipped).toBe(1);
  expect(h.state().readingOverrides).toEqual({'学校':'がくこう','大阪':'おおさか','京都':'きょうと'});
});

test('concurrent corrections enforce the shared capacity and recover after rejected writes',async()=>{
  const existing=Object.fromEntries(Array.from({length:199},(_,i)=>[`字${i}`,'じ']));
  const h=await harness({readingOverrides:existing});
  const outcomes=await Promise.allSettled([h.a.saveCorrection('東京','とうきょう'),h.b.saveCorrection('大阪','おおさか')]);
  expect(outcomes.map(value=>value.status)).toEqual(['fulfilled','rejected']);
  expect(Object.keys(h.state().readingOverrides)).toHaveLength(200);
  await h.a.removeCorrection('字0');await h.b.saveCorrection('大阪','おおさか');
  expect(Object.keys(h.state().readingOverrides)).toHaveLength(200);
  expect(h.state().readingOverrides['東京']).toBe('とうきょう');expect(h.state().readingOverrides['大阪']).toBe('おおさか');
});

test('failed validation and storage writes do not block later queued changes',async()=>{
  const h=await harness({readingOverrides:{'学校':'がっこう'}});
  const [invalid]=await Promise.allSettled([h.a.importCorrections(JSON.stringify({version:1,corrections:{'東京':'とうきょう','大阪':'bad'}}))]);
  expect(invalid.status).toBe('rejected');if(invalid.status==='rejected')expect(String(invalid.reason)).toContain('hiragana');
  expect(h.state().readingOverrides).toEqual({'学校':'がっこう'});
  h.fail();
  const outcomes=await Promise.allSettled([h.a.saveCorrection('東京','とうきょう'),h.b.saveCorrection('大阪','おおさか')]);
  expect(outcomes.map(value=>value.status)).toEqual(['rejected','fulfilled']);
  expect(h.state().readingOverrides).toEqual({'学校':'がっこう','大阪':'おおさか'});
});

test('site pauses and appearance patches preserve changes from other clients',async()=>{
  const h=await harness();
  await Promise.all([h.a.pauseSite('one.test',true),h.b.pauseSite('two.test',true)]);
  expect(h.state().excluded).toEqual(['one.test','two.test']);
  await Promise.all([h.a.updateSiteAppearance('one.test',{scale:1.5}),h.b.updateSiteAppearance('two.test',{contrast:'high'}),h.b.updateSiteAppearance('one.test',{contrast:'high'})]);
  expect(h.state().siteAppearance).toEqual({'one.test':{scale:1.5,contrast:'high'},'two.test':{scale:1,contrast:'high'}});
});

test('the preference writer rejects unknown senders and malformed operations without changing storage',async()=>{
  const h=await harness(),mutation={kind:'save-correction',word:'東京',reading:'とうきょう'};
  for(const sender of [
    {url:h.root+'popup.html'},
    {id:'b'.repeat(32),url:h.root+'popup.html'},
    {id:h.id,url:h.root+'offscreen.html'},
    {id:h.id,tab:{id:1},frameId:1,url:'https://example.com/'},
    {id:h.id,tab:{id:1},frameId:0,url:'about:blank'}
  ])expect((await h.send(mutation,sender)).error).toContain('sender');
  for(const mutation of [null,[],{kind:'unknown'},{kind:'save-correction',word:17,reading:'とうきょう'},{kind:'reading-view',patch:{sites:{'bad.test':true}}},{kind:'site-appearance',hostname:'one.test',patch:{contrast:'bad'}}])expect((await h.send(mutation)).error).toBeTruthy();
  expect(h.state()).toEqual({});
  await h.a.saveCorrection('東京','とうきょう');expect(h.state().readingOverrides).toEqual({'東京':'とうきょう'});
});
