import {appearance,appearanceForSite,validOverrides,validateOverride,readingViewPreferences,mergeCorrectionBackup,correctionBackupLimit,type PreferenceMutation} from './preferences';

// Runtime messages wake this single MV3 worker; keep each read/modify/write in
// the same queue, including imports and deletions, so other clients cannot race it.
let pending=Promise.resolve();
function string(value:unknown,limit:number) {
  if(typeof value!=='string' || value.length>limit)throw new Error('Invalid preference value.');
  return value;
}
function hostname(value:unknown) {
  const name=string(value,253);
  if(!name || /[\s/\\?#]/u.test(name))throw new Error('Invalid website preference.');
  return name;
}
function record(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Invalid preference value.');
  return value as Record<string,unknown>;
}
async function apply(mutation:PreferenceMutation) {
  switch(mutation.kind) {
    case 'reading-view': {
      const patch=record(mutation.patch);
      if(Object.entries(patch).some(([key,value])=>!['spacing','fontSize','width'].includes(key) || typeof value!=='number' || !Number.isFinite(value)))throw new Error('Invalid reading panel preference.');
      if(mutation.site) {hostname(mutation.site.hostname);if(typeof mutation.site.enabled!=='boolean')throw new Error('Invalid website preference.');}
      const state=await chrome.storage.local.get(['readingView','docsReadingView']);
      const current=readingViewPreferences(state.readingView,state.docsReadingView);
      const next=readingViewPreferences({...current,...patch,sites:mutation.site?{...current.sites,[mutation.site.hostname]:mutation.site.enabled}:current.sites});
      await chrome.storage.local.set({readingView:next});return next;
    }
    case 'save-correction': {
      const correction=validateOverride(string(mutation.word,80),string(mutation.reading,80));
      const previous=mutation.previousWord===undefined?undefined:string(mutation.previousWord,80).trim().normalize('NFC');
      const state=await chrome.storage.local.get({readingOverrides:{}}),values=validOverrides(state.readingOverrides);
      if(previous && previous!==correction.word)delete values[previous];
      if(!Object.hasOwn(values,correction.word) && Object.keys(values).length>=200)throw new Error('You have 200 corrections. Remove one before adding another.');
      values[correction.word]=correction.reading;
      await chrome.storage.local.set({readingOverrides:values});return values;
    }
    case 'remove-correction': {
      const word=string(mutation.word,80).trim().normalize('NFC');
      const state=await chrome.storage.local.get({readingOverrides:{}}),values=validOverrides(state.readingOverrides);
      delete values[word];await chrome.storage.local.set({readingOverrides:values});return values;
    }
    case 'import-corrections': {
      if(typeof mutation.json!=='string')throw new Error('Invalid correction backup.');
      if(mutation.json.length>correctionBackupLimit)throw new Error('Choose a backup smaller than 256 KiB.');
      const json=mutation.json;
      const state=await chrome.storage.local.get({readingOverrides:{}});
      const result=mergeCorrectionBackup(json,validOverrides(state.readingOverrides));
      await chrome.storage.local.set({readingOverrides:result.values});return result;
    }
    case 'pause-site': {
      const name=hostname(mutation.hostname);
      if(typeof mutation.paused!=='boolean')throw new Error('Invalid website preference.');
      const state=await chrome.storage.local.get({excluded:[]});
      const sites=new Set<string>(Array.isArray(state.excluded)?state.excluded.filter((site):site is string=>typeof site==='string'):[]);
      mutation.paused?sites.add(name):sites.delete(name);
      const excluded=[...sites];await chrome.storage.local.set({excluded});return excluded;
    }
    case 'site-appearance': {
      const name=hostname(mutation.hostname),patch=record(mutation.patch);
      if(Object.entries(patch).some(([key,value])=>key==='scale'?typeof value!=='number' || !Number.isFinite(value):key!=='contrast' || !['auto','high'].includes(String(value))))throw new Error('Invalid reading appearance.');
      const state=await chrome.storage.local.get({siteAppearance:{}});
      const sites=state.siteAppearance && typeof state.siteAppearance==='object' && !Array.isArray(state.siteAppearance)?{...state.siteAppearance as Record<string,unknown>}:{};
      const next=appearance({...appearanceForSite(sites,name),...patch});sites[name]=next;
      await chrome.storage.local.set({siteAppearance:sites});return next;
    }
    default:throw new Error('Invalid preference operation.');
  }
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type!=='mutate-preferences')return;
  const popup=sender.url===chrome.runtime.getURL('popup.html');
  let webpage=false;
  try {webpage=sender.tab?.id!==undefined && sender.frameId===0 && ['http:','https:'].includes(new URL(sender.url ?? '').protocol);}catch {}
  if(sender.id!==chrome.runtime.id || (!popup && !webpage)) {respond({error:'Invalid preference sender.'});return;}
  if(!message.mutation || typeof message.mutation!=='object' || Array.isArray(message.mutation)) {respond({error:'Invalid preference operation.'});return;}
  const job=pending.then(()=>apply(message.mutation));
  pending=job.then(()=>{},()=>{});
  void job.then(value=>respond({value}),error=>respond({error:error instanceof Error?error.message:'Could not save the preference. Try again.'}));
  return true;
});
