import type {DictionaryPage,DictionaryReply,DefinitionLanguage} from './definitions';
const pending=new Map<string,Promise<DictionaryReply>>();
async function page(language:DefinitionLanguage,word:string):Promise<DictionaryPage> {
  try {
    const url=new URL(`https://${language}.wiktionary.org/w/api.php`);
    url.search=new URLSearchParams({action:'parse',page:word,prop:'text',format:'json',formatversion:'2',redirects:'1',disableeditsection:'1'}).toString();
    const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
    if(!response.ok)return {status:response.status===404?'missing':'error'};
    // Keep oversized entries from consuming unbounded memory in the service worker.
    const reader=response.body?.getReader();if(!reader)return {status:'error'};
    const chunks:Uint8Array[]=[];let size=0;
    for(;;) {
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>1_000_000) {await reader.cancel();return {status:'error'};}
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(data.error)return {status:data.error.code==='missingtitle'?'missing':'error'};
    return typeof data.parse?.text==='string'?{status:'ok',html:data.parse.text,title:data.parse.title}:{status:'error'};
  } catch {return {status:'error'};}
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type!=='define-word')return;
  let url:URL|undefined;try {url=sender.url?new URL(sender.url):undefined;}catch { /* Reject malformed senders below. */ }
  if(sender.tab?.id===undefined || sender.frameId!==0 || !url || !['http:','https:'].includes(url.protocol) || typeof message.word!=='string' || !/^[\p{L}\p{M}\p{N}々〆ー・\s'-]{1,80}$/u.test(message.word) || !message.word.trim()) {
    respond({error:'Invalid dictionary request'});return;
  }
  const word=message.word.trim();let job=pending.get(word);
  if(!job) {
    if(pending.size>=8) {respond({error:'Dictionary is busy. Try again.'});return;}
    job=Promise.all([page('en',word),page('ja',word)]).then(([en,ja])=>({en,ja})).finally(()=>pending.delete(word));
    pending.set(word,job);
  }
  void job.then(respond);return true;
});
