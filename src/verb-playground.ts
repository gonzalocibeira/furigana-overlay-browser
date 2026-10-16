import {conjugateTypeI,conjugateTypeII,type Conjugation} from 'kamiya-codec';
import {hiragana,type Word} from './shared';

export type VerbFamilyId='simple'|'potential'|'passive'|'causative'|'causativePassive'|'desire'|'teIru'|'teMiru'|'teOku'|'teShimau'|'te'|'without'|'conditionalBa'|'conditionalTara'|'volitional'|'request'|'imperative'|'prohibition';
export type VerbControl='past'|'negative'|'polite'|'spoken';
export interface VerbState {family:VerbFamilyId;past:boolean;negative:boolean;polite:boolean;spoken:boolean}
export interface VerbVariant extends VerbState {id:string;text:string;reading:string}
export interface VerbBase {lemma:string;reading:string;verbClass:string;prefix?:string;prefixReading?:string;label?:string;restricted?:boolean}
export interface VerbFamily {id:VerbFamilyId;label:string;group:string;description:string;controls:readonly VerbControl[]}
export interface VerbPlayground {
  start:number;end:number;source:string;sourceReading:string;lemma:string;base:VerbBase;
  forms:VerbVariant[];initial:VerbState;sourceMatches:VerbVariant[];requiresChoice:boolean;
}
const finite:readonly VerbControl[]=['past','negative','polite'];
export const verbFamilies:readonly VerbFamily[]=[
  {id:'simple',label:'Basic',group:'Everyday forms',description:'State an action or situation. Nonpast can describe the present, habits, or the future.',controls:finite},
  {id:'te',label:'Connect: ～て／～なくて',group:'Everyday forms',description:'Connect an affirmative or negative statement to what follows, sometimes giving a reason. Negative ～なくて differs from ～ないで.',controls:['negative']},
  {id:'without',label:'Without doing: ～ないで',group:'Everyday forms',description:'Describe not doing an action, or make a casual negative request. This differs from ～なくて.',controls:[]},
  {id:'desire',label:'Want to: ～たい',group:'Everyday forms',description:'Express a desire to do something. Who wants it and the surrounding context matter.',controls:finite},
  {id:'potential',label:'Can: potential',group:'Ability and voice',description:'Express ability or possibility. Ichidan verbs and 来る share this spelling with passive and some respectful uses.',controls:finite},
  {id:'passive',label:'Passive',group:'Ability and voice',description:'Present someone or something as affected by an action. Participants and particles may need changes.',controls:finite},
  {id:'causative',label:'Make or let: causative',group:'Ability and voice',description:'Express making or allowing someone to act; the sentence determines which meaning applies.',controls:finite},
  {id:'causativePassive',label:'Be made to: causative-passive',group:'Ability and voice',description:'Express being made to act. This playground uses the full form, not the shortened causative-passive.',controls:finite},
  {id:'conditionalBa',label:'If: ～ば',group:'Conditions and intentions',description:'Set a condition. This form has no independent past or polite switch here.',controls:['negative']},
  {id:'conditionalTara',label:'If or when: ～たら',group:'Conditions and intentions',description:'Set a condition or say when something happens. Its た does not by itself locate the condition in the past.',controls:['negative','polite']},
  {id:'volitional',label:'Intention or invitation',group:'Conditions and intentions',description:'Express an intention or invitation. The polite form ends in ～ましょう.',controls:['polite']},
  {id:'request',label:'Please: ～てください',group:'Requests and commands',description:'Make an affirmative or negative request. Politeness also depends on context.',controls:['negative']},
  {id:'imperative',label:'Direct command',group:'Requests and commands',description:'Give a direct, forceful command. This is not a polite request.',controls:[]},
  {id:'prohibition',label:'Do not: ～るな',group:'Requests and commands',description:'Give a direct prohibition. This is stronger than a negative request.',controls:[]},
  {id:'teIru',label:'Ongoing or resulting state: ～ている',group:'Everyday constructions',description:'Describe an ongoing action, repeated activity, or resulting state. The verb and context determine the meaning.',controls:[...finite,'spoken']},
  {id:'teMiru',label:'Try doing: ～てみる',group:'Everyday constructions',description:'Try an action to see what happens. This differs from trying hard or attempting unsuccessfully.',controls:finite},
  {id:'teOku',label:'Prepare or leave: ～ておく',group:'Everyday constructions',description:'Do something in preparation, or leave a situation as it is.',controls:[...finite,'spoken']},
  {id:'teShimau',label:'Finish or end up: ～てしまう',group:'Everyday constructions',description:'Express completion or an unintended result, sometimes with regret. Regret is not automatic.',controls:[...finite,'spoken']}
];

