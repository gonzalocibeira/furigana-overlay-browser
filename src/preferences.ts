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
export function readWithOverrides(text:string,overrides:Record<string,string>,read:(text:string,sourceOffset:number)=>Reading[]):Reading[] {
  const words=Object.keys(overrides).sort((a,b)=>b.length-a.length);
  if(!words.length)return read(text,0);
  const out:Reading[]=[];
  let cursor=0;
  function gap(end:number) {
    if(end>cursor)for(const part of read(text.slice(cursor,end),cursor))out.push({...part,start:part.start+cursor,end:part.end+cursor});
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

export interface ReadingViewPreferences {sites:Record<string,boolean>;spacing:number;fontSize:number;width:number}
export const panelFontSizes=[16,18,20,24,28,32];
export function readingViewPreferences(value:unknown,legacy?:unknown):ReadingViewPreferences {
  const v=value && typeof value==='object' && !Array.isArray(value)?value as Partial<ReadingViewPreferences>:undefined;
  const old=docsReadingView(legacy);
  const sites=v?.sites && typeof v.sites==='object' && !Array.isArray(v.sites)?Object.fromEntries(Object.entries(v.sites).filter(([,enabled])=>typeof enabled==='boolean')):!v && old.enabled?{'docs.google.com':true}:{};
  return {sites,spacing:docsReadingView({spacing:v?.spacing ?? old.spacing}).spacing,fontSize:panelFontSizes.includes(v?.fontSize ?? 0)?v!.fontSize!:20,width:typeof v?.width==='number' && Number.isFinite(v.width)?Math.max(280,Math.min(720,v.width)):420};
}
export function panelEnabled(settings:ReadingViewPreferences,hostname:string) {return Object.hasOwn(settings.sites,hostname) && settings.sites[hostname]===true;}
export type PreferenceMutation =
  | {kind:'reading-view';patch:Partial<Omit<ReadingViewPreferences,'sites'>>;site?:{hostname:string;enabled:boolean}}
  | {kind:'save-correction';word:string;reading:string;previousWord?:string}
  | {kind:'remove-correction';word:string}
  | {kind:'import-corrections';json:string}
  | {kind:'pause-site';hostname:string;paused:boolean}
  | {kind:'site-appearance';hostname:string;patch:Partial<Appearance>};
async function mutatePreferences<T>(mutation:PreferenceMutation):Promise<T> {
  // One service-worker writer coordinates all tabs and popup windows.
  const reply:{value?:T;error?:string}|undefined=await chrome.runtime.sendMessage({type:'mutate-preferences',mutation});
  if(!reply || reply.error || !Object.hasOwn(reply,'value'))throw new Error(reply?.error ?? 'Could not save the preference. Try again.');
  return reply.value as T;
}
export function updateReadingView(patch:Partial<Omit<ReadingViewPreferences,'sites'>>,site?:{hostname:string;enabled:boolean}) {
  return mutatePreferences<ReadingViewPreferences>({kind:'reading-view',patch,site});
}
export function saveCorrection(word:string,reading:string,previousWord?:string) {
  return mutatePreferences<Record<string,string>>({kind:'save-correction',word,reading,previousWord});
}
export function removeCorrection(word:string) {
  return mutatePreferences<Record<string,string>>({kind:'remove-correction',word});
}
export function importCorrections(json:string) {
  return mutatePreferences<ReturnType<typeof mergeCorrectionBackup>>({kind:'import-corrections',json});
}
export function pauseSite(hostname:string,paused:boolean) {
  return mutatePreferences<string[]>({kind:'pause-site',hostname,paused});
}
export function updateSiteAppearance(hostname:string,patch:Partial<Appearance>) {
  return mutatePreferences<Appearance>({kind:'site-appearance',hostname,patch});
}
export const correctionBackupLimit=256*1024;
export function mergeCorrectionBackup(json:string,existing:Record<string,string>) {
  if(new TextEncoder().encode(json).length>correctionBackupLimit)throw new Error('Choose a backup smaller than 256 KiB.');
  let data:any;try {data=JSON.parse(json);}catch {throw new Error('This file is not valid JSON.');}
  if(!data || data.version!==1 || !data.corrections || typeof data.corrections!=='object' || Array.isArray(data.corrections))throw new Error('Choose a version 1 correction backup.');
  const imported:Record<string,string>={};
  for(const [word,reading] of Object.entries(data.corrections)) {
    if(typeof reading!=='string')throw new Error('The backup contains an invalid correction.');
    const valid=validateOverride(word,reading);
    if(Object.hasOwn(imported,valid.word) && imported[valid.word]!==valid.reading)throw new Error('The backup contains conflicting normalized words.');
    imported[valid.word]=valid.reading;
  }
  const values={...existing};let added=0,skipped=0;
  for(const [word,reading] of Object.entries(imported)) {
    if(Object.hasOwn(values,word))skipped++;else {values[word]=reading;added++;}
  }
  if(Object.keys(values).length>200)throw new Error('This import would exceed 200 corrections. Remove some corrections and try again.');
  return {values,added,skipped};
}
export function correctionMatches(word:string,reading:string,query:string) {
  const normalized=hiragana(query.trim().normalize('NFKC')).toLocaleLowerCase();
  return hiragana(word.normalize('NFKC')).toLocaleLowerCase().includes(normalized) || reading.includes(normalized);
}
