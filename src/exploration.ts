import {align, type Word} from './shared';
import {buildVerbPlayground, createVerbPlayground, potentialBaseQueries, resolvePotentialBase, isRaDroppedPotential, restrictVerbBase, verbFamilies, type VerbPlayground, type VerbBase} from './verb-playground';
import {findMimetic, matchMimeticAt, renderMimeticPlayground, mimeticStyles, type MimeticEntry} from './mimetic-playground';
import {buildMeaningForks, renderMeaningForks, meaningForkStyles, type MeaningForks} from './meaning-forks';

export interface WordExplorations {
  verb?: VerbPlayground;
  mimetic?: MimeticEntry;
  meaning?: MeaningForks;
}

// Everything here runs against an already extracted snapshot. No network,
// storage, DOM source mutation, or whole-document analysis is involved.
export function wordExplorations(text:string, words:Word[], wordIndex:number, surface:string, overrides:Record<string,string>):WordExplorations {
  const verb=buildVerbPlayground(text,words,wordIndex);
  const meaning=buildMeaningForks(text,words,wordIndex);
  const corrected=(start:number,end:number)=>Object.keys(overrides).some(word=>{
    let position=text.indexOf(word);
    while(position!==-1) {
      if(position<end && position+word.length>start)return true;
      position=text.indexOf(word,position+1);
    }
    return false;
  });
  return {
    ...(verb && !corrected(verb.start,verb.end)?{verb}:{}),
    ...(meaning && !corrected(meaning.start,meaning.end)?{meaning}:{}),
    mimetic:matchMimeticAt(text,words,wordIndex)?.entry ?? findMimetic(surface)
  };
}

export const explorationStyles=`
.explore-toggle,.definition-retry{margin:8px 8px 0 0;font-size:11px}
.explore-panel{margin-top:12px;border:1px solid var(--line);padding:12px;background:var(--paper);min-width:0}
.explore-panel[hidden]{display:none}.explore-tools{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.explore-tools button{margin:0;font-size:10px}.explore-tools button[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.explore-panel h4{margin:0 0 8px;font:800 12px/1.4 var(--mono);text-transform:uppercase}
.explore-panel p{font-size:12px}.explore-panel .explore-source{font:20px/2 var(--body);margin:4px 0 14px;overflow-wrap:anywhere}
.explore-panel .explore-source-label{font-size:11px;color:var(--muted);margin:0}
.verb-playground{min-width:0}.verb-instruction{color:var(--muted);margin:0 0 14px}
.verb-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}
.verb-controls label{display:inline-flex;flex:0 0 auto;align-items:center;gap:7px;min-height:36px;padding:7px;border:1px solid var(--line);background:var(--paper);font:12px/1.4 var(--body);white-space:nowrap;overflow-wrap:normal;cursor:pointer}
.verb-controls label:has(input:checked){background:var(--surface);border-color:var(--accent)}
.verb-controls input[type=checkbox]{flex:0 0 16px;accent-color:var(--accent);width:16px;height:16px;min-width:16px;max-width:16px;margin:0;padding:0}
.verb-output{border-left:4px solid var(--accent);padding:10px 12px;margin:14px 0;background:var(--surface);overflow-wrap:anywhere}
.verb-result-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font:11px/1.4 var(--body)}
.verb-result .verb-japanese{display:block;font:28px/2.1 var(--body)}
.verb-result mark{color:var(--ink);background:var(--sand,#e4cd9d);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.verb-result .verb-state{font-size:11px;color:var(--muted);margin:4px 0 0}
.verb-reset{margin:0;padding:4px 8px;font-size:11px;background:var(--paper)}
.explore-panel a{font-size:11px;overflow-wrap:anywhere}
.explore-panel button:focus-visible,.explore-panel input:focus-visible,.explore-toggle:focus-visible,.definition-retry:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.verb-family-label{display:grid;gap:6px;font-size:12px;font-weight:600;margin:14px 0 0}
.verb-family{width:100%;min-width:0;max-width:100%;font:13px/1.5 var(--body);padding:9px;background:var(--paper);color:var(--ink);border:1px solid var(--line)}
.verb-explanation{color:var(--muted);font:12px/1.6 var(--body);margin:12px 0}
.verb-help{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font:11px/1.6 var(--body)}
.verb-help summary{cursor:pointer;font-weight:600}.verb-help p{font-size:11px}
.verb-ambiguity,.verb-base-choices{border:1px solid var(--line);padding:10px;margin:10px 0}
.verb-ambiguity button,.verb-base-choices button{margin:4px 6px 4px 0;max-width:100%;white-space:normal;overflow-wrap:anywhere;text-align:left}
.verb-family:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.verb-playground [hidden]{display:none}
${mimeticStyles}
${meaningForkStyles}
`;

