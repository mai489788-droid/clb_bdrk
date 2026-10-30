const {chromium}=require('/Users/maiducthuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const login=async email=>{await page.locator('#email').fill(email);await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();await page.locator('.content h1').waitFor()};
  const nav=async id=>page.locator(`.nav [data-page="${id}"]`).click();
  await page.goto('http://127.0.0.1:4173');await login('mai489788@gmail.com');
  const original=await page.evaluate(()=>({id:userId,roles:db.members.map(m=>m.role)}));
  await nav('roles');assert.equal(await page.locator('.role-card').count(),6);
  await page.screenshot({path:'/private/tmp/rikkei-roles-desktop.png',fullPage:true});
  const cases=[
   {role:1,page:'events',can:['events','requests','members'],button:'eventForm'},
   {role:2,page:'media',can:['media'],button:'postForm'},
   {role:3,page:'logistics',can:['logistics'],button:'taskForm'},
   {role:4,page:'fund',can:['finance']},
   {role:5,page:'dashboard',can:[]}
  ];
  for(const item of cases){
   await nav('roles');await page.locator(`.role-card [data-action="switchRole"][data-id="${item.role}"]`).click();
   const actual=await page.evaluate(()=>({page,role:currentRole(),actualRole:me().role,id:userId,can:['events','requests','members','finance','media','logistics'].filter(area=>can(area))}));
   assert.equal(actual.page,item.page);assert.equal(actual.actualRole,'Quản trị viên');assert.equal(actual.id,original.id);assert.deepEqual(actual.can.sort(),item.can.sort());
   assert.equal(await page.locator('.role-access-active').count(),item.role===5?0:1);assert.equal(await page.locator('.nav [data-page="roles"]').count(),item.role===5?0:1);
   if(item.button)assert.ok(await page.locator(`.content [data-action="${item.button}"]`).count()>0);
   assert.equal(await page.locator('[data-action="fundSettings"]').count(),0);
  }
  await page.reload();assert.equal(await page.locator('#roleAccessSelect').count(),0);assert.equal(await page.evaluate(()=>currentRole()),'Thành viên');assert.equal(await page.locator('.nav [data-page="members"]').count(),0);
  await page.locator('[data-action="switchRole"][data-id="0"]').click();assert.equal(await page.locator('#roleAccessSelect').inputValue(),'0');
  await nav('fund');assert.equal(await page.locator('[data-action="fundSettings"]').count(),1);
  await page.locator('#roleAccessSelect').selectOption('2');await page.locator('.head [data-action="postForm"]').click();await page.locator('#f-title').fill('Bài viết khi quản trị dùng chức vụ Truyền thông');await page.locator('#f-content').fill('Kiểm tra lưu dưới tài khoản quản trị hiện tại.');await page.locator('#editForm .primary').click();await page.locator('#modal').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>db.posts.length),1);assert.deepEqual(await page.evaluate(()=>db.members.map(m=>m.role)),original.roles);
  await page.locator('#roleAccessSelect').selectOption('0');await nav('roles');
  for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false,`role hub overflow at ${width}`)}
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await page.screenshot({path:'/private/tmp/rikkei-roles-mobile.png',fullPage:true});await page.locator('#roleAccessSelect').selectOption('4');await page.locator('[data-action="switchRole"][data-id="0"]').click();assert.equal(await page.locator('#roleAccessSelect').inputValue(),'0');
  await page.setViewportSize({width:1440,height:1000});await page.locator('#roleAccessSelect').selectOption('5');await page.locator('[data-action="logout"]').click();await login('mai489788@gmail.com');assert.equal(await page.locator('#roleAccessSelect').inputValue(),'0');
  // The convenience selector must never elevate a real member's permissions.
  await page.evaluate(()=>{db.members.find(m=>m.id==='gs-member-003').email='member@example.test';save()});await page.locator('[data-action="logout"]').click();await login('member@example.test');
  assert.equal(await page.locator('#roleAccessSelect').count(),0);assert.equal(await page.locator('.nav [data-page="roles"]').count(),0);
  await page.evaluate(()=>{action('switchRole','0');go('roles');sessionStorage.setItem('rikkei-role-view',JSON.stringify({user:userId,role:roles[0]}))});await page.reload();
  assert.equal(await page.evaluate(()=>currentRole()),'Thành viên');assert.equal(await page.evaluate(()=>isAdmin()),false);assert.equal(await page.locator('#roleAccessSelect').count(),0);assert.equal(await page.evaluate(()=>allowed('roles')),false);
  assert.deepEqual(errors,[]);console.log('PASS: all six roles, correct tools and permissions, admin identity preserved, working edits, reload/logout behavior, member guard, desktop/mobile layouts.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