const godan=new Set(['五段・カ行イ音便','五段・カ行促音便','五段・ガ行','五段・サ行','五段・タ行','五段・ナ行','五段・バ行','五段・マ行','五段・ラ行','五段・ワ行促音便']);
const kana=/^[\p{Script=Hiragana}ー]+$/u;
const japanese=/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー]+$/u;
const helperLemmas=new Set(['れる','られる','せる','させる']);
const irregularLexemes=new Set(['問う','請う','乞う','恋う','ゆく','往く','逝く','なさる','為さる','くださる','下さる','おっしゃる','仰る','いらっしゃる','ござる','御座る']);
const lexicalRestrictions=new Set(['できる','出来る']);
const restrictedFamilies=new Set<VerbFamilyId>(['simple','te','without','conditionalBa','conditionalTara']);
type Pair={text:string;reading:string};
const isSuru=(base:VerbBase)=>base.verbClass==='サ変・スル';
const isKuru=(base:VerbBase)=>base.verbClass==='カ変・来ル' || base.verbClass==='カ変・クル';

function validBase(base:VerbBase):boolean {
  if(!base.lemma || base.lemma.length>40 || !japanese.test(base.lemma) || !kana.test(base.reading) || helperLemmas.has(base.lemma) || irregularLexemes.has(base.lemma))return false;
  if(base.prefix && (!japanese.test(base.prefix) || !base.prefixReading || !kana.test(base.prefixReading) || base.lemma!=='する' || (base.prefix+base.lemma).length>40))return false;
  if(base.verbClass==='一段')return base.lemma.endsWith('る') && base.reading.endsWith('る');
  if(base.verbClass==='サ変・スル')return base.lemma==='する' && base.reading==='する';
  if(base.verbClass==='カ変・来ル' || base.verbClass==='カ変・クル')return ['来る','くる'].includes(base.lemma) && base.reading==='くる';
  return godan.has(base.verbClass) && /[うくぐすつぬぶむる]$/u.test(base.lemma);
}
function wordBase(word:Word):VerbBase|undefined {
  if(word.pos!=='動詞' || word.posDetail!=='自立' || !word.verbForm || !word.lemmaReading || !word.verbClass)return;
  const base={lemma:word.lemma,reading:hiragana(word.lemmaReading),verbClass:word.verbClass};
  return validBase(base)?base:undefined;
}
export function restrictVerbBase(base:VerbBase):VerbBase {return {...base,restricted:true};}
export function verbBaseText(base:VerbBase):string {return (base.prefix ?? '')+base.lemma;}
export function verbBaseReading(base:VerbBase):string {return (base.prefixReading ?? '')+base.reading;}

