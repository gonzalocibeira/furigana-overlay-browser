import type {Reading,Word} from './shared';
import type {Appearance,DocsReadingView} from './preferences';
import {definitionText,dictionaryURL,type DictionaryReply,type DictionaryPage,type DefinitionLanguage} from './definitions';
export interface ReadingRun {text:string;top:number;left:number;right:number;readings:Reading[];words?:Word[]}
export function readingLines(runs:ReadingRun[]) {
  const rows:ReadingRun[][]=[];
  for(const run of [...runs].sort((a,b)=>a.top-b.top||a.left-b.left)) {
    const row=rows.at(-1);
    if(row && Math.abs(run.top-row[0].top)<=3)row.push(run);else rows.push([run]);
  }
  return rows.map(row=>{
    let text='',right=-Infinity;
    const readings:Reading[]=[];
    const words:Word[]=[];
    for(const run of row.sort((a,b)=>a.left-b.left)) {
      if(text && run.left-right>3 && !/\s$/.test(text) && !/^\s/.test(run.text))text+=' ';
      const offset=text.length;text+=run.text;right=run.right;
      for(const part of run.readings)readings.push({...part,start:part.start+offset,end:part.end+offset});
      for(const word of run.words ?? [])words.push({...word,start:word.start+offset,end:word.end+offset});
    }
    return {text,readings,...(row.some(run=>run.words)?{words}:{})};
  });
}
type DefinitionResult=Record<DefinitionLanguage,{page:DictionaryPage;definitions:string[]}>;
export class ReadingPanel {
  private host=document.createElement('fob-reading-view');
  private root=this.host.attachShadow({mode:'closed'});
  private content:HTMLElement;
  private status:HTMLElement;
  private context='';
  private scrollTop=0;
  private rendered?:string;
  private definition:HTMLElement;
  private lookupVersion=0;
  private selected?:HTMLButtonElement;
  private definitions=new Map<string,DefinitionResult>();
  constructor(close:()=>void) {
    this.root.innerHTML=`<style>
:host{all:initial!important;position:fixed!important;right:12px!important;top:var(--reader-top,100px)!important;bottom:12px!important;width:min(420px,calc(100vw - 24px))!important;z-index:2147483647!important;display:block!important;contain:layout style!important;color-scheme:light!important}*{box-sizing:border-box}.reader{height:100%;display:flex;flex-direction:column;background:#fffdf7;color:#193f3c;border:1px solid #cbd8ce;border-radius:16px;box-shadow:0 8px 36px #193f3c26;overflow:hidden;font:13px/1.5 system-ui,sans-serif}.reader.high{color:#101010;background:#fff}.header{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #dfe7e0}h2{font:700 16px/1.3 system-ui;margin:0}small{display:block;color:#647572;font-size:11px;margin-top:3px}button{margin-left:auto;flex:none;background:transparent;border:1px solid #cbd8ce;border-radius:8px;color:inherit;cursor:pointer;padding:6px 9px;font:600 12px system-ui}button:focus-visible,.content:focus-visible{outline:2px solid #c28637;outline-offset:-3px}.content{padding:18px 22px 28px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;font:20px system-ui,sans-serif;user-select:text}.line{margin:0;line-height:var(--reader-spacing,2.8);white-space:pre-wrap;overflow-wrap:anywhere}ruby{ruby-position:over;ruby-align:center}rt{font:var(--reader-ruby,.5em)/1 system-ui,sans-serif}.empty{font:13px/1.6 system-ui;color:#647572}.status{margin:0;padding:10px 18px;border-top:1px solid #dfe7e0;color:#647572;font-size:11px}@media print{:host{display:none!important}}
.word{display:inline;margin:0;padding:0;border:0;border-radius:3px;font:inherit;line-height:inherit;color:inherit;white-space:inherit;user-select:text}.word:hover,.word[aria-pressed=true]{background:#e4ebde;text-decoration:underline;text-decoration-color:#b18a46;text-underline-offset:5px}.word:focus-visible{outline-offset:2px}.definition[hidden]{display:none}.definition{flex:none;max-height:44%;overflow:auto;padding:14px 18px;border-top:1px solid #cbd8ce;background:#f3f6ee}.high .definition{background:#fff}.definition header{display:flex;align-items:center;gap:8px}.definition h3{font-size:18px;margin:0;overflow-wrap:anywhere}.definition h4{margin:12px 0 4px;font-size:12px}.definition p{margin:4px 0;overflow-wrap:anywhere}.definition ol{margin:4px 0;padding-left:20px}.definition a{color:inherit;text-underline-offset:2px}.definition .source{font-size:10px;color:#647572}.definition .pronunciation{font-size:12px;color:#647572}.definition .feedback{font-size:12px;color:#647572}
</style><section class="reader" role="region" aria-label="Furigana reading view"><header class="header"><div><h2>Reading view</h2><small>Click a word for English / 日本語 definitions online</small></div><button type="button" aria-label="Close reading view">Close</button></header><div class="content" tabindex="0" aria-label="Document reading text" lang="ja"></div><section class="definition" aria-label="Word definition" aria-live="polite" hidden></section><p class="status" role="status" aria-live="polite"></p></section>`;
    this.content=this.root.querySelector('.content')!;this.status=this.root.querySelector('.status')!;
    this.definition=this.root.querySelector('.definition')!;
    this.root.querySelector('button')!.addEventListener('click',close);
    this.content.addEventListener('click',event=>{
      const button=(event.target as Element).closest<HTMLButtonElement>('.word');
      const selection=(this.root as ShadowRoot & {getSelection?:()=>Selection|null}).getSelection?.() ?? window.getSelection();
      if(button && (selection?.isCollapsed ?? true))void this.define(button);
    });
    this.root.addEventListener('keydown',event=>{if((event as KeyboardEvent).key==='Escape' && !this.definition.hidden) {event.preventDefault();this.dismissDefinition(true);}});
  }
  owns(event:Event) {return event.composedPath().includes(this.host);}
  loading(show:boolean,text:string,keepContent=false) {
    // Leave the readable snapshot and open definition in place while debouncing.
    if(show && keepContent && this.rendered!==undefined)return;
    this.rendered=undefined;
    this.dismissDefinition();
    if(!show) {this.host.remove();this.content.replaceChildren();this.context='';this.scrollTop=0;return;}
    if(!this.host.isConnected)document.documentElement.append(this.host);
    if(this.content.childElementCount && !this.content.querySelector('.empty'))this.scrollTop=this.content.scrollTop;
    const p=document.createElement('p');p.className='empty';p.textContent=text;
    this.content.replaceChildren(p);this.status.textContent='Only the active page’s visible text is processed.';
  }
  display(runs:ReadingRun[],context:string,settings:DocsReadingView,appearance:Appearance,top:number,limited:boolean) {
    this.host.style.setProperty('--reader-top',`${Math.max(12,Math.min(top,innerHeight-180))}px`);
    this.host.style.setProperty('--reader-spacing',String(settings.spacing));
    this.host.style.setProperty('--reader-ruby',`${.5*appearance.scale}em`);
    this.root.querySelector('.reader')!.classList.toggle('high',appearance.contrast==='high');
    const lines=readingLines(runs),rendered=JSON.stringify([context,lines]);
    const status=`${context==='pageless'?'Visible document text':'Active page · visible text'} · Text-only view${limited?' · View limit reached':''}.`;
    if(this.status.textContent!==status)this.status.textContent=status;
    // Docs frequently redraws identical canvas tiles. Preserve selection, scroll,
    // focus, and definitions when the readable text has not actually changed.
    if(rendered===this.rendered)return;
    if(this.rendered!==undefined)this.scrollTop=this.content.scrollTop;
    this.dismissDefinition();this.rendered=rendered;
    const fragment=document.createDocumentFragment();
    for(const line of lines) {
      const p=document.createElement('p');p.className='line';let cursor=0;
      // A correction can span tokenizer words. Keep its ruby and click target together.
      const words=(line.words ?? []).map(word=>({...word}));
      for(const part of line.readings) {
        const first=words.findIndex(word=>word.end>part.start && word.start<part.end);if(first<0)continue;
        let last=first;while(last+1<words.length && words[last+1].start<part.end)last++;
        if(last>first) {words[first].end=words[last].end;words[first].lemma=line.text.slice(words[first].start,words[first].end);words[first].reading='';words.splice(first+1,last-first);}
      }
      const append=(target:HTMLElement,start:number,end:number)=>{
        let position=start;
        for(const part of line.readings) {
          if(!part.reading || part.start<position || part.end>end)continue;
          target.append(document.createTextNode(line.text.slice(position,part.start)));
          const ruby=document.createElement('ruby');ruby.append(document.createTextNode(line.text.slice(part.start,part.end)));
          const rt=document.createElement('rt');rt.textContent=part.reading;ruby.append(rt);target.append(ruby);position=part.end;
        }
        target.append(document.createTextNode(line.text.slice(position,end)));
      };
      for(const word of words) {
        if(word.start<cursor || word.end>line.text.length)continue;
        append(p,cursor,word.start);
        const button=document.createElement('button');button.type='button';button.className='word';
        const surface=line.text.slice(word.start,word.end);
        button.dataset.word=word.lemma;button.dataset.surface=surface;button.dataset.reading=word.reading;
        button.setAttribute('aria-label',`Define ${surface} in English and Japanese`);button.setAttribute('aria-pressed','false');
        button.title=`${surface} · English / 日本語 definitions`;
        append(button,word.start,word.end);p.append(button);cursor=word.end;
      }
      append(p,cursor,line.text.length);fragment.append(p);
    }
    if(!runs.length) {const p=document.createElement('p');p.className='empty';p.textContent='No readable text is available in this view.';fragment.append(p);}
    this.content.replaceChildren(fragment);
    this.content.scrollTop=context===this.context?this.scrollTop:0;this.context=context;
  }
  unavailable(text:string) {this.loading(true,text);}
  private dismissDefinition(focus=false) {
    this.lookupVersion++;this.definition.hidden=true;this.definition.replaceChildren();
    this.selected?.setAttribute('aria-pressed','false');if(focus)this.selected?.focus();this.selected=undefined;
  }
  private async define(button:HTMLButtonElement) {
    this.dismissDefinition();const version=this.lookupVersion;
    this.selected=button;button.setAttribute('aria-pressed','true');
    const word=button.dataset.word!,surface=button.dataset.surface!;
    this.definition.hidden=false;
    const header=document.createElement('header'),title=document.createElement('h3');title.lang='ja';title.textContent=surface;
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close definition');close.addEventListener('click',()=>this.dismissDefinition(true));
    header.append(title,close);this.definition.append(header);
    const pronunciation=document.createElement('p');pronunciation.className='pronunciation';pronunciation.lang='ja';
    pronunciation.textContent=[button.dataset.reading,word!==surface?`辞書形: ${word}`:''].filter(Boolean).join(' · ');this.definition.append(pronunciation);
    const body=document.createElement('div');body.className='definition-body';body.setAttribute('aria-busy','true');
    const loading=document.createElement('p');loading.className='feedback';loading.textContent='Looking up English and Japanese definitions…';body.append(loading);this.definition.append(body);
    let result=this.definitions.get(word);
    if(!result) {
      try {
        const reply:DictionaryReply & {error?:string}=await chrome.runtime.sendMessage({type:'define-word',word});
        if(reply?.error || !reply?.en || !reply?.ja)throw new Error('Dictionary unavailable');
        result={en:{page:reply.en,definitions:definitionText(reply.en.html ?? '','en')},ja:{page:reply.ja,definitions:definitionText(reply.ja.html ?? '','ja')}};
        if(reply.en.status!=='error' && reply.ja.status!=='error') {
          this.definitions.set(word,result);
          while(this.definitions.size>100)this.definitions.delete(this.definitions.keys().next().value!);
        }
      } catch {result={en:{page:{status:'error'},definitions:[]},ja:{page:{status:'error'},definitions:[]}};}
    }
    if(version!==this.lookupVersion || !this.host.isConnected)return;
    body.replaceChildren();body.setAttribute('aria-busy','false');
    for(const language of ['en','ja'] as const) {
      const {page,definitions}=result[language];
      const section=document.createElement('section');section.lang=language;
      const heading=document.createElement('h4');heading.textContent=language==='en'?'English':'日本語';section.append(heading);
      if(definitions.length) {
        const list=document.createElement('ol');for(const text of definitions) {const item=document.createElement('li');item.textContent=text;list.append(item);}section.append(list);
      } else {
        const message=document.createElement('p');message.className='feedback';
        message.textContent=page.status==='error'?(language==='en'?'Could not load definitions. Check your connection and click the word to retry.':'定義を取得できません。接続を確認して、単語をもう一度クリックしてください。'):(language==='en'?'No English definition found for this Japanese word.':'この単語の日本語の定義が見つかりませんでした。');section.append(message);
      }
      const source=document.createElement('a');source.className='source';source.textContent=language==='en'?'English Wiktionary ↗':'ウィクショナリー日本語版 ↗';source.href=dictionaryURL(language,page.title ?? word);source.target='_blank';source.rel='noopener noreferrer';section.append(source);body.append(section);
    }
    const notice=document.createElement('p');notice.className='source';notice.textContent='Wiktionary · CC BY-SA · Only this word is sent for lookup.';body.append(notice);
  }
}
