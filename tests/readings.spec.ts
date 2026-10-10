import {test,expect} from '@playwright/test';
import {align, hiragana, ReadingCache} from '../src/shared';
test('hiragana conversion and okurigana alignment',()=>{
  expect(hiragana('ニホンゴ')).toBe('にほんご');
  expect(align('食べる','タベル')).toEqual([{start:0,end:1,reading:'た'}]);
  expect(align('申し込む','モウシコム')).toEqual([{start:0,end:1,reading:'もう'},{start:2,end:3,reading:'こ'}]);
  expect(align('日本語','ニホンゴ')).toEqual([{start:0,end:3,reading:'にほんご'}]);
  expect(align('不明', '*')).toEqual([]);
  expect(align('ひらがな','ヒラガナ')).toEqual([]);
});
test('cache evicts by recency and total retained characters',()=>{
  const cache=new ReadingCache();
  for(let i=0;i<2000;i++)cache.set(String(i),[]);
  cache.get('0');cache.set('next',[]);expect(cache.get('0')).toEqual([]);expect(cache.get('1')).toBeUndefined();
  cache.set('oversized',[{start:0,end:1,reading:'あ'.repeat(200001)}]);expect(cache.get('oversized')).toBeUndefined();
});
