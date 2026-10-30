/* Member browsing preferences are independent of the imported club data. */
const MEMBER_UI_KEY = 'rikkei-member-view-v1';
const memberUI = (() => {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(MEMBER_UI_KEY)) || {}; } catch {}
  return {
    query: '', position: '', status: '', dues: '',
    view: ['cards', 'list'].includes(stored.view) ? stored.view : (window.matchMedia('(max-width: 700px)').matches ? 'cards' : 'list'),
    sort: ['source', 'name', 'class'].includes(stored.sort) ? stored.sort : 'source'
  };
})();
const normalizeMemberText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
const memberCollator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const memberPositionText = member => member.sourcePosition || member.positions?.join(', ') || 'Chưa cập nhật vị trí';
const memberReceiptAllowed = member => can('members') || can('finance') || member.id === userId;

function saveMemberPreference() {
  try { localStorage.setItem(MEMBER_UI_KEY, JSON.stringify({ view: memberUI.view, sort: memberUI.sort })); } catch {}
}

function memberFiltersActive() {
  return Boolean(memberUI.query.trim() || memberUI.position || memberUI.status || memberUI.dues);
}

function filteredMembers() {
  const read = (id, fallback) => document.getElementById(id)?.value ?? fallback;
  const query = normalizeMemberText(read('memberSearch', memberUI.query)).split(/\s+/).filter(Boolean);
  const position = normalizeMemberText(read('memberPosition', memberUI.position));
  const status = read('memberStatus', memberUI.status);
  const dues = read('memberDues', memberUI.dues);
  const sort = read('memberSort', memberUI.sort);
  const members = db.members.filter(member => {
    const searchable = normalizeMemberText(`${member.name} ${member.unit || ''} ${member.sourceIndex || ''}`);
    return query.every(term => searchable.includes(term)) &&
      (!position || normalizeMemberText(memberPositionText(member)).includes(position)) &&
      (!status || member.status === status) && (!dues || member.duesStatus === dues);
  });
  return members.sort((a, b) => {
    if (sort === 'name') return memberCollator.compare(a.name, b.name);
    if (sort === 'class') return memberCollator.compare(a.unit || '', b.unit || '') || memberCollator.compare(a.name, b.name);
    return (Number(a.sourceIndex) || Number.MAX_SAFE_INTEGER) - (Number(b.sourceIndex) || Number.MAX_SAFE_INTEGER);
  });
}

function memberReceiptLink(member) {
  return member.receipts?.length && memberReceiptAllowed(member)
    ? `<button class="link member-receipt-link" data-action="memberReceipts" data-id="${esc(member.id)}">▧ ${member.receipts.length} ảnh bill</button>`
    : '';
}

function memberTable(members) {
  if (!members.length) return `<div class="member-empty empty"><span aria-hidden="true">⌕</span><h3>Chưa tìm thấy đồng đội</h3><p>Thử tên không dấu, lớp hoặc bỏ bớt bộ lọc.</p>${memberFiltersActive() ? button('Xóa bộ lọc', 'memberClearFilters') : ''}</div>`;
  if (memberUI.view === 'cards') return `<div class="member-card-grid">${members.map(member => `<article class="member-card">
    <button class="member-card-main" data-action="memberDetail" data-id="${esc(member.id)}" aria-label="Xem thông tin ${esc(member.name)}">
      <span class="avatar" aria-hidden="true">${avatarContent(member)}</span>
      <span class="member-card-identity"><strong>${esc(member.name)}</strong><span class="muted">${esc(member.unit || 'Chưa cập nhật lớp')} · ${member.sourceIndex ? 'STT ' + esc(member.sourceIndex) : 'Thành viên mới'}</span></span>
      <span class="member-position">${esc(memberPositionText(member))}</span>
    </button>
    <div class="member-card-status">${tag(member.status)}${tag(member.duesStatus)}${member.locked ? tag('Tài khoản khóa') : ''}</div>
    <div class="member-card-footer">${memberReceiptLink(member)}<button class="link" data-action="memberDetail" data-id="${esc(member.id)}">Xem hồ sơ <span aria-hidden="true">↗</span></button></div>
  </article>`).join('')}</div>`;
  return `<table class="wide-table member-list-table"><thead><tr><th scope="col">THÀNH VIÊN</th><th scope="col">LỚP</th><th scope="col">VỊ TRÍ / VAI TRÒ</th><th scope="col">THAM GIA</th><th scope="col">QUỸ THÁNG ĐẦU</th><th scope="col"><span class="sr-only">Hồ sơ</span></th></tr></thead><tbody>${members.map(member => `<tr>
    <td><button class="member-name-button user" data-action="memberDetail" data-id="${esc(member.id)}"><span class="avatar" aria-hidden="true">${avatarContent(member)}</span><span><b>${esc(member.name)}</b><span class="muted">${member.sourceIndex ? 'STT ' + esc(member.sourceIndex) : 'Thành viên mới'}</span></span></button></td>
    <td>${esc(member.unit || 'Chưa cập nhật')}</td><td class="table-note">${esc(memberPositionText(member))}</td>
    <td>${tag(member.status)}${member.locked ? tag('Tài khoản khóa') : ''}</td><td>${tag(member.duesStatus)}${memberReceiptLink(member)}</td>
    <td><button class="link" data-action="memberDetail" data-id="${esc(member.id)}" aria-label="Xem hồ sơ ${esc(member.name)}">Xem hồ sơ ↗</button></td>
  </tr>`).join('')}</tbody></table>`;
}