function changedRange(original:string,value:string) {
  const a=Array.from(original),b=Array.from(value);let prefix=0,suffix=0;
  while(prefix<a.length && prefix<b.length && a[prefix]===b[prefix])prefix++;
  while(suffix<a.length-prefix && suffix<b.length-prefix && a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
  return {start:b.slice(0,prefix).join('').length,end:b.slice(0,b.length-suffix).join('').length};
}

export function annotated(text:string,reading:string,original?:string) {
  const span=document.createElement('span');span.lang='ja';
  const change=original===undefined?undefined:changedRange(original,text);
  const append=(parent:HTMLElement,start:number,end:number)=>{
    const from=change?Math.max(start,change.start):end,to=change?Math.min(end,change.end):end;
    if(from<to) {
      parent.append(document.createTextNode(text.slice(start,from)));
      const mark=document.createElement('mark');mark.textContent=text.slice(from,to);parent.append(mark,document.createTextNode(text.slice(to,end)));
    } else parent.append(document.createTextNode(text.slice(start,end)));
  };
  let offset=0;
  for(const part of align(text,reading)) {
    append(span,offset,part.start);
    const ruby=document.createElement('ruby');append(ruby,part.start,part.end);
    const rt=document.createElement('rt');rt.textContent=part.reading;ruby.append(rt);span.append(ruby);offset=part.end;
  }
  append(span,offset,text.length);return span;
}

export function renderVerbPlayground(model:VerbPlayground):HTMLElement {
  const section=document.createElement('section');section.className='verb-playground';section.setAttribute('aria-label','Verb Playground');
  const heading=document.createElement('h4');heading.textContent='Verb Playground';
  const description=document.createElement('p');description.className='verb-instruction';description.textContent='Choose a form and adjust its ending.';
  const familyLabel=document.createElement('label');familyLabel.className='verb-family-label';familyLabel.append(document.createTextNode('Form '));
  const select=document.createElement('select');select.className='verb-family';select.setAttribute('aria-label','Verb form');familyLabel.append(select);
  const explanation=document.createElement('p');explanation.className='verb-explanation';
  const controls=document.createElement('div');controls.className='verb-controls';
  const state={...model.initial};
  let pristine=true,chosen=!model.requiresChoice;
  const families=verbFamilies.filter(family=>model.forms.some(form=>form.family===family.id));
  const groups=new Map<string,HTMLOptGroupElement>();
  for(const family of families) {
    let group=groups.get(family.group);
    if(!group) {group=document.createElement('optgroup');group.label=family.group;groups.set(family.group,group);select.append(group);}
    const option=document.createElement('option');option.value=family.id;option.textContent=family.label;group.append(option);
  }
  const choices=document.createElement('div');choices.className='verb-ambiguity';
  if(model.requiresChoice) {
    const prompt=document.createElement('p');prompt.textContent='This spelling has several interpretations, including possible respectful uses. Choose a supported interpretation to explore; the passage determines its meaning.';choices.append(prompt);
    const seen=new Set<string>();
    for(const match of model.sourceMatches) {
      if(seen.has(match.family))continue;seen.add(match.family);
      const button=document.createElement('button');button.type='button';button.textContent=verbFamilies.find(family=>family.id===match.family)?.label ?? match.family;
      button.addEventListener('click',()=>{Object.assign(state,match);chosen=true;pristine=true;paintControls();render();select.focus();});choices.append(button);
    }
  }
  const result=document.createElement('div');result.className='verb-result';result.setAttribute('aria-live','polite');result.setAttribute('aria-atomic','true');
  const render=()=>{
    const family=families.find(family=>family.id===state.family);
    const variant=model.forms.find(form=>form.family===state.family && form.past===state.past && form.negative===state.negative && form.polite===state.polite && form.spoken===state.spoken);
    const japanese=annotated(pristine?model.source:variant?.text ?? model.source,pristine?model.sourceReading:variant?.reading ?? model.sourceReading,model.source);japanese.className='verb-japanese';
    const caption=document.createElement('p');caption.className='verb-state';
    const traits:string[]=[];
    if(chosen && family) {
      traits.push(family.label);
      if(family.controls.includes('past'))traits.push(state.past?'Past':'Nonpast');
      if(family.controls.includes('negative'))traits.push(state.negative?'Negative':'Affirmative');
      if(family.controls.includes('polite'))traits.push(state.polite?'Polite':'Plain');
      if(state.spoken)traits.push('Spoken shortening');
    } else traits.push('Original spelling · Choose an interpretation above');
    caption.textContent=traits.join(' · ');
    result.replaceChildren(japanese,caption);
    familyLabel.hidden=controls.hidden=explanation.hidden=!chosen;choices.hidden=chosen;
    select.value=state.family;explanation.textContent=family?.description ?? '';
  };
  const paintControls=()=>{
    controls.replaceChildren();
    const family=families.find(family=>family.id===state.family);
    for(const [key,label] of [['past','Past'],['negative','Negative'],['polite','Polite'],['spoken','Spoken shortening']] as const) {
      if(!family?.controls.includes(key))continue;
      const container=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=state[key];input.dataset.control=key;
      input.addEventListener('change',()=>{state[key]=input.checked;pristine=false;render();});container.append(input,document.createTextNode(label));controls.append(container);
    }
  };
  select.addEventListener('change',()=>{
    const family=families.find(family=>family.id===select.value);if(!family)return;
    state.family=family.id;
    for(const key of ['past','negative','polite','spoken'] as const)if(!family.controls.includes(key))state[key]=false;
    pristine=false;paintControls();render();
  });
  const reset=document.createElement('button');reset.type='button';reset.className='verb-reset';reset.textContent='Reset';
  reset.addEventListener('click',()=>{Object.assign(state,model.initial);chosen=!model.requiresChoice;pristine=true;paintControls();render();});
  const output=document.createElement('div');output.className='verb-output';
  const resultBar=document.createElement('div');resultBar.className='verb-result-bar';resultBar.append(document.createTextNode('Result'),reset);output.append(resultBar,result);
  const help=document.createElement('details');help.className='verb-help';
  const summary=document.createElement('summary');summary.textContent='How to use this form';
  const note=document.createElement('p');note.textContent='Underlined characters differ from the original. Reset restores its exact spelling. These forms are demonstrations; the surrounding sentence and social context may need other changes.';
  help.append(summary,note);
  section.append(heading,description,choices,familyLabel,controls,output,explanation,help);paintControls();render();return section;
}

export type PlaygroundTokenizer=(texts:string[],signal:AbortSignal)=>Promise<Word[][]>;
export interface VerbInterpretation {label:string;model:VerbPlayground}

function withOriginal(base:VerbBase,original:VerbPlayground):VerbPlayground|undefined {
  try {return createVerbPlayground(base,{text:original.source,reading:original.sourceReading,start:original.start,end:original.end});}catch {return;}
}

/** Potential-looking dictionary entries remain restricted until their bases are verified locally. */
export async function verifiedVerbInterpretations(model:VerbPlayground,tokenize:PlaygroundTokenizer,signal:AbortSignal):Promise<VerbInterpretation[]> {
  const queries=potentialBaseQueries(model.base).filter(query=>Array.from(query).length<=40).slice(0,4);
  if(!queries.length)return [{label:model.base.label ?? model.source,model}];
  const restricted=withOriginal(restrictVerbBase(model.base),model);
  const choices:VerbInterpretation[]=restricted?[{label:`${model.base.label ?? model.lemma} · dictionary entry (limited forms)`,model:restricted}]:[];
  const results=await tokenize(queries,signal);
  if(signal.aborted)return [];
  const seen=new Set<string>();
  let verified=false;
  for(let index=0;index<queries.length;index++) {
    if(isRaDroppedPotential(model.base,queries[index],results[index] ?? []))return [];
    const base=resolvePotentialBase(model.base,queries[index],results[index] ?? []);
    if(!base || seen.has(base.lemma))continue;
    verified=true;
    const derived=withOriginal(base,model);if(!derived)continue;
    seen.add(base.lemma);choices.push({label:`Potential of ${base.prefix ?? ''}${base.lemma} (${base.prefixReading ?? ''}${base.reading})`,model:derived});
  }
  return verified?choices:[{label:model.base.label ?? model.source,model}];
}

const explorationCleanup=new WeakMap<HTMLElement,()=>void>();
export function disposeExplorations(panel:HTMLElement):void {explorationCleanup.get(panel)?.();explorationCleanup.delete(panel);}

export function renderExplorations(models:WordExplorations,settings:{tokenize?:PlaygroundTokenizer}={}):HTMLElement {
  const panel=document.createElement('div');panel.className='explore-panel';panel.hidden=true;
  const tools=document.createElement('div');tools.className='explore-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','Exploration tools');
  const body=document.createElement('div');body.className='explore-body';
  const options:{label:string;source?:string;reading?:string;render:()=>HTMLElement}[]=[];
  let controller:AbortController|undefined,disposed=false;
  const cancel=()=>{controller?.abort();controller=undefined;};
  explorationCleanup.set(panel,()=>{disposed=true;cancel();});
  if(models.verb) {
    const model=models.verb;
    options.push({label:'Verb Playground',source:model.source,reading:model.sourceReading,render:()=>{
      const wrapper=document.createElement('div');
      if(!potentialBaseQueries(model.base).length) {wrapper.append(renderVerbPlayground(model));return wrapper;}
      if(!settings.tokenize) {
        const restricted=withOriginal(restrictVerbBase(model.base),model);
        const note=document.createElement('p');note.textContent='Other constructions need a local dictionary check. Only supported basic forms are available here.';wrapper.append(note);if(restricted)wrapper.append(renderVerbPlayground(restricted));return wrapper;
      }
      const loading=document.createElement('p');loading.setAttribute('role','status');loading.textContent='Checking possible dictionary bases locally…';wrapper.append(loading);
      controller=new AbortController();const current=controller;
      void verifiedVerbInterpretations(model,settings.tokenize,current.signal).then(interpretations=>{
        if(disposed || current.signal.aborted)return;
        if(!interpretations.length) {
          const note=document.createElement('p');note.textContent='This appears to contain a derived construction outside the supported forms. Try its dictionary verb in Playgrounds.';wrapper.replaceChildren(note);return;
        }
        if(interpretations.length===1) {wrapper.replaceChildren(renderVerbPlayground(interpretations[0].model));return;}
        const choices=document.createElement('div');choices.className='verb-base-choices';
        const prompt=document.createElement('p');prompt.textContent='This word may be a potential form or its own dictionary entry. Choose which to explore.';choices.append(prompt);
        for(const interpretation of interpretations) {
          const button=document.createElement('button');button.type='button';button.textContent=interpretation.label;
          button.addEventListener('click',()=>{wrapper.replaceChildren(renderVerbPlayground(interpretation.model));wrapper.querySelector<HTMLElement>('select,button')?.focus();});choices.append(button);
        }
        wrapper.replaceChildren(choices);
      }).catch(()=>{
        if(disposed || current.signal.aborted)return;
        const note=document.createElement('p');note.textContent='Could not verify other bases. Only supported basic dictionary forms are available.';
        const restricted=withOriginal(restrictVerbBase(model.base),model);wrapper.replaceChildren(note);if(restricted)wrapper.append(renderVerbPlayground(restricted));
      });
      return wrapper;
    }});
  }
  if(models.mimetic) {const model=models.mimetic;options.push({label:'Mimetic Playground',render:()=>renderMimeticPlayground(model)});}
  if(models.meaning) {const model=models.meaning;options.push({label:'Meaning Forks',source:model.source,reading:model.reading,render:()=>renderMeaningForks(model)});}
  const buttons:HTMLButtonElement[]=[];
  const choose=(index:number)=>{
    cancel();
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    const option=options[index];body.replaceChildren();
    if(option.source) {
      const label=document.createElement('p');label.className='explore-source-label';label.textContent='Original phrase';
      const source=document.createElement('p');source.className='explore-source';source.append(annotated(option.source,option.reading ?? ''));body.append(label,source);
    }
    body.append(option.render());
  };
  for(let i=0;i<options.length;i++) {
    const button=document.createElement('button');button.type='button';button.textContent=options[i].label;button.addEventListener('click',()=>choose(i));buttons.push(button);tools.append(button);
  }
  if(options.length>1)panel.append(tools);
  panel.append(body);if(options.length)choose(0);return panel;
}
