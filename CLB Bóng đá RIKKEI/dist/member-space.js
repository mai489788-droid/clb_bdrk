/* Personal workspace and explicit administrator-controlled role assignments. */
function assignMemberRole(id){
 if(!isAdmin())return;
 const member=db.members.find(item=>item.id===id);
 if(!member)return toast('Thành viên không còn trong danh sách.');
 const current=assignedRole(member);
 modal('Cập nhật chức vụ',form(`
  <div class="role-assignment-member"><span class="avatar">${avatarContent(member)}</span><div><b>${esc(member.name)}</b><p class="muted">${esc(member.email||'Chưa cấp email đăng nhập')}</p></div></div>
  <p>Chức vụ hiện tại: <b>${esc(current)}</b></p>
  ${select('Chức vụ được cấp','assignedRole',roles,current)}
  <div id="roleAssignmentHelp" class="notice" aria-live="polite"></div>
  <p class="muted">Quyền chỉ thay đổi khi bạn bấm Cập nhật chức vụ. Chọn Thành viên để thu hồi các chức năng quản lý. Thông tin vị trí thi đấu trong hồ sơ được giữ riêng.</p>`));
 const explain=()=>{const space=roleSpaces[roles.indexOf($('#f-assignedRole').value)];$('#roleAssignmentHelp').textContent=space?space.features.join(' · '):''};
 $('#f-assignedRole').onchange=explain;explain();
 $('#editForm [type="submit"]').innerHTML=icon('check')+' Cập nhật chức vụ';
 handleForm(data=>{
  if(!isAdmin())throw Error('Chỉ quản trị viên được cập nhật chức vụ.');
  const target=db.members.find(item=>item.id===id);
  if(!target)throw Error('Thành viên không còn trong danh sách.');
  if(!roles.includes(data.assignedRole))throw Error('Chức vụ không hợp lệ.');
  if(id===userId&&data.assignedRole!==roles[0])throw Error('Không thể hạ quyền tài khoản quản trị đang đăng nhập.');
  if(data.assignedRole!==roles[5])assertEmail(target.email,target.id,true);
  const previous=assignedRole(target),stamp=new Date().toISOString();
  target.role=data.assignedRole;
  target.roleAssignment={role:data.assignedRole,by:userId,at:stamp};
  target.localUpdatedAt=stamp;
  if(previous!==data.assignedRole)notify('Chức vụ của bạn đã được cập nhật',`Chức vụ mới: ${data.assignedRole}. Các chức năng tương ứng đã được cập nhật trong tài khoản của bạn.`,target.id);
 });
}
actionIcons.assignRole='roles';
const actionBeforeMemberSpace=action;
action=function(a,id){if(a==='assignRole')return assignMemberRole(id);return actionBeforeMemberSpace(a,id)};

function personalDashboard(){
 const member=me(),next=upcomingEvents(),pending=db.requests.filter(r=>r.member===userId&&r.status==='Chờ duyệt'),unread=visibleNotifications().filter(n=>!noticeDone(n));
 const fund=collectionStatus(userId).replace('Đã đóng theo nguồn','Đã ghi nhận'),tasks=actionableTasks();
 return head(`Chào ${esc(member.name.split(' ').slice(-2).join(' '))}!`,'Lịch ra sân, quỹ và những cập nhật dành riêng cho bạn.',button('Hồ sơ của tôi','gotoProfile'))+`
  <section class="member-welcome"><div><span class="eyebrow">RIKKEI FC · KHÔNG GIAN CỦA BẠN</span><h2>Sẵn sàng cho buổi ra sân tiếp theo.</h2><p>Theo dõi lịch đá, xác nhận tham gia và kết nối cùng đồng đội.</p><div class="actions">${button('Xem lịch đá','gotoEvents','',true)}${button('Nộp quỹ','openFund')}</div></div><span class="member-welcome-mark" aria-hidden="true">R</span></section>
  <div class="stats personal-stats">${metric('▦','Lịch sắp tới',next.length,'Hoạt động của câu lạc bộ')}${metric('▤','Đơn của tôi',pending.length,'Đơn đang chờ phản hồi')}${metric('◈','Quỹ của tôi',esc(fund),esc(db.fundSettings.periodLabel))}${metric('♧','Thông báo',unread.length,'Thông báo chưa hoàn thành')}</div>
  ${actionCenter()}
  <div class="grid member-home-grid"><div><section class="panel"><div class="panelhead"><h2>Hẹn nhau trên sân</h2><button class="link" data-page="events">Toàn bộ lịch</button></div>${next.length?nextMatch():emptyState('events','Chưa có lịch sắp tới','Lịch đá sẽ xuất hiện tại đây khi đội chốt thời gian.')}</section><section class="panel"><div class="panelhead"><h2>Đơn xin vắng của tôi</h2>${button('Gửi đơn','requestForm')}</div>${personalRequestRows()}</section></div><div><section class="panel"><div class="panelhead"><h2>Thông báo dành cho bạn</h2><button class="link" data-page="notifications">Xem tất cả</button></div>${notificationRows(3)}</section>${currentRole()!==roles[5]?`<section class="panel"><div class="panelhead"><h2>Công việc của ban</h2></div>${taskRows(4,tasks)}</section>`:''}</div></div>`;
}
function personalRequestRows(){
 const rows=db.requests.filter(request=>request.member===userId).slice(0,3);
 return rows.length?rows.map(request=>`<div class="row"><div class="grow"><b>${esc(eventName(request.event))}</b><p>${esc(request.reason)}</p>${tag(request.status)}</div>${button('Chi tiết','requestDetail',request.id)}</div>`).join(''):emptyState('requests','Bạn chưa có đơn xin vắng','Gửi đơn nếu bạn không thể tham gia một hoạt động sắp tới.');
}
const dashboardBeforeMemberSpace=views.dashboard;
views.dashboard=()=>isAdmin()?dashboardBeforeMemberSpace():personalDashboard();
const sourceBeforeMemberSpace=views.source;
views.source=()=>isAdmin()?sourceBeforeMemberSpace():'';
const financeBeforeMemberSpace=views.finance;
views.finance=()=>can('finance')?financeBeforeMemberSpace():head('Quỹ của tôi','Theo dõi khoản đóng và chứng từ của chính bạn.',button('Nộp quỹ','openFund','',true))+`
 <section class="panel"><div class="panelhead"><h2>${esc(db.fundSettings.periodLabel)}</h2>${tag(collectionStatus(userId).replace('Đã đóng theo nguồn','Đã ghi nhận'))}</div><p>Mức đóng: <b>${money(db.fundSettings.amount)}</b>${db.fundSettings.deadline?' · Hạn nộp: '+date(db.fundSettings.deadline):''}</p></section>
 <section class="panel"><h2>Lịch sử xác nhận của tôi</h2>${fundSubmissionRows(db.fundSubmissions.filter(entry=>entry.member===userId))}</section>
 <section class="panel"><div class="panelhead"><h2>Giao dịch của tôi</h2>${button('Xuất CSV','exportFinance')}</div><div class="tablewrap" id="txTable">${txTable(financeTx())}</div></section>`;
