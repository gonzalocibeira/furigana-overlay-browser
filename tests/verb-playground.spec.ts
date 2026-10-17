import {test,expect} from '@playwright/test';
import kuromoji from 'kuromoji';
import {buildVerbPlayground,createVerbPlayground,dictionaryVerbCandidates,potentialBaseQueries,resolvePotentialBase,isRaDroppedPotential,restrictVerbBase,verbBaseText,verbFamilies,type VerbBase,type VerbFamilyId,type VerbPlayground,type VerbState} from '../src/verb-playground';
import {reviewedVerbExamples} from './fixtures/verb-examples';
import {hiragana,type Word} from '../src/shared';
import {verifiedVerbInterpretations} from '../src/exploration';

let tokenizer:kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
test.beforeAll(async()=>{
  tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:'node_modules/kuromoji/dict/'}).build((error,value)=>error?reject(error):resolve(value)));
});
function analyze(text:string):Word[] {
  let offset=0;
  return tokenizer.tokenize(text).flatMap(token=>{
    const start=text.indexOf(token.surface_form,offset);offset=start+token.surface_form.length;
    if(!/[\p{L}\p{N}]/u.test(token.surface_form))return [];
    const lemma=token.basic_form && token.basic_form!=='*'?token.basic_form:token.surface_form;
    return [{start,end:offset,lemma,reading:hiragana(token.reading ?? ''),pos:token.pos,posDetail:token.pos_detail_1,
      ...(token.word_type==='KNOWN' && token.conjugated_type && token.conjugated_type!=='*'?{verbClass:token.conjugated_type,verbForm:token.conjugated_form}:{}),
      ...(token.pos==='動詞' && token.word_type==='KNOWN'?{lemmaReading:hiragana(tokenizer.tokenize(lemma).map(part=>part.reading ?? '').join(''))}:{})}];
  });
}
function explore(text:string,selection=0):VerbPlayground|undefined {return buildVerbPlayground(text,analyze(text),selection);}
function catalog(lemma:string):VerbBase {return reviewedVerbExamples.find(base=>verbBaseText(base)===lemma)!;}
function form(model:VerbPlayground,family:VerbFamilyId,flags:Partial<Omit<VerbState,'family'>>={}) {
  const state:VerbState={family,past:false,negative:false,polite:false,spoken:false,...flags};
  return model.forms.find(value=>value.family===state.family && value.past===state.past && value.negative===state.negative && value.polite===state.polite && value.spoken===state.spoken)!;
}

test('reviewed dictionary-verb fixtures cover all classes with bounded capabilities',()=>{
  expect(reviewedVerbExamples).toHaveLength(30);expect(new Set(reviewedVerbExamples.map(verbBaseText)).size).toBe(30);
  expect(verbFamilies).toHaveLength(18);
  for(const entry of reviewedVerbExamples) {
    expect(entry.gloss).toBeTruthy();expect(entry.keywords.length).toBeGreaterThan(0);
    const model=createVerbPlayground(entry);
    expect(model.source).toBe(verbBaseText(entry));expect(model.forms.length).toBeLessThanOrEqual(128);
    expect(new Set(model.forms.map(value=>value.id)).size).toBe(model.forms.length);
    for(const value of model.forms) {
      const capabilities=verbFamilies.find(family=>family.id===value.family)!.controls;
      for(const key of ['past','negative','polite','spoken'] as const)if(!capabilities.includes(key))expect(value[key],`${entry.lemma} ${value.id}`).toBe(false);
    }
  }
  expect(createVerbPlayground(catalog('食べる')).forms).toHaveLength(119);
});

test('ichidan golden matrix includes eight finite states, standard voice and distinct connections',()=>{
  const model=createVerbPlayground(catalog('食べる'));
  expect(model.forms.filter(value=>value.family==='simple').map(value=>value.text)).toEqual(['食べる','食べます','食べない','食べません','食べた','食べました','食べなかった','食べませんでした']);
  const expected:Partial<Record<VerbFamilyId,string>>={potential:'食べられる',passive:'食べられる',causative:'食べさせる',causativePassive:'食べさせられる',desire:'食べたい',te:'食べて',without:'食べないで',conditionalBa:'食べれば',conditionalTara:'食べたら',volitional:'食べよう',request:'食べてください',imperative:'食べろ',prohibition:'食べるな',teIru:'食べている',teMiru:'食べてみる',teOku:'食べておく',teShimau:'食べてしまう'};
  for(const [family,text] of Object.entries(expected))expect(form(model,family as VerbFamilyId).text,family).toBe(text);
  expect(form(model,'desire',{past:true,negative:true,polite:true}).text).toBe('食べたくなかったです');
  expect(form(model,'conditionalBa',{negative:true}).text).toBe('食べなければ');
  expect(form(model,'te',{negative:true}).text).toBe('食べなくて');
  expect(form(model,'conditionalTara',{negative:true,polite:true}).text).toBe('食べませんでしたら');
  expect(form(model,'volitional',{polite:true}).text).toBe('食べましょう');
  expect(form(model,'request',{negative:true}).text).toBe('食べないでください');
  expect(form(model,'causativePassive',{past:true,negative:true,polite:true}).text).toBe('食べさせられませんでした');
});

