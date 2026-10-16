// Public release notes are authored once in docs/release-notes.md. The build
// produces the offline app views and a GitHub-ready body without runtime fetches.
const docsURL='https://github.com/gonzalocibeira/ko-japanese-reading-companion/blob/master/docs/';
const escapeHTML=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function reference(target) {
  const url=new URL(target,docsURL);
  if(url.protocol!=='https:')throw new Error('Release notes require HTTPS reference links');
  return url.href;
}
function inline(text) {
  const pattern=/`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let output='',offset=0;
  for(const match of text.matchAll(pattern)) {
    output+=escapeHTML(text.slice(offset,match.index));
    if(match[1])output+=`<code>${escapeHTML(match[1])}</code>`;
    else if(match[2])output+=`<strong>${escapeHTML(match[2])}</strong>`;
    else output+=`<a href="${escapeHTML(reference(match[4]))}" target="_blank" rel="noopener noreferrer">${escapeHTML(match[3])}</a>`;
    offset=match.index+match[0].length;
  }
  return output+escapeHTML(text.slice(offset));
}
// The authored changelog uses headings, paragraphs, bullets and inline markup.
// Escape all other text rather than interpreting raw HTML from the document.
function render(markdown) {
  const output=[];let paragraph=[],list=false;
  const flush=()=>{if(paragraph.length){output.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[];}};
  const closeList=()=>{if(list){output.push('</ul>');list=false;}};
  for(const line of markdown.trim().split(/\r?\n/)) {
    if(!line.trim()){flush();closeList();continue;}
    const heading=line.match(/^(#{1,3}) (.+)$/);
    if(heading){flush();closeList();output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);continue;}
    if(line.startsWith('- ')){flush();if(!list){output.push('<ul>');list=true;}output.push(`<li>${inline(line.slice(2))}</li>`);continue;}
    closeList();paragraph.push(line.trim());
  }
  flush();closeList();return output.join('\n');
}

export function prepareReleaseNotes(source,version) {
  const sections=[...source.matchAll(/^## (.+)$/gm)];
  const entries=sections.filter(match=>match[1].startsWith(version+' · '));
  if(entries.length!==1)throw new Error(`Expected one release-notes section for manifest version ${version}`);
  const current=entries[0],index=sections.indexOf(current);
  const body=source.slice(current.index+current[0].length,sections[index+1]?.index ?? source.length).trim();
  if(!body)throw new Error('Current release notes cannot be empty');
  const title=current[1],html=render(body);
  const github=`# Kō ${title}\n\n${body.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g,(_,label,target)=>`[${label}](${reference(target)})`)}\n`;
  const about=`<p class="release-version">${escapeHTML(title)}</p><details id="current-release-notes"><summary>Read the ${escapeHTML(version)} release notes</summary><div class="release-body">${html}</div></details><p class="release-history-link"><a href="release-notes.html">Full release history (offline)</a></p>`;
  const history=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kō release notes</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:17px/1.65 system-ui;color:#242b2d;background:#f4ecd8}h1,h2,h3{line-height:1.3}h2{margin-top:36px;padding-top:20px;border-top:1px solid #625d50}li+li{margin-top:10px}a{color:#234e64;overflow-wrap:anywhere}code{overflow-wrap:anywhere}a:focus-visible{outline:3px solid #234e64;outline-offset:3px}</style><nav aria-label="About navigation"><a href="about.html#release-heading">Back to About Kō</a></nav><main>${render(source)}</main></html>`;
  return {title,body,html,github,about,history};
}
