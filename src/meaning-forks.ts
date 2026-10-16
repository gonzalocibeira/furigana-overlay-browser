import {hiragana, type Word} from './shared';

export type MeaningFunction = 'potential' | 'passive' | 'honorific' | 'make' | 'let';
export interface MeaningForks {
  start: number;
  end: number;
  source: string;
  reading: string;
  lemma: string;
  kind: 'rareru' | 'causative';
  past: boolean;
  negative: boolean;
  polite: boolean;
  possibilities: readonly MeaningFunction[];
}

interface Ending {
  // Expected surface, dictionary form, conjugation form for each token.
  tokens: readonly (readonly [string, string, string])[];
  past: boolean;
  negative: boolean;
  polite: boolean;
}

// An intentionally finite grammar: no substring inference, deconjugation search,
// contractions, conditional forms or compound causative-passive constructions.
function endings(lemma: string): Ending[] {
  const stem = lemma.slice(0, -1);
  return [
    {tokens:[[stem,lemma,'連用形'],['ませ','ます','未然形'],['ん','ん','基本形'],['でし','です','連用形'],['た','た','基本形']],past:true,negative:true,polite:true},
    {tokens:[[stem,lemma,'連用形'],['まし','ます','連用形'],['た','た','基本形']],past:true,negative:false,polite:true},
    {tokens:[[stem,lemma,'連用形'],['ませ','ます','未然形'],['ん','ん','基本形']],past:false,negative:true,polite:true},
    {tokens:[[stem,lemma,'未然形'],['なかっ','ない','連用タ接続'],['た','た','基本形']],past:true,negative:true,polite:false},
    {tokens:[[stem,lemma,'未然形'],['ない','ない','基本形']],past:false,negative:true,polite:false},
    {tokens:[[stem,lemma,'連用形'],['ます','ます','基本形']],past:false,negative:false,polite:true},
    {tokens:[[stem,lemma,'連用形'],['た','た','基本形']],past:true,negative:false,polite:false},
    {tokens:[[lemma,lemma,'基本形']],past:false,negative:false,polite:false},
  ];
}

const suffixes = new Set(['られる', 'れる', 'させる', 'せる']);
const godanNegative: Record<string,string> = {'う':'わ','く':'か','ぐ':'が','す':'さ','つ':'た','ぬ':'な','ぶ':'ば','む':'ま','る':'ら'};

function sourceSurface(text: string, word: Word): string | undefined {
  if (!Number.isInteger(word.start) || !Number.isInteger(word.end) || word.start < 0 || word.end <= word.start || word.end > text.length) return;
  return text.slice(word.start, word.end);
}

function suffixFor(text: string, base: Word): {lemma: string; kind: MeaningForks['kind']}[] {
  if (base.pos !== '動詞' || base.posDetail !== '自立' || !base.verbClass || !base.verbForm || suffixes.has(base.lemma)) return [];
  const surface = sourceSurface(text, base);
  if (!surface) return [];
  const ichidan = base.verbClass === '一段' && base.verbForm === '未然形' && base.lemma.endsWith('る') && surface === base.lemma.slice(0,-1);
  const kuru = base.verbClass.startsWith('カ変') && base.verbForm === '未然形'
    && ((base.lemma === '来る' && surface === '来') || (base.lemma === 'くる' && surface === 'こ'));
  if (ichidan || kuru) return [{lemma:'られる',kind:'rareru'},{lemma:'させる',kind:'causative'}];
  const suru = base.verbClass === 'サ変・スル' && base.lemma === 'する' && base.verbForm === '未然レル接続' && surface === 'さ';
  const last = base.lemma.slice(-1), negativeLast = godanNegative[last];
  const godan = base.verbClass.startsWith('五段・') && base.verbForm === '未然形' && negativeLast
    && surface === base.lemma.slice(0,-1) + negativeLast;
  return suru || godan ? [{lemma:'せる',kind:'causative'}] : [];
}

