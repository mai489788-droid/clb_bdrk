/* Atomic browser-local writes and conservative cross-tab conflict handling. */
let savedSnapshot,remoteDataPending=false;
try{if(!dataLoadError)validateClubBackup(structuredClone(db))}catch(error){dataLoadError='Dữ liệu đã lưu chưa hợp lệ: '+error.message}
savedSnapshot=structuredClone(db);

// Keep object references alive so an open form can retry after a failed save.
function restoreDataInPlace(target,source){
 if(Array.isArray(source)){
  const byId=new Map(target.filter(item=>item&&typeof item==='object'&&item.id).map(item=>[item.id,item]));
  const restored=source.map((item,index)=>{
   if(item&&typeof item==='object'){
    const old=item.id?byId.get(item.id):target[index];
    const match=old&&typeof old==='object'&&Array.isArray(old)===Array.isArray(item)?old:Array.isArray(item)?[]:{};
    restoreDataInPlace(match,item);return match;
   }return item;
  });target.splice(0,target.length,...restored);return target;
 }
 for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
 for(const [key,value] of Object.entries(source)){
  if(value&&typeof value==='object'){
   if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key])!==Array.isArray(value))target[key]=Array.isArray(value)?[]:{};
   restoreDataInPlace(target[key],value);
  }else target[key]=value;
 }return target;
}
function acceptStoredData(raw=localStorage.getItem(DATA_KEY)){
 storedBaseline=raw;savedSnapshot=structuredClone(db);remoteDataPending=false;
}
function persistClubData(){
 try{
  if(dataLoadError)throw Error(dataLoadError);
  if(localStorage.getItem(DATA_KEY)!==storedBaseline){remoteDataPending=true;throw Error('Dữ liệu đã thay đổi ở tab khác. Hãy đóng biểu mẫu để tải bản mới rồi thực hiện lại; bản ở tab khác được giữ nguyên.')}
  validateClubBackup(structuredClone(db));
  const next={...db,lastSavedAt:new Date().toISOString()},raw=JSON.stringify(next);
  localStorage.setItem(DATA_KEY,raw);db.lastSavedAt=next.lastSavedAt;acceptStoredData(raw);
 }catch(error){
  restoreDataInPlace(db,savedSnapshot);
  if(['QuotaExceededError','SecurityError'].includes(error.name))throw Error('Chưa lưu được vì bộ nhớ trình duyệt đã đầy hoặc bị chặn. Dữ liệu cũ được giữ nguyên. Bạn có thể tải bản sao lưu ở mục Dữ liệu nguồn.');
  throw error;
 }
}
function loadLatestLocalData(){
 if($('#editForm')?.dataset.saving)return;
 try{
  const raw=localStorage.getItem(DATA_KEY);if(raw===storedBaseline)return;
  if(raw===null)throw Error('Dữ liệu đã bị xóa ở tab khác. Tải lại trang để bắt đầu hoặc khôi phục bản sao lưu.');
  const next=validateClubBackup(JSON.parse(raw)).data;
  restoreDataInPlace(db,next);dataLoadError='';acceptStoredData(raw);render();toast('Đã cập nhật dữ liệu từ tab khác trên thiết bị này.');
 }catch(error){remoteDataPending=true;toast('Chưa tải dữ liệu mới: '+error.message)}
}
window.addEventListener('storage',event=>{
 if(event.key!==DATA_KEY&&event.key!==null)return;
 if(!$('#modal').open)loadLatestLocalData();else{remoteDataPending=true;toast('Tab khác vừa cập nhật dữ liệu. Hãy đóng biểu mẫu để tải bản mới trước khi lưu.')}
});
$('#modal').addEventListener('close',()=>{if(remoteDataPending)loadLatestLocalData()});

function renderDataRecovery(){
 $('#app').innerHTML=`<main class="recovery-screen"><section class="panel"><span class="badge amber">KHÔI PHỤC DỮ LIỆU</span><h1>Cần kiểm tra bản dữ liệu đã lưu</h1><p>${esc(dataLoadError)}</p><p>Hãy tải bản hiện tại về trước khi khôi phục một tệp sao lưu hợp lệ. Website chưa ghi đè dữ liệu này.</p><button type="button" class="btn" id="downloadRecovery">Tải dữ liệu hiện tại</button><hr><div class="field"><label for="recoveryFile">Chọn bản sao lưu JSON của Rikkei FC</label><input id="recoveryFile" type="file" accept=".json,application/json"></div><label class="check-label"><input type="checkbox" id="recoveryConsent"> Tôi đồng ý thay dữ liệu lỗi bằng bản sao lưu đã chọn.</label><p id="recoveryError" role="alert"></p><button type="button" id="restoreRecovery" class="btn primary" disabled>Khôi phục bản đã chọn</button><p class="muted">Nếu trình duyệt đang chặn lưu trữ, hãy bật lại quyền lưu dữ liệu cho website rồi tải lại trang.</p></section></main>`;
 let candidate=null,selection=0;
 const message=(text,success=false)=>{const el=$('#recoveryError');el.textContent=text;el.classList.toggle('success',success)};
 $('#downloadRecovery').disabled=storedBaseline===null;
 $('#downloadRecovery').onclick=()=>{const url=URL.createObjectURL(new Blob([storedBaseline],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='rikkei-du-lieu-can-khoi-phuc.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const update=()=>{$('#restoreRecovery').disabled=!candidate||!$('#recoveryConsent').checked};
 $('#recoveryConsent').onchange=update;
 $('#recoveryFile').onchange=async event=>{
  const current=++selection,input=event.target;
  candidate=null;$('#recoveryConsent').checked=false;update();message('');
  try{const file=input.files[0];if(!file)return;if(file.size>BACKUP_MAX_BYTES)throw Error('Tệp vượt quá 8 MB.');const raw=await file.text();if(current!==selection||!input.isConnected)return;candidate=validateClubBackup(JSON.parse(raw)).data;message('Bản sao lưu hợp lệ: '+candidate.members.length+' thành viên. Hãy xác nhận để khôi phục.',true);update()}catch(error){if(current===selection&&input.isConnected)message('Không thể dùng tệp này: '+error.message)}
 };
 $('#restoreRecovery').onclick=()=>{
  if(!candidate||!$('#recoveryConsent').checked)return;
  try{if(localStorage.getItem(DATA_KEY)!==storedBaseline)throw Error('Dữ liệu đã đổi ở tab khác. Tải lại trang để kiểm tra bản mới.');const raw=JSON.stringify(candidate);localStorage.setItem(DATA_KEY,raw);db=candidate;dataLoadError='';acceptStoredData(raw);render()}catch(error){message('Chưa khôi phục: '+error.message)}
 };
}
const renderBeforeStorage=render;
render=function(){
 if(dataLoadError)return renderDataRecovery();
 renderBeforeStorage();
 if(remoteDataPending&&$('.content')){
  $('.content').insertAdjacentHTML('afterbegin','<div class="notice storage-notice">Có bản dữ liệu mới ở tab khác. <button type="button" class="btn small" id="reloadLocalData">Tải bản mới</button></div>');$('#reloadLocalData').onclick=loadLatestLocalData;
 }
};
const actionBeforeStorage=action;
action=function(a,id){try{return actionBeforeStorage(a,id)}catch(error){render();toast(error.message||'Chưa thực hiện được thao tác. Dữ liệu cũ được giữ nguyên.')}};
