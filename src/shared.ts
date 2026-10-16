export interface Reading { start: number; end: number; reading: string }
export interface Word {
  start:number; end:number; lemma:string; reading:string;
  /** Dictionary morphology is optional so older reading-only responses stay valid. */
  pos?:string; posDetail?:string; verbClass?:string; verbForm?:string; lemmaReading?:string;
}
export const hiragana = (text: string) => text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const kanji = /[\p{Script=Han}々〆ヵヶ]/u;
// Anchor kana runs in the dictionary reading. Ambiguous alignment stays whole-word.
export function align(surface: string, raw: string): Reading[] {
  if (!kanji.test(surface) || !raw || raw === '*') return [];
  const reading = hiragana(raw);
  const runs = [...surface.matchAll(/[\p{Script=Han}々〆ヵヶ]+|[^\p{Script=Han}々〆ヵヶ]+/gu)];
  let cursor = 0;
  const out: Reading[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i], value = run[0];
    if (!kanji.test(value)) {
      const kana = hiragana(value);
      if (!reading.startsWith(kana, cursor)) return [{ start: 0, end: surface.length, reading }];
      cursor += kana.length;
    } else {
      const next = runs[i + 1];
      let end = reading.length;
      if (next) {
        const anchor = hiragana(next[0]);
        end = reading.indexOf(anchor, cursor + 1);
        if (end < 0 || reading.indexOf(anchor, end + 1) !== -1) return [{ start: 0, end: surface.length, reading }];
      }
      if (end <= cursor) return [{ start: 0, end: surface.length, reading }];
      out.push({ start: run.index!, end: run.index! + value.length, reading: reading.slice(cursor, end) });
      cursor = end;
    }
  }
  return cursor === reading.length ? out : [{ start: 0, end: surface.length, reading }];
}
export class ReadingCache {
  private entries = new Map<string, Reading[]>();
  private size = 0;
  private weight(key: string, value: Reading[]) { return key.length + value.reduce((sum, part) => sum + part.reading.length, 0); }
  get(key: string) { const value = this.entries.get(key); if (value) { this.entries.delete(key); this.entries.set(key, value); } return value; }
  set(key: string, value: Reading[]) {
    if (this.entries.has(key)) { this.size -= this.weight(key, this.entries.get(key)!); this.entries.delete(key); }
    this.entries.set(key, value); this.size += this.weight(key, value);
    while (this.entries.size > 2000 || this.size > 200000) { const first = this.entries.keys().next().value!; this.size -= this.weight(first, this.entries.get(first)!); this.entries.delete(first); }
  }
}
