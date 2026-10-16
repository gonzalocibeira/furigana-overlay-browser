import {test,expect,chromium} from '@playwright/test';
import kuromoji from 'kuromoji';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {buildMeaningForks,type MeaningForks} from '../src/meaning-forks';
import {hiragana,type Word} from '../src/shared';
import {uiTheme} from '../src/ui-theme';

let tokenizer:kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
test.beforeAll(async()=>{
  tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:'dist/dict/'}).build((error,value)=>error?reject(error):resolve(value)));
});

function wordsFor(text:string):Word[] {
  let offset=0;
  return tokenizer.tokenize(text).flatMap(token=>{
    const start=text.indexOf(token.surface_form,offset);
    offset=start+token.surface_form.length;
    return /[\p{L}\p{N}]/u.test(token.surface_form)
      ? [{start,end:offset,lemma:token.basic_form,reading:hiragana(token.reading??''),pos:token.pos,posDetail:token.pos_detail_1,verbClass:token.conjugated_type,verbForm:token.conjugated_form}]
      : [];
  });
}

function forksFor(text:string,index=0) {return buildMeaningForks(text,wordsFor(text),index);}

test('ichidan rareru offers common functions for all supported endings',()=>{
  const cases:[string,boolean,boolean,boolean][]=[
    ['食べられる',false,false,false],['食べられた',true,false,false],
    ['食べられない',false,true,false],['食べられなかった',true,true,false],
    ['食べられます',false,false,true],['食べられました',true,false,true],
    ['食べられません',false,true,true],['食べられませんでした',true,true,true],
  ];
  for(const [text,past,negative,polite] of cases) {
    const words=wordsFor(text);
    for(let index=0;index<words.length;index++) {
      expect(buildMeaningForks(text,words,index),`${text}, selected token ${index}`).toMatchObject({start:0,end:text.length,source:text,kind:'rareru',past,negative,polite,possibilities:['potential','passive','honorific']});
    }
  }
  expect(forksFor('見られる')).toMatchObject({lemma:'見る',reading:'みられる'});
  expect(forksFor('来られない')).toMatchObject({lemma:'来る',reading:'こられない',negative:true});
});

test('causative make and let uses explicit ichidan, godan and suru chains',()=>{
  for(const text of ['食べさせる','食べさせた','食べさせない','食べさせなかった','食べさせます','食べさせました','食べさせません','食べさせませんでした','読ませる','行かせる','買わせる','させる']) {
    expect(forksFor(text),text).toMatchObject({source:text,kind:'causative',possibilities:['make','let']});
  }
  expect(forksFor('読ませませんでした')).toMatchObject({past:true,negative:true,polite:true});
});

test('selected ending keeps the complete phrase and exact sentence offsets',()=>{
  const text='昨日は食べられませんでした。今日は見る。';
  const words=wordsFor(text);
  const index=words.findIndex(word=>word.lemma==='です');
  expect(buildMeaningForks(text,words,index)).toMatchObject({start:3,end:13,source:'食べられませんでした',reading:'たべられませんでした'});
  expect(buildMeaningForks(text,words,words.length-1)).toBeUndefined();
});

test('isolated lexemes, noun suffixes and unsupported compound forms never trigger',()=>{
  for(const text of ['流れる','荒れる','見せる','任せる','騙せる','母られる','られる','させ','読まれる','尊敬される','食べられそう','食べられちゃった','食べられています','食べられなければ','食べられたら','食べられるらしい','食べさせられる','食べさせたい','食べさせて','食べられるな','食べさせるな','食べられないで','食べさせましたら','食べられれば','食べられると','食べられたり']) {
    const words=wordsFor(text);
    for(let index=0;index<words.length;index++)expect(buildMeaningForks(text,words,index),text).toBeUndefined();
  }
});

test('missing morphology, discontinuous spans and invalid selections are rejected',()=>{
  const text='食べられる',words=wordsFor(text);
  expect(buildMeaningForks(text,words.map(({pos,...word})=>word),0)).toBeUndefined();
  expect(buildMeaningForks(text,words.map(({posDetail,...word})=>word),0)).toBeUndefined();
  const spaced='食べ られる';
  expect(buildMeaningForks(spaced,wordsFor(spaced),0)).toBeUndefined();
  expect(buildMeaningForks('食べ、られる',wordsFor('食べ、られる'),0)).toBeUndefined();
  expect(buildMeaningForks(text,[{...words[0],verbClass:'五段・バ行'},words[1]],0)).toBeUndefined();
  expect(buildMeaningForks(text,[{...words[0],end:NaN},words[1]],0)).toBeUndefined();
  for(const index of [-1,0.5,99,NaN])expect(buildMeaningForks(text,words,index)).toBeUndefined();
});

test('dictionary ambiguity is preserved rather than silently normalized',()=>{
  // IPADIC analyzes bare 来られる with the classical godan reading きたられる.
  // Do not silently replace that analysis with modern こられる from spelling.
  const words=wordsFor('来られる');
  expect(words[0].verbClass).toBe('五段・ラ行');
  expect(buildMeaningForks('来られる',words,0)).toBeUndefined();
});

test('native buttons support keyboard exploration, offline references and a narrow panel',async()=>{
  const bundle=await build({entryPoints:[resolve('src/meaning-forks.ts')],bundle:true,write:false,format:'iife',globalName:'MeaningForkTest'});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
  const page=await browser.newPage({viewport:{width:280,height:900}});
  const requests:string[]=[];
  page.on('request',request=>requests.push(request.url()));
  try {
    await page.setContent(`<style>${uiTheme}body{margin:0;padding:10px}</style><main></main>`);
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.evaluate((forks:MeaningForks)=>{
      const module=(window as any).MeaningForkTest;
      const style=document.createElement('style');style.textContent=module.meaningForkStyles;document.head.append(style);
      document.querySelector('main')!.append(module.renderMeaningForks(forks));
    },forksFor('食べられませんでした')!);
    await expect(page.getByRole('button',{name:'Potential',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.meaning-traits')).toHaveText('Past form · Negative form · Polite ending');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button',{name:'Potential',exact:true})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button',{name:'Passive',exact:true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.meaning-selected')).toHaveText('Passive');
    await expect(page.locator('.meaning-explanation')).toContainText('affected by an action');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(page.locator('.meaning-selected')).toHaveText('Honorific');
    await expect(page.locator('.meaning-explanation')).toContainText('person performing the action');
    await expect(page.locator('.meaning-explanation')).toContainText('listener');
    await expect(page.locator('.meaning-diagram')).toHaveAttribute('aria-hidden','true');
    await expect(page.locator('.meaning-detail')).toHaveAttribute('aria-live','polite');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(280);
    expect(requests).toEqual([]);
    await expect(page.getByRole('link',{name:'Potential',exact:true})).toHaveAttribute('rel','noopener noreferrer');
    await page.screenshot({path:test.info().outputPath('meaning-forks-narrow.png')});
    await page.evaluate((forks:MeaningForks)=>document.querySelector('main')!.replaceChildren((window as any).MeaningForkTest.renderMeaningForks(forks)),forksFor('食べさせる')!);
    await page.getByRole('button',{name:'Let',exact:true}).click();
    await expect(page.locator('.meaning-explanation')).toHaveText('The permitter lets someone perform the action.');
    await expect(page.getByRole('button',{name:'Make',exact:true})).toHaveAttribute('aria-pressed','false');
    expect(requests).toEqual([]);
  } finally {await browser.close();}
});
