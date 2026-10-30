/* Email accounts, editable profiles and club fund collection. Browser-local prototype. */
const INITIAL_ADMIN_EMAIL='mai489788@gmail.com';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailKey=value=>String(value||'').trim().toLowerCase();
function ensureAccountData(data){
  if(!data.emailLoginVersion){
    const admin=data.members.find(m=>m.id==='gs-member-001');
    if(admin){admin.email=INITIAL_ADMIN_EMAIL;admin.role=roles[0];admin.locked=false}
    data.emailLoginVersion=1;
  }
  data.fundSettings??={periodId:'source-first',periodLabel:'Quỹ tháng đầu',amount:seed.finance.monthlyFee,deadline:'',bankName:'',accountNumber:'',accountName:'',qrImage:'',instructions:'Ghi đúng nội dung chuyển khoản và gửi xác nhận sau khi nộp quỹ.',enabled:false};
  data.fundSubmissions??=[];
  data.notifications.forEach(n=>{n.completed??=[]});
}
ensureAccountData(db);
function avatarContent(member){return member?.avatar&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(member.avatar)?`<img src="${esc(member.avatar)}" alt="" loading="lazy">`:esc(initials(member?.name||'CLB'))}
function noticeDone(notification,id=userId){return (notification.completed||[]).includes(id)}
function assertEmail(value,id,required=true){
  const email=emailKey(value);
  if(!email&&!required)return '';
  if(!EMAIL_RE.test(email))throw Error('Vui lòng nhập địa chỉ email hợp lệ.');
  if(db.members.some(m=>m.id!==id&&emailKey(m.email)===email))throw Error('Email này đã được dùng cho một thành viên khác.');
  return email;
}
async function passwordDigest(password,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function makeCredential(password){
  if(password.length<8)throw Error('Mật khẩu mới cần ít nhất 8 ký tự.');
  const salt=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');
  return {salt,hash:await passwordDigest(password,salt)};
}
async function passwordMatches(member,password){return member.credential?await passwordDigest(password,member.credential.salt)===member.credential.hash:password==='rikkei123'}
function login(){
  roleView=null;sessionStorage.removeItem('rikkei-role-view');
  userId=null;noticeFilter='pending';sessionStorage.removeItem('rikkei-source-user');document.body.classList.remove('menu-open');
  $('#app').innerHTML=`<div class="login"><div class="loginart"><div class="brand" style="margin:0"><div class="crest">R</div><div>RIKKEI FC<small>PTIT × RIKKEI · HÀ NỘI</small></div></div><span class="chip" style="align-self:flex-start;margin-top:48px">KHÔNG GIAN CỦA ĐỒNG ĐỘI</span><h1>Cùng một đội.<br>Cùng một<br>tinh thần.</h1><p style="color:#c2d7cb">Lịch đá, đồng đội và những hoạt động của CLB<br>được kết nối trong một không gian.</p></div><div class="loginform"><span class="badge red">CHÀO MỪNG TRỞ LẠI</span><h1 style="margin-top:20px">Đăng nhập Rikkei FC</h1><p class="muted">Sử dụng email được đăng ký trong hồ sơ thành viên.</p><form id="loginForm"><div class="field"><label for="email">Email thành viên</label><input id="email" name="email" type="email" required autocomplete="username" placeholder="ban@example.com"></div><div class="field"><label for="password">Mật khẩu</label><div class="password-field"><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Nhập mật khẩu"><button type="button" id="togglePassword" aria-label="Hiện mật khẩu">Hiện</button></div></div><button class="btn primary login-submit" type="submit">Đăng nhập ${icon('arrow')}</button><p id="loginError" role="alert" class="form-error"></p></form><details class="login-help"><summary>Hướng dẫn truy cập bản dùng thử</summary><p>Mật khẩu khởi tạo: <b>rikkei123</b>. Bạn có thể đổi mật khẩu trong Hồ sơ cá nhân. Email chưa được cấp: liên hệ quản trị viên để bổ sung.</p><p>Đăng nhập và dữ liệu hiện lưu tại trình duyệt, chưa đồng bộ giữa các thiết bị.</p></details></div></div>`;
  $('#togglePassword').onclick=()=>{const shown=$('#password').type==='text';$('#password').type=shown?'password':'text';$('#togglePassword').textContent=shown?'Hiện':'Ẩn';$('#togglePassword').setAttribute('aria-label',shown?'Hiện mật khẩu':'Ẩn mật khẩu')};
  $('#loginForm').onsubmit=async event=>{
    event.preventDefault();const submit=event.target.querySelector('[type="submit"]');if(submit.disabled)return;
    const member=db.members.find(m=>emailKey(m.email)===emailKey($('#email').value)&&m.email);submit.disabled=true;submit.textContent='Đang đăng nhập…';$('#loginError').textContent='';
    try{
      if(!member||member.locked||member.status==='Đã rời CLB'||!await passwordMatches(member,$('#password').value))throw Error('Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa.');
      save();userId=member.id;sessionStorage.setItem('rikkei-source-user',userId);page='dashboard';render();toast('Chào mừng '+member.name.split(' ').slice(-2).join(' ')+' trở lại!');
    }catch(error){$('#loginError').textContent=error.message;submit.disabled=false;submit.innerHTML='Đăng nhập '+icon('arrow')}
  };
}
async function readAvatar(file){
  const data=await readFile(file);if(!data)return '';
  const img=new Image();img.src=data;await img.decode();
  const canvas=document.createElement('canvas'),side=Math.min(img.naturalWidth,img.naturalHeight);
  canvas.width=canvas.height=384;canvas.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,384,384);
  return canvas.toDataURL('image/jpeg',.85);
}
function bindAvatarPreview(){
  const file=$('#f-avatar');if(!file)return;
  file.onchange=async()=>{if(!file.files[0])return;try{const image=await readAvatar(file.files[0]);$('#avatarPreview').innerHTML=`<img src="${image}" alt="Ảnh xem trước">`;$('#f-removeAvatar').checked=false;$('#formError').textContent=''}catch(error){file.value='';$('#formError').textContent=error.message}};
  $('#f-removeAvatar').onchange=e=>{if(e.target.checked){file.value='';$('#avatarPreview').textContent=initials($('#f-name').value||me().name)}};
}
function memberForm(id,personal=false){
  if(!personal&&!can('members'))return;
  const existing=db.members.find(m=>m.id===id);if(personal&&id!==userId)return;if(id&&!existing)return toast('Thành viên không còn trong danh sách.');if(existing?.role===roles[0]&&!personal&&!isAdmin())return toast('Chỉ quản trị viên được sửa tài khoản quản trị.');
  const m=existing||{id:uid(),name:'',email:'',phone:'',role:roles[5],department:'',status:'Chờ xác nhận',joined:'',unit:'',sourcePosition:'',positions:[],duesStatus:'Chưa đóng',note:'',note2:'',receipts:[],locked:false};
  const canEditLogin=isAdmin()||personal;
  modal(personal?'Chỉnh sửa hồ sơ cá nhân':existing?'Chỉnh sửa thành viên':'Thêm thành viên',form(`
    <div class="avatar-editor"><span class="avatar profile-avatar" id="avatarPreview">${avatarContent(m)}</span><div>${field('Ảnh đại diện · JPG, PNG, WEBP · tối đa 2 MB','avatar','','file',false)}<label class="check-label"><input type="checkbox" id="f-removeAvatar" name="removeAvatar"> Gỡ ảnh hiện tại</label></div></div>
    <div class="formgrid">${field('Họ tên','name',m.name)}${field('Lớp / Bộ phận','unit',m.unit,'text',false)}${canEditLogin?field('Email đăng nhập','email',m.email,'email',false):`<div class="field"><label>Email đăng nhập</label><p>${esc(m.email||'Chưa được quản trị viên cấp')}</p></div>`}${field('Số điện thoại','phone',m.phone,'tel',false)}</div>
    ${field('Vị trí thi đấu / Vai trò trong đội','sourcePosition',m.sourcePosition,'text',false)}${area('Giới thiệu bản thân','bio',m.bio||'')}
    ${personal?'':`<div class="formgrid">${select('Tình trạng tham gia','status',['Sẵn sàng','Chờ xác nhận','Tạm nghỉ','Đã rời CLB'],m.status)}${field('Ban','department',m.department,'text',false)}${field('Ngày tham gia','joined',m.joined,'date',false)}${isAdmin()?`<div class="field"><label>Chức vụ đang được cấp</label><p>${esc(assignedRole(m))}</p><small>Mở hồ sơ đồng đội → Cập nhật chức vụ để thay đổi quyền.</small></div>`:''}</div>${area('Ghi chú nội bộ','note',m.note)}${area('Ghi chú bổ sung','note2',m.note2)}${isAdmin()?select('Tài khoản','locked',[['false','Mở tài khoản'],['true','Khóa tài khoản']],String(m.locked)):''}`}
    ${canEditLogin?`<details class="account-fields"><summary>${personal?'Đổi mật khẩu':'Cấp / đổi mật khẩu đăng nhập'}</summary>${personal?field('Mật khẩu hiện tại','currentPassword','','password',false):''}${field('Mật khẩu mới · tối thiểu 8 ký tự','newPassword','','password',false)}${field('Nhập lại mật khẩu mới','repeatPassword','','password',false)}<p class="muted">Để trống nếu giữ mật khẩu hiện tại. Tài khoản chưa đổi mật khẩu dùng rikkei123.</p></details>`:''}
    ${!personal&&canEditLogin?'<p class="muted">Email để trống: thành viên chưa thể đăng nhập. Chỉ cấp email đã được thành viên xác nhận.</p>':''}
  `,existing&&!personal&&isAdmin()&&id!==userId?`<button type="button" class="btn danger" data-action="deleteMember" data-id="${esc(id)}">Xóa thành viên</button>`:''));
  $('#f-avatar').accept='image/png,image/jpeg,image/webp';if(personal)$('#f-email').required=true;bindAvatarPreview();
  handleForm(async(d,f)=>{
    const email=canEditLogin?assertEmail(d.email,m.id,personal||m.role===roles[0]):m.email;
    if(id===userId&&(d.locked==='true'||d.status==='Đã rời CLB'))throw Error('Không thể khóa, cho rời CLB hoặc hạ quyền tài khoản đang đăng nhập.');
    let credential=m.credential;
    if(d.newPassword){if(d.newPassword!==d.repeatPassword)throw Error('Hai mật khẩu mới chưa khớp.');if(personal&&!await passwordMatches(m,d.currentPassword||''))throw Error('Mật khẩu hiện tại chưa đúng.');credential=await makeCredential(d.newPassword)}
    else if(d.repeatPassword)throw Error('Vui lòng nhập mật khẩu mới.');
    const avatar=d.removeAvatar?'':await readAvatar(f.avatar.files[0])||m.avatar||'';
    Object.assign(m,{name:d.name.trim(),unit:d.unit.trim(),phone:d.phone.trim(),sourcePosition:d.sourcePosition.trim(),positions:d.sourcePosition.split(',').map(s=>s.trim()).filter(Boolean),email,avatar,bio:d.bio.trim(),localUpdatedAt:new Date().toISOString()});
    if(credential)m.credential=credential;
    if(!personal){Object.assign(m,{status:d.status,department:d.department,joined:d.joined,note:d.note,note2:d.note2});if(isAdmin())Object.assign(m,{locked:d.locked==='true'})}
    if(!existing)db.members.push(m);
  });
}
views.profile=()=>{
 const m=me();return head('Hồ sơ cá nhân','Để đồng đội hiểu thêm về bạn.',button('Chỉnh sửa hồ sơ','profileForm','',true))+`<section class="panel profile-panel"><div class="profile-cover"><span>RIKKEI FC · TOGETHER WE PLAY</span></div><div class="profile-identity"><span class="avatar profile-avatar">${avatarContent(m)}</span><div><h2>${esc(m.name)}</h2><p>${esc(m.unit)} · ${esc(assignedRole(m))}</p></div>${tag(m.status)}</div><p class="profile-bio">${esc(m.bio||'Chưa có giới thiệu. Thêm vài dòng về bản thân và vị trí yêu thích của bạn.')}</p><dl class="profile-details">${[['Email đăng nhập',m.email||'Chưa cấp email'],['Số điện thoại',m.phone||'Chưa cập nhật'],['Lớp / Bộ phận',m.unit||'Chưa cập nhật'],['Vị trí thi đấu',m.sourcePosition||'Chưa cập nhật'],['Ngày tham gia',date(m.joined)],['Quỹ tháng đầu',m.duesStatus]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><div class="actions">${button('Nộp quỹ CLB','openFund','',true)}</div></section><section class="panel"><div class="panelhead"><h2>Hoạt động của bạn</h2></div>${eventRows(db.events.filter(e=>e.rsvps[userId]||e.attendance[userId]))}</section>`;
};

