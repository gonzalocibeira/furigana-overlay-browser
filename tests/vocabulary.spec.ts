import {test,expect} from '@playwright/test';
import kuromoji from 'kuromoji';
import {tokenizeVocabulary,vocabularyHeadwords} from '../src/vocabulary';
import {readWithOverrides} from '../src/preferences';
import {align} from '../src/shared';

let tokenizer:kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
test.beforeAll(async()=>{
  tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:'dist/dict/'}).build((error,value)=>error?reject(error):resolve(value)));
});

test('bundled dictionary prefers common nouns for isolated vocabulary and translation lines',()=>{
  expect(tokenizer.tokenize('出口 = salida')[0].reading).toBe('イデグチ');
  for(const text of ['出口',' 出口 ','出口 = salida','出口＝salida','出口: exit','出口：sortie','\t出口 = saída\t']) {
    const token=tokenizeVocabulary(tokenizer,text).find(t=>t.surface_form==='出口')!;
    expect(token.reading,text).toBe('デグチ');
    expect(token.pos_detail_1,text).toBe('一般');
    expect(align(token.surface_form,token.reading!)).toEqual([{start:0,end:2,reading:'でぐち'}]);
  }
  // Exercise the same dictionary-driven rule on another surname/common noun.
  expect(tokenizer.tokenize('河原')[0].reading).toBe('カワハラ');
  expect(tokenizeVocabulary(tokenizer,'河原 = riverbank')[0].reading).toBe('カワラ');
});

test('sentences, names, Japanese glosses and words without a noun alternative keep dictionary analysis',()=>{
  for(const text of ['出口はどこですか。','出口さん','出口太郎','出口氏は先生です。','出口 = 出口さんの名前','出口 = 123','佐藤','佐藤 = Sato','日本語','食べる','<出口>']) {
    expect(tokenizeVocabulary(tokenizer,text),text).toEqual(tokenizer.tokenize(text));
  }
});

test('multiline vocabulary rules use exact source spans and preserve adjacent names',()=>{
  const text='  出口 = salida\r\n出口さん\n出口はどこですか。\n出口：exit';
  expect(tokenizeVocabulary(tokenizer,text).filter(t=>t.surface_form==='出口').map(t=>t.reading)).toEqual(['デグチ','イデグチ','デグチ','デグチ']);
});

test('saved corrections take precedence without losing vocabulary or name context',()=>{
  function readings(text:string,overrides:Record<string,string>) {
    const headwords=vocabularyHeadwords(text);
    return readWithOverrides(text,overrides,(fragment,sourceOffset)=>{
      let offset=0;
      return tokenizeVocabulary(tokenizer,fragment,headwords,sourceOffset).flatMap(token=>{
        const start=fragment.indexOf(token.surface_form,offset);offset=start+token.surface_form.length;
        return align(token.surface_form,token.reading ?? '').map(part=>({...part,start:start+part.start,end:start+part.end}));
      });
    });
  }
  expect(readings('出口 = salida',{'出口':'いでぐち'})).toEqual([{start:0,end:2,reading:'いでぐち'}]);
  expect(readings('出口太郎',{'太郎':'たろう'})).toEqual([{start:0,end:2,reading:'いでぐち'},{start:2,end:4,reading:'たろう'}]);
  expect(readings('日本語\n出口 = salida',{'日本語':'にっぽんご'})).toEqual([{start:0,end:3,reading:'にっぽんご'},{start:4,end:6,reading:'でぐち'}]);
});
