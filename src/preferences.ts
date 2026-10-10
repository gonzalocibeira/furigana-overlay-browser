import {hiragana, type Reading} from './shared';
export interface Appearance { scale: number; contrast: 'auto'|'high' }
export function appearance(value: unknown): Appearance {
  const v=value as Partial<Appearance> | undefined;
  return {scale:typeof v?.scale==='number' && Number.isFinite(v.scale)?Math.max(.75,Math.min(1.5,v.scale)):1,contrast:v?.contrast==='high'?'high':'auto'};
}
export function appearanceForSite(value:unknown,hostname:string) {
  return appearance(value && typeof value==='object'?(value as Record<string,unknown>)[hostname]:undefined);
}
export function validateOverride(word: string, reading: string) {
  word=word.trim().normalize('NFC');reading=hiragana(reading.trim().normalize('NFKC'));
  if (!word || word.length>80 || !/[\p{Script=Han}々]/u.test(word) || /[\p{Cc}\p{Cf}]/u.test(word)) throw new Error('Enter a word containing kanji, up to 80 characters.');
  if (!/^[ぁ-ゖーゝゞ]+$/u.test(reading) || reading.length>80) throw new Error('Enter a reading in hiragana or katakana, up to 80 characters.');
  return {word,reading};
}
export function validOverrides(value: unknown): Record<string,string> {
  const entries:[string,string][]=[];
  if (value && typeof value==='object') for(const [word,raw] of Object.entries(value)) {
    if(entries.length>=200)break;
    try { if(typeof raw==='string') {const v=validateOverride(word,raw);entries.push([v.word,v.reading]);} } catch { /* Ignore malformed persisted values. */ }
  }
  return Object.fromEntries(entries);
}
// Prefer the longest correction at each position, including multi-token names.
export function readWithOverrides(text:string,overrides:Record<string,string>,read:(text:string)=>Reading[]):Reading[] {
  const words=Object.keys(overrides).sort((a,b)=>b.length-a.length);
  if(!words.length)return read(text);
  const out:Reading[]=[];
  let cursor=0;
  function gap(end:number) {
    if(end>cursor)for(const part of read(text.slice(cursor,end)))out.push({...part,start:part.start+cursor,end:part.end+cursor});
  }
  for(let i=0;i<text.length;) {
    const word=words.find(word=>text.startsWith(word,i));
    if(word) {gap(i);out.push({start:i,end:i+word.length,reading:overrides[word]});i+=word.length;cursor=i;} else i++;
  }
  gap(text.length);
  return out;
}
export interface DocsReadingView { enabled:boolean; spacing:number }
export function docsReadingView(value:unknown):DocsReadingView {
  const v=value as Partial<DocsReadingView>|undefined;
  return {enabled:v?.enabled===true,spacing:typeof v?.spacing==='number'&&Number.isFinite(v.spacing)?Math.max(2.2,Math.min(3.4,v.spacing)):2.8};
}