test('all nine godan endings and 行く have independent golden forms',()=>{
  const cases:[string,string,string,string,string,string,string][]=[
    ['書く','書いて','書いた','書けば','書こう','書ける','書かせられる'],
    ['泳ぐ','泳いで','泳いだ','泳げば','泳ごう','泳げる','泳がせられる'],
    ['話す','話して','話した','話せば','話そう','話せる','話させられる'],
    ['待つ','待って','待った','待てば','待とう','待てる','待たせられる'],
    ['死ぬ','死んで','死んだ','死ねば','死のう','死ねる','死なせられる'],
    ['遊ぶ','遊んで','遊んだ','遊べば','遊ぼう','遊べる','遊ばせられる'],
    ['読む','読んで','読んだ','読めば','読もう','読める','読ませられる'],
    ['帰る','帰って','帰った','帰れば','帰ろう','帰れる','帰らせられる'],
    ['買う','買って','買った','買えば','買おう','買える','買わせられる'],
    ['行く','行って','行った','行けば','行こう','行ける','行かせられる']
  ];
  for(const [lemma,te,past,ba,volitional,potential,causativePassive] of cases) {
    const model=createVerbPlayground(catalog(lemma));
    for(const [family,text,flags] of [['te',te,{}],['simple',past,{past:true}],['conditionalBa',ba,{}],['volitional',volitional,{}],['potential',potential,{}],['causativePassive',causativePassive,{}]] as const)expect(form(model,family,flags).text,lemma+' '+family).toBe(text);
  }
});

test('する and 来る use correct standard forms and changing readings',()=>{
  const suru=createVerbPlayground(catalog('する')),kuru=createVerbPlayground(catalog('来る'));
  for(const [family,text] of [['potential','できる'],['passive','される'],['causative','させる'],['causativePassive','させられる'],['volitional','しよう'],['imperative','しろ']] as const)expect(form(suru,family).text).toBe(text);
  expect(form(suru,'potential',{negative:true,polite:true,past:true}).text).toBe('できませんでした');
  for(const [family,text,reading] of [['potential','来られる','こられる'],['passive','来られる','こられる'],['causative','来させる','こさせる'],['causativePassive','来させられる','こさせられる'],['volitional','来よう','こよう'],['imperative','来い','こい'],['conditionalBa','来れば','くれば'],['te','来て','きて']] as const)expect(form(kuru,family)).toMatchObject({text,reading});
  expect(form(kuru,'simple',{negative:true})).toMatchObject({text:'来ない',reading:'こない'});
  expect(form(kuru,'simple',{past:true,polite:true})).toMatchObject({text:'来ました',reading:'きました'});
  expect(form(kuru,'teIru',{past:true,negative:true,polite:true,spoken:true})).toMatchObject({text:'来てませんでした',reading:'きてませんでした'});
  for(const model of [suru,kuru])expect(model.forms.some(value=>/ようう|すれる/u.test(value.text))).toBe(false);
});

test('spoken variants cover all eight finite states and voiced で boundaries',()=>{
  const model=createVerbPlayground(catalog('読む'));
  expect(model.forms.filter(value=>value.family==='teIru' && value.spoken).map(value=>value.text)).toEqual(['読んでる','読んでます','読んでない','読んでません','読んでた','読んでました','読んでなかった','読んでませんでした']);
  expect(model.forms.filter(value=>value.family==='teOku' && value.spoken).map(value=>value.text)).toEqual(['読んどく','読んどきます','読んどかない','読んどきません','読んどいた','読んどきました','読んどかなかった','読んどきませんでした']);
  expect(model.forms.filter(value=>value.family==='teShimau' && value.spoken).map(value=>value.text)).toEqual(['読んじゃう','読んじゃいます','読んじゃわない','読んじゃいません','読んじゃった','読んじゃいました','読んじゃわなかった','読んじゃいませんでした']);
  const eat=createVerbPlayground(catalog('食べる'));
  expect(form(eat,'teOku',{past:true,spoken:true}).text).toBe('食べといた');
  expect(form(eat,'teShimau',{past:true,spoken:true}).text).toBe('食べちゃった');
  expect(model.forms.some(value=>/ちまう|さす|まされる/u.test(value.text))).toBe(false);
});