// Use strict elementary stems only. The library's general auxiliary API emits
// incorrect する potential and duplicate volitionals, and defaults to ら抜き.
function elementary(base:VerbBase,conj:Conjugation):Pair {
  if(base.verbClass==='五段・カ行促音便' && (conj==='Te' || conj==='Ta')) {
    const ending=conj==='Te'?'って':'った';return {text:base.lemma.slice(0,-1)+ending,reading:base.reading.slice(0,-1)+ending};
  }
  if(base.reading==='ある' && ['ある','有る','在る'].includes(base.lemma) && conj==='Negative')return {text:'',reading:''};
  // The library dispatches literal くる/する as irregular regardless of class.
  // Godan 繰る（くる）and 刷る（する）must retain their trusted godan class
  // for both spelling and reading. A neutral prefix bypasses literal dispatch.
  if(godan.has(base.verbClass)) {
    const prefix='仮';
    const a=conjugateTypeI(prefix+base.lemma,conj),b=conjugateTypeI(prefix+base.reading,conj);
    if(a.length!==1 || b.length!==1)throw new Error('Ambiguous godan form');
    return {text:a[0].slice(prefix.length),reading:b[0].slice(prefix.length)};
  }
  const fn=base.verbClass==='一段'?conjugateTypeII:conjugateTypeI;
  const a=fn(base.lemma,conj),b=fn(base.reading,conj);
  if(conj==='Imperative' && a.length>1 && b.length>1)return {text:a[0],reading:b[0]};
  if(a.length!==1 || b.length!==1)throw new Error('Ambiguous elementary form');
  return {text:a[0],reading:b[0]};
}
function add(pair:Pair,suffix:string):Pair {return {text:pair.text+suffix,reading:pair.reading+suffix};}
function derived(base:VerbBase,family:VerbFamilyId,spoken:boolean):VerbBase {
  const make=(pair:Pair,verbClass='一段'):VerbBase=>({lemma:pair.text,reading:pair.reading,verbClass});
  const negative=()=>elementary(base,'Negative');
  if(family==='potential') {
    if(isSuru(base))return make({text:'できる',reading:'できる'});
    if(isKuru(base))return make(add(negative(),'られる'));
    return make(add(elementary(base,base.verbClass==='一段'?'Negative':'Conditional'),base.verbClass==='一段'?'られる':'る'));
  }
  if(family==='passive')return make(isSuru(base)?{text:'される',reading:'される'}:add(negative(),base.verbClass==='一段' || isKuru(base)?'られる':'れる'));
  if(family==='causative' || family==='causativePassive') {
    const pair=isSuru(base)?{text:'させる',reading:'させる'}:add(negative(),base.verbClass==='一段' || isKuru(base)?'させる':'せる');
    return make(family==='causativePassive'?{text:pair.text.slice(0,-1)+'られる',reading:pair.reading.slice(0,-1)+'られる'}:pair);
  }
  const te=elementary(base,'Te');
  if(family==='teIru')return make(add(te,'いる'));
  if(family==='teMiru')return make(add(te,'みる'));
  if(family==='teOku')return make(spoken?{text:te.text.slice(0,-1)+(te.text.endsWith('で')?'どく':'とく'),reading:te.reading.slice(0,-1)+(te.reading.endsWith('で')?'どく':'とく')}:add(te,'おく'),'五段・カ行イ音便');
  if(family==='teShimau')return make(spoken?{text:te.text.slice(0,-1)+(te.text.endsWith('で')?'じゃう':'ちゃう'),reading:te.reading.slice(0,-1)+(te.reading.endsWith('で')?'じゃう':'ちゃう')}:add(te,'しまう'),'五段・ワ行促音便');
  return base;
}
function finiteForm(base:VerbBase,state:VerbState):Pair {
  if(state.polite)return add(elementary(base,'Conjunctive'),state.negative?(state.past?'ませんでした':'ません'):(state.past?'ました':'ます'));
  if(state.negative)return add(elementary(base,'Negative'),state.past?'なかった':'ない');
  return elementary(base,state.past?'Ta':'Dictionary');
}
function generate(base:VerbBase,state:VerbState):Pair {
  const family=state.family;
  if(family==='desire')return add(elementary(base,'Conjunctive'),(state.negative?(state.past?'たくなかった':'たくない'):(state.past?'たかった':'たい'))+(state.polite?'です':''));
  if(family==='te')return state.negative?add(elementary(base,'Negative'),'なくて'):elementary(base,'Te');
  if(family==='without')return add(elementary(base,'Negative'),'ないで');
  if(family==='conditionalBa')return add(elementary(base,state.negative?'Negative':'Conditional'),state.negative?'なければ':'ば');
  if(family==='conditionalTara')return add(finiteForm(base,{...state,past:true}),'ら');
  if(family==='volitional') {
    if(state.polite)return add(elementary(base,'Conjunctive'),'ましょう');
    const stem=elementary(base,'Volitional');return base.verbClass==='一段' || isSuru(base) || isKuru(base)?stem:add(stem,'う');
  }
  if(family==='request')return state.negative?add(elementary(base,'Negative'),'ないでください'):add(elementary(base,'Te'),'ください');
  if(family==='imperative')return elementary(base,'Imperative');
  if(family==='prohibition')return add(elementary(base,'Dictionary'),'な');
  const target=derived(base,family,state.spoken),pair=finiteForm(target,state);
  if(family==='teIru' && state.spoken) {
    const te=elementary(base,'Te');return {text:te.text+pair.text.slice(te.text.length+1),reading:te.reading+pair.reading.slice(te.reading.length+1)};
  }
  return pair;
}
function stateId(state:VerbState):string {return [state.family,+state.past,+state.negative,+state.polite,+state.spoken].join(':');}
function formsFor(base:VerbBase):VerbVariant[] {
  if(!validBase(base))return [];
  const restricted=base.restricted || lexicalRestrictions.has(base.lemma) || (base.reading==='ある' && ['ある','有る','在る'].includes(base.lemma));
  const out:VerbVariant[]=[];
  for(const family of verbFamilies) {
    if(restricted && !restrictedFamilies.has(family.id))continue;
    for(const past of family.controls.includes('past')?[false,true]:[false])for(const negative of family.controls.includes('negative')?[false,true]:[false])for(const polite of family.controls.includes('polite')?[false,true]:[false])for(const spoken of family.controls.includes('spoken')?[false,true]:[false]) {
      const state:VerbState={family:family.id,past,negative,polite,spoken};
      const pair=generate(base,state);out.push({...state,id:stateId(state),text:(base.prefix ?? '')+pair.text,reading:(base.prefixReading ?? '')+pair.reading});
    }
  }
  return out;
}
function sourceAliases(base:VerbBase,forms:VerbVariant[]):VerbVariant[] {
  const aliases:VerbVariant[]=[];
  for(const form of forms) {
    if(form.family==='desire' && form.polite && form.negative) {
      const pair=add(elementary(base,'Conjunctive'),form.past?'たくありませんでした':'たくありません');
      aliases.push({...form,id:form.id+':alias',text:(base.prefix ?? '')+pair.text,reading:(base.prefixReading ?? '')+pair.reading});
    }
    if(form.family==='imperative' && (base.verbClass==='一段' || isSuru(base))) {
      const pair=isSuru(base)?{text:'せよ',reading:'せよ'}:add(elementary(base,'Negative'),'よ');
      aliases.push({...form,id:form.id+':alias',text:(base.prefix ?? '')+pair.text,reading:(base.prefixReading ?? '')+pair.reading});
    }
  }
  return aliases;
}
function model(base:VerbBase,forms:VerbVariant[],source:string,sourceReading:string,matches:VerbVariant[],start=0,end=source.length):VerbPlayground {
  const first=matches[0];
  const initial:VerbState={family:first.family,past:first.past,negative:first.negative,polite:first.polite,spoken:first.spoken};
  return {start,end,source,sourceReading,lemma:verbBaseText(base),base,forms,initial,sourceMatches:matches,requiresChoice:new Set(matches.map(match=>match.family)).size>1};
}
export function createVerbPlayground(base:VerbBase,source?:{text:string;reading:string;start?:number;end?:number}):VerbPlayground {
  const forms=formsFor(base),text=source?.text ?? verbBaseText(base),reading=source?.reading ?? verbBaseReading(base);
  const matches=source?[...forms,...sourceAliases(base,forms)].filter(form=>form.text===text && form.reading===reading):forms.filter(form=>form.family==='simple' && !form.past && !form.negative && !form.polite && !form.spoken);
  if(!matches.length)throw new Error('Unsupported dictionary verb or source form');
  return model(base,forms,text,reading,matches,source?.start,source?.end);
}

