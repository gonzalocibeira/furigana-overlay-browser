import type {Reading} from './shared';
import type {Appearance,DocsReadingView} from './preferences';
export interface ReadingRun {text:string;top:number;left:number;right:number;readings:Reading[]}
export function readingLines(runs:ReadingRun[]) {
  const rows:ReadingRun[][]=[];
  for(const run of [...runs].sort((a,b)=>a.top-b.top||a.left-b.left)) {
    const row=rows.at(-1);
    if(row && Math.abs(run.top-row[0].top)<=3)row.push(run);else rows.push([run]);
  }
  return rows.map(row=>{
    let text='',right=-Infinity;
    const readings:Reading[]=[];
    for(const run of row.sort((a,b)=>a.left-b.left)) {
      if(text && run.left-right>3 && !/\s$/.test(text) && !/^\s/.test(run.text))text+=' ';
      const offset=text.length;text+=run.text;right=run.right;
      for(const part of run.readings)readings.push({...part,start:part.start+offset,end:part.end+offset});
    }
    return {text,readings};
  });
}
export class ReadingPanel {
  private host=document.createElement('fob-reading-view');
  private root=this.host.attachShadow({mode:'closed'});
  private content:HTMLElement;
  private status:HTMLElement;
  private context='';
  private scrollTop=0;
  constructor(close:()=>void) {
    this.root.innerHTML=`<style>
:host{all:initial!important;position:fixed!important;right:12px!important;top:var(--reader-top,100px)!important;bottom:12px!important;width:min(420px,calc(100vw - 24px))!important;z-index:2147483647!important;display:block!important;contain:layout style!important;color-scheme:light!important}*{box-sizing:border-box}.reader{height:100%;display:flex;flex-direction:column;background:#fffdf7;color:#193f3c;border:1px solid #cbd8ce;border-radius:16px;box-shadow:0 8px 36px #193f3c26;overflow:hidden;font:13px/1.5 system-ui,sans-serif}.reader.high{color:#101010;background:#fff}.header{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #dfe7e0}h2{font:700 16px/1.3 system-ui;margin:0}small{display:block;color:#647572;font-size:11px;margin-top:3px}button{margin-left:auto;flex:none;background:transparent;border:1px solid #cbd8ce;border-radius:8px;color:inherit;cursor:pointer;padding:6px 9px;font:600 12px system-ui}button:focus-visible,.content:focus-visible{outline:2px solid #c28637;outline-offset:-3px}.content{padding:18px 22px 28px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;font:20px system-ui,sans-serif;user-select:text}.line{margin:0;line-height:var(--reader-spacing,2.8);white-space:pre-wrap;overflow-wrap:anywhere}ruby{ruby-position:over;ruby-align:center}rt{font:var(--reader-ruby,.5em)/1 system-ui,sans-serif}.empty{font:13px/1.6 system-ui;color:#647572}.status{margin:0;padding:10px 18px;border-top:1px solid #dfe7e0;color:#647572;font-size:11px}@media print{:host{display:none!important}}
</style><section class="reader" role="region" aria-label="Furigana reading view"><header class="header"><div><h2>Reading view</h2><small>Extra space for furigana · Edit in Docs</small></div><button type="button" aria-label="Close reading view">Close</button></header><div class="content" tabindex="0" aria-label="Document reading text" lang="ja"></div><p class="status" role="status" aria-live="polite"></p></section>`;
    this.content=this.root.querySelector('.content')!;this.status=this.root.querySelector('.status')!;
    this.root.querySelector('button')!.addEventListener('click',close);
  }
  owns(event:Event) {return event.composedPath().includes(this.host);}
  loading(show:boolean,text:string) {
    if(!show) {this.host.remove();this.content.replaceChildren();this.context='';this.scrollTop=0;return;}
    if(!this.host.isConnected)document.documentElement.append(this.host);
    if(this.content.childElementCount && !this.content.querySelector('.empty'))this.scrollTop=this.content.scrollTop;
    const p=document.createElement('p');p.className='empty';p.textContent=text;
    this.content.replaceChildren(p);this.status.textContent='Only the active page’s visible text is processed.';
  }
  display(runs:ReadingRun[],context:string,settings:DocsReadingView,appearance:Appearance,top:number,limited:boolean) {
    this.host.style.setProperty('--reader-top',`${Math.max(12,Math.min(top,innerHeight-180))}px`);
    this.host.style.setProperty('--reader-spacing',String(settings.spacing));
    this.host.style.setProperty('--reader-ruby',`${.5*appearance.scale}em`);
    this.root.querySelector('.reader')!.classList.toggle('high',appearance.contrast==='high');
    const fragment=document.createDocumentFragment();
    for(const line of readingLines(runs)) {
      const p=document.createElement('p');p.className='line';let cursor=0;
      for(const part of line.readings) {
        if(!part.reading || part.start<cursor || part.end>line.text.length)continue;
        p.append(document.createTextNode(line.text.slice(cursor,part.start)));
        const ruby=document.createElement('ruby');ruby.append(document.createTextNode(line.text.slice(part.start,part.end)));
        const rt=document.createElement('rt');rt.textContent=part.reading;ruby.append(rt);p.append(ruby);cursor=part.end;
      }
      p.append(document.createTextNode(line.text.slice(cursor)));fragment.append(p);
    }
    if(!runs.length) {const p=document.createElement('p');p.className='empty';p.textContent='No readable text is available in this view.';fragment.append(p);}
    this.content.replaceChildren(fragment);
    this.content.scrollTop=context===this.context?this.scrollTop:0;this.context=context;
    this.status.textContent=`${context==='pageless'?'Visible document text':'Active page · visible text'} · Text-only view${limited?' · View limit reached':''}.`;
  }
  unavailable(text:string) {this.loading(true,text);}
}
