import {deflateSync} from 'node:zlib';
import {writeFile,mkdir} from 'node:fs/promises';
// Raster counterpart of public/icons/logo.svg; no graphics dependency at build time.
export async function buildIcons(directory) {
  await mkdir(directory,{recursive:true});
  const teal=[32,107,92],cream=[255,253,246],gold=[244,189,107];
  const rounded=(x,y,l,t,w,h,r)=>{
    const dx=Math.max(l+r-x,0,x-(l+w-r)),dy=Math.max(t+r-y,0,y-(t+h-r));
    return x>=l&&x<=l+w&&y>=t&&y<=t+h&&dx*dx+dy*dy<=r*r;
  };
  const line=(x,y,a,b,c,d,r)=>{
    const t=Math.max(0,Math.min(1,((x-a)*(c-a)+(y-b)*(d-b))/((c-a)**2+(d-b)**2)));
    return (x-a-t*(c-a))**2+(y-b-t*(d-b))**2<=r*r;
  };
  const kanji=[[64,46,64,54],[34,65,34,56],[34,56,94,56],[94,56,89,66],[45,72,81,72],[81,72,64,84],[64,84,64,101],[35,88,93,88]];
  const kana=[[54,18,53,29],[65,17,68,21],[72,15,75,19]];
  // Flatten the two quadratic curves from the SVG into short stroke segments.
  const curve=(target,a,b,c,d,e,f)=>{
    let previous=[a,b];
    for(let i=1;i<=16;i++){
      const t=i/16,u=1-t,next=[u*u*a+2*u*t*c+t*t*e,u*u*b+2*u*t*d+t*t*f];
      target.push([...previous,...next]);previous=next;
    }
  };
  curve(kana,53,29,53,39,67,31);
  curve(kanji,64,101,64,107,54,104);
  const pixel=(x,y)=>{
    if(!rounded(x,y,2,2,124,124,29))return [0,0,0,0];
    let color=teal;
    if(kana.some(s=>line(x,y,...s,1.75)))color=gold;
    if(kanji.some(s=>line(x,y,...s,3)))color=cream;
    return [...color,255];
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
  for(const size of [16,32,48,128]) {
    const raw=Buffer.alloc((size*4+1)*size),samples=4;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const sum=[0,0,0,0];
      for(let sy=0;sy<samples;sy++)for(let sx=0;sx<samples;sx++){
        const color=pixel((x+(sx+.5)/samples)*128/size,(y+(sy+.5)/samples)*128/size);
        for(let c=0;c<3;c++)sum[c]+=color[c]*color[3]/255;
        sum[3]+=color[3];
      }
      const offset=y*(size*4+1)+1+x*4;
      for(let c=0;c<3;c++)raw[offset+c]=sum[3]?Math.round(sum[c]*255/sum[3]):0;
      raw[offset+3]=Math.round(sum[3]/samples**2);
    }
    const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
    await writeFile(`${directory}/icon-${size}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
  }
}
