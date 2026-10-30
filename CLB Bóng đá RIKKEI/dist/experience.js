/* Everyday workflows. Data and source figures stay in their existing schema. */
const iconPaths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  members:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h3"/>',
  requests:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',
  finance:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-6 4h6v4h-6zM7 5V3h11"/>',
  media:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  logistics:'<path d="m3 6 2 2 4-4m-6 9 2 2 4-4m-6 9 2 2 4-4M13 6h8m-8 7h8m-8 7h8"/>',
  notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
  venues:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  rules:'<path d="M12 5c-3-2-7-2-10-1v16c3-1 7-1 10 1m0-16c3-2 7-2 10-1v16c-3-1-7-1-10 1V5Z"/>',
  source:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow:'<path d="m9 5 7 7-7 7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  logout:'<path d="M9 21H4V3h5m5 4 5 5-5 5M9 12h12"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
function icon(name){return `<svg class="app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.dashboard}</svg>`}
const normalizeText = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
const visibleNotifications = () => db.notifications.filter(n=>n.member==='all'||n.member===userId);
let menuReturnFocus=null;
function setMenu(open){
  const sidebar=$('.sidebar');if(!sidebar)return;
  sidebar.classList.toggle('open',open);$('.menu-backdrop')?.classList.toggle('open',open);
  document.body.classList.toggle('menu-open',open);
  document.querySelectorAll('[data-action="menu"]').forEach(b=>b.setAttribute('aria-expanded',String(open)));
  if(open){menuReturnFocus=document.activeElement;sidebar.querySelector('button')?.focus()}
  else menuReturnFocus?.focus();
}
function render(){
  document.body.classList.remove('menu-open');
  if(!me())return login();if(!allowed(page))page='dashboard';
  const u=me(),unread=visibleNotifications().filter(n=>!noticeDone(n,u.id)).length;
  const pending=db.requests.filter(r=>r.status==='Chờ duyệt').length;
  const mobilePages=[['dashboard','Trang chủ'],['events','Lịch đá'],[can('members')?'members':'profile',can('members')?'Đồng đội':'Cá nhân'],['fund','Nộp quỹ']];
  $('#app').innerHTML=`
    <aside class="sidebar" id="mainSidebar" aria-label="Điều hướng chính">
      <div class="brand"><div class="crest">R</div><div>RIKKEI FC<small>PTIT × RIKKEI · HÀ NỘI</small></div></div>
      <div class="navlabel">${isAdmin()?'QUẢN TRỊ CÂU LẠC BỘ':'KHÔNG GIAN THÀNH VIÊN'}</div>
      <nav class="nav">${navItems.filter(x=>allowed(x[0])).map(([id,,label])=>`<button data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(id)}<span>${id==='finance'&&!can('finance')?'Quỹ của tôi':label}</span>${id==='requests'&&can('requests')&&pending?`<span class="count">${pending}</span>`:''}</button>`).join('')}</nav>
      <div class="sidefoot"><b>Cùng nhau ra sân.</b><p class="muted">PTIT × Rikkei · Cơ sở Hà Nội</p><button class="link" data-action="logout">${icon('logout')} Đăng xuất</button></div>
    </aside>
    <button class="menu-backdrop" data-action="closeMenu" aria-label="Đóng menu" tabindex="-1"></button>
    <main class="main"><header class="topbar">${isAccountAdmin()&&currentRole()===roles[5]?'<button class="btn small preview-exit" data-action="switchRole" data-id="0">Kết thúc xem trước</button>':''}
      <button class="mobiletoggle" data-action="menu" aria-label="Mở menu" aria-expanded="false" aria-controls="mainSidebar">${icon('menu')}</button>
      <button class="search-trigger" data-action="openSearch" aria-label="Tìm kiếm toàn câu lạc bộ">${icon('search')}<span>Tìm trong câu lạc bộ…</span><kbd class="search-shortcut">⌘ / Ctrl K</kbd></button>
      <div class="user"><button class="notification-trigger" data-page="notifications" aria-label="Thông báo${unread?', '+unread+' chưa đọc':''}">${icon('notifications')}${unread?`<span class="notification-dot">${unread}</span>`:''}</button><button class="avatar" data-page="profile" aria-label="Xem hồ sơ">${avatarContent(u)}</button><div class="userinfo"><b>${esc(u.accessOnly?'Không gian quản lý':u.name)}</b><div class="muted" style="font-size:10px;margin-top:5px">${esc(currentRole())}</div></div></div>
    </header><div class="content">${roleAccessBar()}${views[page]()}<footer class="footnote">${isAdmin()?`Google Sheets · Bản chụp ${date(seed.source.snapshotDate)} · <button class="link" data-page="source">Thông tin dữ liệu</button> · `:'Rikkei FC · Không gian của bạn · '}Dữ liệu lưu trên trình duyệt${db.lastSavedAt?' · Đã lưu '+new Date(db.lastSavedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}):''}.</footer></div></main>
    <nav class="mobile-nav" aria-label="Điều hướng nhanh">${mobilePages.map(([id,label])=>`<button data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('')}<button data-action="menu" aria-label="Mở thêm mục" aria-expanded="false" aria-controls="mainSidebar">${icon('menu')}<span>Thêm</span></button></nav>`;
  bind();
}
function emptyState(symbol,title,copy,actionHtml=''){
 return `<div class="empty-state"><span class="empty-icon">${icon(symbol)}</span><h3>${title}</h3><p>${copy}</p>${actionHtml}</div>`;
}
function upcomingEvents(){return [...db.events].filter(e=>new Date(`${e.date}T${e.time||'23:59'}:00+07:00`).getTime()>=Date.now()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))}
function deadlineState(t){if(!t.deadline||t.status==='Hoàn thành')return '';if(t.deadline<today())return 'overdue';const days=(Date.parse(t.deadline+'T00:00:00+07:00')-Date.parse(today()+'T00:00:00+07:00'))/86400000;return days<=3?'soon':''}
function actionableTasks(){return db.tasks.filter(t=>canTask(t)&&t.status!=='Hoàn thành').sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'))}
function actionCard(symbol,title,count,copy,actionName,id=''){
 return `<button class="action-item" data-action="${actionName}" data-id="${esc(id)}"><span class="action-icon">${icon(symbol)}</span><div class="action-copy"><strong>${title}</strong><p>${copy}</p></div><span class="action-count">${count}</span>${icon('arrow')}</button>`;
}
function actionCenter(){
 const pending=db.requests.filter(r=>r.status==='Chờ duyệt'&&(can('requests')||r.member===userId));
 const tasks=actionableTasks(),unread=visibleNotifications().filter(n=>!noticeDone(n,userId));
 const next=upcomingEvents(),unconfirmed=next.filter(e=>!e.rsvps[userId]);
 const cards=[];
 if(can('requests'))cards.push(actionCard('requests','Đơn cần duyệt',pending.length,pending.length?'Xem lý do và phản hồi cho đồng đội':'Đã xử lý hết đơn đang chờ','pendingRequests'));
 else cards.push(actionCard('events','Lịch chờ xác nhận',unconfirmed.length,unconfirmed.length?'Báo cho đội biết bạn có tham gia':'Theo dõi lịch đá sắp tới','upcoming'));
 if(allowed('logistics'))cards.push(actionCard('logistics','Việc của ban bạn',tasks.length,tasks.some(t=>deadlineState(t)==='overdue')?`${tasks.filter(t=>deadlineState(t)==='overdue').length} việc đã quá hạn`:'Ưu tiên những việc gần đến hạn','myTasks'));
 else cards.push(actionCard('requests','Đơn đang chờ',pending.length,'Theo dõi phản hồi từ ban quản lý','pendingRequests'));
 cards.push(actionCard('notifications','Thông báo mới',unread.length,'Cập nhật lịch, quỹ và hoạt động','unreadNotifications'));
 return `<section class="action-section"><div class="panelhead"><h2>Cần bạn xử lý</h2><span class="muted">Một chạm đến việc cần làm</span></div><div class="action-center">${cards.join('')}</div></section>`;
}
const sourceDashboardView=views.dashboard;
// Use the existing statistic strip as the stable insertion point.
views.dashboard=()=>{
 const html=sourceDashboardView();const marker='<div class="grid">',index=html.indexOf(marker);
 return index<0?html:html.slice(0,index)+actionCenter()+html.slice(index);
};
function summaryTasks(){
 const tasks=actionableTasks();
 return tasks.length?taskRows(4,tasks):emptyState('check','Các việc đã được xử lý',me().accessOnly?'Ban của bạn chưa có việc cần xử lý.':'Chúc bạn có một buổi tập thật tốt.');
}
function taskRows(limit,rows=db.tasks){
 return (limit?rows.slice(0,limit):rows).map(t=>{
  const state=deadlineState(t),editable=canTask(t),hint=t.deadline?date(t.deadline):t.deadlineText||'Chưa có hạn';
  return `<div class="row task-row ${t.status==='Hoàn thành'?'is-complete':'is-pending'}"><span class="status-dot ${t.status==='Hoàn thành'?'done':state==='overdue'?'red':'amber'}"></span><div class="grow"><b class="${t.status==='Hoàn thành'?'taskdone':''}">${esc(t.title)}</b><p>${esc(t.department)} · ${esc(t.owner||'Chưa phân công')}</p><p class="deadline ${state}">${state==='overdue'?'Quá hạn · ':state==='soon'?'Sắp đến hạn · ':'Hạn: '}${esc(hint)}</p></div>${tag(t.status)}${editable?`<div class="task-actions">${t.status!=='Hoàn thành'?`<button class="task-complete" data-action="completeTask" data-id="${esc(t.id)}" aria-label="Hoàn thành: ${esc(t.title)}" title="Đánh dấu hoàn thành">${icon('check')}</button>`:''}<button class="link" data-action="taskForm" data-id="${esc(t.id)}">Sửa</button></div>`:''}</div>`;
 }).join('')||emptyState('check','Không có công việc phù hợp','Thử thay đổi bộ lọc hoặc thêm công việc mới.');
}
let taskScope='all';
const taskView=views.logistics;
views.logistics=()=>taskView().replace('<div class="filters">',`<div class="filter-chips" aria-label="Lọc nhanh công việc"><button data-action="taskScope" data-id="all" class="${taskScope==='all'?'active':''}">Tất cả</button><button data-action="taskScope" data-id="mine" class="${taskScope==='mine'?'active':''}">Ban của tôi</button><button data-action="taskScope" data-id="overdue" class="${taskScope==='overdue'?'active':''}">Quá hạn</button><button data-action="taskScope" data-id="soon" class="${taskScope==='soon'?'active':''}">Sắp đến hạn</button></div><div class="filters">`);
function filterTaskBoard(){
 if(!$('#taskList'))return;
 const value=id=>$('#'+id)?.value||'';
 const rows=db.tasks.filter(t=>normalizeText(t.title+' '+t.owner).includes(normalizeText(value('taskSearch')))&&(!value('taskDept')||t.department===value('taskDept'))&&(!value('taskStatus')||t.status===value('taskStatus'))&&(taskScope==='all'||taskScope==='mine'&&canTask(t)&&t.status!=='Hoàn thành'||taskScope==='overdue'&&deadlineState(t)==='overdue'||taskScope==='soon'&&deadlineState(t)==='soon')).sort((a,b)=>(a.status==='Hoàn thành')-(b.status==='Hoàn thành')||(a.deadline||'9999').localeCompare(b.deadline||'9999'));
 $('#taskList').innerHTML=taskRows(null,rows);bindBase($('#taskList'));
}
const originalEventRows=eventRows;
eventRows=es=>es.length?originalEventRows(es):emptyState('events','Chưa có lịch hoạt động','CLB đang khảo sát sân. Khi chốt ngày và giờ, lịch mới sẽ xuất hiện tại đây.',can('events')?button('＋ Tạo buổi đá','eventForm','',true):'');
const originalRequestRows=requestRows;
requestRows=(limit,status='')=>{
 const filtered=db.requests.filter(r=>(can('requests')||r.member===userId)&&(!status||r.status===status));
 return filtered.length?originalRequestRows(limit,status):emptyState('requests','Không có đơn '+(status?'ở trạng thái này':'đang hiển thị'),can('requests')?'Các đơn thành viên gửi sẽ được tập hợp tại đây.':'Bạn có thể gửi đơn khi có hoạt động đã được lên lịch.');
};
let onlyUnread=false;
views.notifications=()=>head('Trung tâm thông báo','Những cập nhật mới nhất từ câu lạc bộ.',`<div>${button('Đánh dấu tất cả đã đọc','readAll')}${isAdmin()||can('events')||can('media')?button('＋ Tạo thông báo','notificationForm','',true):''}</div>`)+`<section class="panel"><div class="filter-chips"><button data-action="notificationFilter" data-id="all" class="${!onlyUnread?'active':''}">Tất cả</button><button data-action="notificationFilter" data-id="unread" class="${onlyUnread?'active':''}">Chưa đọc (${visibleNotifications().filter(n=>!noticeDone(n,userId)).length})</button></div>${notificationRows()}</section>`;
const originalNotificationRows=notificationRows;
notificationRows=limit=>{
 if(!visibleNotifications().length)return emptyState('notifications','Bạn đã nắm hết thông tin','Thông báo về lịch đá, quỹ và kết quả duyệt đơn sẽ xuất hiện tại đây.');
 if(page!=='notifications'||!onlyUnread)return originalNotificationRows(limit);
 const rows=visibleNotifications().filter(n=>!noticeDone(n,userId));
 return rows.length?rows.map(n=>`<div class="row"><span class="avatar">${icon('notifications')}</span><div class="grow"><b>${esc(n.title)}</b><p>${esc(n.content)}</p><p>${date(n.date)}</p></div><button class="link" data-action="read" data-id="${esc(n.id)}">Đánh dấu đã đọc</button></div>`).join(''):emptyState('check','Không còn thông báo chưa đọc','Bạn đã xem tất cả cập nhật của câu lạc bộ.');
};
const sourceView=views.source;
views.source=()=>sourceView()+(isAdmin()?backupTools():'');

// Search only the records available to the current role.
let searchHits=[];
function getSearchResults(query){
 const q=normalizeText(query);const entries=[];
 const add=(type,title,subtitle,actionName,id)=>entries.push({type,title,subtitle,actionName,id});
 navItems.filter(n=>allowed(n[0])).forEach(([id,,title])=>add('Trang',title,'Đi đến màn hình','searchPage',id));
 if(q){
  if(can('members'))db.members.forEach(m=>add('Thành viên',m.name,[m.unit,m.sourcePosition].filter(Boolean).join(' · '),'memberDetail',m.id));
  db.events.forEach(e=>add('Hoạt động',e.title,`${date(e.date)} · ${e.place}`,'eventDetail',e.id));
  if(allowed('logistics'))db.tasks.forEach(t=>add('Công việc',t.title,`${t.owner} · ${t.department}`,'searchTask',t.id));
  if(allowed('venues'))db.venues.forEach(v=>add('Sân bóng',v.name,v.place||v.survey,'venueForm',v.id));
 }
 return entries.filter(x=>!q||normalizeText(x.title+' '+x.subtitle).includes(q)).slice(0,18);
}
function renderSearch(query){
 searchHits=getSearchResults(query);
 $('#searchResults').innerHTML=searchHits.length?searchHits.map((h,i)=>`<button class="search-result" data-action="searchHit" data-id="${i}"><span class="search-group">${h.type}</span><span><strong>${esc(h.title)}</strong><small>${esc(h.subtitle)}</small></span>${icon('arrow')}</button>`).join(''):`<div class="search-empty">Không tìm thấy “${esc(query)}”. Thử tên ngắn hơn hoặc không dấu.</div>`;
 $('#searchCount').textContent=query?`${searchHits.length}${searchHits.length===18?'+':''} kết quả`:'Đi nhanh đến một màn hình';bindBase($('#searchResults'));
}
function openSearch(){
 if(!me())return;
 setMenu(false);modal('Tìm trong câu lạc bộ',`<div class="field"><label class="visually-hidden" for="searchQuery">Từ khóa</label><input id="searchQuery" type="search" autocomplete="off" placeholder="Thử “mai duc”, “san bong”, “thu quy”…"></div><p id="searchCount" class="muted" aria-live="polite"></p><div id="searchResults" class="search-results"></div><p class="muted search-help">Tìm không dấu · Enter để mở kết quả đầu · Esc để đóng</p>`);
 $('#modal').classList.add('search-dialog');renderSearch('');$('#searchQuery').oninput=e=>renderSearch(e.target.value);
 $('#searchQuery').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('#modal').close();return}if(e.key==='Enter'&&searchHits.length){e.preventDefault();action('searchHit','0')}if(e.key==='ArrowDown'){e.preventDefault();$('#searchResults button')?.focus()}};
 $('#searchQuery').focus();
}
function previewTask(id){
 const t=db.tasks.find(t=>t.id===id);if(!t||!allowed('logistics'))return;
 modal('Chi tiết công việc',`<h3>${esc(t.title)}</h3><p>${esc(t.department)} · ${esc(t.owner||'Chưa phân công')}</p><p>Hạn: ${t.deadline?date(t.deadline):esc(t.deadlineText||'Chưa có hạn')}</p>${tag(t.status)}<p>${esc(t.note)}</p>${canTask(t)?`<div class="actions">${button('Chỉnh sửa','taskForm',t.id,true)}</div>`:''}`);
}

// Calendar exports use local Vietnam time converted to UTC, with a 90-minute default duration.
function calendarText(event){
 const escapeICS=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const stamp=value=>value.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const start=new Date(`${event.date}T${event.time}:00+07:00`);
 const duration=Number(event.duration)||90;
 if(Number.isNaN(start.getTime())||duration<=0||duration>1440)throw Error('Ngày hoặc giờ hoạt động chưa hợp lệ.');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Rikkei FC//Club Calendar//VI','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${event.id}@rikkei-fc`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+duration*60000))}`,`SUMMARY:${escapeICS(event.title)}`,`LOCATION:${escapeICS(event.place)}`,`DESCRIPTION:${escapeICS(`${event.note||''}\nPhụ trách: ${event.owner||''}`)}`,'END:VEVENT','END:VCALENDAR'];
 // Fold at 75 UTF-8 octets, including the leading continuation space.
 return lines.map(line=>{let part='',bytes=0,parts=[];for(const char of line){const length=new TextEncoder().encode(char).length;if(bytes+length>75){parts.push(part);part=' ';bytes=1}part+=char;bytes+=length}parts.push(part);return parts.join('\r\n')}).join('\r\n')+'\r\n';
}
function downloadCalendar(id){
 const e=db.events.find(e=>e.id===id);if(!e)return;
 try{const url=URL.createObjectURL(new Blob([calendarText(e)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rikkei-'+e.date+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã tải lịch .ics. Mở tệp để thêm vào lịch của bạn.')}catch(error){toast(error.message)}
}
const baseEventDetail=eventDetail;
eventDetail=id=>{
 const e=db.events.find(e=>e.id===id);if(!e)return;baseEventDetail(id);
 const header=$('#modal .dialoghead');header.insertAdjacentHTML('afterend',`<div class="event-tools">${button(icon('download')+' Thêm vào lịch cá nhân','downloadCalendar',id)}<span class="muted">${esc(e.duration||90)} phút · Giờ Việt Nam</span></div>`);
 if(me().accessOnly){$('#modal .actions')?.remove()}
 bind($('#modal'));
};
const baseEventForm=eventForm;
eventForm=id=>{
 baseEventForm(id);if(!can('events')||!$('#editForm'))return;
 const e=db.events.find(e=>e.id===id),f=$('#editForm');
 f.querySelector('.formgrid').insertAdjacentHTML('afterend',field('Thời lượng (phút)','duration',e?.duration||90,'number'));
 $('#f-duration').min='15';$('#f-duration').max='360';$('#f-duration').step='15';
 if(!id){const venue=db.venues.find(v=>v.confirmed);if(venue)$('#f-place').value=venue.place?venue.name+' · '+venue.place:venue.name;$('#f-time').value='19:30'}
 // The base form already persists new fields; this validation applies to the additional field.
 const submit=f.onsubmit;f.onsubmit=event=>{const duration=+$('#f-duration').value;if(duration<15||duration>360||duration%15!==0){event.preventDefault();$('#formError').textContent='Thời lượng từ 15 đến 360 phút, theo bước 15 phút.';return}return submit(event)};
};
function bind(root=document){
 bindSource(root);if(typeof bindMemberUI==='function')bindMemberUI(root);if(typeof bindBackupUI==='function')bindBackupUI(root);
 ['taskSearch','taskDept','taskStatus'].forEach(id=>{const input=$('#'+id);if(input)input.oninput=filterTaskBoard});
 if(root===document&&page==='logistics')filterTaskBoard();
 if(root===document&&$('.sidebar'))$('.sidebar').onkeydown=e=>{
  if(!$('.sidebar').classList.contains('open'))return;
  if(e.key==='Escape'){e.preventDefault();setMenu(false)}
  if(e.key==='Tab'){const buttons=[...$('.sidebar').querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 };
}
function action(a,id){
 if(typeof handleMemberAction==='function'&&handleMemberAction(a,id))return;
 if(typeof handleBackupAction==='function'&&handleBackupAction(a,id))return;
 if(a==='menu')return setMenu(!$('.sidebar')?.classList.contains('open'));
 if(a==='closeMenu')return setMenu(false);
 if(a==='openSearch')return openSearch();
 if(a==='searchHit'){
  const hit=searchHits[Number(id)];if(!hit)return;$('#modal').close();if(hit.actionName==='searchPage')return go(hit.id);if(hit.actionName==='searchTask')return previewTask(hit.id);return action(hit.actionName,hit.id);
 }
 if(a==='pendingRequests'){go('requests');$('#requestStatus').value='Chờ duyệt';$('#requestStatus').dispatchEvent(new Event('input'));return}
 if(a==='myTasks'){taskScope='mine';go('logistics');return}
 if(a==='upcoming'){go('events');$('#eventPeriod').value='upcoming';$('#eventPeriod').dispatchEvent(new Event('input'));return}
 if(a==='unreadNotifications'){onlyUnread=true;go('notifications');return}
 if(a==='notificationFilter'){onlyUnread=id==='unread';render();return}
 if(a==='taskScope'){taskScope=id;render();return}
 if(a==='completeTask'){
  const t=db.tasks.find(t=>t.id===id);if(!t||!canTask(t))return;
  const old=t.status;t.status='Hoàn thành';try{save();render();toast('Đã hoàn thành công việc. Bạn có thể mở Sửa để thay đổi trạng thái.')}catch(error){t.status=old;toast(error.message)}return;
 }
 if(a==='downloadCalendar')return downloadCalendar(id);
 if(a==='logout'){setMenu(false);onlyUnread=false;taskScope='all'}
 return actionSource(a,id);
}
document.addEventListener('keydown',event=>{
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&me()){
  if($('#modal').open&&!$('#searchQuery'))return;event.preventDefault();openSearch();
 }
 if(event.key==='Escape'&&$('.sidebar')?.classList.contains('open'))setMenu(false);
});
$('#modal').addEventListener('close',()=>$('#modal').classList.remove('search-dialog'));
