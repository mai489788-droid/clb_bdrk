const { chromium } = require('/Users/maiducthuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.evaluate(()=>{db.members.find(m=>m.id==='gs-member-002').email='manager@example.test';db.members.find(m=>m.id==='gs-member-003').email='member@example.test';save()});await page.locator('#email').fill('mai489788@gmail.com');
 await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();
 await page.locator('h1').filter({hasText:/Xin chào|Tổng quan câu lạc bộ/}).waitFor();
 await page.evaluate(()=>assignMemberRole('gs-member-002'));await page.locator('#f-assignedRole').selectOption('Quản lý đội');await page.locator('#editForm [type="submit"]').click();await page.locator('#modal').waitFor({state:'hidden'});
 assert.equal(await page.locator('.stat').count(),4);assert.match(await page.locator('.stats').innerText(),/50/);assert.match(await page.locator('.stats').innerText(),/2.300.000/);
 await page.screenshot({path:'/private/tmp/rikkei-desktop.png',fullPage:true});
 for(const name of ['members','events','requests','finance','media','logistics','venues','rules','source','profile','notifications']){
  await page.locator(`.nav [data-page="${name}"]`).click();
  assert.ok(await page.locator('.content h1').textContent());assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>window.innerWidth),false,`desktop overflow ${name}`);
 }
 await page.locator('.nav [data-page="members"]').click();await page.locator('#memberSearch').fill('Mai Đức Thuy');assert.equal(await page.locator('#memberTable tbody tr').count(),1);
 await page.locator('#memberSearch').fill('');await page.locator('#memberDues').selectOption('Đã đóng');assert.equal(await page.locator('#memberTable tbody tr').count(),10);
 await page.locator('#memberDues').selectOption('');await page.locator('#memberStatus').selectOption('Sẵn sàng');assert.equal(await page.locator('#memberTable tbody tr').count(),12);
 await page.locator('.nav [data-page="finance"]').click();await page.locator('#duesStatus').selectOption('Chưa đóng');assert.equal(await page.locator('#duesTable tbody tr').count(),40);
 await page.locator('.nav [data-page="venues"]').click();assert.equal(await page.locator('.venue-card').count(),6);
 await page.locator('.venue-card [data-action="venueForm"]').first().click();await page.locator('#f-survey').selectOption('Đã khảo sát');await page.locator('#f-confirmed').selectOption('true');await page.locator('#editForm button[type="submit"],#editForm button.btn.primary').click();assert.match(await page.locator('.venue-card').first().innerText(),/Đã chốt/);
 await page.locator('.nav [data-page="dashboard"]').click();assert.match(await page.locator('.content').innerText(),/Đã chốt Sân Bóng Bắc Việt/);
 await page.locator('.nav [data-page="logistics"]').click();await page.locator('[data-action="taskForm"][data-id]:not([data-id=""])').first().click();assert.equal(await page.locator('#f-deadlineText').inputValue(),'');await page.locator('#f-deadline').fill('');await page.locator('#editForm .primary').click();assert.equal(await page.locator('.content').innerText().then(t=>t.includes('46303')),false);
 await page.locator('.nav [data-page="events"]').click();await page.locator('.head [data-action="eventForm"]').click();
 await page.locator('#f-title').fill('Buổi tập kiểm thử');await page.locator('#f-date').fill('2026-10-20');await page.locator('#f-opponent').fill('Tập nội bộ');await page.locator('#f-place').fill('Sân kiểm thử');await page.locator('#editForm .primary').click();assert.match(await page.locator('#eventList').innerText(),/Buổi tập kiểm thử/);
 await page.locator('[data-action="logout"]').click();await page.locator('#email').fill('member@example.test');await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();
 assert.equal(await page.locator('.nav [data-page="members"]').count(),0);
 await page.locator('.nav [data-page="requests"]').click();await page.locator('[data-action="requestForm"]').click();await page.locator('#f-reason').fill('Có lịch học');await page.locator('#editForm .primary').click();assert.match(await page.locator('#requestList').innerText(),/Có lịch học/);
 await page.locator('[data-action="logout"]').click();await page.locator('#email').fill('manager@example.test');await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();await page.locator('.nav [data-page="requests"]').click();await page.locator('[data-action="requestDetail"]').click();await page.locator('#f-reply').fill('Đã ghi nhận');await page.locator('[data-action="approveRequest"]').click();assert.match(await page.locator('#requestList').innerText(),/Đã duyệt/);
 await page.locator('[data-action="logout"]').click();await page.locator('#email').fill('member@example.test');await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();await page.locator('.nav [data-page="notifications"]').click();assert.match(await page.locator('.content').innerText(),/Đã ghi nhận/);
 await page.locator('[data-action="logout"]').click();await page.locator('#email').fill('mai489788@gmail.com');await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'/private/tmp/rikkei-mobile.png',fullPage:true});
 for(const name of ['members','events','requests','finance','media','logistics','venues','rules','source','profile']){await page.locator('.mobiletoggle').click();await page.locator(`.nav [data-page="${name}"]`).click();assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>window.innerWidth),false,`mobile overflow ${name}`)}
 await page.reload();assert.ok(await page.locator('.content h1').textContent());assert.deepEqual(errors,[]);console.log('PASS: desktop and 390px pages; 50/10/12 roster reconciliation; 40 unpaid; venue edit persistence; member request → manager approval → notification; navigation and console.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
