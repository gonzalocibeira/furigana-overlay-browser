import {test,expect,chromium} from '@playwright/test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

test('native toolbar popup opens at full height and wheel-scrolls to footer links',async()=>{
  const profile=await mkdtemp(resolve(tmpdir(),'ko-native-popup-'));
  const path=resolve('dist');
  const context=await chromium.launchPersistentContext(profile,{
    executablePath:process.env.CHROMIUM_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    // Native popup auto-sizing only happens in a real browser window.
    headless:false,viewport:null,args:[`--disable-extensions-except=${path}`,`--load-extension=${path}`]
  });
  try {
    const worker=context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    await worker.evaluate(async()=>{
      await chrome.storage.local.set({enabled:false});
      await chrome.action.openPopup();
    });
    // Action popups are separate targets, not normal Playwright context pages.
    const browser=await context.browser()!.newBrowserCDPSession();
    const targets=await browser.send('Target.getTargets');
    const target=targets.targetInfos.find(t=>t.url.endsWith('/popup.html'));
    expect(target).toBeDefined();
    const {sessionId}=await browser.send('Target.attachToTarget',{targetId:target!.targetId,flatten:false});
    let next=0;
    const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
    browser.on('Target.receivedMessageFromTarget',event=>{
      if(event.sessionId!==sessionId)return;
      const reply=JSON.parse(event.message),job=pending.get(reply.id);
      if(!job)return;
      pending.delete(reply.id);
      if(reply.error)job.reject(new Error(JSON.stringify(reply.error)));else job.resolve(reply.result);
    });
    const send=(method:string,params:Record<string,unknown>={})=>new Promise<any>((resolve,reject)=>{
      const id=++next;pending.set(id,{resolve,reject});
      void browser.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);
    });
    const evaluate=async(expression:string)=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
    await expect.poll(()=>evaluate('innerHeight')).toBe(580);
    const footerVisible=`Array.from(document.querySelectorAll('footer a')).every(a=>{const r=a.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})`;
    await expect.poll(()=>evaluate(footerVisible)).toBe(true);
    expect(await evaluate('document.body.scrollHeight <= document.body.clientHeight')).toBe(true);
    const collapsed=await send('Page.captureScreenshot');
    await writeFile(test.info().outputPath('native-popup-collapsed.png'),Buffer.from(collapsed.data,'base64'));
    await evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)");
    await expect.poll(()=>evaluate('document.body.scrollHeight > document.body.clientHeight')).toBe(true);
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:350,y:400,deltaX:0,deltaY:10000});
    await expect.poll(()=>evaluate('document.body.scrollTop')).toBeGreaterThan(0);
    await expect.poll(()=>evaluate(footerVisible)).toBe(true);
    expect(await evaluate('innerHeight')).toBe(580);
    const shot=await send('Page.captureScreenshot');
    await writeFile(test.info().outputPath('native-popup-footer.png'),Buffer.from(shot.data,'base64'));
  } finally {await context.close();await rm(profile,{recursive:true,force:true});}
});
