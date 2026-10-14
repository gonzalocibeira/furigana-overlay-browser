import {ReadingPanel,type ReadingRun} from './reading-panel';
import {appearance,appearanceForSite,validOverrides,readingViewPreferences,panelEnabled,updateReadingView,type Appearance} from './preferences';
import {AdaptivePacer} from './pacing';
import { CollisionIndex } from './geometry';
import type { Reading } from './shared';
import type {PageStatus,ToolbarAvailability} from './action-state';
const hostname = location.hostname || (location.ancestorOrigins[0] ? new URL(location.ancestorOrigins[0]).hostname : '');
const docs = location.hostname === 'docs.google.com' && location.pathname.startsWith('/document/');
if (docs) {
  const init = () => window.dispatchEvent(new CustomEvent('ko-docs-init', {detail:chrome.runtime.id}));
  init(); setTimeout(init, 0);
}
const host = document.createElement('ko-overlay');
const shadow = host.attachShadow({mode:'closed'});
shadow.innerHTML = `<style>:host{all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;overflow:hidden!important;contain:strict!important}span{position:absolute;white-space:nowrap;line-height:1;font-family:system-ui,sans-serif;color:var(--ko-color,#15232b);text-shadow:0 0 2px var(--ko-bg,white);pointer-events:none;user-select:none}@media print{:host{display:none!important}}</style><div aria-hidden="true"></div>`;
const layer = shadow.querySelector('div')!;
let mutationObserver: MutationObserver | undefined;
const watchedShadows = new WeakSet<ShadowRoot>();
const observerOptions: MutationObserverInit = {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['style','class','aria-label','data-font-css','width','height','transform']};
function observeShadow(root: ShadowRoot) {
  if (mutationObserver && !watchedShadows.has(root)) { watchedShadows.add(root); mutationObserver.observe(root,observerOptions); }
}
let enabled = true, excluded: string[] = [], revision = 0, timer = 0, running = false, composing = false;
let message = 'Starting offline furigana…';
let statusState:PageStatus['state']='loading';
let toolbarAvailability:ToolbarAvailability='unavailable';
function setToolbarAvailability(value:ToolbarAvailability) {
  if(toolbarAvailability===value)return;
  toolbarAvailability=value;
  if(window===window.top)void chrome.runtime.sendMessage({type:'toolbar-status-changed'}).catch(()=>{});
}
let readingAppearance:Appearance=appearance(undefined);
let overrides:Record<string,string>={};
let legacyView:unknown;
let rawView:unknown;
let viewSettings=readingViewPreferences(undefined);
const topFrame=window===window.top;
const readingModeEnabled=()=>topFrame && panelEnabled(viewSettings,hostname);
let reader:ReadingPanel|undefined;
function ensureReader() {
  if(reader || !readingModeEnabled())return;
  reader=new ReadingPanel(()=>{void updateReadingView({},{hostname,enabled:false}).catch(()=>reader?.unavailable('Could not close the reading view. Try again.'));},width=>updateReadingView({width}));
  reader.setOverrides(overrides);reader.appearance(viewSettings,readingAppearance);
}
let activeRequest:string|undefined;
const pacer=new AdaptivePacer();
let nextScanAt=0;
let activePage: Element | undefined;
const inputDocuments = new WeakSet<Document>();
function watchInput(target: Document) {
  if (inputDocuments.has(target)) return;
  inputDocuments.add(target);
  target.addEventListener('compositionstart', event => { if(reader?.owns(event))return;composing = true; schedule(); }, true);
  target.addEventListener('compositionend', event => { if(reader?.owns(event))return;composing = false; schedule(); }, true);
  target.addEventListener('input', event => {if(!reader?.owns(event))schedule(150,'edit');}, true);
}
function watchDocsInputs(root: ParentNode) {
  const frames = [...root.querySelectorAll<HTMLIFrameElement>('iframe.docs-texteventtarget-iframe')];
  if (root instanceof HTMLIFrameElement && root.matches('.docs-texteventtarget-iframe')) frames.push(root);
  for (const frame of frames) {
    const attach = () => { try { if (frame.contentDocument) watchInput(frame.contentDocument); } catch { /* Cross-origin frames are unavailable. */ } };
    attach(); frame.addEventListener('load', attach, {once:true});
  }
}
const pages = new Set<Element>();
const visiblePages = new Set<Element>();
const pageObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.isIntersecting ? visiblePages.add(entry.target) : visiblePages.delete(entry.target);
  schedule(100);
});
let editorClip: DOMRect | undefined;
const visible = (r: DOMRect) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
function allowed() { return enabled && !excluded.includes(hostname) && !document.hidden && !composing; }
function clear() { layer.replaceChildren(); }
function schedule(delay = 150, activity?:'scroll'|'edit') {
  ensureReader();
  revision++; clear(); window.clearTimeout(timer);
  if(activeRequest) {void chrome.runtime.sendMessage({type:'cancel-tokenize',requestId:activeRequest}).catch(()=>{});activeRequest=undefined;}
  if(activity)delay=pacer.mark(activity);
  // Keep routine Docs panel updates behind a trailing quiet period. Explicit
  // settings/visibility changes still take effect immediately (delay === 0).
  if(readingModeEnabled() && delay>0)delay=Math.max(400,delay);
  statusState=allowed()?'loading':'paused';
  message=!enabled || excluded.includes(hostname)?'Readings are paused for this page.':document.hidden?'Paused while this tab is in the background.':composing?'Waiting for text composition to finish.':activity==='scroll'?'Waiting for scrolling to settle…':activity==='edit'?'Waiting for editing to settle…':'Updating visible readings…';
  reader?.loading(readingModeEnabled() && enabled && !excluded.includes(hostname) && !document.hidden,message,allowed());
  if (allowed()) {nextScanAt=performance.now()+delay;timer = window.setTimeout(() => { if (!running) void scan(); }, delay);}
}
function registerPages(root: ParentNode) {
  const found = [...root.querySelectorAll('.kix-page')];
  if (root instanceof Element && root.matches('.kix-page')) found.push(root);
  for (const page of found) if (!pages.has(page)) { pages.add(page); pageObserver.observe(page); }
}
function region(): Element | undefined {
  if (!docs) return document.body;
  for (const page of pages) if (!page.isConnected) { pages.delete(page); visiblePages.delete(page); pageObserver.unobserve(page); }
  let best = activePage && visiblePages.has(activePage) ? activePage : undefined;
  let area = 0;
  const candidates = best ? [best, ...[...visiblePages].filter(p => p !== best)] : [...visiblePages];
  for (const page of candidates) {
    const r = page.getBoundingClientRect();
    const current = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    if (current > area) { best = page; area = current; }
  }
  activePage = best;
  if (pages.size) return best;
  return document.querySelector('.kix-appview-editor') ?? undefined;
}
interface Source { sourceOffset?:number; orderBox?:DOMRect; text: string; rect: (start: number, end: number) => DOMRect | undefined; fontSize: number; color: string; background: string; block?: Element; identity?: Text }
function textSource(node: Text): Source | undefined {
  const parent = node.parentElement!;
  let block = parent;
  while (block.parentElement && ['inline','contents'].includes(getComputedStyle(block).display)) block = block.parentElement;
  const style = getComputedStyle(parent);
  if (style.visibility !== 'visible' || style.display === 'none' || style.writingMode !== 'horizontal-tb') return;
  let offset = 0;
  // For exceptionally long nodes, use viewport hit-testing to avoid measuring the entire string.
  if (node.length > 2000) {
    const doc = document as Document & {caretRangeFromPoint(x:number,y:number):Range|null};
    let first = Infinity;
    for (let y = 8; y < innerHeight; y += Math.max(32, Math.ceil(innerHeight / 64))) {
      const range = doc.caretRangeFromPoint?.(Math.max(1, parent.getBoundingClientRect().left + 2), y);
      if (range?.startContainer === node) first = Math.min(first, range.startOffset);
    }
    if (first === Infinity) return;
    offset = Math.max(0, first - 64);
  }
  const text = node.data.slice(offset, offset + 2000);
  if (!text.trim()) return;
  return {text, block, identity:node, sourceOffset:offset, fontSize:parseFloat(style.fontSize), color:style.color, background:style.backgroundColor,
    rect(start, end) {
      if (!node.isConnected) return;
      const range = document.createRange();
      range.setStart(node, offset + start); range.setEnd(node, offset + end);
      const rects = [...range.getClientRects()].filter(r => r.width > 0);
      return rects.length === 1 && visible(rects[0]) ? rects[0] : undefined;
    }};
}
// The panel can reflow text: unlike overlays, a source may span several lines.
// Split only at viewport boundaries, yielding each measurement cooperatively.
function* visibleTextSources(node:Text):Generator<Source|undefined> {
  const base=textSource(node);if(!base)return;
  const origin=base.sourceOffset ?? 0,range=document.createRange();
  const pending:[number,number][]=[[0,base.text.length]],parts:{start:number;end:number;box:DOMRect}[]=[];
  while(pending.length) {
    const [start,end]=pending.pop()!;
    range.setStart(node,origin+start);range.setEnd(node,origin+end);
    const rects=[...range.getClientRects()].filter(rect=>rect.width>0 && rect.height>0);
    yield undefined;
    const shown=rects.filter(visible);if(!shown.length)continue;
    if(shown.length===rects.length || end-start<=1) {
      parts.push({start,end,box:range.getBoundingClientRect()});continue;
    }
    let mid=start+Math.floor((end-start)/2);
    // Do not split a supplementary character's UTF-16 surrogate pair.
    if(mid>start && /[\uDC00-\uDFFF]/.test(base.text[mid]))mid--;
    if(mid===start)mid=Math.min(end,start+2);
    if(mid===end) {parts.push({start,end,box:range.getBoundingClientRect()});continue;}
    pending.push([mid,end],[start,mid]);
  }
  const merged:typeof parts=[];
  for(const part of parts) {
    const previous=merged.at(-1);
    if(previous?.end===part.start)previous.end=part.end;else merged.push({...part});
  }
  for(const part of merged) {
    const text=base.text.slice(part.start,part.end);if(!text.trim())continue;
    yield {...base,text,sourceOffset:origin+part.start,orderBox:part.box,rect:()=>part.box};
  }
}
const measure = document.createElement('canvas').getContext('2d')!;
function docsSource(element: Element): Source | undefined {
  const text = element.getAttribute('aria-label') ?? '';
  if (!text || text.length > 2000) return;
  const box = element.getBoundingClientRect(); if (!visible(box)) return;
  const font = element.closest('[data-font-css]')?.getAttribute('data-font-css');
  if (!font) return; // Never guess character positions without a font description.
  measure.font = font;
  const fullMetrics = measure.measureText(text);
  const width = fullMetrics.width; if (!width) return;
  const widths = new Map<number,number>([[0,0],[text.length,width]]);
  const ink = new Map<string,TextMetrics>();
  const prefixWidth = (offset: number) => {
    let value=widths.get(offset);
    if (value === undefined) { value=measure.measureText(text.slice(0,offset)).width; widths.set(offset,value); }
    return value;
  };
  const size = Number(font.match(/([\d.]+)px/)?.[1]); if (!size) return;
  const localHeight = element instanceof SVGRectElement ? element.height.baseVal.value : box.height;
  const scaleY = localHeight > 0 ? box.height / localHeight : 1;
  const clip = editorClip;
  // Ignore tile copies outside their own SVG viewport, including hidden tile overlap.
  const svg = element.closest('svg')?.getBoundingClientRect();
  if (clip && (box.bottom <= clip.top || box.top >= clip.bottom || box.right <= clip.left || box.left >= clip.right)) return;
  if (svg && (box.bottom <= svg.top || box.top >= svg.bottom)) return;
  return {text, orderBox:box, fontSize:size * scaleY, color:'#15232b', background:'white', rect(start,end) {
    if (!element.isConnected) return;
    // Geometry is a snapshot for this scan; mutations invalidate its revision.
    const r = box; measure.font = font;
    const left = prefixWidth(start) / width * r.width;
    const right = prefixWidth(end) / width * r.width;
    const fragment=text.slice(start,end);
    let metrics=ink.get(fragment);
    if (!metrics) { metrics=measure.measureText(fragment); ink.set(fragment,metrics); }
    // Docs' annotation rectangles describe a line box, not the painted glyphs.
    // Center the font box in that rectangle, then use the measured ink extents.
    const ascent = metrics.fontBoundingBoxAscent || size * .8;
    const descent = metrics.fontBoundingBoxDescent || size * .2;
    const baseline = r.top + (r.height - (ascent + descent) * scaleY) / 2 + ascent * scaleY;
    const inkAscent = metrics.actualBoundingBoxAscent;
    const inkDescent = metrics.actualBoundingBoxDescent;
    const result = new DOMRect(r.left + left, baseline - inkAscent * scaleY, right - left, (inkAscent + inkDescent) * scaleY);
    return visible(result) ? result : undefined;
  }};
}
// Explicit traversal keeps each step interruptible, including huge offscreen subtrees.
function* sources(root: Element,panelMode=false): Generator<Source | undefined> {
  let node: Node | null = root;
  while (node) {
    let descend = true;
    let source: Source | undefined;
    if (node instanceof Element) {
      if (node === host || reader?.ownsNode(node) || node.matches('script,style,noscript,ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) descend = false;
      else if (node !== root) {
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || (r.width > 0 && r.height > 0 && !visible(r))) descend = false;
      }
      if (descend && docs && node.matches('svg rect[aria-label]')) { source = docsSource(node); descend = false; }
      if (descend && !docs && node.shadowRoot) { observeShadow(node.shadowRoot); yield* sources(node.shadowRoot as unknown as Element,panelMode); }
    } else if (!docs && node instanceof Text && node.parentElement) {if(panelMode)yield* visibleTextSources(node);else source = textSource(node);}
    yield source;
    if (descend && node.firstChild) { node = node.firstChild; continue; }
    while (node && node !== root && !node.nextSibling) node = node.parentNode;
    if (!node || node === root) break;
    node = node.nextSibling;
  }
}
// Anchor discovery to hit-tested viewport elements rather than walking a flat
// document with potentially hundreds of thousands of offscreen siblings.
function* webSources(panelMode=false): Generator<Source | undefined> {
  const seeds = new Set<Element>(), seen = new Map<Text,Set<number>>();
  let inspected = 0;
  const dx = Math.max(64, Math.ceil(innerWidth / 16)), dy = Math.max(16,Math.ceil(innerHeight / 100));
  for (let y = 4; y < innerHeight; y += dy) for (let x = 4; x < innerWidth; x += dx) {
    let element = panelMode?document.elementsFromPoint(x,y).find(element=>element!==host && !reader?.ownsNode(element)) ?? null:document.elementFromPoint(x,y);
    while (element?.shadowRoot) {
      observeShadow(element.shadowRoot);
      const inner = element.shadowRoot.elementFromPoint(x,y);
      if (!inner || inner === element) break;
      element = inner;
    }
    yield undefined;
    if (!element || element === host || seeds.has(element) || seeds.size >= 512) continue;
    if (element.closest('ruby,rt,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) continue;
    seeds.add(element);
    let local = 0;
    for (const source of sources(element,panelMode)) {
      // Bounds traversal even when a viewport element contains a huge flat tree.
      if (++local > 128 || ++inspected > 4096) break;
      if (source?.identity) {
        let offsets=seen.get(source.identity);if(!offsets) {offsets=new Set();seen.set(source.identity,offsets);}
        const offset=source.sourceOffset ?? 0;if(offsets.has(offset)) {yield undefined;continue;}offsets.add(offset);
      }
      yield source;
    }
  }
}
function* groupedSources(root: Element, prepared?: Source[]): Generator<Source | undefined> {
  let group: Source[] = [], length = 0;
  function combine(): Source {
    const parts = group, first = parts[0];
    return {...first, text:parts.map(p => p.text).join(''), rect(start,end) {
      const rectangles: DOMRect[] = []; let offset = 0;
      for (const part of parts) {
        const a = Math.max(0,start-offset), b = Math.min(part.text.length,end-offset);
        if (a < b) { const r = part.rect(a,b); if (!r) return; rectangles.push(r); }
        offset += part.text.length;
      }
      if (!rectangles.length || rectangles.some(r => Math.abs(r.top-rectangles[0].top)>2)) return;
      const left=Math.min(...rectangles.map(r=>r.left)), top=Math.min(...rectangles.map(r=>r.top));
      return new DOMRect(left,top,Math.max(...rectangles.map(r=>r.right))-left,Math.max(...rectangles.map(r=>r.bottom))-top);
    }};
  }
  for (const source of (docs ? (prepared ?? sources(root)) : webSources())) {
    if (!source) { yield undefined; continue; }
    if (group.length && (docs || group[0].block !== source.block || length + source.text.length > 2000)) {
      yield combine(); group = []; length = 0;
    }
    group.push(source); length += source.text.length;
    // Yield a traversal step even when accumulating inline text so the budget remains effective.
    yield undefined;
  }
  if (group.length) yield combine();
}
async function frame() { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
async function scan() {
  if (!allowed() || !document.body) return;
  running = true;
  const version = revision;
  let count = 0, attempted = 0, found = false, skippedSpace = 0, unknown = 0;
  const readingMode=readingModeEnabled();
  const readingRuns:ReadingRun[]=[];
  const runMap=new Map<Source,ReadingRun>();
  let panelCharacters=0,panelLimited=false;
  const collisions = new CollisionIndex();
  let glyphCount=0;
  try {
    const root = region(); if (!root) { message = docs ? 'Waiting for the active Docs page…' : 'Waiting for page content…';statusState='loading';reader?.loading(readingMode,message); return; }
    if (!host.isConnected) document.documentElement.append(host);
    let prepared: Source[] | undefined;
    if (docs) {
      const viewport = document.querySelector('.kix-appview-editor')?.getBoundingClientRect();
      editorClip = new DOMRect(Math.max(0,viewport?.left ?? 0),Math.max(0,viewport?.top ?? 0),0,0);
      editorClip.width = Math.max(0,Math.min(innerWidth,viewport?.right ?? innerWidth)-editorClip.left);
      editorClip.height = Math.max(0,Math.min(innerHeight,viewport?.bottom ?? innerHeight)-editorClip.top);
      prepared = []; const seen = new Set<string>(); let started = performance.now();
      for (const source of sources(root)) {
        if (performance.now()-started >= pacer.budget()) { await frame(); started=performance.now(); if(version!==revision || !allowed()) return; }
        if (!source) continue;
        const base = source.rect(0,source.text.length); if (!base) continue;
        const key = `${source.text}:${base.left.toFixed(1)}:${base.top.toFixed(1)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if(readingMode) {
          if(panelCharacters+source.text.length>16000) {panelLimited=true;break;}
          panelCharacters+=source.text.length;
          const order=source.orderBox ?? base;
          const run:ReadingRun={text:source.text,top:order.top,left:order.left,right:order.right,readings:[]};
          readingRuns.push(run);runMap.set(source,run);
        }
        prepared.push(source);
        // A descender elsewhere in a long line must not block ruby above every word.
        let offset=0;
        for (const glyph of readingMode?[]:source.text) {
          if (glyphCount >= 8000) { collisions.add(base); break; }
          if (glyph.trim()) { const ink=source.rect(offset,offset+glyph.length); if(ink) { collisions.add(ink); glyphCount++; } }
          offset+=glyph.length;
          if(performance.now()-started>=pacer.budget()) { await frame(); started=performance.now(); if(version!==revision || !allowed()) return; }
        }
        if (prepared.length >= 2000) break;
      }
    }
    if(readingMode && !docs) {
      prepared=[];let started=performance.now();
      const discovered:Source[]=[];
      for(const source of webSources(true)) {
        if(performance.now()-started>=pacer.budget()) {await frame();started=performance.now();if(version!==revision || !allowed())return;}
        if(!source)continue;discovered.push(source);
        if(discovered.length>=2000) {panelLimited=true;break;}
      }
      // Order shadow content at its host's position, rather than hit-test order.
      const paths=new Map<Node,Node[]>();
      const path=(node:Node)=>{
        let result=paths.get(node);if(result)return result;
        result=[];let current:Node|null=node;
        while(current) {result.unshift(current);current=current instanceof ShadowRoot?current.host:current.parentNode;}
        paths.set(node,result);return result;
      };
      discovered.sort((a,b)=>{
        if(a.identity===b.identity)return (a.sourceOffset ?? 0)-(b.sourceOffset ?? 0);
        const first=path(a.identity!),second=path(b.identity!);let i=0;
        while(i<first.length && i<second.length && first[i]===second[i])i++;
        if(i===first.length)return -1;if(i===second.length)return 1;
        const order=first[i].compareDocumentPosition(second[i]);
        return order & Node.DOCUMENT_POSITION_FOLLOWING?-1:order & Node.DOCUMENT_POSITION_PRECEDING?1:0;
      });
      let previousSource:Source|undefined;
      for(const source of discovered) {
        if(panelCharacters+source.text.length>16000) {panelLimited=true;break;}
        panelCharacters+=source.text.length;
        const previous=prepared.at(-1);
        if(previous && previous.block===source.block && previous.text.length+source.text.length<2000) {
          // Preserve actual inline whitespace instead of inventing spaces between kanji.
          const contiguous=!previousSource || previousSource.identity!==source.identity || (previousSource.sourceOffset ?? 0)+previousSource.text.length===source.sourceOffset;
          // A hard line break between inline runs must survive in the text-only view.
          let hardBreak=false,node:Node|null=previousSource?.identity ?? null,steps=0;
          if(node?.getRootNode()===source.identity?.getRootNode() && node!==source.identity)while(node && node!==source.identity && steps++<32) {
            if(node.firstChild)node=node.firstChild;
            else {while(node && !node.nextSibling && node!==source.block)node=node.parentNode;node=node===source.block?null:node?.nextSibling ?? null;}
            if(node instanceof HTMLBRElement)hardBreak=true;
          }
          if(!contiguous || hardBreak) {if(++panelCharacters>16000) {panelLimited=true;break;}previous.text+='\n';}
          previous.text+=source.text;
        } else prepared.push({...source});
        previousSource=source;
      }
      for(const source of prepared) {
        const box=source.orderBox!;
        const run:ReadingRun={text:source.text,top:box.top,left:box.left,right:box.right,readings:[]};
        readingRuns.push(run);runMap.set(source,run);
      }
    }
    const iterator = readingMode?prepared![Symbol.iterator]():groupedSources(root,prepared);
    let done = false;
    while (!done && attempted < 500 && version === revision && allowed()) {
      const batch: Source[] = []; let length = 0, started = performance.now();
      while (length < 2000) {
        if (performance.now() - started >= pacer.budget()) { await frame(); started = performance.now(); if (version !== revision || !allowed()) return; }
        const next = iterator.next(); if (next.done) { done = true; break; }
        if (!next.value) continue;
        if (!readingMode && !/[\p{Script=Han}々]/u.test(next.value.text)) continue;
        // Keep each batch under 2,000 characters without losing an oversized next item.
        if (length + next.value.text.length > 2000) {
          await process(batch); batch.length = 0; length = 0;
          if (version !== revision) return;
          if(attempted>=500)break;
        }
        batch.push(next.value); length += next.value.text.length; found = true;
      }
      await process(batch);
    }
    if (version!==revision || !allowed())return;
    statusState='active';
    if(docs && !prepared?.length) {message='Docs text is unavailable. Reload this document after installation. This editor version may be unsupported.';statusState='unavailable';if(readingMode)reader?.unavailable(message);}
    else if(!found)message='No visible kanji in this view.';
    else message=`Active — ${layer.childElementCount} visible readings${docs ? (activePage ? ' on the active page' : ' in the editor viewport') : ''}.${skippedSpace ? ` Tight spacing: ${skippedSpace} omitted.` : ''}${unknown ? ` Unknown words: ${unknown}. Add a local correction in the menu.` : ''}${attempted>=500 ? ' View limit reached; scroll to reveal more.' : ''}`;
    if(readingMode && (!docs || prepared?.length)) {
      reader?.display(readingRuns,!docs?'web':activePage?String([...pages].indexOf(activePage)):'pageless',viewSettings,readingAppearance,(docs?editorClip?.top:12) ?? 100,panelLimited || attempted>=500);
      message=`Reading view — ${count} readings in ${!docs?'the visible webpage text':activePage?'the active page’s visible text':'the editor viewport'}.${unknown?` Unknown words: ${unknown}. Add a local correction in the menu.`:''}${panelLimited || attempted>=500?' View limit reached; scroll to reveal more.':''}`;
    }
    async function process(batch: Source[]) {
      if (!batch.length || version !== revision || !allowed()) return;
      const requestId=crypto.randomUUID();activeRequest=requestId;
      let response:any;
      try {response=await chrome.runtime.sendMessage({type:'tokenize',requestId,texts:batch.map(s=>s.text),overrides,includeWords:readingMode});}
      finally {if(activeRequest===requestId)activeRequest=undefined;}
      if (version !== revision || !allowed() || response?.cancelled) return;
      if (response?.error) throw new Error(response.error);
      if(readingMode)for(let i=0;i<batch.length;i++) {const run=runMap.get(batch[i]);if(run)run.words=response.words?.[i] ?? [];}
      let started = performance.now();
      for (let i = 0; i < batch.length; i++) for (const part of response.results[i] as Reading[]) {
        if (attempted >= 500) return;
        attempted++;
        if(!part.reading) {unknown++;continue;}
        if(readingMode) {runMap.get(batch[i])?.readings.push(part);count++;continue;}
        if (performance.now() - started >= pacer.budget()) { await frame(); started = performance.now(); if (version !== revision || !allowed()) return; }
        const source = batch[i], rect = source.rect(part.start, part.end); if (!rect) continue;
        const span = document.createElement('span'); span.textContent = part.reading;
        const minimum = docs ? 6 : 7;
        let fontSize = Math.max(minimum,Math.min(18, Math.min(12, source.fontSize * .5)*readingAppearance.scale));
        measure.font = `${fontSize}px system-ui`;
        const natural = measure.measureText(part.reading).width;
        fontSize *= Math.min(1, (rect.width + 4) / natural);
        if (fontSize < minimum) { skippedSpace++; continue; }
        let x=0, y=0, width=0, box: DOMRect | undefined;
        // Shrink vertically too. A full em box can overlap while actual kana ink fits.
        while (fontSize >= minimum) {
          measure.font = `${fontSize}px system-ui`;
          const metrics = measure.measureText(part.reading);
          width = metrics.width; x = rect.left + (rect.width - width) / 2;
          if (docs) {
            const ascent = metrics.fontBoundingBoxAscent || fontSize*.8;
            const descent = metrics.fontBoundingBoxDescent || fontSize*.2;
            const baseline = (fontSize-ascent-descent)/2+ascent;
            y = rect.top-.5-baseline-metrics.actualBoundingBoxDescent;
            box = new DOMRect(x,y+baseline-metrics.actualBoundingBoxAscent,width,metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent);
          } else { y=rect.top-fontSize-1; box=new DOMRect(x,y,width,fontSize); }
          const clip = editorClip;
          const clipped = docs && clip && (box.top < clip.top || box.bottom > clip.bottom || box.left < clip.left || box.right > clip.right);
          if (!clipped && x>=0 && x+width<=innerWidth && box.top>=0 && !collisions.overlaps(box)) break;
          box=undefined;
          if (fontSize === minimum) break;
          fontSize=Math.max(minimum,fontSize-.5);
        }
        if (!box) { skippedSpace++; continue; }
        // Hit-test the annotation band to avoid drawing over the preceding line.
        const probe = document.elementFromPoint(x + width / 2, y + fontSize / 2);
        if (!docs && probe) {
          const doc = document as Document & {caretRangeFromPoint(x:number,y:number):Range|null};
          const caret = doc.caretRangeFromPoint?.(x + width / 2, y + fontSize / 2);
          if (caret?.startContainer instanceof Text && caret.startContainer.length) {
            const n = caret.startContainer, start = Math.min(caret.startOffset, n.length - 1);
            const r = document.createRange(); r.setStart(n,start); r.setEnd(n,start+1);
            const hit = r.getBoundingClientRect();
            if (hit.bottom > box.top && hit.top < box.bottom && hit.top < rect.top - 2) {skippedSpace++;continue;}
          }
        }
        span.style.cssText = `left:${x}px;top:${y}px;font-size:${fontSize}px;--ko-color:${readingAppearance.contrast==='high'?'#101010':source.color};--ko-bg:${readingAppearance.contrast==='high'?'white':source.background === 'rgba(0, 0, 0, 0)' ? 'white' : source.background}${readingAppearance.contrast==='high'?';text-shadow:0 0 2px white,1px 0 white,-1px 0 white,0 1px white,0 -1px white':''}`;
        layer.append(span); collisions.add(box); count++;
      }
    }
  } catch (error) { if(version===revision) {message = `Furigana unavailable: ${String(error)}`;statusState='unavailable';clear();if(readingMode)reader?.unavailable(message);} }
  finally {
    if(version===revision && allowed())setToolbarAvailability(statusState==='unavailable'?'unavailable':'ready');
    running = false; if (revision !== version && allowed()) {window.clearTimeout(timer);timer=window.setTimeout(()=>void scan(),Math.max(0,nextScanAt-performance.now()));}
  }
}
chrome.runtime.onMessage.addListener((request, _sender, respond) => { if (request?.type === 'status') respond({message,state:statusState,toolbarAvailability} satisfies PageStatus); });
chrome.storage.onChanged.addListener((changes, area) => {
  if(area!=='local' || !['enabled','excluded','siteAppearance','readingOverrides','docsReadingView','readingView'].some(key=>key in changes))return;
  const wasReading=readingModeEnabled();
  if(changes.enabled)enabled=changes.enabled.newValue!==false;
  if(changes.excluded)excluded=Array.isArray(changes.excluded.newValue)?changes.excluded.newValue:[];
  if(changes.siteAppearance)readingAppearance=appearanceForSite(changes.siteAppearance.newValue,hostname);
  if(changes.readingOverrides) {overrides=validOverrides(changes.readingOverrides.newValue);reader?.setOverrides(overrides);}
  if(changes.docsReadingView)legacyView=changes.docsReadingView.newValue;
  if(changes.readingView)rawView=changes.readingView.newValue;
  viewSettings=readingViewPreferences(rawView,legacyView);
  if(wasReading===readingModeEnabled() && !changes.enabled && !changes.excluded && !changes.readingOverrides && (readingModeEnabled() || !changes.siteAppearance)) {
    reader?.appearance(viewSettings,readingAppearance);return;
  }
  schedule(0);
});
async function start() {
  const state = await chrome.storage.local.get({enabled:true, excluded:[],siteAppearance:{},readingOverrides:{},docsReadingView:{},readingView:null}); enabled = state.enabled !== false; excluded = Array.isArray(state.excluded) ? state.excluded : [];
  readingAppearance=appearanceForSite(state.siteAppearance,hostname);overrides=validOverrides(state.readingOverrides);legacyView=state.docsReadingView;rawView=state.readingView;viewSettings=readingViewPreferences(rawView,legacyView);reader?.setOverrides(overrides);reader?.appearance(viewSettings,readingAppearance);
  if (docs) { registerPages(document); watchDocsInputs(document); }
  watchInput(document);
  const observer = new MutationObserver(records => {
    let relevant = false;
    for (const record of records) {
      if (record.target === host || host.contains(record.target) || reader?.ownsNode(record.target)) continue;
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      if (docs && element?.closest('.kix-cursor,.kix-selection-overlay,.kix-selection-overlay-content')) continue;
      if (docs && record.type !== 'childList' && element?.closest('.kix-page') && element.closest('.kix-page') !== activePage) continue;
      relevant = true;
      if (docs) for (const node of record.addedNodes) if (node instanceof Element) { registerPages(node); watchDocsInputs(node); }
    }
    if (relevant) schedule(150,'edit');
  });
  mutationObserver = observer;
  observer.observe(document.body, observerOptions);
  document.addEventListener('scroll', event => {if(!reader?.owns(event))schedule(100,'scroll');}, {capture:true, passive:true});
  document.addEventListener('load', event => {if(!reader?.owns(event))schedule();}, true);
  window.addEventListener('resize', () => schedule(100));
  window.visualViewport?.addEventListener('resize', () => schedule(100));
  document.addEventListener('visibilitychange', () => schedule(0));
  document.fonts.addEventListener('loadingdone', () => schedule());
  if (!allowed()) message = 'Disabled for this page.';
  setToolbarAvailability('ready');
  schedule(0);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start(), {once:true}); else void start();
