/* Administrators can enter each role without changing their member record. */
const roleSpaces=[
  {icon:'roles',page:'dashboard',summary:'Điều hành toàn bộ câu lạc bộ.',features:['Toàn bộ chức năng của các ban','Cấp tài khoản và phân quyền','Cấu hình QR, sao lưu và khôi phục']},
  {icon:'events',page:'events',summary:'Tổ chức đội hình và những buổi ra sân.',features:['Quản lý thành viên, lịch đá và điểm danh','Duyệt đơn xin vắng','Khảo sát sân và công việc chuyên môn']},
  {icon:'media',page:'media',summary:'Chia sẻ hình ảnh và hoạt động của đội.',features:['Soạn bài và lên lịch nội dung','Đăng thông báo cho CLB','Quản lý công việc ban Truyền thông']},
  {icon:'logistics',page:'logistics',summary:'Chuẩn bị chu đáo cho từng buổi đá.',features:['Quản lý công việc ban Hậu cần','Khảo sát và cập nhật sân bóng','Theo dõi tiến độ và hạn hoàn thành']},
  {icon:'finance',page:'fund',summary:'Theo dõi quỹ và đối chiếu khoản nộp.',features:['Kiểm tra bill và xác nhận nộp quỹ','Ghi thu chi, xem chứng từ','Theo dõi công việc Tài chính']},
  {icon:'profile',page:'dashboard',summary:'Trải nghiệm các thao tác của thành viên.',features:['Xác nhận tham gia và gửi đơn xin vắng','Nộp quỹ, theo dõi thông báo','Chỉnh sửa hồ sơ của chính bạn']}
];
iconPaths.roles='<path d="M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7L12 3Z"/><path d="m8 12 3 3 5-6"/>';
navItems.splice(1,0,['roles','◎','Truy cập chức vụ']);
const allowedBeforeRoles=allowed;
allowed=p=>p==='roles'?isAccountAdmin()&&currentRole()!==roles[5]:p==='source'?isAdmin():allowedBeforeRoles(p);

function roleAccessBar(){
  if(!isAccountAdmin()||currentRole()===roles[5])return '';
  const full=isAdmin();
  return `<section class="role-access-bar ${full?'':'role-access-active'}" aria-label="Chuyển chức vụ"><div class="role-access-caption">${icon('roles')}<div><b>${full?'Toàn quyền quản trị':'Đang dùng quyền '+esc(currentRole())}</b><p>${full?'Truy cập mọi chức vụ từ tài khoản của bạn.':'Thao tác sẽ lưu vào dữ liệu CLB dưới tài khoản của bạn.'}</p></div></div><div class="role-access-controls"><label class="visually-hidden" for="roleAccessSelect">Chức vụ muốn truy cập</label><select id="roleAccessSelect">${roles.map((role,index)=>`<option value="${index}" ${role===currentRole()?'selected':''}>${esc(role)}</option>`).join('')}</select>${full?'<button class="btn small" data-page="roles">Tất cả chức vụ</button>':button('Về quản trị','switchRole','0',true)}</div></section>`;
}

views.roles=()=>{
  if(!isAccountAdmin()||currentRole()===roles[5])return '';
  return head('Truy cập toàn bộ chức vụ','Chọn không gian làm việc phù hợp. Bạn luôn có thể quay lại toàn quyền quản trị.')+`<section class="role-owner"><span class="avatar">${avatarContent(me())}</span><div><b>${esc(me().name)}</b><p>${esc(me().email)} · Tài khoản quản trị viên</p></div><span class="badge">6 chức vụ</span></section><div class="role-grid">${roleSpaces.map((space,index)=>{
    const selected=currentRole()===roles[index];
    return `<article class="role-card ${selected?'is-selected':''}"><div class="role-card-top"><span class="role-symbol">${icon(space.icon)}</span>${selected?'<span class="badge">Đang sử dụng</span>':''}</div><h2>${esc(roles[index])}</h2><p>${space.summary}</p><ul>${space.features.map(feature=>`<li>${icon('check')}<span>${feature}</span></li>`).join('')}</ul><button class="btn ${selected?'':'primary'}" data-action="switchRole" data-id="${index}">${selected?'Mở không gian':'Truy cập chức vụ'} ${icon('arrow')}</button></article>`;
  }).join('')}</div><p class="role-explanation">Chuyển chức vụ chỉ đổi các chức năng đang hiển thị. Hồ sơ và email vẫn là của bạn; các thay đổi được lưu vào dữ liệu CLB hiện tại.</p>`;
};

function switchRole(index){
  if(!isAccountAdmin()||!/^\d$/.test(String(index))||!roleSpaces[Number(index)])return;
  const role=roles[Number(index)];
  roleView=role===roles[0]?null:{user:userId,role};
  try{if(roleView)sessionStorage.setItem('rikkei-role-view',JSON.stringify(roleView));else sessionStorage.removeItem('rikkei-role-view')}catch{}
  taskScope='all';noticeFilter='pending';onlyUnread=false;searchHits=[];
  go(roleSpaces[Number(index)].page);
  toast(role===roles[0]?'Đã trở về toàn quyền quản trị.':'Đã mở chức vụ '+role+'.');
}
const bindBeforeRoles=bind;
bind=function(root=document){
  bindBeforeRoles(root);
  if(root===document&&$('#roleAccessSelect'))$('#roleAccessSelect').onchange=event=>switchRole(event.target.value);
};
const actionBeforeRoles=action;
action=function(a,id){if(a==='switchRole')return switchRole(id);return actionBeforeRoles(a,id)};
