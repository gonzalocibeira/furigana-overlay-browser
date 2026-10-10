interface Box { left: number; top: number; right: number; bottom: number }
// Limit collision checks to nearby screen cells, rather than every visible glyph.
export class CollisionIndex {
  private cells = new Map<string, Box[]>();
  private *keys(box: Box) {
    for (let y=Math.floor(box.top/64); y<=Math.floor(box.bottom/64); y++)
      for (let x=Math.floor(box.left/64); x<=Math.floor(box.right/64); x++) yield `${x}:${y}`;
  }
  add(box: Box) {
    for (const key of this.keys(box)) {
      const bucket=this.cells.get(key);
      if (bucket) bucket.push(box); else this.cells.set(key,[box]);
    }
  }
  overlaps(box: Box) {
    for (const key of this.keys(box)) for (const other of this.cells.get(key) ?? [])
      if (box.left<other.right && box.right>other.left && box.top<other.bottom && box.bottom>other.top) return true;
    return false;
  }
}