function contiguous(words:Word[],left:number,right:number):boolean {return left>=0 && right<words.length && words[left].end===words[right].start;}
function auxiliaryPrefix(text:string,words:Word[],start:number):boolean {
  let index=start-1;if(!contiguous(words,index,start))return false;
  if(words[index].pos==='動詞')return true;
  const previous=text.slice(words[index].start,words[index].end);
  // The lexical verb 得る is not independently selectable inside ～ざるを得ない.
  if(words[start].lemma==='得る' && previous==='を' && contiguous(words,index-1,index) && words[index-1].lemma==='ぬ' && text.slice(words[index-1].start,words[index-1].end)==='ざる')return true;
  if(previous==='は' || previous==='も') {if(!contiguous(words,index-1,index))return false;index--;}
  const link=text.slice(words[index].start,words[index].end);
  return (link==='て' || link==='で') && contiguous(words,index-1,index) && words[index-1].pos==='動詞';
}
function unsupportedContinuation(text:string,words:Word[],endIndex:number,family:VerbFamilyId):boolean {
  const next=endIndex+1;if(!contiguous(words,endIndex,next))return false;
  if(words[next].pos==='助動詞' || words[next].pos==='動詞')return true;
  const link=text.slice(words[next].start,words[next].end);
  if(link==='な' && words[next].posDetail==='終助詞' && (words[endIndex].pos==='動詞' || words[endIndex].lemma==='ます'))return true;
  if(link==='で' && words[endIndex].lemma==='ない')return true;
  if(['te','without'].includes(family) && ['は','も'].includes(link))return true;
  return ['て','で','と'].includes(link) && contiguous(words,next,next+1) && words[next+1].pos==='動詞';
}
function terminal(word:Word,family:VerbFamilyId):boolean {
  if(['te','without','conditionalBa'].includes(family))return word.pos==='助詞' && word.posDetail==='接続助詞';
  if(family==='conditionalTara')return word.verbForm==='仮定形';
  if(family==='imperative')return !!word.verbForm?.startsWith('命令') || (word.lemma==='よ' && word.pos==='助詞' && word.posDetail==='終助詞');
  if(family==='request')return !!word.verbForm?.startsWith('命令');
  if(family==='prohibition')return word.pos==='助詞' && word.posDetail==='終助詞';
  return word.verbForm==='基本形' || (family==='teShimau' && word.lemma==='う' && word.pos==='感動詞');
}
/** Bound recognition to twelve starts, twelve tokens, eighty characters and 128 generated forms per base. */
export function buildVerbPlayground(text:string,words:Word[],wordIndex:number):VerbPlayground|undefined {
  if(!Number.isInteger(wordIndex) || wordIndex<0 || wordIndex>=words.length)return;
  let best:VerbPlayground|undefined;
  for(let start=Math.max(0,wordIndex-11);start<=wordIndex;start++) {
    const word=words[start],base=wordBase(word);
    if(!base || auxiliaryPrefix(text,words,start) || word.start<0 || word.end>text.length || word.start>=word.end)continue;
    if((['いる','居る'].includes(base.lemma) || (['くる','する'].includes(base.lemma) && godan.has(base.verbClass))) && word.verbForm==='基本形' && text.slice(word.start,word.end)===base.lemma)continue;
    let forms:VerbVariant[],all:VerbVariant[];
    try {forms=formsFor(base);all=[...forms,...sourceAliases(base,forms)];}catch {continue;}
    if(all.length>128)continue;
    const index=new Map<string,VerbVariant[]>();
    for(const form of all) {const key=form.text+'\0'+form.reading;index.set(key,[...(index.get(key) ?? []),form]);}
    let sourceReading='';
    for(let endIndex=start;endIndex<Math.min(words.length,start+12);endIndex++) {
      const endWord=words[endIndex];
      if(endIndex>start && !contiguous(words,endIndex-1,endIndex))break;
      if(endWord.end>text.length || endWord.end<=endWord.start || endWord.end-word.start>80)break;
      sourceReading+=hiragana(endWord.reading);if(endIndex<wordIndex)continue;
      const source=text.slice(word.start,endWord.end);
      const matches=(index.get(source+'\0'+sourceReading) ?? []).filter(form=>terminal(endWord,form.family) && !unsupportedContinuation(text,words,endIndex,form.family));
      if(matches.length && (!best || word.start<best.start || (word.start===best.start && endWord.end>best.end)))best=model(base,forms,source,sourceReading,matches,word.start,endWord.end);
    }
  }
  return best;
}

