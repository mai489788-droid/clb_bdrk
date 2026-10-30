/* Complete lifecycle checks for club activities, absence requests and fund bills. */
function eventStart(event){return Date.parse(`${event.date}T${event.time||'00:00'}:00+07:00`)}
function eventAcceptsResponse(event){return !!event&&eventStart(event)>Date.now()}
function notifyReviewers(type,id,title,content){
 const reviewerRoles=type==='fund'?[roles[0],roles[4]]:[roles[0],roles[1]];
 db.members.filter(m=>reviewerRoles.includes(assignedRole(m))&&!m.locked&&m.status!=='Đã rời CLB').forEach(m=>{
  notify(title,content,m.id);db.notifications[0].related={type,id};
 });
}
function completeRelatedNotices(type,id){
 db.notifications.filter(n=>n.related?.type===type&&n.related.id===id).forEach(n=>{
  n.completed??=[];if(n.member!=='all'&&!n.completed.includes(n.member))n.completed.push(n.member);
 });
}
const readFileBeforeValidation=readFile;
readFile=async file=>{
 const data=await readFileBeforeValidation(file);if(!data)return '';
 const picture=new Image();picture.src=data;
 try{await picture.decode()}catch{throw Error('Tệp không phải ảnh hợp lệ hoặc đã bị hỏng. Hãy chọn một ảnh khác.')}
 if(!picture.naturalWidth||!picture.naturalHeight||picture.naturalWidth*picture.naturalHeight>30000000)throw Error('Ảnh quá lớn. Hãy chọn ảnh có độ phân giải dưới 30 triệu điểm ảnh.');
 return data;
};
function bindSafeImagePreview(input,preview,remove,read,empty){
 const error=$('#formError');let sequence=0;
 input.onchange=async()=>{
  const current=++sequence,file=input.files[0];if(!file)return;
  try{const data=await read(file);if(!preview.isConnected||current!==sequence)return;preview.innerHTML=`<img src="${esc(data)}" alt="Ảnh xem trước">`;remove.checked=false;error.textContent=''}
  catch(problem){if(!error.isConnected||current!==sequence)return;input.value='';error.textContent=problem.message}
 };
 remove.onchange=()=>{if(remove.checked){sequence++;input.value='';preview.textContent=empty()}};
}
bindAvatarPreview=function(){
 if($('#f-avatar'))bindSafeImagePreview($('#f-avatar'),$('#avatarPreview'),$('#f-removeAvatar'),readAvatar,()=>initials($('#f-name').value||me().name));
};
const fundSettingsBeforeQuality=fundSettingsForm;
fundSettingsForm=function(){fundSettingsBeforeQuality();if(isAdmin()&&$('#f-qr'))bindSafeImagePreview($('#f-qr'),$('#qrPreview'),$('#f-removeQr'),readFile,()=>'Chưa có ảnh QR')};

const eventFormBeforeQuality=eventForm;
eventForm=function(id){
 if(id&&!db.events.some(event=>event.id===id))return toast('Hoạt động không còn trong danh sách.');
 eventFormBeforeQuality(id);const editor=$('#editForm');if(!can('events')||!editor)return;
 const submit=editor.onsubmit;
 editor.onsubmit=event=>{
  const start=eventStart({date:$('#f-date').value,time:$('#f-time').value}),end=start+Number($('#f-duration').value||90)*60000;
  const conflict=db.events.find(other=>other.id!==id&&start<eventStart(other)+Number(other.duration||90)*60000&&end>eventStart(other));
  if(conflict){event.preventDefault();$('#formError').textContent='Trùng giờ với “'+conflict.title+'” ('+date(conflict.date)+' · '+conflict.time+'). Hãy chọn giờ khác.';return}
  return submit(event);
 };
};
const eventDetailBeforeQuality=eventDetail;
eventDetail=function(id){
 const event=db.events.find(item=>item.id===id);if(!event)return toast('Không tìm thấy hoạt động.');
 eventDetailBeforeQuality(id);
 if(!eventAcceptsResponse(event)){
  const actions=$('#modal [data-action="rsvpYes"]')?.parentElement;
  if(actions)actions.outerHTML='<p class="notice">Hoạt động đã bắt đầu. Đã đóng xác nhận tham gia và gửi đơn xin vắng; ban quản lý vẫn có thể cập nhật điểm danh, kết quả.</p>';
 }
};

