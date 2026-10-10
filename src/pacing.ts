export class AdaptivePacer {
  private last=-Infinity;
  private pressure=0;
  mark(kind:'scroll'|'edit',now=performance.now()) {
    const gap=now-this.last;
    this.pressure=gap<200?Math.min(10,this.pressure+1):Math.max(0,this.pressure-Math.floor(gap/200));
    this.last=now;
    return (kind==='scroll'?100:150)+this.pressure*35;
  }
  budget(now=performance.now()) { return now-this.last<1000 && this.pressure>=3?2:4; }
}
