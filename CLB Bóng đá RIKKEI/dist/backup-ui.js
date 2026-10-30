// Backups stay on this device. No upload or remote request is made by this module.
const BACKUP_PREVIOUS_KEY=DATA_KEY+'-before-restore';
const BACKUP_MAX_BYTES=8*1024*1024;
let pendingClubBackup=null;

/** Validate exports from this website, retaining history for deleted members. */
function validateClubBackup(data){
  const fail=message=>{throw Error(message)};
  const object=(value,path)=>{if(!value||typeof value!=='object'||Array.isArray(value))fail(path+': cần một đối tượng dữ liệu.');};
  const string=(value,path,required=false)=>{if(typeof value!=='string'||value.length>100000||(required&&!value.trim()))fail(path+': nội dung không hợp lệ.');};
  const array=(value,path)=>{if(!Array.isArray(value)||value.length>20000)fail(path+': danh sách bị thiếu hoặc quá lớn.');};
  const number=(value,path,min=0)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>Number.MAX_SAFE_INTEGER)fail(path+': số không hợp lệ.');};
  const bool=(value,path)=>{if(typeof value!=='boolean')fail(path+': phải là đúng hoặc sai.');};
  const oneOf=(value,values,path)=>{if(!values.includes(value))fail(path+': trạng thái không hợp lệ.');};
  const id=(value,path)=>{if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)||['constructor','prototype','__proto__'].includes(value))fail(path+': mã dữ liệu không hợp lệ.');};
  const day=(value,path,optional=false)=>{
    if(optional&&(value===''||value===null||value===undefined))return;
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail(path+': ngày phải theo dạng YYYY-MM-DD.');
    const parsed=new Date(value+'T12:00:00Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)fail(path+': ngày không tồn tại.');
  };
  const fields=(record,keys,path)=>keys.split(' ').filter(Boolean).forEach(key=>string(record[key],path+'.'+key));
  const optionalFields=(record,keys,path)=>keys.split(' ').filter(Boolean).forEach(key=>{if(key in record)string(record[key],path+'.'+key);});
  const same=(a,b)=>{
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
  };
  const walk=(value,path,depth=0)=>{
    if(depth>24)fail('Tệp có cấu trúc lồng nhau quá sâu.');
    if(value===null)return;
    if(typeof value==='number'&&!Number.isFinite(value))fail(path+': số không hợp lệ.');
    if(typeof value==='string'&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(path+': chứa ký tự điều khiển không hợp lệ.');
    if(typeof value!=='object')return;
    for(const [key,item] of Object.entries(value)){
      if(['__proto__','constructor','prototype'].includes(key))fail('Tệp chứa khóa dữ liệu không được hỗ trợ: '+key+'.');
      walk(item,path+'.'+key,depth+1);
    }
  };
  object(data,'Bản sao lưu');
  walk(data,'Dữ liệu');
  if(data.schemaVersion!==2)fail('Chỉ nhận bản sao lưu JSON phiên bản 2 được xuất từ website này.');
  object(data.source,'Thông tin nguồn');
  if(data.source.spreadsheetId!==seed.source.spreadsheetId||data.source.sha256!==seed.source.sha256)fail('Bản sao lưu thuộc bảng tính hoặc bản chụp nguồn khác. Hãy chọn bản xuất từ website hiện tại.');
  for(const key of ['source','finance','summary','rules','warnings']){
    if(!same(data[key],seed[key]))fail('Phần '+({source:'thông tin nguồn',finance:'tổng quỹ nguồn',summary:'tổng hợp nguồn',rules:'nội quy nguồn',warnings:'ghi chú nguồn'}[key])+' không khớp bản chụp Google Sheets. Không thể khôi phục tệp này.');
  }
  const listKeys=['members','dues','transactions','events','requests','posts','notifications','tasks','venues','budget','receipts'];
  const sets={};
  for(const key of listKeys){
    array(data[key],key);sets[key]=new Set();
    data[key].forEach((record,index)=>{
      const path=key+'['+(index+1)+']';object(record,path);id(record.id,path+'.id');
      if(sets[key].has(record.id))fail(path+': mã bị trùng trong danh sách.');
      sets[key].add(record.id);
      if(record.source!==undefined){
        object(record.source,path+'.source');
        if(record.source.sheet!==undefined)string(record.source.sheet,path+'.source.sheet');
        for(const field of ['row','sheetIndex'])if(record.source[field]!==undefined){
          number(record.source[field],path+'.source.'+field,1);
          if(!Number.isInteger(record.source[field]))fail(path+': vị trí trong bảng nguồn không hợp lệ.');
        }
      }
      if(record.localUpdatedAt!==undefined){
        string(record.localUpdatedAt,path+'.localUpdatedAt');
        const stamp=new Date(record.localUpdatedAt);
        if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.localUpdatedAt)||!Number.isFinite(stamp.getTime())||stamp.toISOString()!==record.localUpdatedAt)fail(path+': thời điểm cập nhật không hợp lệ.');
      }
    });
  }
  const orphanMembers=new Set();
  const memberRef=(value,path,optional=false,allowAll=false)=>{
    if(optional&&(value===''||value===null))return;
    if(allowAll&&value==='all')return;
    id(value,path);
    if(!sets.members.has(value)&&!accessAccounts.some(account=>account.id===value))orphanMembers.add(value);
  };
  const eventRef=(value,path,optional=false)=>{
    if(optional&&value==='')return;
    id(value,path);if(!sets.events.has(value))fail(path+': không tìm thấy hoạt động được liên kết.');
  };
  const imagePaths=new Set(seed.receipts.map(receipt=>receipt.path));
  const picture=(value,path)=>{
    if(value===''||value===undefined)return;
    if(typeof value!=='string')fail(path+': ảnh không hợp lệ.');
    if(imagePaths.has(value))return;
    if(!/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))fail(path+': chỉ nhận ảnh đính kèm PNG, JPEG, WEBP, GIF hoặc ảnh bill có sẵn.');
  };
  const receipts=(value,path)=>{
    array(value,path);
    const seen=new Set();
    value.forEach((receipt,index)=>{
      const p=path+'['+(index+1)+']';object(receipt,p);id(receipt.id,p+'.id');
      if(seen.has(receipt.id))fail(p+': ảnh bill bị trùng mã.');seen.add(receipt.id);
      picture(receipt.path,p+'.path');
      if(!receipt.path)fail(p+': thiếu đường dẫn ảnh bill.');
      memberRef(receipt.member,p+'.member',true);
      string(receipt.assignment,p+'.assignment');
      if(receipt.source!==undefined){object(receipt.source,p+'.source');string(receipt.source.sheet,p+'.source.sheet');}
    });
  };
  receipts(data.receipts,'receipts');
  for(const m of data.members){
    const p='Thành viên '+m.id;
    if(m.id.startsWith('access-')||m.id==='all')fail(p+': mã này dành riêng cho hệ thống.');
    fields(m,'name unit email phone role department status joined sourcePosition duesStatus note note2',p);
    if(!m.name.trim()||/[<>]/.test(m.name))fail(p+': họ tên không hợp lệ.');
    optionalFields(m,'className managementRole participationStatus bio',p);picture(m.avatar,p+'.avatar');
    if(m.credential!==undefined){object(m.credential,p+'.credential');if(!/^[a-f0-9]{32}$/.test(m.credential.salt)||!/^[a-f0-9]{64}$/.test(m.credential.hash))fail(p+': thông tin mật khẩu không hợp lệ.');}
    oneOf(m.role,roles,p+'.role');
    if(m.roleAssignment!==undefined){
      object(m.roleAssignment,p+'.roleAssignment');oneOf(m.roleAssignment.role,roles,p+'.roleAssignment.role');
      if(m.roleAssignment.role!==m.role)fail('Chức vụ được cấp không khớp hồ sơ thành viên.');
      memberRef(m.roleAssignment.by,p+'.roleAssignment.by');string(m.roleAssignment.at,p+'.roleAssignment.at');
      if(!Number.isFinite(Date.parse(m.roleAssignment.at)))fail('Thời điểm cấp chức vụ không hợp lệ.');
    }
    oneOf(m.status,['Sẵn sàng','Chờ xác nhận','Tạm nghỉ','Đã rời CLB'],p+'.status');
    oneOf(m.duesStatus,['Đã đóng','Chưa đóng'],p+'.duesStatus');bool(m.locked,p+'.locked');day(m.joined,p+'.joined',true);
    if(m.sourceIndex!==undefined){number(m.sourceIndex,p+'.sourceIndex',1);if(!Number.isInteger(m.sourceIndex))fail(p+': số thứ tự không hợp lệ.');}
    array(m.positions,p+'.positions');m.positions.forEach(value=>string(value,p+'.positions'));receipts(m.receipts,p+'.receipts');
    for(const receipt of m.receipts){if(receipt.member!==m.id)fail(p+': ảnh bill gắn với thành viên khác.');}
  }
  for(const due of data.dues){
    const p='Đóng quỹ '+due.id;
    memberRef(due.member,p+'.member');oneOf(due.status,['Đã đóng','Chưa đóng'],p+'.status');
    string(due.periodLabel,p+'.periodLabel');number(due.expectedAmount,p+'.expectedAmount');
    if(due.paidAmount!==null)number(due.paidAmount,p+'.paidAmount');day(due.paidDate,p+'.paidDate',true);receipts(due.receipts,p+'.receipts');
    for(const receipt of due.receipts){if(receipt.member!==due.member)fail(p+': ảnh bill gắn với thành viên khác.');}
  }
  for(const e of data.events){
    const p='Hoạt động '+e.id;fields(e,'title opponent time place owner note result',p);day(e.date,p+'.date');
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(e.time))fail(p+': giờ phải theo dạng HH:MM.');
    if(e.duration!==undefined){
      if(!['string','number'].includes(typeof e.duration)||String(Number(e.duration))!==String(e.duration)||!Number.isInteger(Number(e.duration))||Number(e.duration)<15||Number(e.duration)>360||Number(e.duration)%15!==0)fail(p+': thời lượng phải từ 15 đến 360 phút và là bội số của 15.');
    }
    optionalFields(e,'lineup scorers afterNote',p);object(e.rsvps,p+'.rsvps');object(e.attendance,p+'.attendance');
    for(const [member,status] of Object.entries(e.rsvps)){memberRef(member,p+'.rsvps');oneOf(status,['Tham gia','Không tham gia'],p+'.rsvps');}
    for(const [member,present] of Object.entries(e.attendance)){memberRef(member,p+'.attendance');bool(present,p+'.attendance');}
  }
  for(const t of data.transactions){
    const p='Giao dịch '+t.id;fields(t,'content category owner',p);oneOf(t.type,['Thu','Chi'],p+'.type');
    number(t.amount,p+'.amount',Number.MIN_VALUE);day(t.date,p+'.date');memberRef(t.member,p+'.member',true);picture(t.receipt,p+'.receipt');optionalFields(t,'lastEditor',p);
  }
  const activeRequests=new Set();
  for(const r of data.requests){
    const p='Đơn xin vắng '+r.id;fields(r,'reason note reply',p);day(r.date,p+'.date');memberRef(r.member,p+'.member');eventRef(r.event,p+'.event');
    oneOf(r.status,['Chờ duyệt','Đã duyệt','Từ chối','Đã rút'],p+'.status');picture(r.attachment,p+'.attachment');array(r.history,p+'.history');
    if(['Chờ duyệt','Đã duyệt'].includes(r.status)){const key=r.member+'|'+r.event;if(activeRequests.has(key))fail('Thành viên có nhiều đơn đang chờ/đã duyệt cho cùng hoạt động.');activeRequests.add(key);}
    r.history.forEach(h=>{object(h,p+'.history');fields(h,'date by status',p+'.history');oneOf(h.status,['Đã duyệt','Từ chối','Đã rút'],p+'.history.status');});
  }
  for(const post of data.posts){const p='Bài viết '+post.id;fields(post,'title content',p);day(post.date,p+'.date');oneOf(post.status,['Bản nháp','Chờ duyệt','Đã đăng'],p+'.status');picture(post.image,p+'.image');}
  for(const n of data.notifications){
    const p='Thông báo '+n.id;fields(n,'title content',p);day(n.date,p+'.date');memberRef(n.member,p+'.member',false,true);array(n.read,p+'.read');n.read.forEach(member=>memberRef(member,p+'.read'));if(n.completed!==undefined){array(n.completed,p+'.completed');n.completed.forEach(member=>memberRef(member,p+'.completed'));}
    if(n.related!==undefined){object(n.related,p+'.related');oneOf(n.related.type,['request','fund'],p+'.related.type');id(n.related.id,p+'.related.id');}
  }
  for(const task of data.tasks){
    const p='Công việc '+task.id;fields(task,'title department owner deadlineText note',p);day(task.deadline,p+'.deadline',true);eventRef(task.event,p+'.event',true);
    oneOf(task.status,['Chưa làm','Đang làm','Hoàn thành'],p+'.status');optionalFields(task,'sourceStatus deadlineDisplayFormat',p);
  }
  for(const venue of data.venues){
    const p='Sân bóng '+venue.id;fields(venue,'name weekday time place',p);if(venue.price!==null)number(venue.price,p+'.price');
    if(/[<>]/.test(venue.time))fail(p+': khung giờ không hợp lệ.');oneOf(venue.survey,['Chưa Khảo Sát','Đang khảo sát','Đã khảo sát'],p+'.survey');bool(venue.confirmed,p+'.confirmed');
  }
  for(const budget of data.budget){
    const p='Dự trù '+budget.id;fields(budget,'title unit frequency owner note',p);number(budget.quantity,p+'.quantity',Number.MIN_VALUE);number(budget.unitPrice,p+'.unitPrice');number(budget.amount,p+'.amount');
    if(Math.abs(budget.amount-budget.quantity*budget.unitPrice)>0.01)fail(p+': thành tiền không khớp số lượng × đơn giá.');
  }
  const emails=new Set();
  for(const m of data.members){if(m.email){const email=m.email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||emails.has(email))fail('Email thành viên không hợp lệ hoặc bị trùng.');emails.add(email);}}
  if(data.emailLoginVersion!==undefined&&data.emailLoginVersion!==1)fail('Phiên bản tài khoản không được hỗ trợ.');
  if(data.emailLoginVersion===1&&!data.members.some(m=>m.role===roles[0]&&m.email&&!m.locked&&m.status!=='Đã rời CLB'))fail('Bản sao lưu phải có ít nhất một tài khoản quản trị đang hoạt động với email.');
  if(data.fundSettings!==undefined){
    const f=data.fundSettings,p='Cấu hình nộp quỹ';object(f,p);id(f.periodId,p+'.periodId');fields(f,'periodLabel bankName accountNumber accountName instructions',p);number(f.amount,p+'.amount',1);if(!Number.isSafeInteger(f.amount))fail('Mức quỹ phải là số nguyên.');day(f.deadline,p+'.deadline',true);picture(f.qrImage,p+'.qrImage');bool(f.enabled,p+'.enabled');
    if(f.enabled&&(!f.qrImage||!f.bankName.trim()||!f.accountName.trim()||!f.accountNumber.trim()))fail('Kỳ thu đang mở nhưng thiếu thông tin nhận quỹ.');
  }
  if(data.fundSubmissions!==undefined){
    array(data.fundSubmissions,'Xác nhận nộp quỹ');const paymentIds=new Set(),approvedKeys=new Set(),pendingKeys=new Set();
    for(const s of data.fundSubmissions){
      const p='Xác nhận nộp quỹ';object(s,p);id(s.id,p+'.id');if(paymentIds.has(s.id))fail('Trùng mã xác nhận nộp quỹ.');paymentIds.add(s.id);id(s.periodId,p+'.periodId');memberRef(s.member,p+'.member');fields(s,'periodLabel note reply createdAt reviewer transactionId',p);number(s.amount,p+'.amount',1);number(s.expectedAmount,p+'.expectedAmount',1);if(!Number.isSafeInteger(s.amount)||!Number.isSafeInteger(s.expectedAmount))fail('Số tiền xác nhận không hợp lệ.');day(s.paidDate,p+'.paidDate');picture(s.receipt,p+'.receipt');if(!s.receipt)fail('Xác nhận nộp quỹ thiếu ảnh bill.');oneOf(s.status,['Chờ xác nhận','Đã xác nhận','Từ chối','Đã rút'],p+'.status');
      if(s.status==='Chờ xác nhận'){const key=s.member+'|'+s.periodId;if(pendingKeys.has(key))fail('Có hai xác nhận đang chờ cho cùng thành viên và kỳ thu.');pendingKeys.add(key);}
      if(s.status!=='Đã xác nhận'&&s.transactionId)fail('Xác nhận chưa duyệt không được liên kết khoản thu.');
      if(s.reviewer)memberRef(s.reviewer,p+'.reviewer');
      if(s.status==='Đã xác nhận'){
        const key=s.member+'|'+s.periodId;if(approvedKeys.has(key))fail('Có hai xác nhận đã duyệt cho cùng thành viên và kỳ thu.');approvedKeys.add(key);
        const tx=data.transactions.filter(t=>t.sourcePaymentId===s.id);if(tx.length!==1||tx[0].id!==s.transactionId||tx[0].amount!==s.amount||tx[0].member!==s.member||tx[0].type!=='Thu')fail('Xác nhận nộp quỹ không khớp khoản thu liên kết.');
      }
    }
    for(const key of pendingKeys)if(approvedKeys.has(key))fail('Một kỳ thu có cả xác nhận đã duyệt và xác nhận đang chờ của cùng thành viên.');
    for(const tx of data.transactions){if(tx.sourcePaymentId!==undefined){id(tx.sourcePaymentId,'Mã xác nhận trong giao dịch');if(!data.fundSubmissions.some(s=>s.id===tx.sourcePaymentId&&s.status==='Đã xác nhận'))fail('Giao dịch tham chiếu xác nhận nộp quỹ không tồn tại.');}}
  }
  if(typeof ensureAccountData==='function')ensureAccountData(data);
  return {data,orphanMemberCount:orphanMembers.size};
}

