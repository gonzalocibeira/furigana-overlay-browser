import {deflateSync} from 'node:zlib';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
// Rasterize the outlined 考 mark from the SVG; no font or graphics dependency.
export async function buildIcons(directory) {
  await mkdir(directory,{recursive:true});
  const svg=await readFile(new URL('../public/icons/logo.svg',import.meta.url),'utf8');
  const outline=svg.match(/\bd="([^"]+)"/)?.[1];
  if(!outline || /[^MLZ\d.,\s-]/.test(outline))throw new Error('Expected a polygon outline in logo.svg');
  const polygons=outline.split('M').slice(1).map(part=>[...part.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(match=>[Number(match[1]),Number(match[2])]));
  const inside=(x,y)=>{
    let filled=false;
    for(const points of polygons)for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [ax,ay]=points[i],[bx,by]=points[j];
      if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)filled=!filled;
    }
    return filled;
  };
  const pixel=(x,y,state)=>{
    if(x<2 || x>=126 || y<2 || y>=126)return [0,0,0,0];
    if(x<8 || x>=120 || y<8 || y>=120)return [36,43,45,255];
    if(state==='active')return inside(x,y)?[244,236,216,255]:[159,62,45,255];
    if(state==='paused' && x>=94 && y>=94) {
      const bar=y>=100 && y<116 && ((x>=100 && x<105)||(x>=110 && x<115));
      return bar?[36,43,45,255]:[244,236,216,255];
    }
    if(state==='unavailable' && x>=18 && x<=110 && y>=18 && y<=110 && Math.abs(x+y-128)<12) {
      return Math.abs(x+y-128)<4?[36,43,45,255]:[244,236,216,255];
    }
    return inside(x,y)?[36,43,45,255]:state==='paused'?[230,216,185,255]:[244,236,216,255];
  };
  const crc=data=>{
    let n=0xffffffff;
    for(const byte of data){n^=byte;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}
    return (n^0xffffffff)>>>0;
  };
  const chunk=(name,data)=>{
    const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);
    length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));
    return Buffer.concat([length,type,data,checksum]);
  };
  for(const state of ['active','paused','unavailable'])for(const size of [16,32,48,128]) {
    const raw=Buffer.alloc((size*4+1)*size),samples=4;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const sum=[0,0,0,0];
      for(let sy=0;sy<samples;sy++)for(let sx=0;sx<samples;sx++){
        const color=pixel((x+(sx+.5)/samples)*128/size,(y+(sy+.5)/samples)*128/size,state);
        for(let c=0;c<3;c++)sum[c]+=color[c]*color[3]/255;
        sum[3]+=color[3];
      }
      const offset=y*(size*4+1)+1+x*4;
      for(let c=0;c<3;c++)raw[offset+c]=sum[3]?Math.round(sum[c]*255/sum[3]):0;
      raw[offset+3]=Math.round(sum[3]/samples**2);
    }
    const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
    const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
    await writeFile(`${directory}/icon-${state}-${size}.png`,png);
    if(state==='active')await writeFile(`${directory}/icon-${size}.png`,png);
  }
}
