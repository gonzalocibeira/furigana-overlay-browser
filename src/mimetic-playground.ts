/**
 * An authored set of mimetic comparisons. These illustrate a particular use,
 * not an interpretation of the source passage. Artwork and examples are original.
 * Reference pages are opened only by an explicit link click; no data is fetched.
 */
import type {Word} from './shared';
import {mimeticEntries,type MimeticEntry,type MimeticScene} from './mimetic-data';
export {mimeticEntries} from './mimetic-data';
export type {MimeticEntry,MimeticVariant,MimeticCategory,MimeticScene} from './mimetic-data';

/** Normalize script and Unicode-equivalent kana, without guessing spelling variants. */
export function normalizeMimetic(surface:string):string {
  return surface.normalize('NFKC').replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0x60));
}
const spellings=new Map<string,{entry:MimeticEntry;index:0|1}>();
for(const entry of mimeticEntries)for(const [index,variant] of entry.variants.entries()) {
  for(const spelling of [variant.term,...variant.aliases]) {
    const key=normalizeMimetic(spelling);
    if(spellings.has(key))throw new Error(`Duplicate mimetic spelling: ${key}`);
    spellings.set(key,{entry,index:index as 0|1});
  }
}

/** Match only a complete curated expression or an explicitly listed alias. */
export function findMimetic(surface:string):MimeticEntry|undefined {
  const match=spellings.get(normalizeMimetic(surface));
  return match?{...match.entry,initialVariant:match.index}:undefined;
}
export interface MimeticMatch {start:number;end:number;entry:MimeticEntry}

/** Recognize a complete expression across adjacent token boundaries, including the clicked token. */
export function matchMimeticAt(text:string,words:readonly Word[],wordIndex:number):MimeticMatch|undefined {
  if(!Number.isInteger(wordIndex)||wordIndex<0||wordIndex>=words.length)return undefined;
  let best:MimeticMatch|undefined;
  // Listed words are short; bounded joins avoid scanning a passage or taking substrings of a token.
  for(let startIndex=Math.max(0,wordIndex-7);startIndex<=wordIndex;startIndex++) {
    const start=words[startIndex].start;
    let previousEnd=start;
    for(let endIndex=startIndex;endIndex<Math.min(words.length,startIndex+8);endIndex++) {
      const word=words[endIndex];
      if(!Number.isInteger(word.start)||!Number.isInteger(word.end)||word.start!==previousEnd||word.start<0||word.end<=word.start||word.end>text.length||word.end-start>24)break;
      previousEnd=word.end;
      if(endIndex<wordIndex)continue;
      const entry=findMimetic(text.slice(start,word.end));
      if(entry&&(!best||word.end-start>best.end-best.start))best={start,end:word.end,entry};
    }
  }
  return best;
}

