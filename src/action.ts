import {toolbarPresentation,type PageStatus} from './action-state';

// Only current top-level documents can establish toolbar availability. Processing
// pauses (scrolling, composition, background tabs) never change this state.
const revisions=new Map<number,symbol>();
async function refreshTab(tabId:number,navigating=false) {
  const revision=Symbol();revisions.set(tabId,revision);
  try {
    const [tab,preferences]=await Promise.all([chrome.tabs.get(tabId),chrome.storage.local.get({enabled:true,excluded:[]})]);
    let page:PageStatus|undefined;
    if(!navigating && toolbarPresentation(tab.url,preferences).state==='unavailable' && /^https?:/.test(tab.url ?? '')) {
      try {
        const response=await chrome.tabs.sendMessage(tabId,{type:'status'},{frameId:0});
        if(typeof response?.message==='string' && ['ready','unavailable'].includes(response.toolbarAvailability))page=response;
      } catch { /* Missing content script, restricted access, or a navigating tab. */ }
    }
    if(revisions.get(tabId)!==revision)return;
    const presentation=toolbarPresentation(tab.url,preferences,page);
    const path=Object.fromEntries([16,32,48,128].map(size=>[size,`icons/icon-${presentation.state}-${size}.png`]));
    await Promise.all([chrome.action.setIcon({tabId,path}),chrome.action.setTitle({tabId,title:presentation.title})]);
  } catch { /* A tab can close while its state is being checked. */ }
}
async function refreshAll() {
  try {await Promise.all((await chrome.tabs.query({})).flatMap(tab=>tab.id===undefined?[]:[refreshTab(tab.id)]));}
  catch { /* Browser shutdown. The manifest supplies the unavailable default. */ }
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type!=='toolbar-status-changed' || sender.frameId!==0 || sender.tab?.id===undefined)return;
  respond({ok:true});void refreshTab(sender.tab.id);
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local' && ('enabled' in changes || 'excluded' in changes))void refreshAll();
});
chrome.tabs.onActivated.addListener(({tabId})=>void refreshTab(tabId));
chrome.tabs.onUpdated.addListener((tabId,changes,tab)=>{
  if(changes.status==='loading' || changes.url)void refreshTab(tabId,changes.status==='loading' || tab.status==='loading');
  else if(changes.status==='complete')void refreshTab(tabId);
});
chrome.tabs.onRemoved.addListener(tabId=>revisions.delete(tabId));
chrome.runtime.onInstalled.addListener(()=>void refreshAll());
chrome.runtime.onStartup.addListener(()=>void refreshAll());
// Also restore state whenever MV3 starts a fresh service worker.
void refreshAll();
