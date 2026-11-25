const token = location.hash.slice(1);
const form = document.getElementById('submitRequest');
const status = document.getElementById('status');
const result = document.getElementById('result');
const fields = form.elements;
let requestId = crypto.randomUUID();
let paymentPairs = [];

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
  document.getElementById('guestRequestTitle').textContent = payment ? 'แจ้งว่าโอนแล้ว' : 'ส่งค่าใช้จ่าย';
  for (const [id, active] of [['expenseFields', !payment], ['paymentFields', payment]]) {
    const group = document.getElementById(id);
    group.hidden = group.disabled = !active;
  }
  const sender = fields.memberId.value;
  const pair = paymentPairs.find(members => members.includes(sender));
  for (const option of fields.toId.options) option.disabled = Boolean(option.value && (option.value === sender || pair?.includes(option.value)));
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
  const rows = (id, items, toText, empty, addAction) => {
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
      addAction?.(row, item);
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
  ], 'ยังไม่มีค่าใช้จ่าย', (row, expense) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'expenseProof';
    button.textContent = expense.proofCount && expense.id ? 'ดูรายละเอียด · หลักฐาน ' + expense.proofCount + ' รูป' : 'ดูรายละเอียด';
    row.classList.add('clickableExpense');
    row.onclick = () => openExpenseProof(expense, money);
    row.append(button);
  });
  rows('guestTransfers', view.transfers || [], item => [
    item.from + ' → ' + item.to, 'ยอดที่ต้องโอนคืน', money(item.amount)
  ], 'ไม่มีรายการที่ต้องโอนคืน');
  rows('payments', view.payments, item => [
    item.from + ' → ' + item.to, item.date || '', money(item.value)
  ], 'ยังไม่มีรายการชำระที่บันทึกแล้ว');
  const itineraryRows = new Map();
  for (const item of view.schedule) {
    const date = item.date || 'ยังไม่กำหนดวัน';
    if (!itineraryRows.has(date)) itineraryRows.set(date, []);
    itineraryRows.get(date).push(item);
  }
  if (!itineraryRows.size) element('schedule').textContent = 'ยังไม่มีแผนรายวัน';
  let day = 0;
  for (const [date, items] of itineraryRows) {
    const title = document.createElement('h3');
    title.className = 'guest-day';
    title.textContent = date;
    const list = document.createElement('div');
    list.id = 'guestDay' + (++day);
    const dayCard = document.createElement('div');
    dayCard.className = 'guest-schedule-day';
    dayCard.append(title, list);
    element('schedule').append(dayCard);
    rows(list.id, items, item => [item.title || 'กำหนดการ', item.place || '', item.time || ''], '');
  }
  for (const member of project.members) {
    const label = document.createElement('span');
    label.textContent = member.name;
    element('members').append(label);
  }
  if (project.itinerary && !view.schedule.length) element('scheduleLink').href = '#itinerary';
  const memberCount = element('tripMemberCount');
  memberCount.textContent = project.members.length + ' คนร่วมทริป';
  memberCount.hidden = !project.members.length;
  element('projectNav').hidden = false;
  element('projectNav').addEventListener('click', event => {
    const link = event.target.closest('a');
    const href = link?.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    if (link.dataset.action) {
      fields.action.value = link.dataset.action;
      updateForm();
    }
    const target = element(href.slice(1));
    const section = target?.closest('details');
    if (section) section.open = true;
    target?.scrollIntoView();
  });
  element('overview').hidden = false;
}