test('recognizes complete source from every token across the expanded family inventory',()=>{
  const sources=['食べて','食べなくて','食べないで','食べたい','食べたくなかったです','食べれば','食べなければ','食べたら','食べませんでしたら','食べよう','食べましょう','食べてください','食べないでください','食べろ','食べるな','食べられませんでした','食べさせる','食べさせられませんでした','読んでいませんでした','読んでみました','読んでおかなかった','読んでしまいました','読んでる','読んでない','読んでませんでした','読んどく','読んどいた','読んじゃう','読んじゃった','読んじゃいませんでした'];
  for(const source of sources) {
    const text='私は'+source+'。',words=analyze(text),first=words.findIndex(word=>word.start===2);
    for(let selected=first;selected<words.length;selected++) {
      const result=buildVerbPlayground(text,words,selected);
      expect(result,`${source}, token ${selected}`).toBeDefined();
      expect(result!.source,`${source}, token ${selected}`).toBe(source);
      expect(result!.start).toBe(2);expect(result!.end).toBe(2+source.length);
      expect(result!.sourceMatches.some(value=>value.text===source)).toBe(true);
    }
  }
});

test('all eight states of everyday constructions recognize with real dictionary segmentation',()=>{
  for(const lemma of ['読む','食べる','する','来る','行く']) {
    const model=createVerbPlayground(catalog(lemma));
    for(const value of model.forms.filter(value=>['teIru','teMiru','teOku','teShimau'].includes(value.family))) {
      const result=explore(value.text+'。');
      expect(result,lemma+' -> '+value.text).toBeDefined();
      expect(result!.source).toBe(value.text);
      expect(result!.sourceMatches.some(match=>match.family===value.family && match.spoken===value.spoken)).toBe(true);
    }
  }
});

test('source ambiguity requires a choice and aliases preserve exact Reset state',()=>{
  const ambiguous=explore('食べられる。')!;
  expect(ambiguous.requiresChoice).toBe(true);
  expect(ambiguous.sourceMatches.map(value=>value.family)).toEqual(['potential','passive']);
  const source='食べたくありませんでした',model=explore(source+'。')!;
  expect(model.source).toBe(source);
  expect(model.sourceMatches[0].text).toBe(source);
  expect(form(model,'desire',{negative:true,polite:true,past:true}).text).toBe('食べたくなかったです');
  expect(form(model,'desire',{negative:true,polite:true}).text).toBe('食べたくないです');
  for(const source of ['食べよ','せよ']) {
    const result=explore(source+'。')!;
    expect(result?.initial.family).toBe('imperative');expect(result.sourceMatches[0].text).toBe(source);
  }
  expect(createVerbPlayground(catalog('読む'),{text:'読めなかった',reading:'よめなかった',start:3,end:9})).toMatchObject({source:'読めなかった',sourceReading:'よめなかった',start:3,end:9,initial:{family:'potential',past:true,negative:true}});
  expect(()=>createVerbPlayground(catalog('読む'),{text:'読める',reading:'ちがう'})).toThrow();
});

test('typed dictionary verbs require trustworthy exact input and preserve noun + する',()=>{
  for(const input of ['食べる','読む','行く','来る','勉強する','練習する']) {
    const choices=dictionaryVerbCandidates(input,analyze(input));expect(choices,input).toHaveLength(1);
    expect(verbBaseText(choices[0])).toBe(input);
  }
  const compound=createVerbPlayground(dictionaryVerbCandidates('勉強する',analyze('勉強する'))[0]);
  expect(form(compound,'potential').text).toBe('勉強できる');expect(form(compound,'passive').text).toBe('勉強される');
  const words=analyze('勉強します。');expect(buildVerbPlayground('勉強します。',words,0)).toBeUndefined();
  expect(buildVerbPlayground('勉強します。',words,1)?.source).toBe('します');
  for(const input of ['食べた','食べられる','食べます','読もう','問う','おっしゃる','いらっしゃる','英語する','xyzzyる','食べる。','食べる 読む','<script>','食べる'.repeat(20)])expect(dictionaryVerbCandidates(input,analyze(input)),input).toEqual([]);
});

