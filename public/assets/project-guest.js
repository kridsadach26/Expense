const token = location.hash.slice(1);
const form = document.getElementById('submitRequest');
const status = document.getElementById('status');
const result = document.getElementById('result');
const fields = form.elements;
let requestId = crypto.randomUUID();

async function send(payload) {
  const res = await fetch('/api/project-share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ระบบไม่พร้อม กรุณาลองอีกครั้ง');
  return data;
}

async function compressProof(file) {
  if (!file || file.size > 15000000) throw new Error('กรุณาเลือกภาพขนาดไม่เกิน 15 MB');
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.75, 0.55, 0.35, 0.2]) {
      const proof = canvas.toDataURL('image/jpeg', quality);
      if (proof.length <= 250000) return proof;
    }
    throw new Error('ภาพมีขนาดใหญ่เกินไป กรุณาเลือกภาพอื่น');
  } finally {
    image.close();
  }
}

function updateForm() {
  const payment = fields.action.value === 'payment';
  for (const [id, active] of [['expenseFields', !payment], ['paymentFields', payment]]) {
    const group = document.getElementById(id);
    group.hidden = group.disabled = !active;
  }
  for (const option of fields.toId.options) option.disabled = option.value === fields.memberId.value && !!option.value;
  if (fields.toId.selectedOptions[0]?.disabled) fields.toId.value = '';
}

function renderOverview(project) {
  const view = project.overview;
  if (!view) return;
  const element = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: project.currency || 'THB', maximumFractionDigits: 2
  }).format(value);
  const metric = (id, label, value) => {
    const tile = document.createElement('div');
    tile.className = 'metric';
    const strong = document.createElement('strong');
    strong.textContent = value;
    tile.append(label, strong);
    element(id).append(tile);
  };
  const rows = (id, items, toText, empty) => {
    const target = element(id);
    if (!items.length) target.textContent = empty;
    for (const item of items) {
      const [title, detail, value] = toText(item);
      const row = document.createElement('div');
      row.className = 'summaryRow';
      const label = document.createElement('div');
      const subtitle = document.createElement('small');
      subtitle.textContent = detail;
      const amount = document.createElement('strong');
      amount.textContent = value;
      label.append(title, subtitle);
      row.append(label, amount);
      target.append(row);
    }
  };
  element('projectMeta').textContent = [
    [view.start, view.end].filter(Boolean).join(' ถึง '),
    view.destination,
    project.open ? 'กำลังดำเนินการ' : 'ปิดโปรเจกต์แล้ว'
  ].filter(Boolean).join(' · ');
  metric('metrics', 'ค่าใช้จ่ายรวม', money(view.total));
  metric('metrics', 'สมาชิก', view.memberCount + ' คน');
  metric('metrics', 'รายการค่าใช้จ่าย', view.expenseCount + ' รายการ');
  metric('metrics', 'รอตรวจสอบ', view.pendingCount + ' รายการ');
  if (view.fund) {
    element('fundSection').hidden = false;
    metric('fundMetrics', 'รับเข้ากองกลาง', money(view.fund.received));
    metric('fundMetrics', 'ใช้จากกองกลาง', money(view.fund.spent));
    metric('fundMetrics', 'กองกลางคงเหลือ', money(view.fund.balance));
    element('fundHolder').textContent = 'ผู้ถือเงินกองกลาง ' + view.fund.holder;
  }
  rows('balances', view.balances, item => [
    item.name, Math.abs(item.net) <= 0.005 ? 'เคลียร์แล้ว' : item.net < 0 ? 'ต้องจ่าย' : 'ต้องรับคืน',
    money(Math.abs(item.net) <= 0.005 ? 0 : Math.abs(item.net))
  ], 'ยังไม่มีสมาชิก');
  rows('expenses', view.expenses, item => [
    item.name || 'ค่าใช้จ่าย', [item.date, item.central ? 'จ่ายจากกองกลาง' : 'จ่ายโดย ' + item.payer].filter(Boolean).join(' · '),
    money(item.value)
  ], 'ยังไม่มีค่าใช้จ่าย');
  rows('payments', view.payments, item => [
    item.from + ' → ' + item.to, item.date || '', money(item.value)
  ], 'ยังไม่มีรายการชำระที่บันทึกแล้ว');
  if (view.schedule.length) {
    element('projectSchedule').hidden = false;
    rows('schedule', view.schedule, item => [
      item.title || 'กำหนดการ', [item.date, item.place].filter(Boolean).join(' · '), item.time || ''
    ], '');
  }
  const scheduleLink = element('scheduleLink');
  if (view.schedule.length || project.itinerary?.html) {
    scheduleLink.hidden = false;
    scheduleLink.href = view.schedule.length ? '#projectSchedule' : '#itinerary';
  }
  element('projectNav').hidden = false;
  element('projectNav').addEventListener('click', event => {
    const href = event.target.closest('a')?.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    element(href.slice(1))?.scrollIntoView();
  });
  element('overview').hidden = false;
}

async function initialize() {
  try {
    if (!token) throw new Error('กรุณาเปิดจากลิงก์ที่ได้รับจากเจ้าของโปรเจกต์');
    const project = await send({ action: 'view' });
    document.getElementById('title').textContent = project.name;
    renderOverview(project);
    status.textContent = 'รายการที่ส่งจะรอเจ้าของโปรเจกต์อนุมัติ';
    document.getElementById('currency').textContent = '(' + project.currency + ')';
    if (project.itinerary?.html) {
      document.getElementById('itinerary').hidden = false;
      document.getElementById('filename').textContent = project.itinerary.name;
      document.getElementById('showItinerary').onclick = () => {
        const frame = document.getElementById('itineraryFrame');
        const policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'";
        frame.srcdoc = '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '">' + project.itinerary.html;
        frame.hidden = false;
        document.getElementById('showItinerary').hidden = true;
      };
    }
    fields.memberId.add(new Option('เลือกชื่อของคุณ', ''));
    fields.toId.add(new Option('เลือกผู้รับเงิน', ''));
    for (const member of project.members) {
      fields.memberId.add(new Option(member.name, member.id));
      fields.toId.add(new Option(member.name, member.id));
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'participantIds';
      checkbox.value = member.id;
      checkbox.defaultChecked = true;
      label.append(checkbox, ' ' + member.name);
      document.getElementById('participants').append(label);
    }
    fields.date.defaultValue = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format();
    if (!project.open) {
      fields.action.querySelector('[value="expense"]').disabled = true;
      fields.action.querySelector('[value="payment"]').defaultSelected = true;
    }
    form.hidden = !project.members.length;
    document.querySelector('#projectNav a').hidden = form.hidden;
    updateForm();
  } catch (error) {
    status.textContent = error.message;
  }
}
fields.action.addEventListener('change', updateForm);
fields.memberId.addEventListener('change', updateForm);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  result.textContent = 'กำลังส่ง…';
  try {
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd);
    payload.id = requestId;
    if (payload.action === 'expense') {
      payload.participantIds = fd.getAll('participantIds');
      if (!payload.participantIds.length) throw new Error('กรุณาเลือกผู้ร่วมหารอย่างน้อยหนึ่งคน');
      payload.image = await compressProof(fd.get('image'));
    }
    await send(payload);
    requestId = crypto.randomUUID();
    const member = fields.memberId.value;
    form.reset();
    fields.memberId.value = member;
    updateForm();
    result.textContent = 'ส่งแล้ว รอเจ้าของโปรเจกต์ตรวจสอบและอนุมัติ';
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
initialize();