let collectionView;
let collectionRequestId=crypto.randomUUID();
const collectionForm=document.getElementById('guestCollectionForm');
const collectionFields=collectionForm.elements;
function updateCollectionForm(){
  const round=collectionView?.collections.find(item=>item.id===collectionFields.collectionId.value);
  const member=collectionFields.memberId.value;
  const pair=(collectionView?.paymentPairs||[]).find(ids=>ids.includes(member)&&ids.every(id=>round?.targets.some(target=>target.id===id)));
  const pairLabel=document.getElementById('guestCollectionPair');
  pairLabel.hidden=!pair;
  if(!pair)collectionFields.together.checked=false;
  const ids=collectionFields.together.checked&&pair?pair:[member];
  const due=(round?.targets||[]).filter(item=>ids.includes(item.id))
    .reduce((sum,item)=>sum+Math.max(0,item.cents-item.paid-item.pending),0);
  const value=(due/100).toFixed(2);
  collectionFields.amount.value=due?value:'';
  collectionFields.amount.max=value;
  document.getElementById('guestCollectionSend').disabled=!due;
  document.getElementById('guestCollectionDue').textContent=member?'ยอดที่ยังส่งได้ '+value+' '+collectionView.currency:'เลือกชื่อเพื่อดูยอดที่ยังส่งได้';
}
function renderGuestCollections(project){
  const rounds=project.collections||[];
  collectionView={...project,collections:rounds};
  document.getElementById('collectionNav').hidden=!rounds.length;
  document.getElementById('guestCollections').hidden=!rounds.length;
  const list=document.getElementById('guestCollectionList');
  const names=new Map(project.members.map(member=>[member.id,member.name]));
  const money=cents=>new Intl.NumberFormat('th-TH',{style:'currency',currency:project.currency}).format(cents/100);
  list.replaceChildren();
  for(const round of rounds){
    const card=document.createElement('div');
    card.className='guest-collection-round';
    const title=document.createElement('h3');
    title.textContent=round.name;
    const meta=document.createElement('p');
    meta.textContent=[round.closed?'ปิดรับแล้ว':'เปิดรับ',round.dueDate?'ครบกำหนด '+round.dueDate:''].filter(Boolean).join(' · ');
    card.append(title,meta);
    if(round.account?.number){
      const account=document.createElement('p');
      account.textContent=[round.account.name,round.account.number].filter(Boolean).join(' · ');
      card.append(account);
      const copy=document.createElement('button');copy.type='button';copy.textContent='คัดลอกเลขบัญชี';
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(round.account.number);copy.textContent='คัดลอกแล้ว'}catch{window.prompt('คัดลอกเลขบัญชี',round.account.number)}};
      card.append(copy);
    }
    if(round.qr){
      const qr=document.createElement('img');qr.src=round.qr;qr.alt='QR สำหรับโอนเข้ากองกลาง';qr.className='guest-collection-qr';card.append(qr);
    }
    for(const target of round.targets){
      const row=document.createElement('p');
      const state=target.paid>=target.cents?'ครบแล้ว':target.pending?'รอตรวจ '+money(target.pending):target.paid?'จ่ายบางส่วน':'ยังไม่จ่าย';
      row.textContent=(names.get(target.id)||target.name||'สมาชิกเดิม')+' · '+money(target.paid)+' / '+money(target.cents)+' · '+state;
      card.append(row);
    }
    list.append(card);
  }
  const active=project.open?rounds.filter(round=>!round.closed):[];
  const selectedRound=collectionFields.collectionId.value;
  const selectedMember=collectionFields.memberId.value;
  collectionForm.hidden=!active.length;
  collectionFields.collectionId.replaceChildren(...active.map(round=>new Option(round.name,round.id)));
  if(active.some(round=>round.id===selectedRound))collectionFields.collectionId.value=selectedRound;
  collectionFields.memberId.replaceChildren(new Option('เลือกชื่อ',''),...project.members.map(member=>new Option(member.name,member.id)));
  if(names.has(selectedMember))collectionFields.memberId.value=selectedMember;
  if(!collectionFields.date.value)collectionFields.date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
  updateCollectionForm();
}
for(const name of ['collectionId','memberId','together'])collectionFields[name].addEventListener('change',updateCollectionForm);
collectionForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const status=document.getElementById('guestCollectionStatus'), button=document.getElementById('guestCollectionSend');
  if(button.disabled)return;
  button.disabled=true;
  status.textContent='กำลังส่งสลิป…';
  try{
    const fields=new FormData(collectionForm);
    const data=Object.fromEntries(fields);
    data.id=collectionRequestId;
    data.action='collection';
    data.together=fields.has('together');
    data.image=await compressProof(fields.get('image'));
    await send(data);
    collectionRequestId=crypto.randomUUID();
    collectionFields.image.value='';
    status.textContent='ส่งสลิปแล้ว · รอตรวจสอบ';
    try{renderGuestCollections(await send({action:'view'}))}
    catch{status.textContent='ส่งสลิปแล้ว · เปิดหน้าอีกครั้งเพื่อดูยอดล่าสุด'}
  }catch(error){status.textContent=error.message;button.disabled=false}
});
function openExpenseProof(expense, money) {
  const dialog = document.getElementById('expenseProofDialog');
  const image = document.getElementById('proofImage');
  const status = document.getElementById('proofStatus');
  const previous = document.getElementById('previousProof');
  const next = document.getElementById('nextProof');
  let index = 0;
  let request = 0;

  async function load() {
    const currentRequest = ++request;
    previous.disabled = index === 0;
    next.disabled = index + 1 >= expense.proofCount;
    image.hidden = true;
    image.removeAttribute('src');
    status.textContent = 'กำลังโหลดหลักฐาน…';
    try {
      const data = await send({ action: 'expense-proof', expenseId: expense.id, index });
      if (!dialog.open || currentRequest !== request) return;
      image.src = data.image;
      image.hidden = false;
      status.textContent = 'รูป ' + (index + 1) + ' จาก ' + expense.proofCount;
    } catch (error) {
      if (dialog.open && currentRequest === request) status.textContent = error.message;
    }
  }

  document.getElementById('proofTitle').textContent = expense.name || 'หลักฐานค่าใช้จ่าย';
  document.getElementById('closeProof').onclick = () => dialog.close();
  dialog.onclose = () => { request++; image.removeAttribute('src'); };
  previous.onclick = () => { if (index > 0) { index--; load(); } };
  next.onclick = () => { if (index + 1 < expense.proofCount) { index++; load(); } };
  document.getElementById('proofSummary').textContent = [
    money(expense.value), expense.date, expense.central ? 'จ่ายจากกองกลาง' : 'ผู้จ่าย ' + expense.payer
  ].filter(Boolean).join(' · ');
  const hasProof = Boolean(expense.id && expense.proofCount);
  previous.hidden = next.hidden = !hasProof || expense.proofCount < 2;
  image.hidden = true;
  status.textContent = 'ไม่มีรูปแนบ';
  dialog.showModal();
  if (hasProof) load();
}