const svgNS='http://www.w3.org/2000/svg';
function svgNode<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={},children:SVGElement[]=[]):SVGElementTagNameMap[K] {
  const node=document.createElementNS(svgNS,tag);
  for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));
  node.append(...children);return node;
}
function scene(entry:MimeticEntry,index:0|1,play:boolean) {
  const svg=svgNode('svg',{viewBox:'0 0 240 124','aria-hidden':'true',focusable:'false',class:'mimetic-art'});
  const stroke={fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'};
  const line=(d:string,attrs:Record<string,string|number>={})=>svgNode('path',{...stroke,d,...attrs});
  const circle=(cx:number,cy:number,r:number,attrs:Record<string,string|number>={})=>svgNode('circle',{...stroke,cx,cy,r,...attrs});
  const group=(className:string,children:SVGElement[])=>svgNode('g',{class:className},children);
  const box=(x:number,y:number,width:number,height:number,attrs:Record<string,string|number>={})=>svgNode('rect',{...stroke,x,y,width,height,rx:3,fill:'var(--surface)',...attrs});
  const at=(className:string,x:number,y:number,children:SVGElement[])=>{
    const node=group(className,children);node.setAttribute('transform',`translate(${x} ${y})`);return node;
  };
  type Mood='happy'|'neutral'|'worried'|'angry'|'sad';
  const face=(x:number,y:number,r:number,mood:Mood='neutral')=>{
    const eyes=mood==='happy'?'M-14-4q4-5 8 0M6-4q4-5 8 0':mood==='angry'?'M-14-8-6-4M6-4 14-8':'M-13-5h4M9-5h4';
    const mouth=mood==='happy'?'M-9 7q9 10 18 0':mood==='worried'||mood==='sad'||mood==='angry'?'M-8 13q8-9 16 0':'M-7 9H7';
    const node=group('mimetic-face',[circle(0,0,24,{fill:'var(--surface)'}),line(eyes),line(mouth,{stroke:'var(--accent)'})]);
    node.setAttribute('transform',`translate(${x} ${y}) scale(${r/24})`);return node;
  };
  const person=(x:number,y:number,mood:Mood='neutral',seated=false)=>at('mimetic-person',x,y,[
    face(0,0,14,mood),line('M0 15V43M0 24-15 38M0 24 15 38'),
    line(seated?'M0 43H20V66M0 43-18 50-18 66':'M0 43-12 67M0 43 12 67')
  ]);
  const clock=(x:number,y:number)=>at('',x,y,[circle(0,0,13,{fill:'var(--paper)'}),line('M0-9V0L7 4')]);
  const bag=(x:number,y:number)=>at('',x,y,[box(0,0,25,30),line('M7 0V-6Q13-13 19-6V0M5 17H20')]);
  const heart=(x:number,y:number)=>at('mimetic-pulse',x,y,[line('M0 13-17-3C-28-20-5-29 0-13C5-29 28-20 17-3Z',{fill:'var(--accent)'})]);
  const drop=(x:number,y:number,r=4)=>at('mimetic-drop',x,y,[line(`M0 ${-r*2}Q${r*2} ${r} 0 ${r}Q${-r*2} ${r} 0 ${-r*2}Z`,{fill:'var(--accent)','stroke-width':1})]);
  const bubble=(x:number,y:number,width=34)=>at('',x,y,[line(`M0 0H${width}V21H14L6 29V21H0Z`,{fill:'var(--paper)'}),line(`M7 8H${width-7}M7 14H${width-12}`,{'stroke-width':1})]);
  const ground=()=>line('M20 110H220',{class:'mimetic-trail'});
  const motion=(className:string,children:SVGElement[])=>group(className,children);
  const soundMarks=(x:number,y:number,big=false)=>at('mimetic-pulse',x,y,[
    line(`M0-14 ${big?18:9}-24M3 0H${big?26:13}M0 14 ${big?18:9} 24`,{'stroke-width':big?3:1.5,stroke:'var(--accent)'})
  ]);
  const checklist=(x:number,y:number)=>at('',x,y,[box(0,0,37,46,{fill:'var(--paper)'}),line('M6 11 9 14 14 7M6 25 9 28 14 21M18 12H30M18 26H30M6 38H30',{stroke:'var(--accent)'})]);
  svg.dataset.scene=entry.id;svg.dataset.variant=String(index);svg.dataset.playing=String(play);
  const renderers:Record<MimeticScene,()=>void>={rolling:()=>{
    svg.append(line('M12 104H228'),line('M30 70H60m-8-6 8 6-8 6',{class:'mimetic-trail'}));
    const object=index===0?[circle(0,0,12,{fill:'var(--accent)'}),line('M-7-7 7 7M7-7-7 7',{stroke:'var(--paper)'})]:[
      line('M-25-12-10-27 13-24 28-7 21 19 0 28-22 15Z',{fill:'var(--surface)'}),line('M-10-20 0-3 18 6M0-3-16 9')
    ];
    const mover=group('mimetic-roll',[group('mimetic-wheel',object)]);mover.setAttribute('transform',`translate(92 ${index===0?91:75})`);
    svg.append(mover);
  },rotation:()=>{
    svg.append(line('M65 26A59 40 0 1 1 59 85m0 0 2-13m-2 13 13-2',{class:'mimetic-trail'}));
    if(index===0) {
      const top=group('mimetic-spin',[line('M120 31V45'),line('M83 57 120 41 157 57 120 99Z',{fill:'var(--surface)'}),line('M83 57 120 72 157 57M120 72V99'),line('M103 49 139 64',{stroke:'var(--accent)','stroke-width':5})]);
      svg.append(top);
    } else {
      svg.append(circle(120,65,10,{fill:'var(--accent)'}));
      const cup=group('mimetic-orbit',[line('M160 44H198L193 70Q180 82 165 70Z',{fill:'var(--surface)'}),line('M198 50Q216 48 210 63Q208 69 195 67'),line('M165 44Q179 37 198 44')]);
      svg.append(cup);
    }
  },light:()=>{
    if(index===0) {
      svg.append(line('M13 96Q38 86 63 96T113 96T163 96T213 96M26 110Q51 100 76 110T126 110T176 110T226 110',{class:'mimetic-trail'}));
      for(const [cx,cy,r] of [[57,45,13],[117,66,9],[179,32,17]])svg.append(group('mimetic-spark',[line(`M${cx} ${cy-r}Q${cx} ${cy} ${cx+r} ${cy}Q${cx} ${cy} ${cx} ${cy+r}Q${cx} ${cy} ${cx-r} ${cy}Q${cx} ${cy} ${cx} ${cy-r}Z`,{fill:'var(--accent)'})]));
    } else {
      const rays:SVGElement[]=[circle(120,62,25,{fill:'var(--accent)'})];
      for(let n=0;n<12;n++) {
        const angle=n*Math.PI/6;
        rays.push(line(`M${120+Math.cos(angle)*34} ${62+Math.sin(angle)*34}L${120+Math.cos(angle)*52} ${62+Math.sin(angle)*52}`,{'stroke-width':5}));
      }
      svg.append(group('mimetic-glare',rays));
    }
  },rain:()=>{
    svg.append(line('M57 43Q37 21 64 17Q78-2 100 14Q119-3 138 12Q167 4 172 24Q204 23 190 43Z',{fill:'var(--surface)'}));
    const drops:SVGElement[]=[];
    for(let n=0;n<(index===0?9:24);n++) {
      const x=47+(n%8)*21,y=58+Math.floor(n/8)*19;
      drops.push(line(`M${x} ${y}l${index===0?-2:-6} ${index===0?7:13}`,{'stroke-width':index===0?1.5:3}));
    }
    svg.append(group('mimetic-rainfall',drops),line('M38 115H201',{class:'mimetic-trail'}));
  },texture:()=>{
    svg.append(line('M24 69H216V112H24Z',{fill:'var(--surface)'}));
    for(let y=78;y<=100;y+=11) {
      const d=index===0?`M31 ${y}Q44 ${y-4} 57 ${y}T83 ${y}T109 ${y}T135 ${y}T161 ${y}T187 ${y}T213 ${y}`:`M31 ${y}l7-4 6 6 7-7 7 6 7-4 7 5 7-6 7 5 7-5 7 5 7-6 7 6 7-4 7 4 7-6 7 6 7-5 7 6 7-7 7 5 7-3 7 4 7-4 7 4`;
      svg.append(line(d,{'stroke-width':1.4,class:'mimetic-trail'}));
    }
    svg.append(group('mimetic-touch',[line('M88 19V52Q88 68 103 68H128Q136 68 136 60V47Q136 42 130 42H111V18Q111 9 101 9T88 19Z',{fill:'var(--paper)'}),line('M94 62H105',{stroke:'var(--accent)','stroke-width':3})]));
  },smile:()=>{
    svg.append(circle(120,62,45,{fill:'var(--surface)'}));
    const features=index===0?[
      line('M94 51Q101 41 108 51M132 51Q139 41 146 51'),line('M99 70Q120 95 141 70',{stroke:'var(--accent)','stroke-width':3})
    ]:[
      line('M94 48 108 52M132 52 146 48'),line('M105 76Q125 82 143 66',{stroke:'var(--accent)','stroke-width':3}),line('M140 63 147 65')
    ];
    svg.append(group('mimetic-expression',features));
  },anticipation:()=>{
    svg.append(ground(),person(77,35,index===0?'happy':'worried'));
    if(index===0)svg.append(bag(165,74),motion('mimetic-bob',[line('M140 29 145 39 156 40 148 48 150 59 140 53 130 59 132 48 124 40 135 39Z',{fill:'var(--accent)'})]));
    else svg.append(box(146,18,65,43),line('M154 31H203M154 43H190M178 61V82M163 84H193'),heart(119,88));
  },irritation:()=>{
    svg.append(ground(),motion('mimetic-restless',[person(82,35,'angry')]));
    if(index===0)svg.append(clock(181,35),line('M181 49V108M161 65H201',{class:'mimetic-trail'}));
    else svg.append(motion('mimetic-pulse',[line('M145 24 157 28 166 18 174 29 190 24 188 39 202 47 187 55 191 69 174 65 164 77 157 63 142 66 145 51 133 41 148 36Z',{fill:'var(--paper)'}),line('M168 33V49M168 56V58',{stroke:'var(--accent)','stroke-width':4})]));
  },relief:()=>{
    svg.append(ground(),motion('mimetic-breathe',[person(80,34,'happy')]));
    if(index===0)svg.append(motion('mimetic-bob',[circle(158,59,10,{stroke:'var(--accent)'}),line('M166 65 190 89M181 80 188 73M187 86 194 79',{stroke:'var(--accent)','stroke-width':4})]),line('M104 47q15 9 23-1',{class:'mimetic-trail'}));
    else svg.append(checklist(164,41),motion('mimetic-clear',[line('M99 20q7-16 20-8 14-10 24 4 13 0 12 13H103Z',{class:'mimetic-trail'})]),line('M100 49 111 43M104 59H116M100 69 111 75',{stroke:'var(--accent)'}));
  },worry:()=>{
    svg.append(ground());
    if(index===0) {
      svg.append(person(50,35,'worried'),person(123,45,'neutral'),line('M123 69 153 72M141 65H163L160 91H144Z',{fill:'var(--paper)'}),motion('mimetic-tilt',[line('M143 72H162',{stroke:'var(--accent)','stroke-width':3})]),line('M66 32 103 37',{class:'mimetic-trail','stroke-dasharray':'3 4'}));
    } else svg.append(motion('mimetic-restless',[person(83,36,'worried'),box(77,66,7,9)]),box(160,48,34,62),line('M154 49H205M167 66H187M177 56V76',{stroke:'var(--accent)'}),line('M118 24Q116 12 128 12T139 24Q139 29 129 34V40M129 48V50'));
  },sleep:()=>{
    if(index===0) {
      svg.append(ground(),line('M67 63V99H113M72 98V110M107 98V110'),motion('mimetic-nod',[face(96,38,16,'sad')]),line('M95 54V80H117V108M95 65 126 73M95 80 84 98V108'),line('M122 66 144 60 164 67V91L144 85 122 91Z',{fill:'var(--paper)'}),line('M144 60V85'));
    } else svg.append(box(43,74,153,33),line('M43 66V115M196 66V115'),face(69,61,14,'happy'),motion('mimetic-breathe',[line('M82 72Q121 48 181 70V99H81Z',{fill:'var(--surface)'})]),line('M197 16A17 17 0 1 0 215 36 15 15 0 0 1 197 16Z',{fill:'var(--accent)'}));
  },exhaustion:()=>{
    svg.append(ground());
    if(index===0)svg.append(line('M30 83 49 50 67 84M36 74H60',{class:'mimetic-trail'}),person(100,36,'sad',true),line('M77 91H124V109H77Z',{fill:'var(--surface)'}),bag(168,76),motion('mimetic-sag',[line('M132 36q9 7 0 14m9-8q9 7 0 14',{class:'mimetic-trail'})]));
    else svg.append(box(40,70,155,37),box(34,61,17,46),box(185,61,17,46),face(69,64,13,'sad'),motion('mimetic-sag',[line('M83 73 150 77 173 91M111 75 119 99M149 78 173 81M88 70 91 83',{'stroke-width':3})]));
  },pain:()=>{
    if(index===0)svg.append(line('M91 30Q106 19 120 29Q137 19 150 31Q159 45 146 62L138 103Q128 108 123 75Q120 66 116 75Q112 108 102 103L94 62Q82 45 91 30Z',{fill:'var(--surface)'}),motion('mimetic-pulse',[line('M66 40 76 45M63 61H76M68 82 78 76M164 44 175 38M166 62H180M163 79 175 86',{stroke:'var(--accent)','stroke-width':3})]));
    else svg.append(face(120,29,19,'worried'),line('M91 49 65 67 79 88 90 77V113H150V77L161 88 175 67 149 49 139 57H101Z',{fill:'var(--surface)'}),line('M103 55V65M111 56V65M119 56V65M127 56V65M135 55V65'),motion('mimetic-pulse',[line('M101 61 104 49M113 62 116 50M125 62 128 50M137 61 140 49',{stroke:'var(--accent)'})]));
  },stomach:()=>{
    svg.append(ground(),person(84,35,index===0?'sad':'neutral'));
    if(index===0)svg.append(motion('mimetic-pulse',[line('M76 68 83 64 89 69 96 64',{stroke:'var(--accent)'})]),line('M147 81H204Q201 105 175 105T147 81Z',{fill:'var(--paper)'}),line('M153 85H198',{class:'mimetic-trail'}));
    else {
      svg.append(motion('mimetic-breathe',[circle(84,70,17,{fill:'var(--surface)',stroke:'var(--accent)'})]));
      for(const x of [142,171,200])svg.append(line(`M${x} 85h25q-2 16-12 16t-13-16Z`,{fill:'var(--paper)'}));
    }
  },balance:()=>{
    svg.append(ground());
    if(index===0)svg.append(line('M39 59V91H72M44 91V110M69 91V110'),motion('mimetic-sway',[person(122,36,'worried')]),line('M159 34q15-11 20 3t20 0',{class:'mimetic-trail'}));
    else svg.append(motion('mimetic-stagger',[person(88,35,'worried'),box(113,58,62,35),line('M101 72H126M128 60V93')]),line('M79 108 91 102 105 109 118 104 132 110',{class:'mimetic-trail'}));
  },temperature:()=>{
    if(index===0) {
      svg.append(ground(),person(80,38,'happy'),circle(180,34,16,{fill:'var(--accent)'}),line('M180 9V2M180 59V67M155 34H147M205 34H213M162 16 156 10M198 52 204 58M162 52 156 58M198 16 204 10'));
      svg.append(motion('mimetic-rise',[line('M126 56q-8 10 0 20t0 20M139 53q-8 10 0 20t0 20',{stroke:'var(--accent)'})]));
    } else svg.append(face(112,76,31,'happy'),box(81,40,62,17,{fill:'var(--paper)'}),motion('mimetic-pulse',[line('M182 29V67M165 38 199 58M165 58 199 38M177 34 182 39 187 34M177 62 182 57 187 62',{stroke:'var(--accent)'})]));
  },walking:()=>{
    svg.append(ground(),line('M191 47V108M176 26H218V47H176Z',{fill:'var(--paper)'}),line('M184 37H209m-6-5 6 5-6 5',{stroke:'var(--accent)'}));
    const walker=motion(index===0?'mimetic-slow-walk':'mimetic-walk',[person(77,35,index===0?'sad':'neutral')]);
    svg.append(walker,index===0?line('M41 96H51M52 105H59',{class:'mimetic-trail'}):line('M27 58H52M23 70H47M30 83H54',{class:'mimetic-trail'}));
  },busy:()=>{
    svg.append(ground());
    if(index===0)svg.append(motion('mimetic-restless',[person(112,35,'worried')]),bag(37,76),clock(194,29),box(172,75,31,18),line('M170 74 188 60 210 74M48 42H65V62H48',{fill:'var(--paper)'}));
    else svg.append(person(69,35,'neutral'),line('M115 80H216M122 81V110M208 81V110'),box(161,71,40,9),box(166,62,40,9),motion('mimetic-sort',[box(120,54,32,14,{fill:'var(--paper)'})]),checklist(171,9));
  },wandering:()=>{
    svg.append(ground());
    if(index===0)svg.append(motion('mimetic-restless',[person(68,34,'worried')]),line('M152 30H209V47H152M178 47V86M160 38H198m-5-4 5 4-5 4',{fill:'var(--paper)'}),line('M93 106Q137 76 154 96T207 95',{class:'mimetic-trail','stroke-dasharray':'4 4'}));
    else svg.append(motion('mimetic-slow-walk',[person(66,35,'happy')]),box(147,44,70,57),line('M141 43 151 27H213L223 43ZM159 45V100M185 45V100M159 77H185',{fill:'var(--paper)'}),line('M95 105Q119 93 136 104',{class:'mimetic-trail'}));
  },looking:()=>{
    if(index===0)svg.append(box(145,17,69,78,{fill:'var(--paper)'}),line('M180 17V95M145 56H214'),line('M53 94Q57 64 78 65Q100 62 106 92V105H53M52 100Q28 107 34 87M61 61 59 38 75 49 87 43 94 60Q96 80 76 80T61 61Z',{fill:'var(--surface)'}),line('M77 60H81M89 60H92M96 66 100 68M109 62 164 47',{class:'mimetic-trail','stroke-dasharray':'3 4'}),motion('mimetic-bob',[line('M164 42q11-13 23 0l8-3-3 8h-24m7-5 5 5',{fill:'var(--accent)'})]));
    else svg.append(ground(),person(51,35,'neutral'),person(179,35,'neutral'),line('M156 23H201M165 23V12H191V23M166 103H175M183 103H192'),motion('mimetic-gaze',[line('M68 32 157 18M68 36 164 94',{class:'mimetic-trail','stroke-dasharray':'3 4',stroke:'var(--accent)'})]));
  },laughter:()=>{
    svg.append(face(120,61,34,'happy'));
    if(index===0)svg.append(box(46,45,24,40,{fill:'var(--paper)'}),line('M52 52H63M52 58H64M52 64H61'),motion('mimetic-bob',[line('M126 76 136 67Q142 62 145 69L137 86 121 90',{fill:'var(--paper)'})]),line('M98 73Q110 83 121 74',{stroke:'var(--accent)'}));
    else svg.append(motion('mimetic-laugh',[svgNode('ellipse',{...stroke,cx:120,cy:76,rx:13,ry:10,fill:'var(--accent)'})]),soundMarks(164,61,true),at('',76,61,[line('M0-14-18-24M-3 0H-26M0 14-18 24',{'stroke-width':3,stroke:'var(--accent)'})]));
  },crying:()=>{
    svg.append(face(120,60,34,'sad'),drop(101,79,3),drop(139,84,3));
    if(index===0)svg.append(line('M109 78q4-3 8 0t8 0',{stroke:'var(--accent)'}),line('M100 53 109 56M132 56 141 53'));
    else svg.append(svgNode('ellipse',{...stroke,cx:120,cy:77,rx:8,ry:11,fill:'var(--accent)'}),drop(98,94,4),drop(143,99,4),soundMarks(165,61,true),line('M77 36 62 27M74 60H55M77 83 62 94',{stroke:'var(--accent)','stroke-width':3}));
  },softness:()=>{
    if(index===0)svg.append(line('M70 104V72Q60 55 75 46Q87 36 101 43Q118 27 134 43Q151 34 168 50Q179 64 169 74V104Z',{fill:'var(--surface)'}),circle(97,77,4),circle(121,90,5),circle(145,76,4),motion('mimetic-press',[line('M113 12V45Q113 58 121 58T129 45V12',{fill:'var(--paper)'})]));
    else svg.append(motion('mimetic-stretch',[line('M73 68Q84 44 119 57Q157 45 168 69Q162 99 122 92Q81 99 73 68Z',{fill:'var(--surface)'})]),line('M43 57 74 66 68 83 40 77M197 55 168 65 173 82 202 75',{fill:'var(--paper)'}),line('M90 70Q119 76 149 69',{stroke:'var(--accent)'}));
  },moisture:()=>{
    if(index===0) {
      svg.append(line('M78 54 114 31 176 51V101H78Z',{fill:'var(--surface)'}),line('M78 54H176M114 31V53M78 71H176'),drop(98,87,3),drop(121,88,3),drop(151,86,3));
    } else svg.append(face(115,71,35,'worried'),drop(92,53,3),drop(107,46,3),drop(127,45,3),drop(142,54,3),motion('mimetic-rise',[line('M177 34q-8 9 0 18t0 18M192 34q-8 9 0 18t0 18',{stroke:'var(--accent)'})]));
  },stickiness:()=>{
    if(index===0) {
      svg.append(line('M66 81H171Q166 111 118 111T66 81Z',{fill:'var(--surface)'}));
      for(const x of [86,105,126,148])svg.append(circle(x,84,5,{fill:'var(--accent)'}));
      svg.append(motion('mimetic-lift',[line('M121 24 162 67M132 19 171 61'),line('M153 57Q130 68 109 83M159 63Q152 78 135 84M145 50Q106 57 89 83',{stroke:'var(--accent)'})]));
    } else svg.append(svgNode('ellipse',{...stroke,cx:116,cy:99,rx:62,ry:11,fill:'var(--paper)'}),line('M86 95Q105 88 125 94T153 98Q129 107 86 101Z',{fill:'var(--accent)','stroke-width':1}),motion('mimetic-lift',[line('M113 13V63Q113 73 123 73T133 63V13',{fill:'var(--paper)'}),line('M117 70Q113 84 104 97M127 71Q143 85 139 97',{stroke:'var(--accent)','stroke-width':3})]));
  },slipperiness:()=>{
    svg.append(svgNode('ellipse',{...stroke,cx:121,cy:93,rx:64,ry:20,fill:'var(--surface)'}));
    if(index===0)svg.append(line('M79 88Q109 75 161 86',{class:'mimetic-trail'}));
    else svg.append(svgNode('ellipse',{...stroke,cx:121,cy:86,rx:49,ry:12,fill:'var(--accent)'}),circle(176,77,8),circle(189,64,5),line('M104 85H139',{stroke:'var(--paper)'}));
    svg.append(motion('mimetic-slide',[line('M85 15V54Q85 69 101 69H125Q135 69 135 60V51Q135 44 126 44H109V15Q109 5 97 5T85 15Z',{fill:'var(--paper)'})]));
  },crispness:()=>{
    if(index===0) {
      svg.append(motion('mimetic-crack',[line('M113 34A34 34 0 0 0 113 100L105 90 115 80 105 70 115 59 105 47Z',{fill:'var(--surface)'}),line('M122 34A34 34 0 0 1 122 100L114 90 124 80 114 70 124 59 114 47Z',{fill:'var(--surface)'})]),circle(94,56,3),circle(98,83,3),circle(137,55,3),circle(138,81,3),circle(166,95,2),circle(175,83,2));
    } else svg.append(motion('mimetic-crack',[line('M59 40 104 31 120 49 110 58 119 68 109 79 118 91 66 102Z',{fill:'var(--surface)'}),line('M129 30 177 40 172 103 129 93 120 81 130 69 121 58 131 49Z',{fill:'var(--surface)'})]),line('M70 48 98 42M139 43 165 49M73 91 98 85M140 84 161 91',{stroke:'var(--accent)','stroke-width':4}),soundMarks(185,69));
  },dryness:()=>{
    if(index===0)svg.append(ground(),person(77,35,'sad'),line('M148 73H181L177 106H152ZM181 80Q200 77 196 90Q195 98 180 97'),motion('mimetic-pulse',[line('M71 53 78 48 84 54 91 48',{stroke:'var(--accent)'})]));
    else svg.append(line('M82 103V64Q82 55 90 58L100 65V28Q100 19 108 20Q114 20 114 29V55H120V17Q120 10 127 10T134 17V55H140V24Q140 16 147 17T154 25V56H160V39Q160 31 167 32T174 40V86Q171 105 154 111H96Z',{fill:'var(--surface)'}),motion('mimetic-pulse',[line('M105 78 111 74 117 80 124 75M125 95 131 90 138 96 145 91M148 69 154 65 160 70',{stroke:'var(--accent)'})]));
  },crowd:()=>{
    if(index===0)svg.append(person(55,48,'happy'),person(119,52,'neutral'),person(183,48,'happy'),motion('mimetic-bob',[bubble(28,7,38),bubble(91,10,43),bubble(166,5,42)]));
    else {
      for(const [row,y] of [43,83].entries())for(let n=0;n<5;n++) {
        const x=40+n*39;
        svg.append(face(x,y,10,'neutral'),line(`M${x-12} ${y+26}V${y+14}H${x+12}V${y+26}`,{fill:'var(--surface)'}));
        if(row===0&&n%2===0)svg.append(motion('mimetic-bob',[line(`M${x-5} ${y-20}h4m4 0h4m4 0h4`,{stroke:'var(--accent)'})]));
      }
    }
  },knocking:()=>{
    svg.append(box(122,14,62,101,{fill:'var(--paper)'}),box(131,23,43,32),circle(173,76,3,{fill:'var(--accent)'}),motion('mimetic-knock',[line('M40 64H74V52Q74 46 80 46H100Q106 46 106 53V60H113V75Q113 87 101 87H80V81H40Z',{fill:'var(--surface)'}),line('M82 54V65M91 53V65M100 54V65')]),soundMarks(193,68,index===1));
    if(index===1)svg.append(line('M112 37 117 43M111 95 117 90',{stroke:'var(--accent)','stroke-width':3}));
  }};
  renderers[entry.id]();
  return svg;
}
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,text?:string) {
  const node=document.createElement(tag);node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

/** Render using DOM nodes only: selected page text is never interpreted as HTML. */
export function renderMimeticPlayground(entry:MimeticEntry):HTMLElement {
  const root=element('section','mimetic-playground');root.setAttribute('aria-label','Mimetic Playground');
  const heading=element('h4','mimetic-heading','Mimetic Playground');
  const context=element('p','mimetic-context',entry.sceneUse);
  const controls=element('div','mimetic-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label','Compare expressions');
  const detail=element('div','mimetic-detail');detail.setAttribute('aria-live','polite');detail.setAttribute('aria-atomic','true');
  const term=element('p','mimetic-term');term.lang='ja';
  const gloss=element('p','mimetic-gloss');
  const example=element('p','mimetic-example');example.lang='ja';
  const translation=element('p','mimetic-translation');
  detail.append(term,gloss);
  const examples=element('div','mimetic-examples');examples.setAttribute('aria-live','polite');examples.append(example,translation);
  const figure=element('figure','mimetic-figure');
  const stage=element('div','mimetic-stage');
  const caption=element('figcaption','mimetic-caption');figure.append(stage,caption);
  const replay=element('button','mimetic-replay','Replay scene');replay.type='button';
  const motionNote=element('p','mimetic-motion-note','Reduced motion: the illustration stays still.');
  const uses=element('p','mimetic-uses');
  const reference=element('a','mimetic-reference');reference.target='_blank';reference.rel='noopener noreferrer';
  let selected=entry.initialVariant;
  const buttons=entry.variants.map((variant,index)=>{
    const button=element('button','mimetic-choice',variant.term);button.type='button';button.lang='ja';
    button.addEventListener('click',()=>update(index as 0|1,true));
    controls.append(button);return button;
  });
  function update(index:0|1,play:boolean) {
    selected=index;const variant=entry.variants[index];
    for(const [i,button] of buttons.entries())button.setAttribute('aria-pressed',String(i===index));
    term.textContent=variant.term;gloss.textContent=variant.gloss;
    example.textContent=variant.example;translation.textContent=variant.translation;
    caption.textContent=variant.sceneDescription;uses.textContent=variant.otherUses;
    // An allowlist is intentional: no source-derived URL can become a link.
    let url:URL|undefined;
    try{url=new URL(variant.reference.url);}catch{/* Invalid links stay absent without breaking the local scene. */}
    if(url?.protocol==='https:' && ['www2.ninjal.ac.jp','kotobank.jp'].includes(url.hostname)) {
      reference.href=url.href;reference.textContent=`${variant.reference.label} (opens a new tab)`;reference.hidden=false;
    } else {reference.removeAttribute('href');reference.hidden=true;}
    stage.replaceChildren(scene(entry,index,play));
  }
  replay.addEventListener('click',()=>stage.replaceChildren(scene(entry,selected,true)));
  const more=element('details','mimetic-more');more.append(element('summary','','Other uses & reference'),element('p','','These are related expressions, each shown in one context.'),uses,reference);
  root.append(heading,context,controls,detail,figure,replay,motionNote,examples,more);
  update(selected,false);return root;
}

export const mimeticStyles=`
.mimetic-playground{min-width:0;margin-top:12px;padding-top:12px;border-top:2px solid var(--line);color:var(--ink);font:12px/1.55 var(--body,system-ui)}
.mimetic-playground .mimetic-heading{margin:0 0 8px;font:800 11px/1.4 var(--mono,monospace);text-transform:uppercase}
.mimetic-playground .mimetic-context,.mimetic-playground .mimetic-uses{margin:8px 0;color:var(--muted,var(--ink));font-size:11px}
.mimetic-controls{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.mimetic-controls .mimetic-choice{flex:1;min-width:0;white-space:nowrap;font-size:16px}
.mimetic-playground .mimetic-choice,.mimetic-playground .mimetic-replay{margin:0;padding:7px 9px;border:2px solid var(--line);background:var(--paper);color:var(--ink);cursor:pointer;font:700 12px/1.4 var(--body,system-ui)}
.mimetic-playground .mimetic-choice[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.mimetic-playground button:focus-visible,.mimetic-playground a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.mimetic-playground .mimetic-term{margin:8px 0 2px;font-size:21px;font-weight:700}
.mimetic-playground .mimetic-gloss{margin:0 0 10px;font-weight:700}
.mimetic-playground .mimetic-example{margin:8px 0 2px;font-size:15px;line-height:1.8;overflow-wrap:anywhere}
.mimetic-playground .mimetic-translation{margin:2px 0 8px;color:var(--muted,var(--ink))}
.mimetic-figure{margin:12px 0 8px}.mimetic-stage{overflow:hidden;background:var(--paper);border:1px solid var(--line)}
.mimetic-art{display:block;width:100%;height:auto;max-height:180px;color:var(--ink)}.mimetic-trail{opacity:.55}
.mimetic-playground .mimetic-caption{padding:5px 0;font-size:11px;overflow-wrap:anywhere}
.mimetic-playground .mimetic-reference{display:inline-block;margin:4px 0;font-size:10px;color:var(--accent);overflow-wrap:anywhere;text-underline-offset:3px}
.mimetic-more{margin-top:14px;border-top:1px solid var(--line);padding-top:10px;font-size:11px;color:var(--muted)}.mimetic-more summary{cursor:pointer;font-weight:600}.mimetic-motion-note{display:none}.mimetic-art .mimetic-spin{transform-origin:120px 65px}.mimetic-art .mimetic-orbit{transform-origin:120px 65px}.mimetic-art .mimetic-expression{transform-origin:120px 65px}.mimetic-art .mimetic-spark,.mimetic-art .mimetic-wheel{transform-box:fill-box;transform-origin:center}
.mimetic-art[data-playing=true] .mimetic-roll{animation:mimetic-roll 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-wheel{animation:mimetic-wheel 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-spin{animation:mimetic-spin 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-orbit{animation:mimetic-spin 2.4s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-spark{animation:mimetic-spark 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-glare{animation:mimetic-glare 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-rainfall{animation:mimetic-rainfall .65s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-touch{animation:mimetic-touch 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-expression{animation:mimetic-expression 1.8s ease-in-out 1}
.mimetic-art .mimetic-pulse,.mimetic-art .mimetic-breathe,.mimetic-art .mimetic-tilt,.mimetic-art .mimetic-nod,.mimetic-art .mimetic-sway,.mimetic-art .mimetic-stretch{transform-box:fill-box;transform-origin:center}
.mimetic-art[data-playing=true] .mimetic-pulse{animation:mimetic-pulse 1.8s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-bob{animation:mimetic-bob 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-restless{animation:mimetic-restless 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-breathe{animation:mimetic-breathe 2.2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-clear{animation:mimetic-clear 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-tilt{animation:mimetic-tilt 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-nod{animation:mimetic-nod 2.2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sag{animation:mimetic-sag 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sway{animation:mimetic-sway 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-stagger{animation:mimetic-stagger 2.3s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-rise{animation:mimetic-rise 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-slow-walk{animation:mimetic-slow-walk 2.4s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-walk{animation:mimetic-walk 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-sort{animation:mimetic-sort 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-gaze{animation:mimetic-gaze 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-laugh{animation:mimetic-laugh .7s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-drop{animation:mimetic-drop .7s ease-in-out 3}
.mimetic-art[data-playing=true] .mimetic-press{animation:mimetic-press 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-stretch{animation:mimetic-stretch 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-lift{animation:mimetic-lift 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-slide{animation:mimetic-slide 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-crack{animation:mimetic-crack 2s ease-in-out 1}
.mimetic-art[data-playing=true] .mimetic-knock{animation:mimetic-knock .6s ease-in-out 3}
@keyframes mimetic-roll{0%,100%{translate:0 0}50%{translate:80px 0}}
@keyframes mimetic-wheel{0%,100%{rotate:0deg}50%{rotate:150deg}}
@keyframes mimetic-spin{0%{rotate:0deg}100%{rotate:720deg}}
@keyframes mimetic-spark{0%,100%{scale:1;opacity:1}50%{scale:.75;opacity:.65}}
@keyframes mimetic-glare{0%,100%{opacity:1}50%{opacity:.7}}
@keyframes mimetic-rainfall{0%{translate:0 -7px}100%{translate:0 7px}}
@keyframes mimetic-touch{0%,100%{translate:0 0}50%{translate:65px 0}}
@keyframes mimetic-expression{0%,100%{scale:1}50%{scale:1.05}}
@keyframes mimetic-pulse{0%,100%{scale:1;opacity:1}50%{scale:1.1;opacity:.7}}
@keyframes mimetic-bob{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes mimetic-restless{0%,100%{translate:0 0}25%{translate:-4px 0}75%{translate:4px 0}}
@keyframes mimetic-breathe{0%,100%{scale:1}50%{scale:1 1.035}}
@keyframes mimetic-clear{0%,100%{opacity:.5}50%{opacity:.08}}
@keyframes mimetic-tilt{0%,100%{rotate:0deg}50%{rotate:6deg}}
@keyframes mimetic-nod{0%,100%{rotate:0deg;translate:0 0}50%{rotate:8deg;translate:0 3px}}
@keyframes mimetic-sag{0%,100%{translate:0 0}50%{translate:0 3px}}
@keyframes mimetic-sway{0%,100%{rotate:0deg}25%{rotate:-3deg}75%{rotate:3deg}}
@keyframes mimetic-stagger{0%,100%{translate:0 0}33%{translate:9px 2px}66%{translate:18px -1px}}
@keyframes mimetic-rise{0%,100%{translate:0 0;opacity:1}50%{translate:0 -7px;opacity:.5}}
@keyframes mimetic-slow-walk{0%,100%{translate:0 0}50%{translate:20px 0}}
@keyframes mimetic-walk{0%,100%{translate:0 0}50%{translate:48px 0}}
@keyframes mimetic-sort{0%,100%{translate:0 0}50%{translate:42px 9px}}
@keyframes mimetic-gaze{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes mimetic-laugh{0%,100%{translate:0 0}50%{translate:0 -2px}}
@keyframes mimetic-drop{0%,100%{translate:0 0;opacity:1}70%{translate:0 5px;opacity:.5}}
@keyframes mimetic-press{0%,100%{translate:0 0}50%{translate:0 9px}}
@keyframes mimetic-stretch{0%,100%{scale:1}50%{scale:1.15 1}}
@keyframes mimetic-lift{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes mimetic-slide{0%,100%{translate:0 0}50%{translate:30px 0}}
@keyframes mimetic-crack{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes mimetic-knock{0%,100%{translate:0 0}50%{translate:7px 0}}
@media(prefers-reduced-motion:reduce){.mimetic-art[data-playing=true] *{animation:none!important}.mimetic-playground .mimetic-replay{display:none}.mimetic-playground .mimetic-motion-note{display:block;margin:6px 0;font-size:11px;color:var(--muted,var(--ink))}}
`;
