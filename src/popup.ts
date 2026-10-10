import {appearanceForSite,validOverrides,validateOverride,docsReadingView} from './preferences';
async function main() {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  let hostname='';
  try { if (tab?.url && /^https?:/.test(tab.url)) hostname=new URL(tab.url).hostname; } catch { /* Unavailable tab URL. */ }
  const state = await chrome.storage.local.get({enabled:true, excluded:[],siteAppearance:{},readingOverrides:{},docsReadingView:{}});
  const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
  const excluded = document.querySelector<HTMLInputElement>('#excluded')!;
  const status = document.querySelector('#status')!;
  const card = document.querySelector<HTMLElement>('#status-card')!;
  const label = document.querySelector('#status-label')!;
  document.querySelector('#site')!.textContent = hostname || 'Unavailable on this page';
  enabled.checked = state.enabled !== false;
  excluded.checked = Array.isArray(state.excluded) && state.excluded.includes(hostname);
  excluded.disabled = !hostname;
  function show(text:string, mode:'active'|'paused'|'unavailable'|'loading') {
    status.textContent=text; card.dataset.state=mode;
    label.textContent={active:'On this page',paused:'Paused',unavailable:'Page unavailable',loading:'Getting ready'}[mode];
  }
  let revision=0;
  async function refresh() {
    const current=++revision;
    if (!enabled.checked) { show('Automatic readings are turned off.','paused'); return; }
    if (excluded.checked) { show(`Readings are paused on ${hostname}.`,'paused'); return; }
    if (!hostname || tab?.id === undefined) { show('Open a webpage or Google Doc to see readings.','unavailable'); return; }
    try {
      const response=await chrome.tabs.sendMessage(tab.id,{type:'status'},{frameId:0});
      if (current===revision) show(response.message,response.state ?? (/^Active|^No visible/.test(response.message)?'active':/unavailable|unsupported/i.test(response.message)?'unavailable':'loading'));
    } catch {
      if (current===revision) show('Reload this tab to start automatic readings. Browser-protected pages are unavailable.','unavailable');
    }
  }
  const timers:number[]=[];
  function changed() {
    timers.forEach(clearTimeout); timers.length=0;
    void refresh();
    // Briefly recheck after a preference change; no continuous popup polling.
    for (const delay of [300,1200,4000]) timers.push(window.setTimeout(()=>void refresh(),delay));
  }
  enabled.onchange = async () => {
    try { await chrome.storage.local.set({enabled:enabled.checked}); changed(); }
    catch { show('Could not save the preference. Reopen the menu and try again.','unavailable'); }
  };
  excluded.onchange = async () => {
    try {
      const latest = await chrome.storage.local.get({excluded:[]});
      const sites = new Set<string>(Array.isArray(latest.excluded) ? latest.excluded : []);
      excluded.checked ? sites.add(hostname) : sites.delete(hostname);
      await chrome.storage.local.set({excluded:[...sites]}); changed();
    } catch { show('Could not save the site preference. Reopen the menu and try again.','unavailable'); }
  };
  const docsPage=hostname==='docs.google.com' && !!tab.url && new URL(tab.url).pathname.startsWith('/document/');
  document.querySelector<HTMLElement>('#docs-reading-panel')!.hidden=!docsPage;
  const viewEnabled=document.querySelector<HTMLInputElement>('#docs-reading-enabled')!;
  const spacing=document.querySelector<HTMLSelectElement>('#docs-reading-spacing')!;
  const view=docsReadingView(state.docsReadingView);
  viewEnabled.checked=view.enabled;spacing.value=String(view.spacing);spacing.disabled=!view.enabled;
  async function saveReadingView() {
    const feedback=document.querySelector<HTMLElement>('#docs-reading-feedback')!;
    try {
      await chrome.storage.local.set({docsReadingView:{enabled:viewEnabled.checked,spacing:Number(spacing.value)}});
      spacing.disabled=!viewEnabled.checked;feedback.textContent='Saved for Google Docs.';feedback.dataset.error='false';changed();
    } catch {feedback.textContent='Could not save. Try again.';feedback.dataset.error='true';}
  }
  viewEnabled.onchange=spacing.onchange=()=>void saveReadingView();
  const size=document.querySelector<HTMLSelectElement>('#reading-size')!;
  const contrast=document.querySelector<HTMLSelectElement>('#reading-contrast')!;
  const initial=appearanceForSite(state.siteAppearance,hostname);
  size.value=String(initial.scale);contrast.value=initial.contrast;
  size.disabled=contrast.disabled=!hostname;
  document.querySelector('#appearance-site')!.textContent=hostname?`Saved for ${hostname}.`:'Open a website to customize its readings.';
  async function saveAppearance() {
    const feedback=document.querySelector<HTMLElement>('#appearance-feedback')!;
    try {
      const latest=await chrome.storage.local.get({siteAppearance:{}});
      const sites=latest.siteAppearance && typeof latest.siteAppearance==='object'?{...latest.siteAppearance as Record<string,unknown>}:{};
      sites[hostname]={scale:Number(size.value),contrast:contrast.value};
      await chrome.storage.local.set({siteAppearance:sites});
      feedback.textContent='Saved for this site.';feedback.dataset.error='false';changed();
    } catch {feedback.textContent='Could not save. Try again.';feedback.dataset.error='true';}
  }
  size.onchange=contrast.onchange=()=>void saveAppearance();
  const word=document.querySelector<HTMLInputElement>('#correction-word')!;
  const reading=document.querySelector<HTMLInputElement>('#correction-reading')!;
  const form=document.querySelector<HTMLFormElement>('#correction-form')!;
  const list=document.querySelector('#corrections')!;
  const cancelEdit=document.querySelector<HTMLButtonElement>('#cancel-edit')!;
  const feedback=document.querySelector<HTMLElement>('#correction-feedback')!;
  let editingWord:string|undefined;
  function report(text:string,error=false) {feedback.textContent=text;feedback.dataset.error=String(error);}
  function reset() {form.reset();editingWord=undefined;cancelEdit.hidden=true;}
  cancelEdit.onclick=()=>{reset();report('');};
  function renderCorrections(values:Record<string,string>) {
    list.replaceChildren();document.querySelector('#correction-count')!.textContent=Object.keys(values).length?`(${Object.keys(values).length})`:'';
    for(const [w,r] of Object.entries(values)) {
      const row=document.createElement('li');row.className='correction';
      const copy=document.createElement('span');copy.textContent=w;
      const kana=document.createElement('small');kana.textContent=r;copy.append(kana);
      const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.setAttribute('aria-label',`Edit ${w}`);
      edit.onclick=()=>{word.value=w;reading.value=r;editingWord=w;cancelEdit.hidden=false;word.focus();};
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${w}`);
      remove.onclick=async()=>{
        try {
          const latest=await chrome.storage.local.get({readingOverrides:{}}),values=validOverrides(latest.readingOverrides);
          delete values[w];await chrome.storage.local.set({readingOverrides:values});renderCorrections(values);
          if(editingWord===w)reset();report('Correction removed.');changed();
        } catch {report('Could not remove the correction. Try again.',true);}
      };
      row.append(copy,edit,remove);list.append(row);
    }
  }
  renderCorrections(validOverrides(state.readingOverrides));
  form.onsubmit=async event=>{
    event.preventDefault();
    try {
      const correction=validateOverride(word.value,reading.value);
      const latest=await chrome.storage.local.get({readingOverrides:{}}),values=validOverrides(latest.readingOverrides);
      if(editingWord && editingWord!==correction.word)delete values[editingWord];
      if(!(correction.word in values) && Object.keys(values).length>=200)throw new Error('You have 200 corrections. Remove one before adding another.');
      values[correction.word]=correction.reading;
      await chrome.storage.local.set({readingOverrides:values});renderCorrections(values);reset();report('Saved. Readings update automatically.');changed();
    } catch(error) {report(error instanceof Error?error.message:'Could not save the correction.',true);}
  };
  changed();
}
void main();
