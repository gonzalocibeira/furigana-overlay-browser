import {test,expect,chromium,type Browser} from '@playwright/test';
import {readFile} from 'node:fs/promises';

let browser:Browser,source:string;
test.beforeAll(async()=>{
  source=await readFile('dist/content.js','utf8');
  browser=await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless:true
  });
});
test.afterAll(async()=>{await browser?.close();});

for(const failure of ['sync-toolbar','async-toolbar','sync-tokenize','async-tokenize','sync-cancel','missing-id','transient-toolbar'] as const) {
  test(`content script handles ${failure} without uncaught errors or stale retries`,async()=>{
    const page=await browser.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.route('https://example.com/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<style>p{font:24px/3 system-ui;margin:60px}</style><p>日本語</p>'}));
      await page.goto('https://example.com/');
      await page.evaluate(failure=>{
        const h=(window as any).h={sent:[] as string[],status:()=>({}),finish:()=>{},valid:true};
        const event={addListener:()=>{}};
        (window as any).chrome={
          runtime:{
            get id(){return h.valid?'test-extension':undefined;},
            onMessage:{addListener:(listener:Function)=>{h.status=()=>{let value;listener({type:'status'},{},(reply:unknown)=>{value=reply;});return value;};}},
            sendMessage:(message:{type:string})=>{
              h.sent.push(message.type);
              const toolbar=message.type==='toolbar-status-changed';
              if(toolbar && failure==='transient-toolbar')throw new Error('Temporary connection failure');
              if(toolbar && failure==='sync-toolbar' || message.type==='tokenize' && failure==='sync-tokenize' || message.type==='cancel-tokenize' && failure==='sync-cancel')throw new Error('Extension context invalidated.');
              if(toolbar && failure==='async-toolbar' || message.type==='tokenize' && failure==='async-tokenize')return Promise.reject(new Error('Extension context invalidated.'));
              if(message.type==='tokenize' && failure==='sync-cancel')return new Promise(resolve=>{h.finish=()=>resolve({results:[[]]});});
              return Promise.resolve({results:[[]]});
            }
          },
          storage:{onChanged:event,local:{get:async()=>({enabled:true,excluded:[]})}}
        };
      },failure);
      await page.addScriptTag({content:source});
      if(failure==='sync-cancel') {
        await expect.poll(()=>page.evaluate(()=>(window as any).h.sent)).toContain('tokenize');
        await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
        await page.evaluate(()=>(window as any).h.finish());
      } else if(failure==='missing-id') {
        await expect.poll(()=>page.evaluate(()=>(window as any).h.status().state)).toBe('active');
        await page.evaluate(()=>{(window as any).h.valid=false;window.dispatchEvent(new Event('resize'));});
      }
      if(failure==='transient-toolbar') {
        // Ordinary notification failures must not disable a healthy script.
        await expect.poll(()=>page.evaluate(()=>(window as any).h.status().state)).toBe('active');
        await expect(page.locator('ko-overlay')).toHaveCount(1);
      } else {
        await expect.poll(()=>page.evaluate(()=>(window as any).h.status().message)).toContain('Reload this page');
        await expect(page.locator('ko-overlay')).toHaveCount(0);
        const sent=await page.evaluate(()=>(window as any).h.sent.length);
        await page.evaluate(()=>{
          for(let i=0;i<5;i++) {
            window.dispatchEvent(new Event('resize'));
            document.dispatchEvent(new Event('scroll'));
            document.querySelector('p')!.textContent+='日本語';
          }
        });
        await page.waitForTimeout(600);
        expect(await page.evaluate(()=>(window as any).h.sent.length)).toBe(sent);
      }
      expect(errors).toEqual([]);
    } finally {await page.close();}
  });
}
