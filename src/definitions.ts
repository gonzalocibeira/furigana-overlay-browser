export type DefinitionLanguage='en'|'ja';
export interface DictionaryPage {status:'ok'|'missing'|'error';html?:string;title?:string}
export type DictionaryReply=Record<DefinitionLanguage,DictionaryPage>;
export function dictionaryURL(language:DefinitionLanguage,word:string) {
  return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(word)}#${language==='en'?'Japanese':'日本語'}`;
}
// Parse in an inert template; remote markup is never inserted into the panel.
export function definitionText(html:string,language:DefinitionLanguage):string[] {
  const template=document.createElement('template');template.innerHTML=html;
  let japanese=false,partOfSpeech=false;
  const out:string[]=[];
  const clean=(element:Element)=>{
    const copy=element.cloneNode(true) as Element;
    copy.querySelectorAll('script,style,iframe,img,video,audio,svg,ul,ol,dl,table,rt,rp,.mw-editsection,.reference,.citation-whole,.quotation,.h-usage-example').forEach(node=>node.remove());
    return (copy.textContent ?? '').replace(/\s+/g,' ').trim();
  };
  for(const element of template.content.querySelectorAll('h2,h3,h4,h5,h6,ol')) {
    if(element.closest('table,dl,.toc'))continue;
    if(element.tagName==='H2') {japanese=/^(Japanese|日本語)(?:\s|$)/u.test(clean(element));partOfSpeech=false;continue;}
    if(!japanese)continue;
    if(element.tagName!=='OL') {
      const heading=clean(element);
      if(!/^語義(?:\s|$)/u.test(heading))partOfSpeech=/^(Noun|Proper noun|Verb|Adjective|Adverb|Pronoun|Particle|Conjunction|Interjection|Prefix|Suffix|Counter|Numeral|Determiner|Phrase|Proverb|Idiom|Affix|名詞|固有名詞|動詞|形容詞|形容動詞|副詞|代名詞|助詞|接続詞|感動詞|接頭辞|接尾辞|助数詞|数詞|連体詞|成句|熟語|ことわざ|熟字訓|語素)(?:\s|[:：0-9０-９]|$)/u.test(heading);
      continue;
    }
    if(!partOfSpeech || element.parentElement?.closest('ol,ul'))continue;
    for(const item of element.querySelectorAll('li')) {
      if(item.parentElement?.tagName!=='OL' || item.closest('ul'))continue;
      const value=clean(item).slice(0,600);
      if(value && !out.includes(value))out.push(value);
      if(out.length===4)return out;
    }
  }
  return out;
}
