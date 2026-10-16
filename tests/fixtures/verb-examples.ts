import type {VerbBase} from '../../src/verb-playground';

// Reviewed conjugation fixtures only; the product has no preset verb catalogue.
export interface ReviewedVerbExample extends VerbBase {id:string;gloss:string;keywords:readonly string[]}
const rows:readonly [string,string,string,string][]=[
  ['食べる','たべる','一段','eat'],['見る','みる','一段','see, watch'],['起きる','おきる','一段','wake up, get up'],['寝る','ねる','一段','sleep'],['着る','きる','一段','wear'],['借りる','かりる','一段','borrow'],['教える','おしえる','一段','teach, tell'],['開ける','あける','一段','open'],
  ['書く','かく','五段・カ行イ音便','write'],['泳ぐ','およぐ','五段・ガ行','swim'],['話す','はなす','五段・サ行','speak, talk'],['待つ','まつ','五段・タ行','wait'],['死ぬ','しぬ','五段・ナ行','die'],['遊ぶ','あそぶ','五段・バ行','play'],['読む','よむ','五段・マ行','read'],['帰る','かえる','五段・ラ行','return home'],['買う','かう','五段・ワ行促音便','buy'],['行く','いく','五段・カ行促音便','go'],['聞く','きく','五段・カ行イ音便','hear, listen, ask'],['飲む','のむ','五段・マ行','drink'],['会う','あう','五段・ワ行促音便','meet'],['走る','はしる','五段・ラ行','run'],['入る','はいる','五段・ラ行','enter'],['持つ','もつ','五段・タ行','hold, have'],['する','する','サ変・スル','do'],['来る','くる','カ変・来ル','come'],['勉強する','べんきょうする','サ変・スル','study'],['練習する','れんしゅうする','サ変・スル','practice'],['ある','ある','五段・ラ行','exist (inanimate), have'],['いる','いる','一段','exist (animate), stay']
];
export const reviewedVerbExamples:readonly ReviewedVerbExample[]=rows.map(([lemma,reading,verbClass,gloss],index)=>({id:'verb-'+index,lemma:verbClass==='サ変・スル'?'する':lemma,reading:verbClass==='サ変・スル'?'する':reading,verbClass,gloss,keywords:gloss.split(/[, ()]+/u).filter(Boolean),...(verbClass==='サ変・スル' && lemma!=='する'?{prefix:lemma.slice(0,-2),prefixReading:reading.slice(0,-2)}:{}),...(lemma==='ある'?{restricted:true}:{})}));
