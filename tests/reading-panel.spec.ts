import {test,expect} from '@playwright/test';
import {readingLines} from '../src/reading-panel';
test('reading view sorts geometry, joins inline runs, and offsets ruby without interpreting text',()=>{
  const lines=readingLines([
    {text:'<script>',top:40,left:10,right:80,readings:[]},
    {text:'語',top:20,left:58,right:82,readings:[{start:0,end:1,reading:'ご'}]},
    {text:'日本',top:20,left:10,right:58,readings:[{start:0,end:2,reading:'にほん'}]},
    {text:'test',top:20,left:100,right:150,readings:[]}
  ]);
  expect(lines).toEqual([{text:'日本語 test',readings:[{start:0,end:2,reading:'にほん'},{start:2,end:3,reading:'ご'}]},{text:'<script>',readings:[]}]);
});
