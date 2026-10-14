import type {IpadicFeatures, Tokenizer, ViterbiLattice, ViterbiNode} from 'kuromoji';

interface Headword {start:number;end:number}
const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆]/u;

export function vocabularyHeadwords(text:string):Headword[] {
  const out:Headword[]=[];
  for(const line of text.matchAll(/[^\r\n]+/gu)) {
    const match=line[0].trim().match(/^([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ー]+)(?:[^\S\r\n]*[=＝:：][^\S\r\n]*([^\r\n]+))?$/u);
    if(!match || (match[2] && (japanese.test(match[2]) || !/\p{Script=Latin}/u.test(match[2]))))continue;
    const start=line.index!+line[0].indexOf(match[1]);
    out.push({start,end:start+match[1].length});
  }
  return out;
}

function commonNoun(tokenizer:Tokenizer<IpadicFeatures>,token:IpadicFeatures):IpadicFeatures | undefined {
  // Kuromoji's typings omit nodes_end_at, present in the bundled 0.1.2 lattice.
  const lattice=tokenizer.getLattice(token.surface_form) as ViterbiLattice & {nodes_end_at:ViterbiNode[][]};
  tokenizer.viterbi_searcher.forward(lattice);
  const eos=lattice.nodes_end_at[lattice.nodes_end_at.length-1][0];
  let best:IpadicFeatures | undefined,bestCost=Infinity;
  for(const nodes of lattice.nodes_end_at)for(const node of nodes ?? []) {
    if(node.type!=='KNOWN' || node.start_pos!==1 || node.surface_form!==token.surface_form)continue;
    const features=tokenizer.token_info_dictionary.getFeatures(node.name).split(',');
    if(features[1]!=='名詞' || features[2]!=='一般' || !features[8] || features[8]==='*')continue;
    const cost=node.shortest_cost+tokenizer.viterbi_searcher.connection_costs.get(node.right_id,eos.left_id);
    if(cost<bestCost) {
      bestCost=cost;
      best=tokenizer.formatter.formatEntry(Number(node.name),token.word_position,node.type,features);
    }
  }
  return best;
}

// Ranges belong to the original source, so a saved correction cannot turn part
// of a person's name into an apparently isolated vocabulary word.
export function tokenizeVocabulary(tokenizer:Tokenizer<IpadicFeatures>,text:string,headwords=vocabularyHeadwords(text),sourceOffset=0):IpadicFeatures[] {
  const tokens=tokenizer.tokenize(text);
  if(!headwords.length)return tokens;
  let offset=0;
  return tokens.map(token=>{
    const start=text.indexOf(token.surface_form,offset);
    if(start<0)return token;
    offset=start+token.surface_form.length;
    if(token.pos!=='名詞' || token.pos_detail_1!=='固有名詞')return token;
    if(!headwords.some(word=>word.start===sourceOffset+start && word.end===sourceOffset+offset))return token;
    return commonNoun(tokenizer,token) ?? token;
  });
}
