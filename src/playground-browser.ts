import {hiragana} from './shared';
import {createVerbPlayground,dictionaryVerbCandidates,type VerbBase} from './verb-playground';
import {mimeticEntries,normalizeMimetic,renderMimeticPlayground,type MimeticCategory} from './mimetic-playground';
import {annotated,renderVerbPlayground,verifiedVerbInterpretations,type PlaygroundTokenizer,type VerbInterpretation} from './exploration';

export interface PlaygroundBrowserOptions {tokenize:PlaygroundTokenizer}
export interface PlaygroundBrowser {element:HTMLElement;dispose():void;focus():void}

export const playgroundBrowserStyles=`
.playground-browser{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;font:13px/1.5 var(--body);overflow-wrap:break-word}
.playground-tabs{display:flex;flex:none;gap:6px;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--paper)}
.playground-tabs button{flex:1;min-width:0;margin:0;padding:9px;font:700 12px/1.4 var(--mono)}
.playground-tabs [aria-selected=true]{background:var(--accent);color:var(--paper)}
.playground-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px}
.playground-intro{margin:0 0 14px;color:var(--muted);font-size:12px}
.playground-filters{display:grid;gap:10px}
.playground-filters label,.playground-verb-input label{display:grid;gap:5px;font-size:12px;font-weight:600}
.playground-filters input,.playground-filters select,.playground-verb-input input{width:100%;max-width:100%;min-width:0;box-sizing:border-box;font:13px/1.5 var(--body);color:var(--ink);background:var(--paper);border:1px solid var(--line);padding:9px}
.playground-browser button{max-width:100%}
.playground-verb-input{margin:0}.playground-verb-input button{margin:8px 0 0;font-size:12px}
.playground-feedback{color:var(--muted);margin:8px 0;font-size:12px}.playground-feedback:empty{display:none}
.playground-confirmation{display:grid;gap:8px;margin:8px 0}.playground-confirmation:empty{display:none}
.playground-confirmation button{margin:0;text-align:left;font-size:12px;white-space:normal;overflow-wrap:anywhere}
.playground-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;margin:10px 0}
.playground-entry{display:flex;flex-direction:column;gap:3px;margin:0;width:100%;min-width:0;text-align:left;padding:10px;font-size:12px;white-space:normal;overflow-wrap:break-word}
.playground-entry .playground-term{font:20px/1.5 var(--body);color:var(--accent)}
.playground-entry .playground-gloss{font:11px/1.5 var(--body);color:var(--muted)}
.playground-count{font-size:11px;color:var(--muted);margin:14px 0 8px}
.playground-detail-nav{flex:none;padding:8px 16px;border-bottom:1px solid var(--line);background:var(--surface)}
.playground-back{margin:0;padding:4px 0;border:0;background:transparent;color:var(--accent);font-size:12px}.playground-back:hover{background:transparent;text-decoration:underline}
.playground-selection{min-width:0}.playground-selection:empty{display:none}
.playground-selection .explore-panel{margin:0;padding:0;border:0;background:transparent}
.playground-original{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.playground-selection .verb-instruction{display:none}
.playground-selection .explore-source-label{margin:0;color:var(--muted);font:11px/1.4 var(--body)}
.playground-selection .explore-source{margin:0;font:22px/1.9 var(--body)}
.playground-selection .mimetic-playground{border:0;margin:0;padding:0}
.playground-browser button:focus-visible,.playground-browser input:focus-visible,.playground-browser select:focus-visible,.playground-browser summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.playground-browser [hidden]{display:none}
`;