test('bounded potential probes validate dictionary class and exact reading without assuming semantics',()=>{
  const readable=dictionaryVerbCandidates('読める',analyze('読める'))[0];
  expect(potentialBaseQueries(readable)).toEqual(['読む']);
  expect(resolvePotentialBase(readable,'読む',analyze('読む'))).toMatchObject({lemma:'読む',reading:'よむ'});
  const cut=dictionaryVerbCandidates('切れる',analyze('切れる'))[0];expect(resolvePotentialBase(cut,'切る',analyze('切る'))?.lemma).toBe('切る');
  const eat=dictionaryVerbCandidates('食べる',analyze('食べる'))[0];expect(potentialBaseQueries(eat)).toEqual(['食ぶ']);expect(resolvePotentialBase(eat,'食ぶ',analyze('食ぶ'))).toBeUndefined();
  expect(resolvePotentialBase({...readable,reading:'べつ'},'読む',analyze('読む'))).toBeUndefined();
  expect(resolvePotentialBase(readable,'飲む',analyze('飲む'))).toBeUndefined();
  const lexical=createVerbPlayground(restrictVerbBase(readable));
  expect(lexical.forms.some(value=>['potential','passive','causative','causativePassive'].includes(value.family))).toBe(false);
  expect(form(lexical,'simple',{negative:true}).text).toBe('読めない');
  expect(potentialBaseQueries(catalog('ある'))).toEqual([]);
});

test('semantic exceptions restrict derived forms and ambiguous いる gets explicit curated choices',()=>{
  for(const lemma of ['ある','有る','在る','できる','出来る']) {
    const candidates=dictionaryVerbCandidates(lemma,analyze(lemma));expect(candidates).toHaveLength(1);
    const model=createVerbPlayground(candidates[0]);
    expect(model.forms.every(value=>['simple','te','without','conditionalBa','conditionalTara'].includes(value.family))).toBe(true);
  }
  const aru=createVerbPlayground(catalog('ある'));expect(form(aru,'simple',{negative:true}).text).toBe('ない');expect(form(aru,'conditionalBa',{negative:true}).text).toBe('なければ');
  const choices=dictionaryVerbCandidates('いる',analyze('いる'));expect(choices.length).toBeGreaterThan(1);
  const exist=createVerbPlayground(choices.find(value=>value.verbClass==='一段')!);expect(form(exist,'simple',{negative:true}).text).toBe('いない');
  const need=createVerbPlayground(choices.find(value=>value.lemma==='要る')!);expect(form(need,'simple',{negative:true}).text).toBe('要らない');
  expect(explore('いる。')).toBeUndefined();expect(explore('居る。')).toBeUndefined();
});

test('unsupported chains, lexical exceptions and untrusted metadata never expose a partial helper',()=>{
  for(const source of ['読んできた','読んではいない','読んでもいない','読んでおりません','読んでいたい','読まざるを得ない','食べないといけない','食べないでいる','読ませている','読まされた','読むらしい','なさる','くださる','おっしゃる','いらっしゃる','問う','請う','乞う','恋う','問うた','ゆく','往く','逝く','嬉しかった','日本語','xyzzyる']) {
    const text=source+'。',words=analyze(text);
    for(let selected=0;selected<words.length;selected++)expect(buildVerbPlayground(text,words,selected),`${source}, token ${selected}`).toBeUndefined();
  }
  const text='書いた。',words=analyze(text);
  for(const damaged of [{...words[0],pos:undefined},{...words[0],posDetail:undefined},{...words[0],verbClass:undefined},{...words[0],lemmaReading:undefined},{...words[0],reading:'かき'},{...words[0],lemmaReading:'*'},{...words[0],start:-1},{...words[0],end:999999},{...words[0],lemma:'書く'.repeat(41)}])expect(buildVerbPlayground(text,[damaged,...words.slice(1)],0)).toBeUndefined();
  expect(buildVerbPlayground(text,words,-1)).toBeUndefined();expect(buildVerbPlayground(text,words,1.5)).toBeUndefined();expect(buildVerbPlayground(text,words,words.length)).toBeUndefined();
  expect(explore('書い た。')).toBeUndefined();expect(explore('書い、た。')).toBeUndefined();
  expect(buildVerbPlayground('書く',[{start:0,end:2,lemma:'書く',reading:'かく'}],0)).toBeUndefined();
  expect(explore('来られる。')).toBeUndefined(); // IPADIC picks classical きたられる.
});