function memberFilterSelect(id, label, placeholder, options, value) {
  return `<label class="member-filter-field" for="${id}"><span>${label}</span><select id="${id}"><option value="">${placeholder}</option>${options.map(option => `<option value="${esc(option)}"${value === option ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select></label>`;
}

views.members = () => {
  const members = filteredMembers();
  return head('Đồng đội Rikkei', `${db.members.length} thành viên · ${readyCount()} sẵn sàng ra sân`, can('members') ? button('＋ Thêm thành viên', 'memberForm', '', true) : '') + sourceLine() + `<section class="panel member-directory">
    <div class="member-toolbar"><label class="member-search" for="memberSearch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span class="sr-only">Tìm tên, lớp, số thứ tự</span><input id="memberSearch" type="search" autocomplete="off" value="${esc(memberUI.query)}" placeholder="Tìm đồng đội theo tên, lớp…"></label>
      <div class="member-view-toggle" role="group" aria-label="Kiểu hiển thị thành viên"><button data-action="memberView" data-id="list" aria-pressed="${memberUI.view === 'list'}" class="${memberUI.view === 'list' ? 'active' : ''}" title="Hiển thị danh sách">☷ <span>Danh sách</span></button><button data-action="memberView" data-id="cards" aria-pressed="${memberUI.view === 'cards'}" class="${memberUI.view === 'cards' ? 'active' : ''}" title="Hiển thị dạng thẻ">▦ <span>Thẻ</span></button></div>
      ${can('members') ? button('↓ Xuất CSV', 'exportMembers') : ''}
    </div>
    <div class="member-filters">
      ${memberFilterSelect('memberPosition', 'Vị trí / Vai trò', 'Tất cả vị trí', ['Thủ Môn', 'Hậu Vệ', 'Tiền Vệ', 'Tiền Đạo', 'Quản Lý Đội', 'Hậu Cần', 'Truyền Thông'], memberUI.position)}
      ${memberFilterSelect('memberStatus', 'Tình trạng tham gia', 'Tất cả trạng thái', ['Sẵn sàng', 'Chờ xác nhận', 'Tạm nghỉ', 'Đã rời CLB'], memberUI.status)}
      ${memberFilterSelect('memberDues', 'Quỹ tháng đầu', 'Tất cả trạng thái quỹ', ['Đã đóng', 'Chưa đóng'], memberUI.dues)}
      <label class="member-filter-field" for="memberSort"><span>Sắp xếp theo</span><select id="memberSort">${[['source', 'Thứ tự trong Sheets'], ['name', 'Họ tên A → Z'], ['class', 'Lớp / Bộ phận']].map(([value, label]) => `<option value="${value}"${memberUI.sort === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
    </div>
    <div class="member-results-heading"><p id="memberCount" role="status" aria-live="polite">Hiển thị <b>${members.length}</b> / ${db.members.length} thành viên</p><button class="link" id="memberClear" data-action="memberClearFilters"${memberFiltersActive() ? '' : ' hidden'}>Xóa bộ lọc</button></div>
    <div id="memberTable" class="member-results${memberUI.view === 'list' ? ' tablewrap' : ''}">${memberTable(members)}</div>
  </section>`;
};

function refreshMemberResults() {
  const container = document.getElementById('memberTable');
  if (!container) return;
  const members = filteredMembers();
  container.className = 'member-results' + (memberUI.view === 'list' ? ' tablewrap' : '');
  container.innerHTML = memberTable(members);
  const count = document.getElementById('memberCount');
  if (count) count.innerHTML = `Hiển thị <b>${members.length}</b> / ${db.members.length} thành viên`;
  const clear = document.getElementById('memberClear');
  if (clear) clear.hidden = !memberFiltersActive();
  document.querySelectorAll('[data-action="memberView"]').forEach(button => {
    const selected = button.dataset.id === memberUI.view;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  bind(container);
}

/* Call after the existing bind() so legacy handlers are replaced, not duplicated. */
function bindMemberUI() {
  const controls = { memberSearch: 'query', memberPosition: 'position', memberStatus: 'status', memberDues: 'dues', memberSort: 'sort' };
  Object.entries(controls).forEach(([id, key]) => {
    const control = document.getElementById(id);
    if (!control) return;
    control.oninput = () => {
      memberUI[key] = control.value;
      if (key === 'sort') saveMemberPreference();
      refreshMemberResults();
    };
  });
}

function showMemberDetail(id) {
  const member = db.members.find(item => item.id === id);
  if (!member || (!allowed('members') && member.id !== userId)) return;
  const fields = [
    ['Lớp / Bộ phận', member.unit], ['Vị trí / Vai trò trong đội', memberPositionText(member)],
    ['Chức vụ được cấp', assignedRole(member)], ['Ban phụ trách', member.department], ['Ngày tham gia', member.joined ? date(member.joined) : 'Chưa cập nhật'],
    ['Email', member.email], ['Số điện thoại', member.phone]
  ];
  modal('Hồ sơ đồng đội', `<div class="member-detail-hero"><span class="avatar large" aria-hidden="true">${avatarContent(member)}</span><div class="member-detail-heading"><h3>${esc(member.name)}</h3><p class="muted">${esc(member.unit || 'Chưa cập nhật lớp')}${member.sourceIndex ? ' · STT ' + esc(member.sourceIndex) : ''}</p></div></div>
    <div class="member-detail-status">${tag(member.status)}${tag(member.duesStatus)}${member.locked ? tag('Tài khoản khóa') : ''}</div>
    <dl class="member-detail-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value || 'Chưa cập nhật')}</dd></div>`).join('')}</dl>
    ${member.note ? `<div class="member-detail-note"><h3>Ghi chú</h3><p>${esc(member.note)}</p></div>` : ''}
    ${member.note2 ? `<div class="member-detail-note"><h3>Ghi chú bổ sung</h3><p>${esc(member.note2)}</p></div>` : ''}
    ${isAdmin()?`<div class="member-detail-source"><p>${member.source ? `Nguồn: ${esc(member.source.sheet)} · hàng ${esc(member.source.row)}` : 'Thành viên được bổ sung trên website.'}</p>${member.source ? sourceLink : ''}${member.localUpdatedAt ? '<p class="muted">Hồ sơ có thông tin được cập nhật trên trình duyệt này.</p>' : ''}</div>`:''}
    <div class="actions member-detail-actions">${memberReceiptLink(member)}<span class="grow"></span>${button('Đóng', 'close')}${isAdmin()?button('Cập nhật chức vụ','assignRole',member.id):''}${can('members') && (isAdmin() || member.role !== roles[0]) ? button('Chỉnh sửa hồ sơ', 'memberForm', member.id, true) : ''}</div>`);
}

/* Return true only for a handled action; the main dispatcher handles all others. */
function handleMemberAction(actionName, id) {
  if (actionName === 'memberDetail') { showMemberDetail(id); return true; }
  if (actionName === 'memberView') {
    if (!['cards', 'list'].includes(id)) return true;
    memberUI.view = id;
    saveMemberPreference();
    refreshMemberResults();
    return true;
  }
  if (actionName === 'memberClearFilters') {
    Object.assign(memberUI, { query: '', position: '', status: '', dues: '' });
    ['memberSearch', 'memberPosition', 'memberStatus', 'memberDues'].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = '';
    });
    refreshMemberResults();
    document.getElementById('memberSearch')?.focus();
    return true;
  }
  return false;
}