const categories:readonly [MimeticCategory,string][]=[['feelings','Feelings'],['body','Body'],['movement','Movement'],['people','People'],['texture','Texture'],['sounds','Sound'],['nature','Light & Weather']];
const normalize=(value:string)=>hiragana(value.normalize('NFKC')).toLocaleLowerCase('en').trim();
let browserSequence=0;
const matches=(query:string,values:readonly string[])=>!query || query.split(/\s+/u).every(part=>values.some(value=>normalize(value).includes(part)));
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,text?:string):HTMLElementTagNameMap[K] {
  const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function classLabel(base:VerbBase):string {
  if(base.verbClass==='一段')return 'Ichidan';
  if(base.verbClass.startsWith('五段'))return 'Godan';
  if(base.verbClass.startsWith('サ変'))return 'する irregular';
  if(base.verbClass.startsWith('カ変'))return '来る irregular';
  return base.verbClass;
}

/** In-memory, offline browsing. The caller owns insertion and removal of element. */
export function renderPlaygroundBrowser(options:PlaygroundBrowserOptions):PlaygroundBrowser {
  const root=element('section','playground-browser');root.setAttribute('aria-label','Playgrounds');
  const panelId=`ko-playground-pane-${++browserSequence}`;
  let tab:'verbs'|'mimetics'='verbs',disposed=false,request=0,controller:AbortController|undefined;
  let catalogScroll=0,returnFocus:HTMLElement|undefined;
  const cancel=()=>{request++;controller?.abort();controller=undefined;form.removeAttribute('aria-busy');submit.disabled=false;};
  const dispose=()=>{if(disposed)return;disposed=true;cancel();};
  const verbIntro='Enter a dictionary-form verb here, or open a word’s playground in Reading view. Everything works offline.';
  const intro=element('p','playground-intro',verbIntro);
  const tabs=element('div','playground-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Playground type');
  const filters=element('div','playground-filters');
  const searchLabel=element('label','','Search expressions');const search=element('input','playground-search');search.type='search';search.maxLength=80;search.setAttribute('aria-label','Search mimetic expressions');search.placeholder='Japanese, reading, or English';searchLabel.append(search);
  const categoryLabel=element('label','','Category');const category=element('select','playground-category');category.setAttribute('aria-label','Mimetic category');
  const all=element('option','','All categories');all.value='';category.append(all);
  for(const [value,label] of categories) {const option=element('option','',label);option.value=value;category.append(option);}categoryLabel.append(category);filters.hidden=true;filters.append(searchLabel,categoryLabel);
  const form=element('form','playground-verb-input');form.noValidate=true;
  const inputLabel=element('label','','Dictionary-form verb');const input=element('input','');input.type='text';input.maxLength=40;input.autocomplete='off';input.spellcheck=false;input.placeholder='食べる or 勉強する';inputLabel.append(input);
  const submit=element('button','','Check verb locally');submit.type='submit';
  const feedback=element('p','playground-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const confirmation=element('div','playground-confirmation');
  form.append(inputLabel,submit,feedback,confirmation);
  const count=element('p','playground-count');count.setAttribute('role','status');count.hidden=true;
  const results=element('div','playground-results');results.setAttribute('aria-label','Mimetic expressions');results.hidden=true;
  const selection=element('div','playground-selection');
  const catalog=element('div','playground-catalog');catalog.append(intro,form,filters,count,results);
  const detailNav=element('div','playground-detail-nav');detailNav.hidden=true;
  const back=element('button','playground-back','← Examples');back.type='button';back.setAttribute('aria-label','Back to examples');detailNav.append(back);
  const scroller=element('div','playground-scroll');
  const backToExamples=()=>{
    selection.replaceChildren();catalog.hidden=false;detailNav.hidden=true;scroller.scrollTop=catalogScroll;
    if(tab==='verbs'){confirmation.replaceChildren();feedback.textContent='';input.focus({preventScroll:true});input.select();}
    else (returnFocus?.isConnected?returnFocus:search).focus({preventScroll:true});
  };
  back.addEventListener('click',backToExamples);
  root.addEventListener('keydown',event=>{if(event.key==='Escape' && catalog.hidden){event.preventDefault();event.stopPropagation();backToExamples();}});
  const showSelection=(panel:HTMLElement,origin?:HTMLElement)=>{
    if(!catalog.hidden)catalogScroll=scroller.scrollTop;
    back.textContent=tab==='verbs'?'← Change verb':'← Examples';back.setAttribute('aria-label',tab==='verbs'?'Change verb':'Back to examples');
    returnFocus=origin;selection.replaceChildren(panel);catalog.hidden=true;detailNav.hidden=false;scroller.scrollTop=0;
    Array.from(panel.querySelectorAll<HTMLElement>('select,button')).find(node=>node.getClientRects().length)?.focus({preventScroll:true});
  };
  const pane=element('div','playground-pane');pane.id=panelId;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',`${panelId}-${tab}`);
  const showVerb=(interpretation:VerbInterpretation,origin?:HTMLElement)=>{
    const panel=element('div','explore-panel');
    const label=element('p','explore-source-label','Original phrase');const source=element('p','explore-source');source.append(annotated(interpretation.model.source,interpretation.model.sourceReading));
    const original=element('div','playground-original');original.append(label,source);panel.append(original,renderVerbPlayground(interpretation.model));showSelection(panel,origin);
  };
  const confirm=(choices:VerbInterpretation[])=>{
    confirmation.replaceChildren();
    for(const choice of choices) {
      const button=element('button','',`Use ${choice.label}`);button.type='button';
      button.addEventListener('click',()=>{if(disposed)return;cancel();feedback.textContent='';showVerb(choice,button);});confirmation.append(button);
    }
  };
  const check=async(value:string)=>{
    cancel();selection.replaceChildren();confirmation.replaceChildren();feedback.textContent='';
    if(disposed)return;
    if(!value || Array.from(value).length>40 || !/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー]+$/u.test(value)) {
      feedback.textContent='Enter one dictionary-form verb, such as 食べる or 勉強する (up to 40 characters).';return;
    }
    controller=new AbortController();const current=controller,id=request;form.setAttribute('aria-busy','true');submit.disabled=true;feedback.textContent='Checking the bundled dictionary…';
    try {
      const candidates=dictionaryVerbCandidates(value,(await options.tokenize([value],current.signal))[0] ?? []);
      if(disposed || current.signal.aborted || id!==request)return;
      if(!candidates.length) {feedback.textContent='Use a recognized dictionary-form verb, such as 食べる, 読む, or 勉強する. Sentences and conjugated forms cannot be entered here.';return;}
      const choices:VerbInterpretation[]=[];
      // Each probe is bounded by the engine and the separate tokenizer purpose.
      for(const candidate of candidates) {
        const model=createVerbPlayground(candidate);
        const interpretations=await verifiedVerbInterpretations(model,options.tokenize,current.signal);
        if(disposed || current.signal.aborted || id!==request)return;
        for(const interpretation of interpretations) {
          const base=interpretation.model.base;
          choices.push({...interpretation,label:`${interpretation.label} · ${base.prefixReading ?? ''}${base.reading} · ${classLabel(base)}`});
        }
      }
      feedback.textContent=!choices.length?'That derived construction is outside the supported forms. Try its original dictionary verb.':choices.length>1?'Choose the dictionary entry or interpretation you intend.':'Confirm the dictionary form, reading, and class to begin.';confirm(choices);
    } catch {
      if(disposed || current.signal.aborted || id!==request)return;
      feedback.textContent='The local dictionary could not finish. Try again, or click a verb in Reading view to explore it.';
    } finally {
      if(!disposed && !current.signal.aborted && id===request) {form.removeAttribute('aria-busy');submit.disabled=false;controller=undefined;}
    }
  };
  const renderResults=()=>{
    if(disposed)return;
    results.replaceChildren();if(tab==='verbs'){count.textContent='';return;}
    const query=normalize(search.value);let total=0;
    for(const entry of mimeticEntries)for(const [index,variant] of entry.variants.entries()) {
      if(category.value && entry.category!==category.value)continue;
      const values=[variant.term,...variant.aliases,entry.sceneUse,variant.gloss,...entry.keywords];
      if(!matches(normalizeMimetic(query),values))continue;total++;
      const button=element('button','playground-entry');button.type='button';button.append(element('span','playground-term',variant.term),element('span','playground-gloss',variant.gloss));
      button.addEventListener('click',()=>{
        if(disposed)return;cancel();confirmation.replaceChildren();feedback.textContent='';
        const panel=element('div','explore-panel');panel.append(renderMimeticPlayground({...entry,initialVariant:index as 0|1}));showSelection(panel,button);
      });results.append(button);
    }
    count.textContent=`${total} expressions`;
    if(!total)results.append(element('p','','No matching expressions. Try another spelling, reading, or English word.'));
  };
  const tabButtons=new Map<'verbs'|'mimetics',HTMLButtonElement>();
  const changeTab=(next:'verbs'|'mimetics')=>{
    if(disposed)return;cancel();tab=next;selection.replaceChildren();confirmation.replaceChildren();feedback.textContent='';
    catalog.hidden=false;detailNav.hidden=true;scroller.scrollTop=0;
    form.hidden=next!=='verbs';filters.hidden=count.hidden=results.hidden=next!=='mimetics';
    intro.textContent=next==='verbs'?verbIntro:'Choose an expression to compare. Everything works offline.';
    pane.setAttribute('aria-labelledby',`${panelId}-${next}`);
    for(const [key,button] of tabButtons) {button.setAttribute('aria-selected',String(key===next));button.tabIndex=key===next?0:-1;}
    renderResults();
  };
  for(const [id,label] of [['verbs','Verbs'],['mimetics','Mimetics']] as const) {
    const button=element('button','',label);button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(id===tab));button.tabIndex=id===tab?0:-1;
    button.id=`${panelId}-${id}`;button.setAttribute('aria-controls',panelId);
    button.addEventListener('click',()=>changeTab(id));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
      const next=event.key==='Home'?'verbs':event.key==='End'?'mimetics':tab==='verbs'?'mimetics':'verbs';changeTab(next);tabButtons.get(next)?.focus();
    });tabButtons.set(id,button);tabs.append(button);
  }
  search.addEventListener('input',renderResults);category.addEventListener('change',renderResults);
  input.addEventListener('input',()=>{cancel();feedback.textContent='';confirmation.replaceChildren();selection.replaceChildren();});
  form.addEventListener('submit',event=>{event.preventDefault();void check(input.value.normalize('NFKC').trim());});
  pane.append(catalog,selection);scroller.append(pane);root.append(tabs,detailNav,scroller);renderResults();
  return {element:root,dispose,focus:()=>{if(!disposed)(tab==='verbs'?input:search).focus();}};
}