function backupTools(){
  if(!isAdmin())return '';
  let hasPrevious=false;try{hasPrevious=!!localStorage.getItem(BACKUP_PREVIOUS_KEY)}catch{}
  return `<section class="panel backup-tools"><div class="panelhead"><h2>Sao lưu & khôi phục</h2><span class="badge gray">Trên thiết bị này</span></div><p>Giữ một bản dữ liệu để chuyển sang trình duyệt khác hoặc khôi phục khi cần. Tệp chứa dữ liệu và ảnh đính kèm hiện có trên website.</p><div class="actions">${button('↓ Tải bản sao lưu','exportBackup')}${button('↑ Khôi phục từ tệp','restoreBackup','',true)}${hasPrevious?button('↶ Bản trước lần khôi phục','restorePreviousBackup'):''}</div><p class="muted">Chỉ nhận tệp JSON do website này xuất, cùng bản chụp Google Sheets ngày ${date(seed.source.snapshotDate)}, tối đa 8 MB. Khôi phục thay thế dữ liệu ở trình duyệt này; bạn được xem trước và xác nhận.</p></section>`;
}

function backupError(message){
  const output=$('#backupError');if(output)output.textContent=message;else toast(message);
}

function previewClubBackup(data,label){
  if(!isAdmin())return;
  const checked=validateClubBackup(data);
  pendingClubBackup={data:checked.data,label,current:JSON.stringify(db),stored:localStorage.getItem(DATA_KEY)};
  const counts=[['members','Thành viên'],['events','Hoạt động'],['tasks','Công việc'],['transactions','Giao dịch'],['requests','Đơn xin vắng'],['posts','Bài viết']];
  modal('Xem trước bản khôi phục',`<div class="backup-preview"><p><b>${esc(label)}</b></p><p class="muted">Cùng bản chụp Google Sheets ngày ${date(data.source.snapshotDate)}. Tổng quỹ và nội quy nguồn đã được đối chiếu.</p><div class="backup-counts">${counts.map(([key,title])=>`<div><b>${db[key].length} → ${data[key].length}</b><span>${title}</span></div>`).join('')}</div><p class="muted">Số bản ghi hiện tại → số bản ghi sau khi khôi phục.</p>${checked.orphanMemberCount?`<div class="notice">Có lịch sử liên quan tới ${checked.orphanMemberCount} thành viên không còn trong danh sách. Các bản ghi này sẽ được giữ nguyên.</div>`:''}<div class="notice">Dữ liệu hiện tại sẽ được thay thế toàn bộ. Website sẽ giữ một bản trước lần khôi phục để bạn có thể quay lại.</div><label class="backup-confirm" for="backupConfirm"><input id="backupConfirm" type="checkbox"> Tôi đã kiểm tra và đồng ý thay thế dữ liệu trên trình duyệt này.</label><p id="backupError" role="alert"></p><div class="actions">${button('Hủy','close')}<button class="btn primary" data-action="backupCommit" disabled>Khôi phục dữ liệu</button></div></div>`);
  bindBackupUI($('#modal'));
}