let noticeFilter='pending';
notificationRows=limit=>{
 const all=visibleNotifications(),rows=all.filter(n=>page!=='notifications'||noticeFilter==='all'||(noticeFilter==='done'?noticeDone(n):!noticeDone(n)));
 return (limit?rows.slice(0,limit):rows).map(n=>`<article class="notification-card ${noticeDone(n)?'is-complete':'is-pending'}"><span class="notice-icon">${icon(noticeDone(n)?'check':'notifications')}</span><div class="notification-copy"><div class="notice-meta"><span>${noticeDone(n)?'ĐÃ HOÀN THÀNH':'CẦN BẠN XEM'}</span><time>${date(n.date)}</time></div><h3>${esc(n.title)}</h3><p>${esc(n.content)}</p></div><button class="btn small ${noticeDone(n)?'':'primary'}" data-action="toggleNotice" data-id="${esc(n.id)}">${noticeDone(n)?'Đánh dấu chưa xong':'Đã xử lý '+icon('check')}</button></article>`).join('')||emptyState('check','Không còn thông báo cần xử lý','Bạn có thể xem lại mọi thông báo trong mục Tất cả.');
};
views.notifications=()=>head('Trung tâm thông báo','Thẻ sáng là việc chưa xử lý. Hoàn thành để đưa thông báo về trạng thái dịu.',`${isAdmin()||can('events')||can('media')?button('Tạo thông báo','notificationForm','',true):''}`)+`<section class="panel notices-panel"><div class="filter-chips">${[['pending','Chưa hoàn thành'],['done','Đã hoàn thành'],['all','Tất cả']].map(([id,label])=>`<button data-action="noticeFilter" data-id="${id}" class="${noticeFilter===id?'active':''}">${label} <span class="count">${visibleNotifications().filter(n=>id==='all'||(id==='done'?noticeDone(n):!noticeDone(n))).length}</span></button>`).join('')}</div>${notificationRows()}</section>`;

