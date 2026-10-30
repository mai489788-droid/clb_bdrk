/* Shared action styling and feedback for both initial and filtered content. */
Object.assign(iconPaths,{
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
 save:'<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 undo:'<path d="M3 10h11a6 6 0 0 1 0 12M3 10l5-5m-5 5 5 5" transform="translate(0 -3)"/>',
 settings:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
 list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h1m-1 7h1m-1 7h1"/>',
 previous:'<path d="m15 5-7 7 7 7"/>'
});
const actionIcons={
 profileForm:'edit',income:'plus',expense:'plus',resultForm:'edit',duesForm:'edit',
 approveRequest:'check',approveFund:'check',rejectRequest:'close',rejectFund:'close',
 deleteMember:'trash',deleteTx:'trash',withdrawRequest:'undo',
 exportMembers:'download',exportFinance:'download',exportDues:'download',exportBackup:'download',downloadCalendar:'download',
 restoreBackup:'undo',restorePreviousBackup:'undo',backupCommit:'undo',
 fundSettings:'settings',openFund:'finance',submitFund:'upload',copyMemo:'copy',
 eventDetail:'arrow',requestDetail:'arrow',reviewFund:'arrow',memberDetail:'arrow',
 memberReceipts:'receipt',receipt:'receipt',unassignedReceipts:'receipt',
 rsvpYes:'check',rsvpNo:'close',requestForEvent:'requests',close:'close',
 monthPrev:'previous',monthNext:'arrow',memberClearFilters:'close',mediaTask:'plus'
};
iconPaths.receipt=iconPaths.requests;
const formButtonLabels={
 'Thêm thành viên':'Thêm thành viên','Chỉnh sửa thành viên':'Lưu thành viên','Chỉnh sửa hồ sơ cá nhân':'Lưu hồ sơ',
 'Tạo buổi đá':'Tạo buổi đá','Sửa lịch hoạt động':'Lưu lịch hoạt động','Lưu kết quả trận đấu':'Lưu kết quả',
 'Gửi đơn xin vắng':'Gửi đơn xin vắng','Sửa đơn xin vắng':'Lưu đơn xin vắng','Tạo thông báo':'Gửi thông báo',
 'Cấu hình nộp quỹ':'Lưu cấu hình','Gửi xác nhận nộp quỹ':'Gửi xác nhận',
 'Ghi khoản thu':'Ghi khoản thu','Ghi khoản chi':'Ghi khoản chi','Sửa giao dịch':'Lưu giao dịch',
 'Thêm sân bóng':'Thêm sân bóng','Cập nhật sân bóng':'Lưu sân bóng',
 'Thêm khoản dự trù':'Thêm khoản dự trù','Sửa khoản dự trù':'Lưu dự trù',
 'Thêm đầu việc':'Thêm công việc','Cập nhật đầu việc':'Lưu công việc',
 'Tạo bài viết':'Lưu bài viết','Chỉnh sửa bài viết':'Lưu bài viết'
};
function decorateControls(root=document){
 root.querySelectorAll('button').forEach(control=>{if(!control.hasAttribute('type'))control.type=control.closest('form')&&!control.dataset.action?'submit':'button'});
 root.querySelectorAll('.btn,button.link,.dialoghead button,[data-action="monthPrev"],[data-action="monthNext"],[data-action="memberView"]').forEach(control=>{
  const actionName=control.dataset.action||'',id=control.dataset.id;
  const editActions=['memberForm','eventForm','requestForm','taskForm','venueForm','budgetForm','postForm','txForm'];
  let symbol=editActions.includes(actionName)?(id?'edit':'plus'):actionIcons[actionName];
  if(actionName==='toggleNotice')symbol=control.closest('.is-complete')?'undo':'check';
  if(actionName==='memberView')symbol=id==='cards'?'dashboard':'list';
  if(control.tagName==='A'&&control.target==='_blank')symbol='external';
  if(control.closest('.dialoghead')&&actionName==='close'){control.innerHTML=icon('close');control.title='Đóng';control.classList.add('icon-button')}
  if(['monthPrev','monthNext'].includes(actionName)){control.innerHTML=icon(symbol);control.classList.add('icon-button');control.title=control.getAttribute('aria-label')}
  if(symbol){
   // Remove old text glyphs while preserving labels, existing icons and badges.
   control.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.textContent=node.textContent.replace(/^[\s＋↓↗✓☷▦]+/u,'').replace(/\s*[→↗]\s*$/u,'')});
   control.querySelectorAll('span[aria-hidden="true"]').forEach(node=>{if(/^[↗→]$/.test(node.textContent.trim()))node.remove()});
   if(!control.querySelector('svg'))control.insertAdjacentHTML('afterbegin',icon(symbol));
  }
  if(control.classList.contains('link')&&symbol)control.classList.add('control-link');
  if(['approveRequest','approveFund'].includes(actionName))control.classList.add('success');
  if(['deleteMember','deleteTx','withdrawRequest','withdrawFund','rejectRequest','rejectFund'].includes(actionName))control.classList.add('danger');
  if(['rsvpYes','rsvpNo'].includes(actionName)){
   const selected=db.events.find(event=>event.id===id)?.rsvps[userId]===(actionName==='rsvpYes'?'Tham gia':'Không tham gia');
   control.classList.remove('primary');control.classList.add('rsvp-choice');control.classList.toggle('is-selected',selected);control.setAttribute('aria-pressed',String(selected));
  }
  if(editActions.includes(actionName)&&id&&!control.hasAttribute('aria-label')){
   const recordTitle=control.closest('.row,tr,.venue-card')?.querySelector('b,h3')?.textContent.trim();
   if(recordTitle)control.setAttribute('aria-label','Chỉnh sửa: '+recordTitle);
  }
 });
 root.querySelectorAll('.filter-chips button').forEach(control=>control.setAttribute('aria-pressed',String(control.classList.contains('active'))));
 const submit=root.querySelector('#editForm [type="submit"]');
 if(submit&&!submit.dataset.labeled){
  const label=formButtonLabels[$('#dialogTitle')?.textContent]||'Lưu thay đổi';
  submit.innerHTML=icon(/^(Gửi|Tạo thông báo)/.test(label)?'upload':'save')+'<span>'+label+'</span>';submit.dataset.labeled='true';
 }
 root.querySelectorAll('.quick button').forEach(control=>{
  const symbol={gotoEvents:'events',gotoMembers:'members',gotoProfile:'profile',income:'plus',expense:'finance',gotoFinance:'finance',gotoRequests:'requests'}[control.dataset.action];
  if(symbol&&control.querySelector('b'))control.querySelector('b').innerHTML=icon(symbol);
 });
}
const bindBeforeControls=bindBase;
bindBase=function(root=document){bindBeforeControls(root);decorateControls(root)};
$('#modal').addEventListener('cancel',event=>{
 if($('#editForm')?.dataset.saving){event.preventDefault();toast('Đang lưu thông tin, vui lòng đợi trong giây lát.')}
});
const actionBeforeControls=action;
action=function(a,id){
 if(a==='close'&&$('#editForm')?.dataset.saving)return;
 if(a==='copyMemo')return copyTransferMemo();
 return actionBeforeControls(a,id);
};
async function copyTransferMemo(){
 const control=document.querySelector('[data-action="copyMemo"]');if(!me()||control?.disabled)return;
 const label=control?.innerHTML;if(control){control.disabled=true;control.setAttribute('aria-busy','true')}
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(transferMemo());
  if(control?.isConnected){control.removeAttribute('aria-busy');control.innerHTML=icon('check')+' Đã sao chép';control.classList.add('is-copied');setTimeout(()=>{if(control.isConnected){control.innerHTML=label;control.classList.remove('is-copied');control.disabled=false}},2000)}
  toast('Đã sao chép nội dung chuyển khoản.');
 }catch{
  if(control){control.disabled=false;control.removeAttribute('aria-busy')}
  modal('Sao chép nội dung chuyển khoản',`${field('Chọn nội dung bên dưới để sao chép','copyText',transferMemo())}<p class="muted">Trình duyệt chưa cho phép sao chép tự động. Nhấn giữ nội dung hoặc dùng Ctrl/Cmd + C.</p><div class="actions">${button('Đóng','close')}</div>`);$('#f-copyText').readOnly=true;$('#f-copyText').select();
 }
}
