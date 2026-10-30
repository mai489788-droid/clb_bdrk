const {chromium}=require('/Users/maiducthuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const nav=async id=>page.locator(`.nav [data-page="${id}"]`).click();
  const close=async()=>page.locator('#modal .dialoghead [data-action="close"]').click();
  await page.goto('http://127.0.0.1:4173');await page.locator('#email').fill('mai489788@gmail.com');await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();await nav('media');
  await page.locator('.head [data-action="postForm"]').click();assert.match(await page.locator('#editForm [type="submit"]').innerText(),/Lưu bài viết/);
  await page.locator('#f-title').fill('Kiểm tra nút lưu');await page.locator('#f-content').fill('Nội dung kiểm tra phản hồi thao tác.');
  await page.locator('#f-image').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await page.locator('#editForm [type="submit"]').click();await page.locator('#formError').filter({hasText:/PNG/}).waitFor();
  assert.equal(await page.locator('#editForm [type="submit"]').isEnabled(),true);assert.equal(await page.locator('#editForm [type="submit"] svg').count(),1);assert.match(await page.locator('#editForm [type="submit"]').innerText(),/Lưu bài viết/);
  await page.locator('#f-image').setInputFiles([]);
  // Simulate a slow image read to exercise duplicate-submit and dialog-close behavior.
  await page.evaluate(()=>{window.normalReadFile=readFile;readFile=()=>new Promise(resolve=>{window.finishRead=()=>resolve('')})});
  await page.locator('#editForm [type="submit"]').click();assert.equal(await page.locator('#editForm [type="submit"]').getAttribute('aria-busy'),'true');assert.equal(await page.locator('#f-title').isDisabled(),true);assert.equal(await page.locator('#modal .dialoghead button').isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').evaluate(el=>el.open),true);await page.evaluate(()=>document.querySelector('#editForm').requestSubmit());await page.evaluate(()=>window.finishRead());await page.locator('#modal').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>db.posts.length),1);await page.evaluate(()=>{readFile=window.normalReadFile});
  await nav('events');await page.locator('.head [data-action="eventForm"]').click();await page.locator('#f-title').fill('Buổi đá kiểm tra nút xác nhận');await page.locator('#f-date').fill('2026-10-20');await page.locator('#f-opponent').fill('Nội bộ');await page.locator('#f-place').fill('Sân kiểm tra');await page.locator('#editForm [type="submit"]').click();await page.locator('#modal').waitFor({state:'hidden'});await page.locator('#eventList [data-action="eventDetail"]').click();
  await page.locator('[data-action="rsvpYes"]').click();assert.equal(await page.locator('[data-action="rsvpYes"]').getAttribute('aria-pressed'),'true');await page.locator('[data-action="rsvpNo"]').click();assert.equal(await page.locator('[data-action="rsvpNo"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-action="rsvpYes"]').getAttribute('aria-pressed'),'false');await close();
  // A browser with no Clipboard API still exposes selectable transfer text.
  await nav('fund');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.locator('[data-action="copyMemo"]').click();assert.match(await page.locator('#f-copyText').inputValue(),/Mai Đức Thuy/);assert.equal(await page.locator('#f-copyText').getAttribute('readonly'),'');await close();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedMemo=text}},configurable:true}));await page.locator('[data-action="copyMemo"]').click();await page.locator('[data-action="copyMemo"]').filter({hasText:'Đã sao chép'}).waitFor();assert.match(await page.evaluate(()=>window.copiedMemo),/Mai Đức Thuy/);
  await nav('logistics');await page.locator('[data-action="taskScope"][data-id="mine"]').click();assert.equal(await page.locator('[data-action="taskScope"][data-id="mine"]').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'/private/tmp/rikkei-controls-desktop.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await page.locator('#taskList [data-action="taskForm"]').first().click();
  await page.locator('#editForm [type="submit"]').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/rikkei-controls-phone.png',fullPage:false});assert.equal(await page.locator('#modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  for(const selector of ['#editForm [type="submit"]','#editForm [data-action="close"]','#modal .dialoghead button'])assert.ok((await page.locator(selector).boundingBox()).height>=44,`touch target ${selector}`);
  const closeBounds=await page.locator('#modal .dialoghead button').boundingBox();assert.ok(closeBounds.y>=0&&closeBounds.y+closeBounds.height<=844,'close button stays visible in long forms');
  await close();await page.locator('.mobile-nav [data-page="fund"]').click();await page.locator('[data-action="fundSettings"]').click();await page.locator('#editForm [type="submit"]').scrollIntoViewIfNeeded();assert.equal(await page.locator('#modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);await close();assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS: contextual submit labels, retry after file error, pending save/duplicate submit/Escape, RSVP selection, clipboard fallback and success, filter state, mobile dialog controls.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
