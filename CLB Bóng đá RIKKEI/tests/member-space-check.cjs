const {chromium}=require('/Users/maiducthuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),admin=await context.newPage(),errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));admin.on('pageerror',error=>errors.push(error.message));
  const login=async(page,email)=>{await page.goto('http://127.0.0.1:4173');await page.locator('#email').fill(email);await page.locator('#password').fill('rikkei123');await page.locator('#loginForm [type="submit"]').click();await page.locator('.content h1').waitFor()};
  const close=async page=>page.locator('#modal .dialoghead [data-action="close"]').click();
  const submit=async page=>{await page.locator('#editForm [type="submit"]').click();await page.locator('#modal').waitFor({state:'hidden'})};
  const nav=async(page,id)=>page.locator(`.nav [data-page="${id}"]`).click();
  await login(admin,'mai489788@gmail.com');
  // Register a real member whose imported position says manager; this alone grants no rights.
  await admin.evaluate(()=>memberForm('gs-member-002'));assert.equal(await admin.locator('#f-role').count(),0);await admin.locator('#f-email').fill('member-space@example.test');await submit(admin);
  const member=await context.newPage();await login(member,'member-space@example.test');
  assert.equal(await member.evaluate(()=>me().role),'Quản lý đội');assert.equal(await member.evaluate(()=>currentRole()),'Thành viên');assert.equal(await member.evaluate(()=>can('members')),false);
  for(const screen of ['dashboard','events','requests','fund','finance','notifications','profile','rules']){
   await nav(member,screen);
   assert.equal(await member.locator('.nav [data-page="roles"],.nav [data-page="source"],#roleAccessSelect,[data-action="assignRole"],[data-action="exportBackup"]').count(),0,screen);
   assert.equal(await member.locator('a[href*="docs.google.com/spreadsheets"]').count(),0,screen);
   assert.doesNotMatch(await member.locator('.content').innerText(),/Google Sheets|Truy cập chức vụ|Dự trù chi phí|Ghi nhận từ dữ liệu nguồn/);
  }
  await nav(member,'dashboard');assert.equal(await member.locator('.member-welcome').count(),1);assert.doesNotMatch(await member.locator('.stats').innerText(),/2.300.000|11.040.000|3.600.000/);
  await member.evaluate(()=>{go('source');go('roles');action('assignRole',userId);action('switchRole','0')});assert.equal(await member.evaluate(()=>page),'dashboard');assert.equal(await member.locator('#modal').evaluate(el=>el.open),false);assert.equal(await member.evaluate(()=>views.source()),'');
  await member.screenshot({path:'/private/tmp/rikkei-member-space-desktop.png',fullPage:true});
  // Only an administrator's explicit save applies the selected function. Cancel has no effect.
  await nav(admin,'members');
  // Use the actual card action regardless of the source member's display name.
  await admin.locator('#memberSearch').fill('');await admin.locator('[data-action="memberDetail"][data-id="gs-member-002"]').first().click();await admin.locator('#modal [data-action="assignRole"]').click();
  await admin.locator('#f-assignedRole').selectOption('Trưởng ban Truyền thông');assert.equal(await member.evaluate(()=>can('media')),false);await close(admin);assert.equal(await member.evaluate(()=>can('media')),false);
  await admin.evaluate(()=>assignMemberRole('gs-member-002'));await admin.locator('#f-assignedRole').selectOption('Trưởng ban Truyền thông');await submit(admin);await member.waitForFunction(()=>can('media'));
  assert.equal(await member.locator('.nav [data-page="media"]').count(),1);assert.equal(await member.locator('.nav [data-page="roles"],.nav [data-page="source"]').count(),0);assert.equal(await member.evaluate(()=>can('finance')||can('members')),false);
  await nav(member,'media');await member.locator('.head [data-action="postForm"]').click();await member.locator('#f-title').fill('Bài viết sau khi được cấp chức vụ');await member.locator('#f-content').fill('Đồng đội cùng ra sân.');await submit(member);assert.equal(await member.evaluate(()=>db.posts.length),1);
  await member.reload();assert.equal(await member.evaluate(()=>currentRole()),'Trưởng ban Truyền thông');
  // Revocation refreshes an open tab and closes access to previously granted screens.
  await admin.waitForFunction(()=>db.posts.length===1);await nav(member,'media');await admin.evaluate(()=>assignMemberRole('gs-member-002'));await admin.locator('#f-assignedRole').selectOption('Thành viên');await submit(admin);await member.waitForFunction(()=>currentRole()==='Thành viên');assert.equal(await member.evaluate(()=>page),'dashboard');assert.equal(await member.locator('.nav [data-page="media"]').count(),0);
  await member.evaluate(()=>{postForm();assignMemberRole(userId)});assert.equal(await member.locator('#modal').evaluate(el=>el.open),false);
  assert.equal(await member.evaluate(()=>validateClubBackup(structuredClone(db)).data.members.find(m=>m.id===userId).roleAssignment.role),'Thành viên');
  await nav(member,'profile');await member.locator('[data-action="profileForm"]').click();assert.equal(await member.locator('#f-role,#f-assignedRole').count(),0);await close(member);
  for(const width of [360,390,768]){await member.setViewportSize({width,height:844});await member.evaluate(()=>go('dashboard'));assert.equal(await member.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false,`member overflow at ${width}`)}
  await member.setViewportSize({width:390,height:844});await member.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await member.screenshot({path:'/private/tmp/rikkei-member-space-mobile.png',fullPage:true});
  // An administrator's member preview also hides administration and has a clear exit.
  await admin.locator('#roleAccessSelect').selectOption('5');assert.equal(await admin.locator('.nav [data-page="roles"],.nav [data-page="source"],#roleAccessSelect').count(),0);await admin.locator('.preview-exit').click();assert.equal(await admin.evaluate(()=>isAdmin()),true);
  assert.deepEqual(errors,[]);console.log('PASS: independent member workspace, no Sheets/role hub, imported positions grant no access, explicit assignment/cancel/revocation, live tab refresh, working role tools, backup persistence, admin preview and mobile layouts.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