function renderItinerary(itinerary) {
  if (!itinerary) return;
  const element = id => document.getElementById(id);
  const status = element('fileStatus');
  const open = element('showItinerary');
  const download = element('downloadItinerary');
  let previewUrl;
  element('itinerary').hidden = false;
  element('filename').textContent = itinerary.name || 'กำหนดการ';
  const html = itinerary.type === 'text/html' || Boolean(itinerary.html);
  const image = itinerary.type?.startsWith('image/');
  const pdf = itinerary.type === 'application/pdf';
  open.hidden = !html && !image && !pdf;
  if (pdf) open.textContent = 'เตรียมเปิด PDF';

  async function fileAction(button, action) {
    button.disabled = true;
    status.textContent = 'กำลังเปิดไฟล์…';
    try {
      const url = itinerary.stored ? (await send({ action: 'itinerary-file' })).url : null;
      await action(url);
      if (status.textContent === 'กำลังเปิดไฟล์…') status.textContent = '';
    } catch (error) {
      status.textContent = error.message || 'เปิดไฟล์ไม่ได้ กรุณาลองอีกครั้ง';
    } finally {
      button.disabled = false;
    }
  }
  download.onclick = () => fileAction(download, url => {
    const link = document.createElement('a');
    link.href = url || URL.createObjectURL(new Blob([itinerary.html], { type: 'text/html' }));
    link.download = itinerary.name || 'itinerary.html';
    document.body.append(link);
    link.click();
    link.remove();
    if (!url) setTimeout(() => URL.revokeObjectURL(link.href), 30000);
  });
  open.onclick = () => fileAction(open, async url => {
    const response = url ? await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }) : null;
    if (response && !response.ok) throw new Error('โหลดไฟล์กำหนดการไม่สำเร็จ');
    if (html) {
      const content = response ? await response.text() : itinerary.html;
      const frame = element('itineraryFrame');
      const policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'";
      frame.srcdoc = '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '">' + content;
      frame.hidden = false;
    } else {
      const bytes = await response.arrayBuffer();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(new Blob([bytes], { type: itinerary.type }));
      const preview = element(image ? 'itineraryImage' : 'openPdfItinerary');
      if (image) preview.src = previewUrl;
      else preview.href = previewUrl;
      preview.hidden = false;
      if (pdf) preview.focus();
    }
    open.hidden = true;
  });
}

async function initialize() {
  try {
    if (!token) throw new Error('กรุณาเปิดจากลิงก์ที่ได้รับจากเจ้าของโปรเจกต์');
    if (new URLSearchParams(location.search).get('proof') === '1') {
      document.getElementById('title').textContent = 'หลักฐานการชำระเงิน';
      const proof = await send({ action: 'payment-proof-view' });
      const amount = new Intl.NumberFormat('th-TH', { style: 'currency', currency: proof.currency }).format(proof.amount);
      document.getElementById('recipientProofDetails').textContent = [proof.from + ' → ' + proof.to, amount, proof.date].join(' · ');
      document.getElementById('recipientProofImage').src = proof.image;
      document.getElementById('recipientProof').hidden = false;
      status.textContent = '';
      return;
    }
    const project = await send({ action: 'view' });
    paymentPairs = project.paymentPairs || [];
    document.getElementById('title').textContent = project.name;
    renderOverview(project);
    renderGuestCollections(project);
    status.textContent = project.open ? '' : 'ทริปนี้ปิดแล้ว';
    renderItinerary(project.itinerary);
    document.getElementById('currency').textContent = '(' + project.currency + ')';
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
    document.getElementById('submitLink').hidden = form.hidden || !project.open;
    document.getElementById('reportPaymentLink').hidden = form.hidden;
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
    }
    payload.image = await compressProof(fd.get('image'));
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
