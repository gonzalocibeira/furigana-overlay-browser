import {uiTheme} from './ui-theme';
// Supplied from public/icons/logo.svg by the build, keeping a single logo source.
declare const __KO_LOGO_SVG__:string;
import type {Reading,Word} from './shared';
import {saveCorrection,removeCorrection,type Appearance,type ReadingViewPreferences} from './preferences';
import {definitionText,dictionaryURL,type DictionaryReply,type DictionaryPage,type DefinitionLanguage} from './definitions';
import {wordExplorations,renderExplorations,disposeExplorations,explorationStyles} from './exploration';
import {renderPlaygroundBrowser,playgroundBrowserStyles} from './playground-browser';
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
  private host=document.createElement('ko-reading-view');
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
  private wordContexts=new WeakMap<HTMLButtonElement,{text:string;words:Word[];index:number}>();
  private overrides:Record<string,string>={};
  private resizeHandle:HTMLElement;
  private resizeStart?:{x:number;width:number};
  private width=420;
  private saveWidth:(width:number)=>Promise<unknown>;
  private playground?:ReturnType<typeof renderPlaygroundBrowser>;
  private exploration?:HTMLElement;
  private playgroundLauncher:HTMLButtonElement;
  setOverrides(values:Record<string,string>) {this.overrides=values;}

  constructor(close:()=>void,saveWidth:(width:number)=>Promise<unknown>) {
    this.saveWidth=saveWidth;
    this.root.innerHTML=`<style>${uiTheme}
:host{all:initial!important;position:fixed!important;right:12px!important;top:var(--reader-top,100px)!important;bottom:12px!important;width:min(var(--reader-width,420px),calc(100vw - 24px))!important;z-index:2147483647!important;display:block!important;contain:layout style!important;color-scheme:light!important}
:host(.playground-active){top:12px!important}
.reader{height:100%;display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:2px solid var(--line);overflow:hidden;font:13px/1.5 var(--body)}.reader.high{background:#fff;color:#101010}.header{display:grid;grid-template-columns:minmax(0,1fr) auto 28px;align-items:center;gap:6px 8px;padding:12px;flex:none;border-bottom:4px solid var(--line);background:var(--surface)}.header>div{min-width:0}.header .heading{grid-column:1;grid-row:1}.panel-close{grid-column:3;grid-row:1;justify-self:end;margin:0;width:28px;height:28px;padding:0;font-size:18px}.reader-hint{grid-column:1/-1;grid-row:2;margin:0}.playgrounds-open{grid-column:2;grid-row:1;display:inline-flex;align-items:center;gap:4px;margin:0;min-height:28px;padding:4px 6px;font-size:10px;background:var(--accent);color:var(--paper);white-space:nowrap}.playgrounds-open:hover{background:var(--ink)}.playgrounds-open svg{display:block;flex:none;width:14px;height:14px}.reader.playground-mode .reader-hint,.reader.playground-mode>.content,.reader.playground-mode>.status{display:none}.reader.playground-mode .heading{grid-column:1/3}.reader.playground-mode .playgrounds-open svg{display:none}.reader.playground-mode .playgrounds-open{grid-column:1/-1;grid-row:2;justify-self:start;min-height:0;padding:4px 0;border:0;background:transparent;color:var(--accent)}.heading{display:flex;align-items:center;gap:8px}.brand-mark{display:block;flex:none;width:24px;height:24px}.brand-mark svg{display:block;width:100%;height:100%}h2{font:900 16px/1.2 var(--mono);text-transform:uppercase;letter-spacing:-.5px;margin:0}small{display:block;color:var(--muted);font-size:11px;margin-top:6px}button{margin-left:auto;flex:none;background:var(--paper);border:2px solid var(--line);color:inherit;cursor:pointer;padding:7px 9px;font:700 11px/1.4 var(--mono)}button:hover{background:var(--surface)}.content:focus-visible{outline:3px solid var(--accent);outline-offset:-5px}.content{padding:20px 22px 28px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;font:var(--reader-font,20px) var(--body);user-select:text}.line{margin:0;line-height:var(--reader-spacing,2.8);white-space:pre-wrap;overflow-wrap:anywhere}ruby{ruby-position:over;ruby-align:center}rt{font:var(--reader-ruby,.5em)/1 var(--body)}.empty{font:13px/1.6 var(--body);color:var(--muted)}.status{margin:0;padding:12px 16px;border-top:2px solid var(--line);background:var(--surface);color:var(--muted);font:10px/1.6 var(--mono)}@media print{:host{display:none!important}}
.word{display:inline;margin:0;padding:0;border:0;background:transparent;font:inherit;line-height:inherit;color:inherit;white-space:inherit;user-select:text}.word:hover,.word[aria-pressed=true]{background:var(--surface);color:var(--accent);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px}.word:focus-visible{outline-offset:2px}.definition{flex:none;max-height:44%;overflow:auto;padding:16px;border-top:4px solid var(--line);background:var(--surface)}.high .definition{background:var(--paper)}.definition header{display:flex;align-items:center;gap:8px}.definition h3{font-size:20px;margin:0;overflow-wrap:anywhere}.definition h4{margin:14px 0 6px;font:800 11px/1.4 var(--mono);text-transform:uppercase}.definition p{margin:6px 0;overflow-wrap:anywhere}.definition ol{margin:6px 0;padding-left:20px}.definition a{color:var(--accent);text-underline-offset:3px}.definition .source{font-size:10px;color:var(--muted)}.definition .pronunciation{font-size:12px;color:var(--muted)}.definition .feedback{font-size:12px;color:var(--muted)}
.resize{position:absolute;left:-6px;top:16px;bottom:16px;width:12px;cursor:ew-resize;touch-action:none}.resize:after{content:"";position:absolute;left:5px;top:0;bottom:0;width:3px;background:var(--line)}.resize:hover:after,.resize:focus-visible:after{background:var(--accent)}.resize:focus-visible{outline:3px solid var(--accent);outline-offset:0}.correction-form{margin-top:12px;padding-top:12px;border-top:2px solid var(--line)}.correction-form label{display:block;font-size:11px;font-weight:700;margin:8px 0}.correction-form input{display:block;width:100%;font:14px var(--body);color:var(--ink);background:var(--paper);padding:8px;border:2px solid var(--line);margin-top:6px}.correction-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.correction-actions button{margin:0;font-size:11px}.feedback[data-error=true]{color:var(--ink);font-weight:700;border-left:3px solid var(--line);padding-left:8px}.feedback[data-error=true]:before{content:"! "}
.definition.exploring{max-height:70%}.definition.browsing{flex:1;min-height:0;max-height:none;padding:0;border-top:0;overflow:hidden;background:var(--paper)}.definition>header{position:sticky;top:-16px;z-index:1;padding:8px 0;background:var(--surface)}
${explorationStyles}
${playgroundBrowserStyles}

</style><div class="resize" role="separator" tabindex="0" aria-label="Reading panel width" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="720" aria-valuenow="420"></div><section class="reader" role="region" aria-label="Kō reading view"><header class="header"><div class="heading"><span class="brand-mark" aria-hidden="true">${__KO_LOGO_SVG__}</span><h2>Reading view</h2></div><button type="button" class="playgrounds-open" aria-expanded="false" title="Open playgrounds"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg><span>Playgrounds</span></button><button type="button" class="panel-close" aria-label="Close reading view" title="Close reading view">×</button><small class="reader-hint">Click a word to see its meaning.</small></header><div class="content" tabindex="0" aria-label="Page reading text" lang="ja"></div><section class="definition" aria-label="Word details" aria-live="polite" hidden></section><p class="status" role="status" aria-live="polite"></p></section>`;
    this.resizeHandle=this.root.querySelector('.resize')!;
    const finish=()=>{if(!this.resizeStart)return;this.resizeStart=undefined;void this.persistWidth();};
    this.resizeHandle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();
      this.resizeStart={x:event.clientX,width:this.host.getBoundingClientRect().width};this.resizeHandle.setPointerCapture(event.pointerId);
    });
    this.resizeHandle.addEventListener('pointermove',event=>{if(this.resizeStart)this.setWidth(this.resizeStart.width+this.resizeStart.x-event.clientX);});
    this.resizeHandle.addEventListener('pointerup',finish);
    this.resizeHandle.addEventListener('pointercancel',finish);
    this.resizeHandle.addEventListener('lostpointercapture',finish);
    this.resizeHandle.addEventListener('keydown',event=>{
      let width=this.width;
      if(event.key==='ArrowLeft')width+=10;else if(event.key==='ArrowRight')width-=10;else if(event.key==='Home')width=280;else if(event.key==='End')width=720;else return;
      event.preventDefault();this.setWidth(width);void this.persistWidth();
    });
    this.content=this.root.querySelector('.content')!;this.status=this.root.querySelector('.status')!;
    this.definition=this.root.querySelector('.definition')!;
    this.root.querySelector('[aria-label="Close reading view"]')!.addEventListener('click',close);
    this.playgroundLauncher=this.root.querySelector('.playgrounds-open')!;
    this.playgroundLauncher.addEventListener('click',()=>{if(this.playground)this.dismissDefinition(true);else this.openPlaygrounds();});
    this.content.addEventListener('click',event=>{
      const button=(event.target as Element).closest<HTMLButtonElement>('.word');
      const selection=(this.root as ShadowRoot & {getSelection?:()=>Selection|null}).getSelection?.() ?? window.getSelection();
      if(button && (selection?.isCollapsed ?? true))void this.define(button);
    });
    this.root.addEventListener('keydown',event=>{if((event as KeyboardEvent).key==='Escape' && !this.definition.hidden) {event.preventDefault();this.dismissDefinition(true);}});
  }
  private setWidth(value:number) {
    this.width=Math.max(Math.min(280,innerWidth-24),Math.min(720,innerWidth-24,value));
    this.host.style.setProperty('--reader-width',`${this.width}px`);
    this.resizeHandle.setAttribute('aria-valuemin',String(Math.min(280,innerWidth-24)));
    this.resizeHandle.setAttribute('aria-valuemax',String(Math.min(720,innerWidth-24)));
    this.resizeHandle.setAttribute('aria-valuenow',String(Math.round(this.width)));
  }
  private async persistWidth() {
    try {await this.saveWidth(Math.max(280,this.width));}
    catch {this.status.textContent='Could not save the panel width. Try resizing again.';}
  }
  appearance(settings:ReadingViewPreferences,appearance:Appearance) {
    if(!this.resizeStart)this.setWidth(settings.width);
    this.host.style.setProperty('--reader-font',`${settings.fontSize}px`);
    this.host.style.setProperty('--reader-spacing',String(settings.spacing));
    this.host.style.setProperty('--reader-ruby',`${.5*appearance.scale}em`);
    this.root.querySelector('.reader')!.classList.toggle('high',appearance.contrast==='high');
  }
  ownsNode(node:Node) {return node===this.host || this.host.contains(node);}
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
    this.content.replaceChildren(p);this.status.textContent='Only visible page text is processed.';
  }
  display(runs:ReadingRun[],context:string,settings:ReadingViewPreferences,appearance:Appearance,top:number,limited:boolean) {
    this.host.style.setProperty('--reader-top',`${Math.max(12,Math.min(top,innerHeight-180))}px`);
    this.appearance(settings,appearance);
    const lines=context==='web'?runs.map(run=>({text:run.text,readings:run.readings,words:run.words})):readingLines(runs),rendered=JSON.stringify([context,lines]);
    const status=`${context==='web'?'Visible webpage text':context==='pageless'?'Visible document text':'Active page · visible text'} · Text-only view${limited?' · View limit reached':''}.`;
    if(this.status.textContent!==status)this.status.textContent=status;
    // Docs frequently redraws identical canvas tiles. Preserve selection, scroll,
    // focus, and definitions when the readable text has not actually changed.
    if(rendered===this.rendered)return;
    if(this.rendered!==undefined)this.scrollTop=this.content.scrollTop;
    // A local browser opened during initial analysis does not depend on that snapshot.
    if(this.rendered!==undefined || !this.playground)this.dismissDefinition();this.rendered=rendered;
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
        let pronunciation='',position=word.start,unknown=false;
        for(const part of line.readings) {
          if(part.start<position || part.end>word.end)continue;
          pronunciation+=line.text.slice(position,part.start)+part.reading;position=part.end;
          if(!part.reading)unknown=true;
        }
        pronunciation+=line.text.slice(position,word.end);
        if(unknown || /[\p{Script=Han}々]/u.test(pronunciation))pronunciation=word.reading==='*'?'':word.reading;
        button.dataset.word=word.lemma;button.dataset.surface=surface;button.dataset.reading=pronunciation;
        const originalIndex=(line.words ?? []).findIndex(entry=>entry.start===word.start);
        if(originalIndex>=0)this.wordContexts.set(button,{text:line.text,words:line.words!,index:originalIndex});
        button.setAttribute('aria-label',`Open details for ${surface}`);button.setAttribute('aria-pressed','false');
        button.title=`${surface} · Word details`;
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
    const returnFocus=this.selected ?? (this.playground?this.playgroundLauncher:undefined);
    if(this.exploration)disposeExplorations(this.exploration);this.exploration=undefined;
    this.playground?.dispose();this.playground=undefined;this.playgroundLauncher.setAttribute('aria-expanded','false');
    this.playgroundLauncher.querySelector('span')!.textContent='Playgrounds';this.playgroundLauncher.title='Open playgrounds';this.playgroundLauncher.removeAttribute('aria-label');
    this.host.classList.remove('playground-active');this.root.querySelector('.reader')!.classList.remove('playground-mode');this.root.querySelector('h2')!.textContent='Reading view';
    this.definition.setAttribute('aria-label','Word details');this.definition.setAttribute('aria-live','polite');
    this.lookupVersion++;this.definition.hidden=true;this.definition.classList.remove('exploring','browsing');this.definition.replaceChildren();
    this.selected?.setAttribute('aria-pressed','false');if(focus)returnFocus?.focus();this.selected=undefined;
  }
  private async tokenizePlayground(texts:string[],signal:AbortSignal):Promise<Word[][]> {
    if(signal.aborted)throw new DOMException('Analysis cancelled','AbortError');
    const requestId=crypto.randomUUID();
    let abort:()=>void=()=>{};
    try {
      const reply=await new Promise<{words?:Word[][];cancelled?:boolean;error?:string}>((resolve,reject)=>{
        abort=()=>{
          try {void Promise.resolve(chrome.runtime.sendMessage({type:'cancel-tokenize',purpose:'playground',requestId})).catch(()=>{});}catch {}
          reject(new DOMException('Analysis cancelled','AbortError'));
        };
        signal.addEventListener('abort',abort,{once:true});
        try {Promise.resolve(chrome.runtime.sendMessage({type:'tokenize',purpose:'playground',requestId,texts,includeWords:true})).then(resolve,reject);}
        catch(error) {reject(error);}
      });
      if(signal.aborted || reply?.cancelled)throw new DOMException('Analysis cancelled','AbortError');
      if(reply?.error || !Array.isArray(reply?.words) || reply.words.length!==texts.length || reply.words.some(words=>!Array.isArray(words)))throw new Error('Could not analyze this verb offline. Try again.');
      return reply.words;
    } finally {signal.removeEventListener('abort',abort);}
  }
  private openPlaygrounds() {
    this.dismissDefinition();this.definition.hidden=false;this.definition.classList.add('browsing');this.definition.scrollTop=0;
    this.definition.setAttribute('aria-label','Learning playground browser');this.definition.setAttribute('aria-live','off');
    this.playgroundLauncher.setAttribute('aria-expanded','true');this.playgroundLauncher.querySelector('span')!.textContent='← Reading view';this.playgroundLauncher.title='Back to reading view';this.playgroundLauncher.setAttribute('aria-label','Back to reading view');
    this.host.classList.add('playground-active');this.root.querySelector('.reader')!.classList.add('playground-mode');this.root.querySelector('h2')!.textContent='Playgrounds';
    this.playground=renderPlaygroundBrowser({tokenize:(texts,signal)=>this.tokenizePlayground(texts,signal)});
    this.definition.append(this.playground.element);this.playground.focus();
  }
  private correctionControls(surface:string,reading:string) {
    const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Correct reading';toggle.style.margin='8px 0 0';
    const form=document.createElement('form');form.className='correction-form';form.hidden=true;
    const wordLabel=document.createElement('label');wordLabel.textContent='Word or name';
    const word=document.createElement('input');word.value=surface;word.maxLength=80;word.required=true;word.autocomplete='off';wordLabel.append(word);
    const readingLabel=document.createElement('label');readingLabel.textContent='Reading';
    const kana=document.createElement('input');kana.value=reading;kana.maxLength=80;kana.required=true;kana.autocomplete='off';readingLabel.append(kana);
    const actions=document.createElement('div');actions.className='correction-actions';
    const save=document.createElement('button');save.type='submit';save.className='primary';save.textContent='Save correction';
    const restore=document.createElement('button');restore.type='button';restore.textContent='Restore automatic reading';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    const feedback=document.createElement('p');feedback.className='feedback';feedback.setAttribute('role','status');
    const report=(text:string,error=false)=>{feedback.textContent=text;feedback.dataset.error=String(error);};
    const sync=()=>{restore.hidden=!Object.hasOwn(this.overrides,word.value.trim().normalize('NFC'));};sync();word.oninput=sync;
    toggle.onclick=()=>{form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)kana.focus();};
    toggle.setAttribute('aria-expanded','false');
    cancel.onclick=()=>{form.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();};
    form.onsubmit=async event=>{
      event.preventDefault();save.disabled=true;
      try {this.overrides=await saveCorrection(word.value,kana.value);report('Saved. Readings update automatically.');sync();}
      catch(error) {report(error instanceof Error?error.message:'Could not save. Try again.',true);}
      finally {save.disabled=false;}
    };
    restore.onclick=async()=>{
      restore.disabled=true;
      try {this.overrides=await removeCorrection(word.value.trim().normalize('NFC'));report('Automatic reading restored.');sync();}
      catch {report('Could not restore the reading. Try again.',true);}
      finally {restore.disabled=false;}
    };
    actions.append(save,restore,cancel);form.append(wordLabel,readingLabel,actions,feedback);this.definition.append(toggle,form);
  }
  private define(button:HTMLButtonElement) {
    this.dismissDefinition();const version=this.lookupVersion;
    this.selected=button;button.setAttribute('aria-pressed','true');
    const word=button.dataset.word!,surface=button.dataset.surface!;
    this.definition.hidden=false;this.definition.scrollTop=0;
    const header=document.createElement('header'),title=document.createElement('h3');title.lang='ja';title.textContent=surface;
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close word details');close.addEventListener('click',()=>this.dismissDefinition(true));
    header.append(title,close);this.definition.append(header);
    const pronunciation=document.createElement('p');pronunciation.className='pronunciation';pronunciation.lang='ja';
    pronunciation.textContent=[button.dataset.reading,word!==surface?`辞書形: ${word}`:''].filter(Boolean).join(' · ');this.definition.append(pronunciation);
    const context=this.wordContexts.get(button);
    if(context) {
      const models=wordExplorations(context.text,context.words,context.index,surface,this.overrides);
      if(models.verb || models.mimetic || models.meaning) {
        const explore=document.createElement('button');explore.type='button';explore.className='explore-toggle';explore.textContent=models.verb && !models.mimetic && !models.meaning?'Try verb forms':'Open playgrounds';explore.setAttribute('aria-expanded','false');
        const panel=renderExplorations(models,{tokenize:(texts,signal)=>this.tokenizePlayground(texts,signal)});this.exploration=panel;
        explore.addEventListener('click',()=>{panel.hidden=!panel.hidden;explore.setAttribute('aria-expanded',String(!panel.hidden));this.definition.classList.toggle('exploring',!panel.hidden);this.definition.scrollTop=0;});
        this.definition.append(explore,panel);
      }
    }
    if(/[\p{Script=Han}々]/u.test(surface))this.correctionControls(surface,button.dataset.reading ?? '');
    const body=document.createElement('div');body.className='definition-body';this.definition.append(body);
    void this.lookupDefinitions(word,body,version);
  }
  private async lookupDefinitions(word:string,body:HTMLElement,version:number) {
    body.setAttribute('aria-busy','true');
    const loading=document.createElement('p');loading.className='feedback';loading.textContent='Looking up English and Japanese definitions…';body.replaceChildren(loading);
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
    const failed=result.en.page.status==='error' || result.ja.page.status==='error';
    for(const language of ['en','ja'] as const) {
      const {page,definitions}=result[language];
      const section=document.createElement('section');section.lang=language;
      const heading=document.createElement('h4');heading.textContent=language==='en'?'English':'日本語';section.append(heading);
      if(definitions.length) {
        const list=document.createElement('ol');for(const text of definitions) {const item=document.createElement('li');item.textContent=text;list.append(item);}section.append(list);
      } else {
        const message=document.createElement('p');message.className='feedback';
        message.textContent=page.status==='error'?(language==='en'?'Could not load definitions. Check your connection and choose Retry definitions online.':'定義を取得できません。接続を確認して、オンライン検索を再試行してください。'):(language==='en'?'No English definition found for this Japanese word.':'この単語の日本語の定義が見つかりませんでした。');section.append(message);
      }
      const source=document.createElement('a');source.className='source';source.textContent=language==='en'?'English Wiktionary ↗':'ウィクショナリー日本語版 ↗';source.href=dictionaryURL(language,page.title ?? word);source.target='_blank';source.rel='noopener noreferrer';section.append(source);body.append(section);
    }
    if(failed) {
      const retry=document.createElement('button');retry.type='button';retry.className='definition-retry';retry.textContent='Retry definitions online';
      retry.addEventListener('click',()=>void this.lookupDefinitions(word,body,version));body.append(retry);
    }
    const notice=document.createElement('p');notice.className='source';notice.textContent='Wiktionary · CC BY-SA · Only this word is sent for lookup.';body.append(notice);
  }
}