function matchEnding(text: string, words: Word[], index: number, base: Word, ending: Ending): Word[] | undefined {
  const tokens: Word[] = [];
  let previous = base;
  for (let offset = 0; offset < ending.tokens.length; offset++) {
    const word = words[index + offset];
    const [surface, lemma, form] = ending.tokens[offset];
    if (!word || word.start !== previous.end || sourceSurface(text,word) !== surface || word.lemma !== lemma || word.verbForm !== form) return;
    if (offset === 0 ? word.pos !== '動詞' || word.posDetail !== '接尾' || word.verbClass !== '一段' : word.pos !== '助動詞') return;
    tokens.push(word);
    previous = word;
  }
  const next = words[index + ending.tokens.length];
  // Do not quietly cut away unsupported auxiliaries (e.g. らしい or a second
  // causative/passive suffix) that would alter the form being explored.
  if (next?.start === previous.end && (next.pos === '動詞' || next.pos === '助動詞')) return;
  // A trailing command or nonfinite connection belongs to the construction,
  // even when the request or following clause is omitted (食べさせるな / ～ないで).
  if (next?.start === previous.end && next.pos === '助詞'
    && ['な','て','で','たら','ば','たり','だり','と','ながら','つつ'].includes(sourceSurface(text,next) ?? '')) return;
  return tokens;
}

/** Recognize only attested, contiguous token chains around the chosen token. */
export function buildMeaningForks(text: string, words: Word[], wordIndex: number): MeaningForks | undefined {
  if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) return;
  // The longest supported chain has one base and five suffix/ending tokens.
  for (let index = Math.max(0,wordIndex - 5); index <= wordIndex; index++) {
    const base = words[index];
    for (const suffix of suffixFor(text,base)) {
      for (const ending of endings(suffix.lemma)) {
        const tokens = matchEnding(text,words,index + 1,base,ending);
        if (!tokens || wordIndex > index + tokens.length) continue;
        const end = tokens[tokens.length-1].end;
        const reading = [base,...tokens].map(word=>word.reading).join('');
        return {start:base.start,end,source:text.slice(base.start,end),reading:hiragana(reading),lemma:base.lemma,
          kind:suffix.kind,past:ending.past,negative:ending.negative,polite:ending.polite,
          possibilities:suffix.kind === 'rareru' ? ['potential','passive','honorific'] : ['make','let']};
      }
    }
  }
}