function bindBackupUI(root=document){
  const input=root.querySelector('#backupFile');
  if(input)input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    backupError('');
    if(file.size>BACKUP_MAX_BYTES){backupError('Tệp vượt quá 8 MB. Hãy chọn bản sao lưu nhỏ hơn.');input.value='';return;}
    input.disabled=true;
    try{
      const text=await file.text();let data;
      try{data=JSON.parse(text)}catch{throw Error('Tệp không phải JSON hợp lệ. Hãy chọn bản sao lưu được xuất từ website.');}
      if(!input.isConnected||!$('#modal').open||!isAdmin())return;
      previewClubBackup(data,file.name);
    }catch(error){backupError(error.message);input.disabled=false;input.value='';}
  };
  const confirmInput=root.querySelector('#backupConfirm');
  if(confirmInput)confirmInput.onchange=()=>{
    const submit=root.querySelector('[data-action="backupCommit"]');if(submit)submit.disabled=!confirmInput.checked;
  };
}

function handleBackupAction(actionName){
  if(actionName==='close'){pendingClubBackup=null;return false;}
  if(!['exportBackup','restoreBackup','restorePreviousBackup','backupCommit'].includes(actionName))return false;
  if(!isAdmin()){toast('Chỉ quản trị viên có thể sao lưu và khôi phục dữ liệu.');return true;}
  if(actionName==='exportBackup'){
    const url=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='rikkei-club-backup-'+today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Đã tải bản sao lưu dữ liệu website.');return true;
  }
  if(actionName==='restoreBackup'){
    pendingClubBackup=null;
    modal('Khôi phục dữ liệu website',`<p>Chọn bản sao lưu JSON để xem trước. Tệp được đọc trực tiếp trên thiết bị này.</p><div class="field"><label for="backupFile">Bản sao lưu JSON · tối đa 8 MB</label><input id="backupFile" type="file" accept=".json,application/json"></div><p class="muted">Khôi phục bản xuất từ website Rikkei FC, cùng bản chụp Google Sheets ngày ${date(seed.source.snapshotDate)}.</p><p id="backupError" role="alert"></p><div class="actions">${button('Hủy','close')}</div>`);
    bindBackupUI($('#modal'));return true;
  }
  if(actionName==='restorePreviousBackup'){
    try{
      const text=localStorage.getItem(BACKUP_PREVIOUS_KEY);if(!text)throw Error('Chưa có bản dữ liệu trước lần khôi phục.');
      const previous=JSON.parse(text);
      previewClubBackup(previous.data,'Bản trước lần khôi phục'+(typeof previous.savedAt==='string'&&Number.isFinite(Date.parse(previous.savedAt))?' · '+new Date(previous.savedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):''));
    }catch(error){toast(error.message||'Không đọc được bản trước lần khôi phục.');}
    return true;
  }
  if(!pendingClubBackup||!$('#backupConfirm')?.checked){backupError('Hãy xem trước và xác nhận bản khôi phục.');return true;}
  try{
    // Do not discard changes made while the review dialog was open, including another tab.
    if(JSON.stringify(db)!==pendingClubBackup.current||localStorage.getItem(DATA_KEY)!==pendingClubBackup.stored)throw Error('Dữ liệu đã thay đổi trong lúc xem trước. Hãy đóng hộp thoại và chọn lại bản khôi phục.');
    const next=validateClubBackup(pendingClubBackup.data).data;
    const serialized=JSON.stringify(next);
    try{
      // Web Storage setItem is atomic for each key. Save the recovery copy first;
      // a quota failure must never replace the in-memory or persisted current data.
      localStorage.setItem(BACKUP_PREVIOUS_KEY,JSON.stringify({savedAt:new Date().toISOString(),data:db}));
      localStorage.setItem(DATA_KEY,serialized);
    }catch{throw Error('Bộ nhớ trình duyệt không đủ hoặc đang bị chặn. Dữ liệu hiện tại chưa bị thay thế. Tải bản sao lưu trước khi thử lại.');}
    db=next;acceptStoredData(serialized);pendingClubBackup=null;$('#modal').close();render();toast('Đã khôi phục. Bản dữ liệu trước đó được giữ tại mục Dữ liệu nguồn.');
  }catch(error){backupError(error.message);}
  return true;
}
