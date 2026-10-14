import {test,expect} from '@playwright/test';
import {appearance,appearanceForSite,validOverrides,validateOverride,readWithOverrides} from '../src/preferences';
import {AdaptivePacer} from '../src/pacing';
test('preferences validate local readings, bounds and per-site isolation',()=>{
  expect(appearance({scale:99,contrast:'high'})).toEqual({scale:1.5,contrast:'high'});
  expect(appearance({scale:NaN})).toEqual({scale:1,contrast:'auto'});
  expect(appearanceForSite({'example.com':{scale:.75}},'other.com').scale).toBe(1);
  expect(validateOverride(' 日本語 ','ニホンゴ')).toEqual({word:'日本語',reading:'にほんご'});
  expect(()=>validateOverride('日本語','abc')).toThrow();
  expect(()=>validateOverride('abc','にほんご')).toThrow();
  expect(validOverrides({'日本語':'ニホンゴ','京都':17,'東京':'invalid'})).toEqual({'日本語':'にほんご'});
  expect(Object.keys(validOverrides(Object.fromEntries(Array.from({length:300},(_,i)=>[`字${i}`,'じ']))))).toHaveLength(200);
});
test('longest corrections span tokens and preserve readings around partial matches',()=>{
  const read=(text:string)=>Array.from(text,(c,i)=>({start:i,end:i+1,reading:c==='語'?'ご':'じ'}));
  expect(readWithOverrides('日本語と日本',{'日本':'にっぽん','日本語':'にほんご'},read)).toEqual([
    {start:0,end:3,reading:'にほんご'},{start:3,end:4,reading:'じ'},{start:4,end:6,reading:'にっぽん'}
  ]);
  expect(readWithOverrides('東京都',{'京':'けい'},read)).toEqual([{start:0,end:1,reading:'じ'},{start:1,end:2,reading:'けい'},{start:2,end:3,reading:'じ'}]);
});
test('adaptive pacing waits for bursts to settle and recovers its normal budget',()=>{
  const p=new AdaptivePacer();expect(p.mark('scroll',0)).toBe(100);
  for(let i=1;i<=10;i++)p.mark('scroll',i*20);
  expect(p.mark('edit',220)).toBe(500);expect(p.budget(300)).toBe(2);
  expect(p.budget(2000)).toBe(4);expect(p.mark('scroll',3000)).toBe(100);
});

test('Docs reading view defaults off and bounds spacing',async()=>{
  const {docsReadingView}=await import('../src/preferences');
  expect(docsReadingView(undefined)).toEqual({enabled:false,spacing:2.8});
  expect(docsReadingView({enabled:true,spacing:99})).toEqual({enabled:true,spacing:3.4});
  expect(docsReadingView({enabled:'true',spacing:NaN})).toEqual({enabled:false,spacing:2.8});
});

test('reading panel preferences migrate Docs only, isolate sites, and bound appearance',async()=>{
  const {readingViewPreferences,panelEnabled}=await import('../src/preferences');
  const migrated=readingViewPreferences(undefined,{enabled:true,spacing:3.4});
  expect(migrated).toEqual({sites:{'docs.google.com':true},spacing:3.4,fontSize:20,width:420});
  expect(panelEnabled(migrated,'example.com')).toBe(false);
  expect(readingViewPreferences({sites:{'example.com':true,bad:'true'},width:999,fontSize:24,spacing:2.2})).toEqual({sites:{'example.com':true},width:720,fontSize:24,spacing:2.2});
  expect(readingViewPreferences({sites:{},width:NaN,fontSize:21},{enabled:true}).sites).toEqual({});
  expect(panelEnabled(readingViewPreferences(undefined),'toString')).toBe(false);
});

test('correction backup merge validates atomically, normalizes readings, and keeps existing values',async()=>{
  const {mergeCorrectionBackup,correctionMatches}=await import('../src/preferences');
  const existing={'日本語':'にっぽんご'};
  expect(mergeCorrectionBackup(JSON.stringify({version:1,corrections:{'日本語':'にほんご',' 東京 ':'トウキョウ'}}),existing)).toEqual({values:{'日本語':'にっぽんご','東京':'とうきょう'},added:1,skipped:1});
  expect(existing).toEqual({'日本語':'にっぽんご'});
  for(const data of [{version:2,corrections:{}},{version:1,corrections:[]},{version:1,corrections:{'東京':'とうきょう','学校':17}},{version:1,corrections:{'東京':'abc'}}])expect(()=>mergeCorrectionBackup(JSON.stringify(data),existing)).toThrow();
  expect(()=>mergeCorrectionBackup('{',existing)).toThrow('JSON');
  expect(()=>mergeCorrectionBackup(' '.repeat(256*1024+1),existing)).toThrow('256 KiB');
  expect(correctionMatches('東京','とうきょう','トウキョウ')).toBe(true);
  expect(correctionMatches('東京','とうきょう',' 京都 ')).toBe(false);
});

test('correction backups reject capacity and normalized conflicts without truncating',async()=>{
  const {mergeCorrectionBackup}=await import('../src/preferences');
  const full=Object.fromEntries(Array.from({length:200},(_,i)=>[`字${i}`,'じ']));
  expect(()=>mergeCorrectionBackup(JSON.stringify({version:1,corrections:{'東京':'とうきょう'}}),full)).toThrow('200');
  expect(Object.keys(full)).toHaveLength(200);
  expect(mergeCorrectionBackup(JSON.stringify({version:1,corrections:full}),{}).added).toBe(200);
  expect(()=>mergeCorrectionBackup(JSON.stringify({version:1,corrections:{' 東京 ':'とうきょう','東京':'ひがしきょう'}}),{})).toThrow('conflicting');
});