requestForm=function(id,eventId){
 if(!me())return;
 const request=db.requests.find(item=>item.id===id);
 if(id&&(!request||request.member!==userId||request.status!=='Chờ duyệt'))return toast('Chỉ có thể sửa đơn của bạn khi đang chờ duyệt.');
 const events=db.events.filter(eventAcceptsResponse);
 if(request&&!events.some(event=>event.id===request.event))return toast('Hoạt động đã bắt đầu, không thể sửa đơn xin vắng.');
 if(!events.length)return toast('Chưa có hoạt động sắp tới để xin vắng.');
 modal(request?'Sửa đơn xin vắng':'Gửi đơn xin vắng',form(`${select('Buổi đá / Sự kiện','event',events.map(event=>[event.id,event.title+' · '+date(event.date)+' '+event.time]),request?.event||eventId)}${area('Lý do xin vắng','reason',request?.reason||'',true)}${area('Ghi chú bổ sung','note',request?.note||'')}${field('Minh chứng (ảnh, tối đa 2 MB)','attachment','','file',false)}<p class="muted">Bạn có thể rút đơn trước giờ hoạt động bắt đầu. Lịch sử đơn được giữ để đối chiếu.</p>`));
 $('#f-attachment').accept='image/png,image/jpeg,image/webp,image/gif';
 handleForm(async(data,editor)=>{
  const activity=db.events.find(event=>event.id===data.event);
  if(!eventAcceptsResponse(activity))throw Error('Hoạt động đã bắt đầu hoặc không còn tồn tại.');
  if(db.requests.some(other=>other.id!==id&&other.member===userId&&other.event===data.event&&['Chờ duyệt','Đã duyệt'].includes(other.status)))throw Error('Bạn đã có đơn đang chờ hoặc đã được duyệt cho hoạt động này.');
  const attachment=await readFile(editor.attachment.files[0]);
  const value={event:data.event,reason:data.reason.trim(),note:data.note.trim(),date:today(),attachment:attachment||request?.attachment||''};
  const next=request||{id:uid(),member:userId,status:'Chờ duyệt',reply:'',history:[]};Object.assign(next,value);
  if(!request)db.requests.unshift(next);
  else completeRelatedNotices('request',next.id);
  notifyReviewers('request',next.id,request?'Đơn xin vắng đã cập nhật':'Có đơn xin vắng cần duyệt',`${me().name} · ${activity.title} · ${date(activity.date)}`);
 });
};
requestDetail=function(id){
 const request=db.requests.find(item=>item.id===id);if(!request||!can('requests')&&request.member!==userId)return;
 const activity=db.events.find(event=>event.id===request.event),open=eventAcceptsResponse(activity),own=request.member===userId;
 modal('Chi tiết đơn xin vắng',`<p><b>${esc(name(request.member))}</b> · ${esc(eventName(request.event))}</p><p>${esc(request.reason)}</p><p>${esc(request.note||'')}</p>${request.attachment?`<img class="receipt-preview" src="${esc(request.attachment)}" alt="Minh chứng xin vắng">`:''}${tag(request.status)}${request.reply?`<p>Phản hồi: ${esc(request.reply)}</p>`:''}${request.history.map(item=>`<p class="muted">${esc(item.date)} · ${esc(item.by)} · ${esc(item.status)}</p>`).join('')}${!open?'<p class="notice">Hoạt động đã bắt đầu. Đơn được giữ để đối chiếu lịch sử.</p>':''}${open&&request.status==='Chờ duyệt'&&can('requests')?`${area('Lời nhắn phản hồi','reply')}<div class="actions">${button('Từ chối','rejectRequest',id)}${button('Duyệt đơn','approveRequest',id,true)}</div>`:''}${open&&own&&['Chờ duyệt','Đã duyệt'].includes(request.status)?`<div class="actions">${button('Rút đơn xin vắng','withdrawRequest',id)}${request.status==='Chờ duyệt'?button('Sửa đơn','requestForm',id,true):''}</div>`:''}`);
};
function decideRequest(id,approve){
 if(!can('requests'))return;
 const request=db.requests.find(item=>item.id===id);if(!request||request.status!=='Chờ duyệt')return;
 const activity=db.events.find(event=>event.id===request.event);if(!eventAcceptsResponse(activity))return toast('Hoạt động đã bắt đầu, không thể duyệt hoặc từ chối đơn mới.');
 const reply=$('#f-reply')?.value.trim()||'';if(!approve&&!reply)return toast('Vui lòng nhập lý do từ chối.');
 request.status=approve?'Đã duyệt':'Từ chối';request.reply=reply;
 request.history.push({date:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),by:me().name,status:request.status});
 if(approve)activity.rsvps[request.member]='Không tham gia';
 completeRelatedNotices('request',id);notify('Đơn xin vắng '+request.status.toLowerCase(),activity.title+(reply?' · '+reply:''),request.member);
 save();$('#modal').close();render();toast('Đã xử lý đơn và gửi thông báo.');
}
function withdrawAbsence(id){
 const request=db.requests.find(item=>item.id===id);if(!request||request.member!==userId||!['Chờ duyệt','Đã duyệt'].includes(request.status))return;
 const activity=db.events.find(event=>event.id===request.event);if(!eventAcceptsResponse(activity))return toast('Đã qua giờ bắt đầu, không thể rút đơn này.');
 if(!confirm('Rút đơn xin vắng? Lịch sử vẫn được giữ và bạn có thể xác nhận tham gia lại.'))return;
 if(request.status==='Đã duyệt'&&activity.rsvps[userId]==='Không tham gia')delete activity.rsvps[userId];
 request.status='Đã rút';request.history.push({date:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),by:me().name,status:'Đã rút'});
 completeRelatedNotices('request',id);notifyReviewers('request',id,'Thành viên đã rút đơn xin vắng',`${me().name} · ${activity.title}`);
 save();$('#modal').close();render();toast('Đã rút đơn. Bạn có thể xác nhận tham gia hoặc gửi đơn mới.');
}