function collectionStatus(memberId,periodId=db.fundSettings.periodId){
 const submissions=db.fundSubmissions.filter(s=>s.member===memberId&&s.periodId===periodId);
 if(submissions.some(s=>s.status==='Đã xác nhận'))return 'Đã xác nhận';
 if(periodId==='source-first'&&db.members.find(m=>m.id===memberId)?.duesStatus==='Đã đóng')return 'Đã đóng theo nguồn';
 if(submissions.some(s=>s.status==='Chờ xác nhận'))return 'Chờ xác nhận';
 return 'Chưa nộp';
}
function transferMemo(){return `${db.fundSettings.periodLabel} - ${me().name}`}
function fundSubmissionRows(rows){
 return rows.map(s=>`<div class="row fund-submission"><span class="avatar">${avatarContent(db.members.find(m=>m.id===s.member))}</span><div class="grow"><b>${esc(name(s.member))}</b><p>${esc(s.periodLabel)} · ${date(s.paidDate)} · ${money(s.amount)}</p>${s.reply?`<p>Phản hồi: ${esc(s.reply)}</p>`:''}</div>${tag(s.status)}${button(can('finance')&&s.status==='Chờ xác nhận'?'Kiểm tra':'Chi tiết','reviewFund',s.id)}</div>`).join('')||emptyState('finance','Chưa có xác nhận nộp quỹ','Các xác nhận chuyển khoản sẽ xuất hiện tại đây.');
}
views.fund=()=>{
 const f=db.fundSettings,status=collectionStatus(userId),canSubmit=status==='Chưa nộp'&&f.enabled&&f.qrImage,own=db.fundSubmissions.filter(s=>s.member===userId),pending=db.fundSubmissions.filter(s=>s.status==='Chờ xác nhận');
 return head('Nộp quỹ câu lạc bộ','Đóng góp của bạn giữ cho những buổi ra sân luôn sẵn sàng.',isAdmin()?button('Cấu hình thu quỹ','fundSettings','',true):'')+`<div class="fund-grid"><section class="panel fund-payment"><div class="panelhead"><div><span class="eyebrow">KỲ THU HIỆN TẠI</span><h2>${esc(f.periodLabel)}</h2></div>${tag(status)}</div><div class="fund-amount">${money(f.amount)}</div><p class="muted">${f.deadline?'Hạn nộp: '+date(f.deadline):'Chưa đặt hạn nộp'} · Mức đóng mỗi thành viên</p><div class="qr-frame">${f.qrImage?`<img src="${esc(f.qrImage)}" alt="Mã QR nộp quỹ do quản trị viên cung cấp">`:`<div class="qr-placeholder">${icon('finance')}<h3>Chưa có mã QR</h3><p>Quản trị viên sẽ thêm mã QR và thông tin nhận quỹ tại đây.</p></div>`}</div>${!f.enabled?'<div class="notice">Kỳ thu đang tạm đóng. Bạn vẫn có thể xem thông tin và lịch sử.</div>':''}<dl class="payment-bank">${[['Ngân hàng',f.bankName],['Số tài khoản',f.accountNumber],['Chủ tài khoản',f.accountName]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'Chưa cấu hình')}</dd></div>`).join('')}</dl><div class="transfer-memo"><span>NỘI DUNG CHUYỂN KHOẢN</span><p id="transferMemo">${esc(transferMemo())}</p>${button('Sao chép nội dung','copyMemo')}</div><p class="muted">${esc(f.instructions)}</p><button class="btn primary fund-submit" data-action="submitFund" ${canSubmit?'':'disabled'}>${status==='Chờ xác nhận'?'Đang chờ kiểm tra':status.startsWith('Đã')?'Đã ghi nhận nộp quỹ':'Tôi đã chuyển khoản'}</button><p class="fund-note">Gửi xác nhận kèm ảnh bill. Website không tự trừ tiền hoặc xác nhận giao dịch ngân hàng.</p></section><div><section class="panel fund-steps"><h2>Nộp quỹ trong 3 bước</h2><ol><li><b>Quét mã QR</b><p>Mở ứng dụng ngân hàng, kiểm tra tên người nhận và số tiền.</p></li><li><b>Gửi xác nhận</b><p>Điền số tiền đã nộp và đính kèm ảnh bill sau khi chuyển.</p></li><li><b>Chờ đối chiếu</b><p>Quản trị viên hoặc thủ quỹ kiểm tra và gửi phản hồi cho bạn.</p></li></ol></section>${can('finance')?`<section class="panel"><div class="panelhead"><h2>Xác nhận cần kiểm tra</h2><span class="badge amber">${pending.length}</span></div>${fundSubmissionRows(pending)}</section>`:''}<section class="panel"><h2>Lịch sử nộp quỹ của bạn</h2>${fundSubmissionRows(own)}</section></div></div>${can('finance')?`<section class="panel"><div class="panelhead"><h2>Lịch sử xác nhận toàn CLB</h2></div>${fundSubmissionRows([...db.fundSubmissions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}</section>`:''}`;
};
function fundSettingsForm(){
 if(!isAdmin())return;const f=db.fundSettings;
 modal('Cấu hình nộp quỹ',form(`${field('Tên kỳ thu','periodLabel',f.periodLabel)}<div class="formgrid">${field('Số tiền mỗi người (đồng)','amount',f.amount,'number')}${field('Hạn nộp','deadline',f.deadline,'date',false)}</div>${field('Ngân hàng','bankName',f.bankName,'text',false)}<div class="formgrid">${field('Số tài khoản','accountNumber',f.accountNumber,'text',false)}${field('Chủ tài khoản','accountName',f.accountName,'text',false)}</div>${field('Ảnh QR của bạn · tối đa 2 MB','qr','','file',false)}<div class="qr-upload-preview" id="qrPreview">${f.qrImage?`<img src="${esc(f.qrImage)}" alt="Mã QR hiện tại">`:'Chưa có ảnh QR'}</div><label class="check-label"><input type="checkbox" id="f-removeQr" name="removeQr"> Gỡ mã QR hiện tại</label>${area('Hướng dẫn nộp quỹ','instructions',f.instructions)}${select('Nhận xác nhận nộp quỹ','enabled',[['false','Tạm đóng'],['true','Đang mở']],String(f.enabled))}<label class="check-label new-period"><input type="checkbox" name="newPeriod"> Bắt đầu kỳ thu mới (giữ lịch sử kỳ cũ)</label><p class="muted">Chọn kỳ mới khi bắt đầu thu tháng tiếp theo. Sửa QR hoặc hướng dẫn của kỳ hiện tại thì không cần chọn.</p>`));
 $('#f-qr').accept='image/png,image/jpeg,image/webp';$('#f-qr').onchange=async event=>{try{const image=await readFile(event.target.files[0]);if(image){$('#qrPreview').innerHTML=`<img src="${image}" alt="QR xem trước">`;$('#f-removeQr').checked=false}}catch(error){$('#formError').textContent=error.message;event.target.value=''}};
 handleForm(async(d,formEl)=>{
  const amount=Number(d.amount);if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Mức quỹ phải là số nguyên lớn hơn 0.');
  if(!d.newPeriod&&db.fundSubmissions.some(s=>s.periodId===f.periodId)&&(+d.amount!==f.amount||d.periodLabel.trim()!==f.periodLabel))throw Error('Kỳ thu đã có xác nhận. Hãy chọn Bắt đầu kỳ thu mới khi đổi tên kỳ hoặc mức đóng.');
  const qrImage=d.removeQr?'':await readFile(formEl.qr.files[0])||f.qrImage;
  if(d.enabled==='true'&&(!qrImage||!d.bankName.trim()||!d.accountName.trim()||!d.accountNumber.trim()))throw Error('Để mở thu quỹ, hãy thêm QR, ngân hàng, số tài khoản và chủ tài khoản.');
  if(qrImage){const image=new Image();image.src=qrImage;try{await image.decode()}catch{throw Error('Ảnh QR không đọc được. Vui lòng chọn ảnh khác.')}}
  const periodId=d.newPeriod?uid():f.periodId;
  Object.assign(f,{periodId,periodLabel:d.periodLabel.trim(),amount,deadline:d.deadline,bankName:d.bankName.trim(),accountNumber:d.accountNumber.trim(),accountName:d.accountName.trim(),qrImage,instructions:d.instructions.trim(),enabled:d.enabled==='true',updatedAt:new Date().toISOString()});
  if(d.newPeriod&&f.enabled)notify('Kỳ nộp quỹ mới: '+f.periodLabel,`Mức đóng ${money(f.amount)}${f.deadline?', hạn '+date(f.deadline):''}. Xem mã QR tại mục Nộp quỹ.`);
 });
}
function submitFundForm(){
 const f=db.fundSettings;if(!f.enabled||!f.qrImage)return toast('Kỳ thu chưa được mở.');if(collectionStatus(userId)!=='Chưa nộp')return toast('Kỳ này đã có xác nhận hoặc đã được ghi nhận.');
 const snapshot=structuredClone(f);
 modal('Gửi xác nhận nộp quỹ',form(`<p><b>${esc(f.periodLabel)}</b> · Mức đóng ${money(f.amount)}</p><div class="formgrid">${field('Số tiền đã chuyển (đồng)','amount',f.amount,'number')}${field('Ngày chuyển khoản','paidDate',today(),'date')}</div>${field('Ảnh bill chuyển khoản · tối đa 2 MB','receipt','','file')}${area('Ghi chú','note','')}<p class="muted">Chỉ gửi sau khi bạn đã chuyển khoản. Trạng thái đóng quỹ đổi sau khi người phụ trách xác nhận.</p>`));$('#f-receipt').accept='image/png,image/jpeg,image/webp';$('#f-paidDate').max=today();
 handleForm(async(d,formEl)=>{
  if(!db.fundSettings.enabled||db.fundSettings.periodId!==snapshot.periodId)throw Error('Kỳ thu đã thay đổi hoặc tạm đóng. Đóng biểu mẫu và tải lại thông tin.');
  if(collectionStatus(userId,snapshot.periodId)!=='Chưa nộp')throw Error('Bạn đã gửi xác nhận cho kỳ này.');
  if(!Number.isSafeInteger(+d.amount)||+d.amount<=0)throw Error('Số tiền phải là số nguyên lớn hơn 0.');
  if(d.paidDate>today())throw Error('Ngày chuyển khoản không được ở tương lai.');
  const receipt=await readFile(formEl.receipt.files[0]);if(!receipt)throw Error('Vui lòng đính kèm ảnh bill.');
  db.fundSubmissions.unshift({id:uid(),member:userId,periodId:snapshot.periodId,periodLabel:snapshot.periodLabel,expectedAmount:snapshot.amount,amount:+d.amount,paidDate:d.paidDate,receipt,note:d.note.trim(),status:'Chờ xác nhận',reply:'',reviewer:'',createdAt:new Date().toISOString(),transactionId:''});
  notifyReviewers('fund',db.fundSubmissions[0].id,'Có xác nhận nộp quỹ cần kiểm tra',`${me().name} · ${snapshot.periodLabel} · ${money(+d.amount)}`);
 });
}
function reviewFund(id){
 const s=db.fundSubmissions.find(s=>s.id===id);if(!s||!can('finance')&&s.member!==userId)return;
 modal('Xác nhận nộp quỹ',`<div class="fund-review"><h3>${esc(name(s.member))}</h3><p>${esc(s.periodLabel)} · ${date(s.paidDate)}</p><div class="fund-amount">${money(s.amount)}</div>${tag(s.status)}${s.amount!==s.expectedAmount?`<div class="notice">Số tiền gửi ${money(s.amount)} khác mức kỳ thu ${money(s.expectedAmount)}. Kiểm tra và chỉ xác nhận khi khoản nộp này phù hợp.</div>`:''}<p>${esc(s.note)}</p><img class="receipt-preview" src="${esc(s.receipt)}" alt="Bill do thành viên gửi">${s.reply?`<p><b>Phản hồi:</b> ${esc(s.reply)}</p>`:''}${s.reviewer?`<p class="muted">Người kiểm tra: ${esc(name(s.reviewer))}</p>`:''}${can('finance')&&s.status==='Chờ xác nhận'?`${area('Phản hồi khi kiểm tra','fundReply')}<p class="muted">Xác nhận sẽ tạo một khoản thu ${money(s.amount)} trong sổ giao dịch bổ sung.</p><div class="actions">${button('Từ chối','rejectFund',s.id)}${button('Xác nhận đã nhận tiền','approveFund',s.id,true)}</div>`:''}</div>`);
}
function decideFund(id,approved){
 if(!can('finance'))return;const s=db.fundSubmissions.find(s=>s.id===id);if(!s||s.status!=='Chờ xác nhận')return;
 const reply=$('#f-fundReply')?.value.trim()||'';if(!approved&&!reply)return toast('Nhập lý do để thành viên biết cần bổ sung gì.');
 if(approved&&!confirm(`Bạn đã đối chiếu và nhận ${money(s.amount)} từ ${name(s.member)}?`))return;
 const before=structuredClone(db);
 try{
  if(approved){
   if(db.fundSubmissions.some(other=>other.id!==id&&other.member===s.member&&other.periodId===s.periodId&&other.status==='Đã xác nhận'))throw Error('Kỳ này đã có khoản nộp được xác nhận.');
   const existing=db.transactions.find(t=>t.sourcePaymentId===s.id);if(existing)throw Error('Xác nhận này đã có giao dịch, cần kiểm tra lại.');
   const txId=uid();db.transactions.unshift({id:txId,type:'Thu',amount:s.amount,content:`${s.periodLabel} — ${name(s.member)}`,category:'Phí thành viên',date:s.paidDate,member:s.member,owner:me().name,receipt:s.receipt,sourcePaymentId:s.id});s.transactionId=txId;
   if(s.periodId==='source-first'){const member=db.members.find(m=>m.id===s.member);if(member)member.duesStatus='Đã đóng';const due=db.dues.find(d=>d.member===s.member);if(due)due.status='Đã đóng'}
  }
  completeRelatedNotices('fund',id);s.status=approved?'Đã xác nhận':'Từ chối';s.reply=reply;s.reviewer=userId;s.reviewedAt=new Date().toISOString();
  notify(approved?'Đã xác nhận nộp quỹ':'Xác nhận nộp quỹ cần bổ sung',`${s.periodLabel} · ${money(s.amount)}${reply?' · '+reply:''}`,s.member);
  save();$('#modal').close();render();toast(approved?'Đã xác nhận và ghi một khoản thu.':'Đã gửi phản hồi cho thành viên.');
 }catch(error){restoreDataInPlace(db,before);toast(error.message)}
}
const beforeFundAllowed=allowed;allowed=p=>p==='fund'||beforeFundAllowed(p);
navItems.splice(navItems.findIndex(item=>item[0]==='finance'),0,['fund','◈','Nộp quỹ']);iconPaths.fund=iconPaths.finance;
const financeBeforeFund=views.finance;
views.finance=()=>financeBeforeFund().replace('<div class="stats">',`<div class="fund-banner"><div><b>Nộp quỹ qua mã QR</b><p>Thông tin nhận quỹ và lịch sử xác nhận của câu lạc bộ.</p></div>${button('Mở mục nộp quỹ','openFund','',true)}</div><div class="stats">`);
const beforeAccountAction=action;
action=function(a,id){
 if(a==='fundSettings')return fundSettingsForm();if(a==='openFund')return go('fund');if(a==='submitFund')return submitFundForm();if(a==='reviewFund')return reviewFund(id);if(a==='approveFund'||a==='rejectFund')return decideFund(id,a==='approveFund');
 if(a==='copyMemo'){navigator.clipboard.writeText(transferMemo()).then(()=>toast('Đã sao chép nội dung chuyển khoản.')).catch(()=>{modal('Nội dung chuyển khoản',field('Chọn và sao chép','copyText',transferMemo()));$('#f-copyText').select()});return}
 if(a==='noticeFilter'){noticeFilter=id;render();return}
 if(a==='unreadNotifications'){noticeFilter='pending';go('notifications');return}
 if(a==='toggleNotice'){
  const n=visibleNotifications().find(n=>n.id===id);if(!n)return;const before=structuredClone(n);n.completed??=[];
  if(noticeDone(n))n.completed=n.completed.filter(x=>x!==userId);else{n.completed.push(userId);if(!n.read.includes(userId))n.read.push(userId)}
  try{save();render();toast(noticeDone(n)?'Thông báo đã hoàn thành.':'Đã đưa về chưa hoàn thành.')}catch{Object.assign(n,before);toast('Chưa lưu được trạng thái.')}return;
 }
 if((a==='txForm'||a==='deleteTx')&&db.transactions.find(t=>t.id===id)?.sourcePaymentId){toast('Khoản thu này đã gắn với xác nhận nộp quỹ. Xem chi tiết tại mục Nộp quỹ để đối chiếu.');return}
 return beforeAccountAction(a,id);
};
