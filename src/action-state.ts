export type ToolbarAvailability = 'ready'|'unavailable';
export interface PageStatus {
  message:string;
  state:'loading'|'active'|'paused'|'unavailable';
  toolbarAvailability:ToolbarAvailability;
}
export type ToolbarState = 'active'|'paused'|'unavailable';
export interface ToolbarPresentation {state:ToolbarState;title:string}
export function toolbarPresentation(url:string|undefined,preferences:{enabled?:unknown;excluded?:unknown},page?:PageStatus):ToolbarPresentation {
  if(preferences.enabled===false)return {state:'paused',title:'Kō — paused everywhere'};
  let hostname='';
  try {const parsed=new URL(url ?? '');if(/^https?:$/.test(parsed.protocol))hostname=parsed.hostname;} catch { /* Protected or unavailable tab. */ }
  if(hostname && Array.isArray(preferences.excluded) && preferences.excluded.includes(hostname))return {state:'paused',title:`Kō — paused on ${hostname}`};
  if(!hostname)return {state:'unavailable',title:'Kō — unavailable on this page'};
  if(!page)return {state:'unavailable',title:'Kō — reload this tab to start readings'};
  if(page.toolbarAvailability!=='ready')return {state:'unavailable',title:`Kō — ${page.message}`};
  return {state:'active',title:`Kō — active on ${hostname}`};
}