const reviewFundBeforeQuality=reviewFund;
reviewFund=function(id){
 const entry=db.fundSubmissions.find(item=>item.id===id);reviewFundBeforeQuality(id);
 if(entry?.member===userId&&entry.status==='Chờ xác nhận'&&$('#modal').open){
  $('#modal .fund-review').insertAdjacentHTML('beforeend',`<div class="actions">${button('Rút xác nhận để gửi lại','withdrawFund',id)}</div><p class="muted">Gửi nhầm bill? Bạn có thể rút xác nhận khi chưa được duyệt, rồi gửi bản đúng.</p>`);bind($('#modal'));
 }
};
function withdrawFund(id){
 const entry=db.fundSubmissions.find(item=>item.id===id);if(!entry||entry.member!==userId||entry.status!=='Chờ xác nhận')return;
 if(!confirm('Rút xác nhận nộp quỹ này để gửi lại? Khoản tiền đã chuyển tại ngân hàng không bị thay đổi.'))return;
 entry.status='Đã rút';entry.withdrawnAt=new Date().toISOString();completeRelatedNotices('fund',id);
 save();$('#modal').close();render();toast('Đã rút xác nhận. Hãy gửi lại bill đúng tại kỳ thu hiện tại.');
}
const actionBeforeQuality=action;
action=function(a,id){
 try{
  if(a==='approveRequest'||a==='rejectRequest')return decideRequest(id,a==='approveRequest');
  if(a==='withdrawRequest')return withdrawAbsence(id);
  if(a==='withdrawFund')return withdrawFund(id);
  if(a==='rsvpYes'||a==='rsvpNo'){
   const activity=db.events.find(event=>event.id===id);if(!eventAcceptsResponse(activity))return toast('Hoạt động đã bắt đầu, không thể thay đổi xác nhận tham gia.');
   if(a==='rsvpYes'&&db.requests.some(request=>request.member===userId&&request.event===id&&['Chờ duyệt','Đã duyệt'].includes(request.status)))return toast('Bạn đang có đơn xin vắng. Hãy rút đơn trước khi xác nhận tham gia.');
  }
  const recordTypes={memberForm:'members',eventForm:'events',taskForm:'tasks',venueForm:'venues',budgetForm:'budget',duesForm:'members',postForm:'posts',txForm:'transactions',resultForm:'events'};
  if(id&&recordTypes[a]&&!db[recordTypes[a]].some(record=>record.id===id))return toast('Mục này không còn trong dữ liệu. Hãy tải lại danh sách.');
  return actionBeforeQuality(a,id);
 }catch(error){render();toast(error.message)}
};
actionIcons.withdrawFund='undo';
render();