test('godan readings くる and する keep their class across all derived families',()=>{
  for(const [lemma,reading,negative,past,potential,passive,causative,volitional] of [
    ['繰る','くる','くらない','くった','くれる','くられる','くらせる','くろう'],
    ['刷る','する','すらない','すった','すれる','すられる','すらせる','すろう']
  ]) {
    const base=dictionaryVerbCandidates(lemma,analyze(lemma))[0];expect(base.verbClass).toBe('五段・ラ行');
    const model=createVerbPlayground(base);
    expect(form(model,'simple',{negative:true})).toMatchObject({text:lemma.slice(0,-1)+'らない',reading:negative});
    expect(form(model,'simple',{past:true})).toMatchObject({text:lemma.slice(0,-1)+'った',reading:past});
    for(const [family,expected] of [['potential',potential],['passive',passive],['causative',causative],['volitional',volitional]] as const)expect(form(model,family as VerbFamilyId).reading).toBe(expected);
    expect(form(model,'causativePassive').reading).toBe(reading.slice(0,-1)+'らせられる');
    const again=explore(lemma.slice(0,-1)+'った。');expect(again?.sourceReading).toBe(past);
  }
  const coming=dictionaryVerbCandidates('くる',analyze('くる'));expect(coming.map(value=>value.verbClass)).toEqual(['カ変・来ル','五段・ラ行']);
  expect(form(createVerbPlayground(coming[0]),'simple',{negative:true}).reading).toBe('こない');
  expect(form(createVerbPlayground(coming[1]),'simple',{negative:true}).reading).toBe('くらない');
  const doing=dictionaryVerbCandidates('する',analyze('する'));expect(doing.map(value=>value.lemma)).toEqual(['する','刷る','摺る']);
  expect(form(createVerbPlayground(doing[0]),'potential').text).toBe('できる');
  expect(form(createVerbPlayground(doing[1]),'potential').reading).toBe('すれる');
  expect(buildVerbPlayground('くる',analyze('くる'),0)).toBeUndefined();
  expect(buildVerbPlayground('する',analyze('する'),0)).toBeUndefined();
});

test('verified ら抜き dictionary entries are rejected as potential bases without inventing an interpretation',()=>{
  for(const input of ['みれる','見れる','来れる']) {
    const base=dictionaryVerbCandidates(input,analyze(input))[0];expect(base,input).toBeDefined();
    const queries=potentialBaseQueries(base);expect(queries.length).toBeLessThanOrEqual(2);
    expect(queries.some(query=>isRaDroppedPotential(base,query,analyze(query))),input).toBe(true);
    expect(queries.every(query=>!resolvePotentialBase(base,query,analyze(query)))).toBe(true);
  }
  for(const input of ['食べる','読める','切れる']) {
    const base=dictionaryVerbCandidates(input,analyze(input))[0];
    expect(potentialBaseQueries(base).some(query=>isRaDroppedPotential(base,query,analyze(query))),input).toBe(false);
  }
});

test('lexical kana homographs retain their forms without unsupported potential interpretations',async()=>{
  const tokenize=async(texts:string[])=>texts.map(analyze);
  for(const input of ['いれる','入れる','あれる','荒れる']) {
    const [base]=dictionaryVerbCandidates(input,analyze(input));
    expect(base,input).toBeDefined();
    const choices=await verifiedVerbInterpretations(createVerbPlayground(base),tokenize,new AbortController().signal);
    expect(choices,input).toHaveLength(1);
    expect(choices[0].model.base).toEqual(base);
    expect(new Set(choices[0].model.forms.map(value=>value.family)).size,input).toBe(18);
  }
  const [rough]=dictionaryVerbCandidates('あれる',analyze('あれる'));
  expect(resolvePotentialBase(rough,'ある',analyze('ある'))).toBeUndefined();
  for(const source of ['いれた','いれている','あれていた']) {
    const model=explore(source)!;
    expect(model,source).toBeDefined();
    const choices=await verifiedVerbInterpretations(model,tokenize,new AbortController().signal);
    expect(choices,source).toHaveLength(1);
    expect(choices[0].model.source).toBe(source);
    expect(choices[0].model.initial).toEqual(model.initial);
    expect(new Set(choices[0].model.forms.map(value=>value.family)).size,source).toBe(18);
  }
  for(const input of ['みれる','見れる','来れる']) {
    const [base]=dictionaryVerbCandidates(input,analyze(input));
    expect(await verifiedVerbInterpretations(createVerbPlayground(base),tokenize,new AbortController().signal),input).toEqual([]);
  }
  for(const input of ['食べれる','これる']) {
    expect(dictionaryVerbCandidates(input,analyze(input)),input).toEqual([]);
    expect(explore(input),input).toBeUndefined();
  }
});
