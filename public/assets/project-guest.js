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

async function initialize() {
  try {
    if (!token) throw new Error('กรุณาเปิดจากลิงก์ที่ได้รับจากเจ้าของโปรเจกต์');
    const project = await send({ action: 'view' });
    document.getElementById('title').textContent = project.name;
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