/** Typed inputs must reproduce a complete known dictionary-form analysis. */
export function dictionaryVerbCandidates(input:string,words:Word[]):VerbBase[] {
  if(!input || input.length>40 || !japanese.test(input) || !words.length || words[0].start!==0 || words.at(-1)!.end!==input.length)return [];
  if(words.some((word,index)=>word.start<0 || word.end<=word.start || word.end>input.length || (index>0 && !contiguous(words,index-1,index))))return [];
  if(input==='くる')return [
    {lemma:'来る',reading:'くる',verbClass:'カ変・来ル',label:'来る — come'},
    {lemma:'繰る',reading:'くる',verbClass:'五段・ラ行',label:'繰る — reel, turn, or leaf through'}
  ];
  if(input==='する')return [
    {lemma:'する',reading:'する',verbClass:'サ変・スル',label:'する — do'},
    {lemma:'刷る',reading:'する',verbClass:'五段・ラ行',label:'刷る — print'},
    {lemma:'摺る',reading:'する',verbClass:'五段・ラ行',label:'摺る — rub or grind'}
  ];
  if(input==='居る')return [
    {lemma:'居る',reading:'いる',verbClass:'一段',label:'居る（いる）— exist or stay (animate)'},
    {lemma:'居る',reading:'おる',verbClass:'五段・ラ行',label:'居る（おる）— be or stay'}
  ];
  if(input==='いる')return [
    {lemma:'いる',reading:'いる',verbClass:'一段',label:'いる — exist or stay (animate)'},
    {lemma:'要る',reading:'いる',verbClass:'五段・ラ行',label:'要る — need'},
    {lemma:'煎る',reading:'いる',verbClass:'五段・ラ行',label:'煎る — roast'},
    {lemma:'炒る',reading:'いる',verbClass:'五段・ラ行',label:'炒る — roast or toast'}
  ];
  const last=words.at(-1)!,base=wordBase(last);
  if(!base || last.verbForm!=='基本形' || input.slice(last.start,last.end)!==base.lemma || hiragana(last.reading)!==base.reading)return [];
  if(words.length===1)return [lexicalRestrictions.has(base.lemma)?restrictVerbBase(base):base];
  if(words.length===2 && base.lemma==='する' && words[0].pos==='名詞' && words[0].posDetail==='サ変接続' && kana.test(hiragana(words[0].reading)))return [{...base,prefix:input.slice(0,last.start),prefixReading:hiragana(words[0].reading)}];
  return [];
}
const potentialRows:Record<string,string>={'え':'う','け':'く','げ':'ぐ','せ':'す','て':'つ','ね':'ぬ','べ':'ぶ','め':'む','れ':'る'};
/** At most one mechanical godan probe; caller validates it using the offline tokenizer. */
export function potentialBaseQueries(base:VerbBase):string[] {
  if(base.prefix || base.verbClass!=='一段' || lexicalRestrictions.has(base.lemma) || !base.lemma.endsWith('る'))return [];
  const tail=potentialRows[base.lemma.at(-2) ?? ''];
  const queries=tail?[base.lemma.slice(0,-2)+tail]:[];
  if(base.lemma==='これる')queries.push('くる');
  return queries;
}
/** A verified ら抜き spelling is outside this playground's standard-form scope. */
export function isRaDroppedPotential(source:VerbBase,query:string,words:Word[]):boolean {
  if(!potentialBaseQueries(source).includes(query))return false;
  for(const candidate of dictionaryVerbCandidates(query,words)) {
    if(candidate.prefix || (candidate.verbClass!=='一段' && !isKuru(candidate)))continue;
    const stem=elementary(candidate,'Negative');
    if(stem.text+'れる'===source.lemma && stem.reading+'れる'===source.reading)return true;
    if(isKuru(candidate) && source.lemma==='これる' && source.reading==='これる')return true;
  }
  return false;
}
export function resolvePotentialBase(source:VerbBase,query:string,words:Word[]):VerbBase|undefined {
  if(!potentialBaseQueries(source).includes(query))return;
  for(const candidate of dictionaryVerbCandidates(query,words)) {
    if(candidate.prefix || !godan.has(candidate.verbClass))continue;
    const potential=derived(candidate,'potential',false);
    if(potential.lemma===source.lemma && potential.reading===source.reading)return candidate;
  }
}