interface FunctionDescription {
  label: string;
  roles: readonly [string,string,string];
  explanation: string;
}
const descriptions: Record<MeaningFunction,FunctionDescription> = {
  potential:{label:'Potential',roles:['Actor','ability / possibility','Action'],explanation:'Potential concerns whether an action is possible for someone.'},
  passive:{label:'Passive',roles:['Another actor','action affects','Subject'],explanation:'Passive describes a subject affected by an action. The effect can be indirect.'},
  honorific:{label:'Honorific',roles:['Speaker','shows respect toward','Actor'],explanation:'The honorific use shows respect for the person performing the action. A ～ます ending instead marks politeness toward the listener.'},
  make:{label:'Make',roles:['Causer','makes','Someone act'],explanation:'The causer makes someone perform the action.'},
  let:{label:'Let',roles:['Permitter','allows','Someone act'],explanation:'The permitter lets someone perform the action.'},
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let nextId = 0;
/** All visible content is local authored text; source text never becomes HTML. */
export function renderMeaningForks(forks: MeaningForks): HTMLElement {
  const root = element('section','meaning-forks');
  const heading = element('h3','meaning-title','Meaning Forks');
  root.append(heading);
  const traits = [forks.past ? 'Past form' : 'Nonpast form',forks.negative ? 'Negative form' : 'Affirmative form',forks.polite ? 'Polite ending' : 'Plain ending'];
  root.append(element('p','meaning-traits',traits.join(' · ')));
  root.append(element('p','meaning-intro','Explore a function. These are common possibilities, not a ranking or a sentence translation.'));
  const controls = element('fieldset','meaning-controls');
  controls.append(element('legend','meaning-legend','Compare functions'));
  const detail = element('div','meaning-detail');
  detail.id = `meaning-detail-${++nextId}`;
  detail.setAttribute('aria-live','polite');
  detail.setAttribute('aria-atomic','true');
  const buttons: HTMLButtonElement[] = [];
  const select = (choice: MeaningFunction) => {
    const description = descriptions[choice];
    for (const button of buttons) button.setAttribute('aria-pressed',String(button.dataset.function === choice));
    const label = element('h4','meaning-selected',description.label);
    const diagram = element('div','meaning-diagram');
    diagram.setAttribute('aria-hidden','true');
    diagram.append(element('span','meaning-role',description.roles[0]),element('span','meaning-relation',`↓ ${description.roles[1]} ↓`),element('span','meaning-role',description.roles[2]));
    const explanation = element('p','meaning-explanation',description.explanation);
    detail.replaceChildren(label,diagram,explanation);
  };
  for (const choice of forks.possibilities) {
    const button = element('button','meaning-choice',descriptions[choice].label);
    button.type = 'button';
    button.dataset.function = choice;
    button.setAttribute('aria-controls',detail.id);
    button.addEventListener('click',()=>select(choice));
    buttons.push(button);
    controls.append(button);
  }
  root.append(controls,detail);
  root.append(element('p','meaning-note','The diagram shows roles only. The source ending controls tense and negation. Context determines which function fits; other uses may exist.'));
  const references = element('p','meaning-references');
  const sources = forks.kind === 'rareru'
    ? [['Potential','https://guidetojapanese.org/learn/complete/potential'],['Passive and honorific','https://guidetojapanese.org/learn/grammar/causepass']]
    : [['Causative','https://guidetojapanese.org/learn/grammar/causepass']];
  references.append(document.createTextNode('Grammar reference: '));
  sources.forEach(([label,href],index)=>{
    if (index) references.append(document.createTextNode(' · '));
    const link = element('a','meaning-reference',label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    references.append(link);
  });
  root.append(references);
  if (forks.possibilities.length) select(forks.possibilities[0]);
  return root;
}

export const meaningForkStyles = `
.meaning-forks{min-width:0;max-width:100%;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.55}
.meaning-title{font-size:16px;margin:0 0 6px}
.meaning-traits{font-family:var(--mono);font-size:10px;color:var(--muted);margin:0 0 10px;overflow-wrap:anywhere}
.meaning-intro,.meaning-note{margin:8px 0;color:var(--muted)}
.meaning-controls{border:0;padding:0;margin:12px 0;display:flex;gap:6px;flex-wrap:wrap;min-width:0}
.meaning-legend{font-size:11px;color:var(--muted);margin-bottom:6px;padding:0}
.meaning-choice{font:inherit;border:1px solid var(--line);padding:6px 9px;margin:0;background:var(--paper);color:var(--ink);cursor:pointer}
.meaning-choice[aria-pressed=true]{background:var(--accent);color:var(--paper)}
.meaning-choice:focus-visible,.meaning-reference:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.meaning-detail{border:1px solid var(--line);padding:12px;background:var(--paper)}
.meaning-selected{margin:0 0 10px;font-size:13px}
.meaning-diagram{display:flex;align-items:center;flex-direction:column;gap:4px;margin:0 0 10px}
.meaning-role{border:1px solid var(--line);padding:5px 9px;max-width:100%;overflow-wrap:anywhere;text-align:center}
.meaning-relation{font-size:11px;color:var(--accent);text-align:center}
.meaning-explanation{margin:0;overflow-wrap:anywhere}
.meaning-note,.meaning-references{font-size:11px}
.meaning-references{margin:12px 0 0;color:var(--muted)}
.meaning-reference{color:var(--accent)}
`;
