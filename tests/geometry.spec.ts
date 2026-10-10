import {test,expect} from '@playwright/test';
import {CollisionIndex} from '../src/geometry';
test('spatial collisions match exhaustive checks across cells and negative coordinates',()=>{
  const index=new CollisionIndex();
  const boxes=Array.from({length:1000},(_,i)=>{
    const left=(i*137%1500)-100,top=(i*89%1000)-100;
    return {left,top,right:left+5+i%75,bottom:top+4+i%20};
  });
  for(const box of boxes)index.add(box);
  for(let i=0;i<400;i++){
    const left=(i*41%1700)-200,top=(i*157%1200)-200;
    const box={left,top,right:left+17,bottom:top+9};
    expect(index.overlaps(box)).toBe(boxes.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top));
  }
  const edge=new CollisionIndex();edge.add({left:0,top:0,right:64,bottom:64});
  expect(edge.overlaps({left:64,top:0,right:80,bottom:20})).toBe(false);
  expect(edge.overlaps({left:63.9,top:0,right:80,bottom:20})).toBe(true);
});
