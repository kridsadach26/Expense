'use strict';
const $ = id => document.getElementById(id);
function safeParseStorage(key,fallback){
  try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}
  catch(err){console.warn('ข้อมูล Cache เสียหาย:',key,err);return fallback}
}
function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function inlineJsString(value=''){
  return JSON.stringify(String(value)).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
}
function newId(){
  if(globalThis.crypto?.randomUUID)return globalThis.newId();
  const bytes=new Uint8Array(16);
  if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function stableCategoryId(prefix,name){
  let hash=2166136261;
  const source=`${prefix}:${String(name||'').trim().toLowerCase()}`;
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return `${prefix}-${(hash>>>0).toString(36)}`;
}
function categoryNode(name,icon='🏷️',children=[]){
  return {id:stableCategoryId('cat',name),name,icon,children:children.map(sub=>{
    if(typeof sub==='string')return {id:stableCategoryId(`sub-${name}`,sub),name:sub,children:[]};
    const subName=sub.name||'อื่น ๆ';
    return {
      id:sub.id||stableCategoryId(`sub-${name}`,subName),
      name:subName,
      children:(sub.children||[]).map(detail=>({
        id:typeof detail==='string'?stableCategoryId(`detail-${name}-${subName}`,detail):(detail.id||stableCategoryId(`detail-${name}-${subName}`,detail.name)),
        name:typeof detail==='string'?detail:detail.name
      }))
    };
  })};
}
function defaultCategoryCatalog(){
  return [
    categoryNode('อาหาร','🍽️',[
      {name:'ร้านอาหาร',children:['อาหารไทย','อาหารญี่ปุ่น','อาหารเกาหลี','ปิ้งย่าง','บุฟเฟต์','ฟาสต์ฟู้ด','อาหารตามสั่ง']},
      {name:'ซื้อวัตถุดิบ',children:['ของสด','ของแห้ง','เครื่องปรุง','ขนมและของทานเล่น']},
      {name:'เดลิเวอรี',children:['GrabFood','LINE MAN','foodpanda','อื่น ๆ']}
    ]),
    categoryNode('เครื่องดื่ม','☕',[
      {name:'คาเฟ่',children:['กาแฟ','ชา','โกโก้','เบเกอรี']},
      {name:'เครื่องดื่มทั่วไป',children:['น้ำดื่ม','น้ำอัดลม','น้ำผลไม้','เครื่องดื่มชูกำลัง']}
    ]),
    categoryNode('ของใช้ในบ้าน','🛒',[
      {name:'ของใช้ประจำวัน',children:['กระดาษและทิชชู','ของใช้ในห้องน้ำ','ของใช้ในครัว']},
      {name:'ทำความสะอาด',children:['น้ำยาทำความสะอาด','อุปกรณ์ทำความสะอาด']},
      {name:'เครื่องใช้ในบ้าน',children:['เฟอร์นิเจอร์','เครื่องใช้ไฟฟ้า','ของตกแต่ง']}
    ]),
    categoryNode('ค่าน้ำค่าไฟ','💡',[
      {name:'สาธารณูปโภค',children:['ค่าไฟ','ค่าน้ำ','ค่าแก๊ส']},
      {name:'สื่อสาร',children:['อินเทอร์เน็ตบ้าน','โทรศัพท์มือถือ','บริการออนไลน์']}
    ]),
    categoryNode('เดินทาง','🚌',[
      {name:'ขนส่งสาธารณะ',children:['รถไฟฟ้า','รถเมล์','รถไฟ','เรือ']},
      {name:'รถรับจ้าง',children:['แท็กซี่','Grab','Bolt']},
      {name:'การเดินทางไกล',children:['ตั๋วเครื่องบิน','รถทัวร์','รถเช่า']}
    ]),
    categoryNode('รถยนต์','🚗',[
      {name:'เชื้อเพลิง',children:['ดีเซล','เบนซิน','แก๊ส','ชาร์จรถไฟฟ้า']},
      {name:'ค่าทางและที่จอด',children:['ค่าทางด่วน','ค่าจอดรถ']},
      {name:'ซ่อมบำรุง',children:['เช็กระยะ','น้ำมันเครื่อง','ยาง','แบตเตอรี่','อะไหล่','ล้างรถ']},
      {name:'เอกสารและประกัน',children:['ประกันรถ','พ.ร.บ.','ภาษีรถ','ค่าปรับ']}
    ]),
    categoryNode('ที่อยู่อาศัย','🏠',[
      {name:'ค่าที่อยู่',children:['ค่าเช่า','ผ่อนบ้าน','ค่าส่วนกลาง']},
      {name:'ซ่อมและปรับปรุง',children:['ซ่อมบ้าน','ต่อเติม','อุปกรณ์ช่าง']}
    ]),
    categoryNode('สุขภาพ','🏥',[
      {name:'การรักษา',children:['พบแพทย์','ทันตกรรม','กายภาพบำบัด']},
      {name:'ยาและเวชภัณฑ์',children:['ยา','วิตามิน','อุปกรณ์การแพทย์']},
      {name:'สุขภาพเชิงป้องกัน',children:['ตรวจสุขภาพ','วัคซีน','ประกันสุขภาพ']}
    ]),
    categoryNode('ท่องเที่ยว','✈️',[
      {name:'ที่พัก',children:['โรงแรม','รีสอร์ต','โฮมสเตย์']},
      {name:'กิจกรรม',children:['ค่าเข้าชม','ทัวร์','กิจกรรมผจญภัย']},
      {name:'ค่าใช้จ่ายทริป',children:['อาหารทริป','การเดินทางในทริป','ของฝาก']}
    ]),
    categoryNode('ช้อปปิ้ง','🛍️',[
      {name:'ของใช้ส่วนตัว',children:['เสื้อผ้า','รองเท้า','กระเป๋า','เครื่องสำอาง']},
      {name:'อุปกรณ์ไอที',children:['คอมพิวเตอร์','โทรศัพท์','อุปกรณ์เสริม']},
      {name:'ของขวัญ',children:['ของขวัญครอบครัว','ของขวัญเพื่อน','ของขวัญลูกค้า']}
    ]),
    categoryNode('บันเทิง','🎮',[
      {name:'สมาชิกและสตรีมมิ่ง',children:['Netflix','YouTube','Spotify','บริการอื่น ๆ']},
      {name:'กิจกรรมบันเทิง',children:['ภาพยนตร์','คอนเสิร์ต','เกม','งานอดิเรก']}
    ]),
    categoryNode('การศึกษา','📚',[
      {name:'ค่าเรียน',children:['คอร์สออนไลน์','ค่าอบรม','ค่าเทอม']},
      {name:'สื่อการเรียน',children:['หนังสือ','ซอฟต์แวร์','อุปกรณ์การเรียน']}
    ]),
    categoryNode('ธุรกิจและงาน','💼',[
      {name:'สำนักงาน',children:['อุปกรณ์สำนักงาน','ซอฟต์แวร์','ค่าบริการรายเดือน']},
      {name:'ลูกค้าและการตลาด',children:['เลี้ยงลูกค้า','โฆษณา','ของสมนาคุณ']},
      {name:'ค่าธรรมเนียม',children:['ธนาคาร','ภาครัฐ','ขนส่ง']}
    ]),
    categoryNode('รายได้','💰',[
      {name:'รายได้ประจำ',children:['เงินเดือน','ค่าจ้าง','โบนัส']},
      {name:'รายได้อื่น',children:['รายได้เสริม','ดอกเบี้ย','เงินปันผล','เงินคืน']}
    ]),
    categoryNode('อื่น ๆ','🏷️',[
      {name:'ไม่ระบุ',children:['ทั่วไป']}
    ])
  ];
}
function normalizeCategoryCatalog(raw,legacy=[]){
  const source=Array.isArray(raw)&&raw.length?raw:defaultCategoryCatalog();
  const normalizeNode=(node,level=0,parent='root')=>{
    if(typeof node==='string')return {id:stableCategoryId(`${level}-${parent}`,node),name:node,icon:level===0?'🏷️':undefined,children:[]};
    const name=String(node?.name||'').trim();
    if(!name)return null;
    return {
      id:node.id||stableCategoryId(`${level}-${parent}`,name),
      name,
      ...(level===0?{icon:node.icon||'🏷️'}:{}),
      children:(Array.isArray(node.children)?node.children:[]).map(child=>normalizeNode(child,level+1,`${parent}-${name}`)).filter(Boolean)
    };
  };
  const catalog=source.map(node=>normalizeNode(node)).filter(Boolean);
  (Array.isArray(legacy)?legacy:[]).forEach(name=>{
    if(name&&!catalog.some(node=>node.name===name))catalog.push(categoryNode(name,'🏷️',[]));
  });
  if(!catalog.some(node=>node.name==='อื่น ๆ'))catalog.push(categoryNode('อื่น ๆ','🏷️',[{name:'ไม่ระบุ',children:['ทั่วไป']}]));
  return catalog;
}
function parseTagInput(value){
  const seen=new Set();
  return String(value||'').split(/[,#\n]/).map(tag=>tag.trim()).filter(Boolean).filter(tag=>{
    const key=tag.toLocaleLowerCase('th-TH');
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,12);
}
function categoryPathLabel(path){
  return (Array.isArray(path)?path:[]).filter(Boolean).join(' › ');
}
function categoryPathValue(path){
  return encodeURIComponent(JSON.stringify((Array.isArray(path)?path:[]).filter(Boolean)));
}
function parseCategoryPathValue(value){
  try{
    const parsed=JSON.parse(decodeURIComponent(String(value||'')));
    return Array.isArray(parsed)?parsed.filter(Boolean):[];
  }catch{return value?[String(value)]:[]}
}
function flattenedCategoryPaths(){
  const rows=[];
  categoryCatalog.forEach(main=>{
    rows.push([main.name]);
    (main.children||[]).forEach(sub=>{
      rows.push([main.name,sub.name]);
      (sub.children||[]).forEach(detail=>rows.push([main.name,sub.name,detail.name]));
    });
  });
  return rows;
}
function detailedCategoryOptions(selectedPath=[]){
  const selected=categoryPathLabel(selectedPath);
  return flattenedCategoryPaths().map(path=>{
    const label=path.length===1?path[0]:`${'— '.repeat(path.length-1)}${path[path.length-1]}`;
    return `<option value="${categoryPathValue(path)}" ${categoryPathLabel(path)===selected?'selected':''}>${escapeHtml(label)}</option>`;
  }).join('');
}
function matchesCategoryPath(entry,path){
  const target=Array.isArray(path)&&path.length?path:[entry?.category].filter(Boolean);
  const actual=entryCategoryPath(entry);
  return target.every((part,index)=>actual[index]===part);
}
function entryCategoryPath(entry){
  if(Array.isArray(entry?.categoryPath)&&entry.categoryPath.length)return entry.categoryPath.filter(Boolean);
  return [entry?.category,entry?.subcategory,entry?.detailCategory].filter(Boolean);
}
function entryCategoryLabel(entry){
  return categoryPathLabel(entryCategoryPath(entry))||entry?.category||'ไม่ระบุ';
}
function normalizeMerchantKey(value){
  return String(value||'').trim().toLocaleLowerCase('th-TH').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}

const appLifecycle={booting:false,ready:false,redirecting:false,bootAttempts:0,lastError:null};
let entries = safeParseStorage('home-expense-entries',[]);
let imageData = [];
let splitCounter = 0;

let currentPeriod = 'month';
const initialParams = new URLSearchParams(location.search);
const urlUser = initialParams.get('user');
let activeUser = urlUser || sessionStorage.getItem('home-expense-user') || localStorage.getItem('home-expense-user') || '';

let appSettings = safeParseStorage('home-expense-settings',{});
let profiles = safeParseStorage('home-expense-profiles',{
  Toey:{name:'Toey',photo:''},
  Perla:{name:'Perla',photo:''}
});
let categories = safeParseStorage('home-expense-categories',["อาหาร","ของใช้ในบ้าน","ค่าน้ำค่าไฟ","เดินทาง","รถยนต์","ที่อยู่อาศัย","สุขภาพ","ท่องเที่ยว","รายได้","อื่น ๆ"]);
let categoryCatalog = normalizeCategoryCatalog(safeParseStorage('home-expense-category-catalog',null),categories);
let tagLibrary = safeParseStorage('home-expense-tag-library',[]);
let merchantCategoryMemory = safeParseStorage('home-expense-merchant-category-memory',{});
let pendingMerchantSuggestions={};
categories=categoryCatalog.map(node=>node.name);

let budgets = safeParseStorage('home-expense-budgets',[]);
let recurringItems = safeParseStorage('home-expense-recurring',[]);
let creditCards = safeParseStorage('home-expense-cards',[]);

let projects = safeParseStorage('home-expense-projects',[]);
let calendarItems = safeParseStorage('home-expense-calendar',[]);
let appNotifications = safeParseStorage('home-expense-notifications',[]);
let calendarViewDate=new Date();let selectedCalendarDate=today();let calendarFilter='all';
let currentProjectId = null;
let projectExpenseImagesData = [];
let cloudReady=false;
let cloudSaveTimer=null;
let cloudSaving=false;
let cloudSaveAgain=false;
const cloudDataKeys=[
  'home-expense-entries','home-expense-settings','home-expense-profiles','home-expense-categories',
  'home-expense-budgets','home-expense-recurring','home-expense-cards','home-expense-projects','home-expense-calendar','home-expense-notifications',
  'home-expense-category-catalog','home-expense-tag-library','home-expense-merchant-category-memory'
];

function setBootState(title,message,{error=false,showActions=false}={}){
  const overlay=$('appBoot');
  if(!overlay)return;
  overlay.classList.toggle('error',error);
  overlay.classList.remove('hidden');
  $('appBootTitle').textContent=title||'Harmony Haven';
  $('appBootMessage').textContent=message||'';
  $('appBootActions').classList.toggle('hidden',!showActions);
}
function finishBoot(){
  appLifecycle.ready=true;appLifecycle.booting=false;
  document.body.classList.remove('app-loading');
  $('appBoot')?.classList.add('hidden');
}
function reportRuntimeError(message,error){
  console.error(message,error||'');
  let el=$('runtimeBanner');
  if(!el){el=document.createElement('div');el.id='runtimeBanner';el.className='runtime-banner';document.body.appendChild(el)}
  el.textContent=message;
  clearTimeout(reportRuntimeError.timer);
  reportRuntimeError.timer=setTimeout(()=>el.remove(),7000);
}
function redirectToLogin(reason='กรุณาเข้าสู่ระบบใหม่'){
  if(appLifecycle.redirecting)return;
  appLifecycle.redirecting=true;
  sessionStorage.removeItem('home-expense-user');
  setBootState('ต้องเข้าสู่ระบบ',reason,{error:true,showActions:true});
}
function persistActiveUser(name){
  if(!name)return;
  activeUser=name;
  sessionStorage.setItem('home-expense-user',name);
  if(appSettings.rememberUser!==false)localStorage.setItem('home-expense-user',name);
}
async function fetchJsonWithTimeout(url,options={},timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{...options,signal:controller.signal});
    let data={};
    try{data=await res.json()}catch{data={}}
    return {res,data};
  }finally{clearTimeout(timer)}
}
function cloudStateSnapshot(){
  return {schemaVersion:3,entries,appSettings,profiles,categories,categoryCatalog,tagLibrary,merchantCategoryMemory,budgets,recurringItems,creditCards,projects,calendarItems,appNotifications};
}
function setCloudStatus(text,type=''){
  const el=$('cloudSyncStatus');if(!el)return;
  el.textContent=text;el.className='cloud-sync-status '+type;
}
function applyCloudState(state={}){
  entries=Array.isArray(state.entries)?state.entries:[];
  appSettings=state.appSettings&&typeof state.appSettings==='object'?state.appSettings:{};
  profiles=state.profiles&&typeof state.profiles==='object'?state.profiles:profiles;
  categories=Array.isArray(state.categories)&&state.categories.length?state.categories:categories;
  categoryCatalog=normalizeCategoryCatalog(state.categoryCatalog,categories);
  categories=categoryCatalog.map(node=>node.name);
  tagLibrary=Array.isArray(state.tagLibrary)?state.tagLibrary:[];
  merchantCategoryMemory=state.merchantCategoryMemory&&typeof state.merchantCategoryMemory==='object'?state.merchantCategoryMemory:{};
  budgets=Array.isArray(state.budgets)?state.budgets:[];
  recurringItems=Array.isArray(state.recurringItems)?state.recurringItems:[];
  creditCards=Array.isArray(state.creditCards)?state.creditCards:[];
  projects=Array.isArray(state.projects)?state.projects:[];
  calendarItems=Array.isArray(state.calendarItems)?state.calendarItems:[];
  appNotifications=Array.isArray(state.appNotifications)?state.appNotifications:[];
}
function clearLegacyCloudData(){cloudDataKeys.forEach(k=>localStorage.removeItem(k));}
async function saveCloudState(){
  if(!cloudReady||!appLifecycle.ready)return;
  if(cloudSaving){cloudSaveAgain=true;return;}
  cloudSaving=true;setCloudStatus('กำลังบันทึก…','syncing');
  try{
    const {res,data}=await fetchJsonWithTimeout('/api/cloud/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:cloudStateSnapshot()})});
    if(!res.ok)throw Object.assign(new Error(data.error||'บันทึกไม่สำเร็จ'),{status:res.status});
    clearLegacyCloudData();setCloudStatus('บันทึกบน Cloud แล้ว','ok');
  }catch(err){
    console.error(err);setCloudStatus('Cloud มีปัญหา','error');
    reportRuntimeError(err.name==='AbortError'?'บันทึก Cloud ใช้เวลานานเกินไป ระบบจะลองใหม่เมื่อมีการเปลี่ยนแปลง':'บันทึก Cloud ไม่สำเร็จ: '+err.message,err);
  }finally{
    cloudSaving=false;
    if(cloudSaveAgain){cloudSaveAgain=false;setTimeout(saveCloudState,400)}
  }
}
function queueCloudSave(){
  if(!cloudReady||!appLifecycle.ready)return;
  clearTimeout(cloudSaveTimer);setCloudStatus('รอบันทึก…','syncing');
  cloudSaveTimer=setTimeout(saveCloudState,800);
}
async function bootstrapCloudState(){
  if(appLifecycle.booting)return;
  appLifecycle.booting=true;appLifecycle.bootAttempts+=1;
  setBootState('กำลังเปิด Harmony Haven','กำลังตรวจสอบผู้ใช้และโหลดข้อมูลจาก Cloud…');
  setCloudStatus('กำลังโหลด Cloud…','syncing');
  const legacy=cloudStateSnapshot();
  try{
    const {res,data}=await fetchJsonWithTimeout('/api/cloud/state',{cache:'no-store'});
    if(res.status===401||res.status===403){
      redirectToLogin(data.error||'เซสชันหมดอายุ');
      appLifecycle.booting=false;
      return;
    }
    if(!res.ok)throw new Error(data.error||'โหลด Cloud ไม่สำเร็จ');
    if(data.exists)applyCloudState(data.state||{});
    else{applyCloudState(legacy);cloudReady=true;}

    const profileName=data.activeProfile?.name||activeUser;
    if(!profileName){redirectToLogin('ไม่พบโปรไฟล์ที่กำลังใช้งาน');appLifecycle.booting=false;return;}
    persistActiveUser(profileName);
    cloudReady=true;clearLegacyCloudData();
    initializeStaticUI();
    refreshProfilesUI();refreshCategories();applyDashboardSettings();renderAll();
    if(!data.exists)await saveCloudState();
    setCloudStatus('ข้อมูล Cloud ล่าสุด','ok');
    const page=initialParams.get('page');if(page&&$(page))showPage(page,{updateUrl:false});
    const clean=new URL(location.href);clean.searchParams.delete('user');history.replaceState({},'',clean.pathname+clean.search);
    finishBoot();
  }catch(err){
    appLifecycle.lastError=err;appLifecycle.booting=false;
    const msg=err.name==='AbortError'?'Cloud ตอบสนองช้าเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่':err.message;
    setCloudStatus('โหลด Cloud ไม่สำเร็จ','error');
    setBootState('เปิดระบบไม่สำเร็จ',msg,{error:true,showActions:true});
    console.error(err);
  }
}


const supportedCurrencies=[
  ['THB','บาท'],['USD','ดอลลาร์สหรัฐ'],['JPY','เยน'],['EUR','ยูโร'],['GBP','ปอนด์'],
  ['CNY','หยวน'],['HKD','ดอลลาร์ฮ่องกง'],['SGD','ดอลลาร์สิงคโปร์'],['KRW','วอนเกาหลี'],
  ['VND','ดองเวียดนาม'],['MYR','ริงกิต'],['TWD','ดอลลาร์ไต้หวัน'],['AUD','ดอลลาร์ออสเตรเลีย'],['CHF','ฟรังก์สวิส']
];

function entryBaseAmount(entry){
  return Number(entry.baseAmount ?? (Number(entry.amount||0)*Number(entry.exchangeRate||1)));
}

function currencyOptions(selected='THB'){
  return supportedCurrencies.map(([code,name])=>`<option value="${code}" ${code===selected?'selected':''}>${code} ${name}</option>`).join('');
}
function expenseBaseAmount(e){
  return Number(e.baseAmount ?? (Number(e.amount||0)*Number(e.exchangeRate||1)));
}







function profileInitial(name){ return (name||'?').trim().charAt(0).toUpperCase(); }
function defaultAvatar(name){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" rx="60" fill="#ff9a2f"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="48" font-weight="700" fill="white">${profileInitial(name)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function refreshProfilesUI(){
  const t=profiles.Toey||{name:'Toey',photo:''}, p=profiles.Perla||{name:'Perla',photo:''};
  $('loginNameToey').textContent=t.name; $('loginNamePerla').textContent=p.name;
  $('loginPhotoToey').src=t.photo||defaultAvatar(t.name); $('loginPhotoPerla').src=p.photo||defaultAvatar(p.name);
  $('profileNameToey').value=t.name; $('profileNamePerla').value=p.name;
  $('profilePhotoToey').src=t.photo||defaultAvatar(t.name); $('profilePhotoPerla').src=p.photo||defaultAvatar(p.name);
  $('currentUser').innerHTML=`<option value="Toey">${t.name}</option><option value="Perla">${p.name}</option>`;
  $('payer').innerHTML=`<option value="Toey">${t.name}</option><option value="Perla">${p.name}</option>`;
  ['recurringPayer','cardOwner'].forEach(id=>{ if($(id)) $(id).innerHTML=`<option value="Toey">${t.name}</option><option value="Perla">${p.name}</option>`; });
  if(activeUser){
    $('currentUser').value=activeUser;
    $('activeUserName').textContent=profiles[activeUser]?.name||activeUser;
    $('payer').value=activeUser;
  }
}
function categoryMainById(id){return categoryCatalog.find(node=>node.id===id)}
function categorySubById(main,id){return main?.children?.find(node=>node.id===id)}
function selectedCategoryPath(prefix){
  const main=categoryMainById($(`${prefix}CategoryMain`)?.value);
  const sub=categorySubById(main,$(`${prefix}CategorySub`)?.value);
  const detail=sub?.children?.find(node=>node.id===$(`${prefix}CategoryDetail`)?.value);
  return [main?.name,sub?.name,detail?.name].filter(Boolean);
}
function refreshCategoryPathPreview(prefix){
  const preview=$(`${prefix}CategoryPathPreview`);
  if(preview)preview.textContent=categoryPathLabel(selectedCategoryPath(prefix))||'ยังไม่ได้เลือกหมวดหมู่';
}
function populateCategoryPicker(prefix,path=[]){
  const mainEl=$(`${prefix}CategoryMain`),subEl=$(`${prefix}CategorySub`),detailEl=$(`${prefix}CategoryDetail`);
  if(!mainEl||!subEl||!detailEl)return;
  const wanted=Array.isArray(path)?path:[];
  const previous=selectedCategoryPath(prefix);
  const target=wanted.length?wanted:previous;
  mainEl.innerHTML=categoryCatalog.map(node=>`<option value="${node.id}">${escapeHtml(node.icon||'🏷️')} ${escapeHtml(node.name)}</option>`).join('');
  let main=categoryCatalog.find(node=>node.name===target[0])||categoryMainById(mainEl.value)||categoryCatalog[0];
  if(main)mainEl.value=main.id;
  subEl.innerHTML='<option value="">ไม่ระบุหมวดย่อย</option>'+(main?.children||[]).map(node=>`<option value="${node.id}">${escapeHtml(node.name)}</option>`).join('');
  let sub=(main?.children||[]).find(node=>node.name===target[1])||categorySubById(main,subEl.value);
  subEl.value=sub?.id||'';
  detailEl.innerHTML='<option value="">ไม่ระบุรายละเอียด</option>'+(sub?.children||[]).map(node=>`<option value="${node.id}">${escapeHtml(node.name)}</option>`).join('');
  const detail=(sub?.children||[]).find(node=>node.name===target[2]);
  detailEl.value=detail?.id||'';
  subEl.disabled=!(main?.children||[]).length;
  detailEl.disabled=!(sub?.children||[]).length;
  refreshCategoryPathPreview(prefix);
}
function setCategoryPath(prefix,path=[]){populateCategoryPicker(prefix,path)}
const boundCategoryPickers=new Set();
function bindCategoryPicker(prefix){
  if(boundCategoryPickers.has(prefix))return;
  const mainEl=$(`${prefix}CategoryMain`),subEl=$(`${prefix}CategorySub`),detailEl=$(`${prefix}CategoryDetail`);
  if(!mainEl||!subEl||!detailEl)return;
  mainEl.addEventListener('change',()=>populateCategoryPicker(prefix,[categoryMainById(mainEl.value)?.name]));
  subEl.addEventListener('change',()=>{
    const main=categoryMainById(mainEl.value),sub=categorySubById(main,subEl.value);
    populateCategoryPicker(prefix,[main?.name,sub?.name]);
  });
  detailEl.addEventListener('change',()=>refreshCategoryPathPreview(prefix));
  boundCategoryPickers.add(prefix);
}
function syncFlatCategories(){
  categories=categoryCatalog.map(node=>node.name);
  if(!categories.length){categoryCatalog=defaultCategoryCatalog();categories=categoryCatalog.map(node=>node.name)}
}
function refreshTagLibrary(){
  const options=tagLibrary.map(tag=>`<option value="${escapeHtml(tag)}"></option>`).join('');
  ['entryTagSuggestions','projectTagSuggestions'].forEach(id=>{if($(id))$(id).innerHTML=options});
  const quick=tagLibrary.slice(0,10).map(tag=>`<button type="button" class="tag quick-tag" onclick="appendTagToInput('entryTags',${inlineJsString(tag)})">#${escapeHtml(tag)}</button>`).join('');
  if($('entryTagQuick'))$('entryTagQuick').innerHTML=quick;
  if($('projectTagQuick'))$('projectTagQuick').innerHTML=tagLibrary.slice(0,10).map(tag=>`<button type="button" class="tag quick-tag" onclick="appendTagToInput('projectExpenseTags',${inlineJsString(tag)})">#${escapeHtml(tag)}</button>`).join('');
  if($('tagLibraryTags'))$('tagLibraryTags').innerHTML=tagLibrary.length?tagLibrary.map((tag,i)=>`<span class="tag">#${escapeHtml(tag)}<button type="button" class="tag-delete" onclick="removeLibraryTag(${i})">×</button></span>`).join(''):'<span class="muted">ยังไม่มีแท็กที่บันทึกไว้</span>';
}
function appendTagToInput(inputId,tag){
  const input=$(inputId);if(!input)return;
  const tags=parseTagInput(input.value);
  if(!tags.some(x=>x.toLocaleLowerCase('th-TH')===String(tag).toLocaleLowerCase('th-TH')))tags.push(tag);
  input.value=tags.join(', ');
}
function rememberTags(tags){
  let changed=false;
  tags.forEach(tag=>{if(!tagLibrary.some(x=>x.toLocaleLowerCase('th-TH')===tag.toLocaleLowerCase('th-TH'))){tagLibrary.push(tag);changed=true}});
  if(changed){tagLibrary.sort((a,b)=>a.localeCompare(b,'th'));refreshTagLibrary()}
}
function removeLibraryTag(index){
  tagLibrary.splice(index,1);queueCloudSave();refreshTagLibrary();
}
function categoryUsageCount(path){
  const key=categoryPathLabel(path);
  let count=entries.filter(entry=>categoryPathLabel(entryCategoryPath(entry)).startsWith(key)).length;
  projects.forEach(project=>(project.expenses||[]).forEach(expense=>{if(categoryPathLabel(entryCategoryPath(expense)).startsWith(key))count++}));
  return count;
}
function renderCategoryManager(){
  const tree=$('categoryManagerTree');if(!tree)return;
  tree.innerHTML=categoryCatalog.map((main,index)=>`<details class="category-tree-main" ${index===0?'open':''}>
    <summary><span>${escapeHtml(main.icon||'🏷️')} <strong>${escapeHtml(main.name)}</strong></span><button type="button" class="category-tree-delete" onclick="event.preventDefault();event.stopPropagation();removeCategoryNode('${main.id}')">ลบ</button></summary>
    <div class="category-tree-children">${(main.children||[]).length?(main.children||[]).map(sub=>`<div class="category-tree-sub">
      <div class="category-tree-row"><span>↳ ${escapeHtml(sub.name)}</span><button type="button" class="category-tree-delete" onclick="removeCategoryNode('${main.id}','${sub.id}')">ลบ</button></div>
      <div class="category-tree-details">${(sub.children||[]).map(detail=>`<span class="tag">${escapeHtml(detail.name)}<button type="button" class="tag-delete" onclick="removeCategoryNode('${main.id}','${sub.id}','${detail.id}')">×</button></span>`).join('')||'<span class="muted">ยังไม่มีรายละเอียดระดับ 3</span>'}</div>
    </div>`).join(''):'<div class="muted">ยังไม่มีหมวดย่อย</div>'}</div>
  </details>`).join('');
  const mainOptions=categoryCatalog.map(main=>`<option value="${main.id}">${escapeHtml(main.name)}</option>`).join('');
  if($('categoryParentMain'))$('categoryParentMain').innerHTML=mainOptions;
  refreshCategorySubParentOptions();
}
function refreshCategorySubParentOptions(){
  const main=categoryMainById($('categoryParentMain')?.value)||categoryCatalog[0];
  if($('categoryParentSub'))$('categoryParentSub').innerHTML=(main?.children||[]).map(sub=>`<option value="${sub.id}">${escapeHtml(sub.name)}</option>`).join('')||'<option value="">กรุณาเพิ่มหมวดย่อยก่อน</option>';
}
function addMainCategory(){
  const input=$('newMainCategory'),name=input?.value.trim();if(!name)return;
  if(categoryCatalog.some(node=>node.name.toLocaleLowerCase('th-TH')===name.toLocaleLowerCase('th-TH')))return alert('มีหมวดหลักนี้อยู่แล้ว');
  categoryCatalog.push({id:newId(),name,icon:'🏷️',children:[]});input.value='';syncFlatCategories();queueCloudSave();refreshCategories();
}
function addSubCategory(){
  const main=categoryMainById($('categoryParentMain')?.value),input=$('newSubCategory'),name=input?.value.trim();
  if(!main||!name)return;
  if((main.children||[]).some(node=>node.name.toLocaleLowerCase('th-TH')===name.toLocaleLowerCase('th-TH')))return alert('มีหมวดย่อยนี้อยู่แล้ว');
  main.children.push({id:newId(),name,children:[]});input.value='';queueCloudSave();refreshCategories();
}
function addDetailCategory(){
  const main=categoryMainById($('categoryParentMain')?.value),sub=categorySubById(main,$('categoryParentSub')?.value),input=$('newDetailCategory'),name=input?.value.trim();
  if(!sub||!name)return alert('กรุณาเลือกหมวดย่อยก่อน');
  if((sub.children||[]).some(node=>node.name.toLocaleLowerCase('th-TH')===name.toLocaleLowerCase('th-TH')))return alert('มีรายละเอียดนี้อยู่แล้ว');
  sub.children.push({id:newId(),name});input.value='';queueCloudSave();refreshCategories();
}
function removeCategoryNode(mainId,subId='',detailId=''){
  const main=categoryMainById(mainId);if(!main)return;
  const sub=categorySubById(main,subId);
  const detail=sub?.children?.find(node=>node.id===detailId);
  const path=[main.name,sub?.name,detail?.name].filter(Boolean),used=categoryUsageCount(path);
  if(!subId&&categoryCatalog.length<=1)return alert('ต้องมีหมวดหลักอย่างน้อย 1 หมวด');
  const warning=used?`\nพบ ${used} รายการเก่าที่ใช้หมวดนี้ รายการเก่าจะยังคงข้อมูลเดิม แต่จะเลือกหมวดนี้กับรายการใหม่ไม่ได้`:'';
  if(!confirm(`ลบ “${categoryPathLabel(path)}” ออกจากรายการหมวดหมู่หรือไม่?${warning}`))return;
  if(detailId)sub.children=sub.children.filter(node=>node.id!==detailId);
  else if(subId)main.children=main.children.filter(node=>node.id!==subId);
  else categoryCatalog=categoryCatalog.filter(node=>node.id!==mainId);
  syncFlatCategories();queueCloudSave();refreshCategories();
}
function renderMerchantMemory(){
  const el=$('merchantMemoryList');if(!el)return;
  const rows=Object.entries(merchantCategoryMemory).sort((a,b)=>String(b[1]?.updatedAt||'').localeCompare(String(a[1]?.updatedAt||''))).slice(0,50);
  el.innerHTML=rows.length?rows.map(([key,item])=>`<div class="category-memory-row"><div><strong>${escapeHtml(item.label||key)}</strong><div class="muted">${escapeHtml(categoryPathLabel(item.path))}${(item.tags||[]).length?' · '+item.tags.map(tag=>'#'+escapeHtml(tag)).join(' '):''}</div></div><button type="button" class="btn btn-light" onclick="removeMerchantMemory(${inlineJsString(key)})">ลบ</button></div>`).join(''):'<div class="muted">ระบบจะเริ่มจำหมวดหมู่หลังจากบันทึกรายการ</div>';
}
function removeMerchantMemory(key){delete merchantCategoryMemory[key];queueCloudSave();renderMerchantMemory()}
function clearMerchantMemory(){
  if(!confirm('ล้างความจำร้านค้าและหมวดหมู่ทั้งหมดหรือไม่?'))return;
  merchantCategoryMemory={};queueCloudSave();renderMerchantMemory();
}
function refreshCategories(){
  syncFlatCategories();
  ['entry','projectExpense'].forEach(prefix=>{bindCategoryPicker(prefix);populateCategoryPicker(prefix)});
  if($('budgetCategory'))$('budgetCategory').innerHTML=detailedCategoryOptions();
  if($('recurringCategory'))$('recurringCategory').innerHTML=detailedCategoryOptions();
  renderCategoryManager();refreshTagLibrary();renderMerchantMemory();
}
const merchantKeywordRules=[
  {words:['pt station','shell','caltex','esso','บางจาก','ปั๊ม'],path:['รถยนต์','เชื้อเพลิง'],tags:['เติมน้ำมัน']},
  {words:['cafe amazon','café amazon','amazon café','amazon cafe','starbucks','คาเฟ่','coffee'],path:['เครื่องดื่ม','คาเฟ่'],tags:['คาเฟ่']},
  {words:['grabfood','line man','lineman','foodpanda'],path:['อาหาร','เดลิเวอรี'],tags:['เดลิเวอรี']},
  {words:['grab','bolt','taxi','แท็กซี่'],path:['เดินทาง','รถรับจ้าง'],tags:['เดินทาง']},
  {words:['lotus','big c','makro','tops','gourmet market'],path:['ของใช้ในบ้าน','ของใช้ประจำวัน'],tags:['ซื้อของเข้าบ้าน']},
  {words:['netflix','spotify','youtube premium','disney+'],path:['บันเทิง','สมาชิกและสตรีมมิ่ง'],tags:['รายเดือน']},
  {words:['โรงพยาบาล','คลินิก','hospital'],path:['สุขภาพ','การรักษา'],tags:['สุขภาพ']},
  {words:['agoda','booking.com','hotel','โรงแรม'],path:['ท่องเที่ยว','ที่พัก'],tags:['ทริป']}
];
function merchantCategorySuggestion(value){
  const key=normalizeMerchantKey(value);if(!key)return null;
  const remembered=merchantCategoryMemory[key];
  if(remembered)return {...remembered,source:'memory'};
  const rule=merchantKeywordRules.find(item=>item.words.some(word=>key.includes(normalizeMerchantKey(word))));
  return rule?{label:value,path:rule.path,tags:rule.tags,source:'rule'}:null;
}
function applyCategorySuggestion(prefix,suggestion,tagInputId){
  if(!suggestion)return;
  setCategoryPath(prefix,suggestion.path||[]);
  const input=$(tagInputId);
  if(input){
    const current=parseTagInput(input.value);
    (suggestion.tags||[]).forEach(tag=>{if(!current.some(x=>x.toLocaleLowerCase('th-TH')===tag.toLocaleLowerCase('th-TH')))current.push(tag)});
    input.value=current.join(', ');
  }
  pendingMerchantSuggestions[prefix]=null;
}
function showMerchantCategorySuggestion(inputId,prefix,hintId,tagInputId){
  const input=$(inputId),hint=$(hintId);if(!input||!hint)return;
  const suggestion=merchantCategorySuggestion(input.value);
  pendingMerchantSuggestions[prefix]=suggestion;
  if(!suggestion){hint.innerHTML='';return}
  const label=escapeHtml(categoryPathLabel(suggestion.path));
  if(suggestion.source==='memory'){
    applyCategorySuggestion(prefix,suggestion,tagInputId);
    hint.innerHTML=`<span class="smart-category-ok">✨ ใช้หมวดจากครั้งก่อน: ${label}</span>`;
  }else{
    hint.innerHTML=`<span>✨ แนะนำ: ${label}</span> <button type="button" class="smart-category-apply" onclick="applyPendingMerchantSuggestion('${prefix}')">ใช้คำแนะนำ</button>`;
  }
}
function applyPendingMerchantSuggestion(prefix){
  const config=prefix==='entry'?{tagInputId:'entryTags',hintId:'merchantCategoryHint'}:{tagInputId:'projectExpenseTags',hintId:'projectMerchantCategoryHint'};
  const suggestion=pendingMerchantSuggestions[prefix];
  applyCategorySuggestion(prefix,suggestion,config.tagInputId);
  if($(config.hintId)&&suggestion)$(config.hintId).innerHTML=`<span class="smart-category-ok">✓ เลือก ${escapeHtml(categoryPathLabel(suggestion.path))} แล้ว</span>`;
}
function rememberMerchantCategory(label,path,tags=[]){
  const key=normalizeMerchantKey(label);if(!key||!path?.length)return;
  merchantCategoryMemory[key]={label:String(label).trim(),path:[...path],tags:[...tags],updatedAt:new Date().toISOString()};
}
$('merchant')?.addEventListener('blur',()=>showMerchantCategorySuggestion('merchant','entry','merchantCategoryHint','entryTags'));
$('projectExpenseName')?.addEventListener('blur',()=>showMerchantCategorySuggestion('projectExpenseName','projectExpense','projectMerchantCategoryHint','projectExpenseTags'));

function applyDashboardSettings(){
  const d=appSettings.dashboard||{};
  $('metricIncome').classList.toggle('hidden',d.income===false);
  $('metricExpense').classList.toggle('hidden',d.expense===false);
  $('metricBalance').classList.toggle('hidden',d.balance===false);
  $('metricPending').classList.toggle('hidden',d.pending===false);
  const hideChart=d.chart===false;
  $('chartTitle').classList.toggle('hidden',hideChart);
  $('chartCard').classList.toggle('hidden',hideChart);
}

function loginAs(name){
  persistActiveUser(name);
  if($('currentUser'))$('currentUser').value=name;
  if($('activeUserName'))$('activeUserName').textContent=profiles[name]?.name||name;
  if($('payer'))$('payer').value=name;
  $('loginScreen')?.classList.add('hidden');
}
function logout(){
  if(appLifecycle.redirecting)return;
  appLifecycle.redirecting=true;activeUser='';
  sessionStorage.removeItem('home-expense-user');localStorage.removeItem('home-expense-user');
  setBootState('กำลังออกจากระบบ','กรุณารอสักครู่…');
  window.location.replace('/logout');
}


function money(n){ return '฿' + Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function save(){ queueCloudSave(); renderAll(); }
function today(){ return new Date().toISOString().slice(0,10); }
let staticUiInitialized=false;
function initializeStaticUI(){
  if(!staticUiInitialized){
    if($('date'))$('date').value=today();
    if($('summaryMonth'))$('summaryMonth').value=today().slice(0,7);
    const currentYear=new Date().getFullYear();
    if($('summaryYear')&&!$('summaryYear').options.length){
      for(let y=currentYear+1;y>=currentYear-5;y--){const opt=document.createElement('option');opt.value=y;opt.textContent=y+543+' ('+y+')';$('summaryYear').appendChild(opt)}
    }
    if($('summaryYear'))$('summaryYear').value=currentYear;
    if($('summaryQuarter'))$('summaryQuarter').value=Math.floor(new Date().getMonth()/3)+1;
    if($('entryCurrency')){$('entryCurrency').innerHTML=currencyOptions('THB');$('entryCurrency').value='THB';updateEntryRateHint()}
    staticUiInitialized=true;
  }
  const checks={dashIncome:appSettings.dashboard?.income!==false,dashExpense:appSettings.dashboard?.expense!==false,dashBalance:appSettings.dashboard?.balance!==false,dashPending:appSettings.dashboard?.pending!==false,dashChart:appSettings.dashboard?.chart!==false,useBuddhistYear:appSettings.useBuddhistYear!==false,rememberUser:appSettings.rememberUser!==false,confirmDelete:appSettings.confirmDelete!==false,notifyRecurring:appSettings.notifyRecurring!==false,notifyBudget:appSettings.notifyBudget!==false,notifyCard:appSettings.notifyCard!==false};
  Object.entries(checks).forEach(([id,value])=>{if($(id))$(id).checked=value});
  if(activeUser)loginAs(activeUser);
}


document.querySelectorAll('[data-period]').forEach(btn=>btn.addEventListener('click',()=>{
  currentPeriod=btn.dataset.period;
  document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b===btn));
  $('monthPickerWrap').classList.toggle('hidden',currentPeriod!=='month');
  $('quarterPickerWrap').classList.toggle('hidden',currentPeriod!=='quarter');
  renderDashboard();
}));
['summaryMonth','summaryQuarter','summaryYear'].forEach(id=>$(id).addEventListener('change',renderDashboard));


document.querySelectorAll('nav button').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
function showPage(id,{updateUrl=true}={}){
  const target=$(id);if(!target){reportRuntimeError('ไม่พบหน้าที่ร้องขอ: '+id);return}
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  target.classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  const renderers={projects:renderProjects,calendar:renderCalendar,budget:renderBudgets,recurring:renderRecurring,cards:renderCards};
  try{renderers[id]?.()}catch(err){reportRuntimeError('เปิดหน้า '+id+' ไม่สำเร็จ',err)}
  if(id==='settings'){try{refreshProfilesUI();refreshCategories();loadStorageUsage()}catch(err){reportRuntimeError('โหลดหน้าตั้งค่าไม่สำเร็จ',err)}}
  if(updateUrl){const u=new URL(location.href);u.searchParams.set('page',id);history.replaceState({},'',u.pathname+u.search)}
  window.scrollTo({top:0,behavior:'smooth'});
}

function addSplitRow(name='', amount=''){
  splitCounter++;
  const row=document.createElement('div');
  row.className='split-row';
  row.innerHTML=`
    <div><label>ชื่อผู้รับผิดชอบ</label><input class="split-name" value="${name}" placeholder="ชื่อสมาชิกหรือบุคคลภายนอก"></div>
    <div><label>ยอดที่รับผิดชอบ</label><input class="split-amount" type="number" min="0" step="0.01" value="${amount}"></div>
    <div><label>สถานะคืนเงิน</label><select class="split-status"><option value="unpaid">ยังไม่คืน</option><option value="paid">คืนแล้ว</option></select></div>
    <button type="button" class="btn btn-danger remove-split">ลบ</button>`;
  row.querySelector('.remove-split').onclick=()=>{row.remove();updateSplitTotal()};
  row.querySelector('.split-amount').oninput=updateSplitTotal;
  $('splitRows').appendChild(row);
  updateSplitTotal();
}
$('toggleSplit').onclick=()=>{
  $('splitSection').classList.toggle('hidden');
  if(!$('splitSection').classList.contains('hidden') && !document.querySelector('.split-row')){
    addSplitRow();
  }
};
$('addSplit').onclick=()=>addSplitRow();

$('amount')?.addEventListener('input',updateSplitTotal);
$('type')?.addEventListener('change',()=>{
  const isIncome=$('type').value==='income';
  $('toggleSplit').classList.toggle('hidden',isIncome);
  if(isIncome){
    $('splitSection').classList.add('hidden');
    setCategoryPath('entry',['รายได้']);
  }else if(selectedCategoryPath('entry')[0]==='รายได้'){
    setCategoryPath('entry',[categoryCatalog.find(node=>node.name!=='รายได้')?.name||'อื่น ๆ']);
  }
});

function updateSplitTotal(){
  const rows=[...document.querySelectorAll('.split-row')];
  const total=rows.reduce((s,row)=>s+Number(row.querySelector('.split-amount')?.value||0),0);
  if(!rows.length){
    $('splitSummary').innerHTML='ยังไม่มีการแชร์บิล';
  }else{
    $('splitSummary').innerHTML=`ยอดของผู้ร่วมแชร์รวม: <strong>${money(total)}</strong> / ยอดบิล <strong>${money($('amount').value)}</strong><br>ส่วนที่เหลือถือเป็นยอดรับผิดชอบของผู้จ่าย`;
  }
}

$('uploadImageBtn')?.addEventListener('click',()=> $('images').click());
$('cameraImageBtn')?.addEventListener('click',()=> $('cameraImages').click());

async function addSelectedImages(files, replace=false){
  if(replace){
    imageData=[];
    $('preview').innerHTML='';
  }
  for(const file of [...files]){
    let data;
    try{data=await compressImage(file,1600,.78,460800);}catch(err){alert(`${file.name||'รูปภาพ'}: ${err.message}`);continue;}
    imageData.push(data);
    const wrap=document.createElement('div');
    wrap.style.position='relative';
    wrap.innerHTML=`<img src="${data}" class="preview"><button type="button" class="btn btn-danger" style="position:absolute;right:4px;top:4px;padding:4px 7px;border-radius:8px">×</button>`;
    wrap.querySelector('button').onclick=()=>{
      const index=[...$('preview').children].indexOf(wrap);
      if(index>=0) imageData.splice(index,1);
      wrap.remove();
    };
    $('preview').appendChild(wrap);
  }
}

$('images')?.addEventListener('change', async e=>{
  await addSelectedImages(e.target.files, false);
  e.target.value='';
});

$('cameraImages')?.addEventListener('change', async e=>{
  await addSelectedImages(e.target.files, false);
  e.target.value='';
});

function dataUrlBytes(dataUrl=''){
  const base64=(dataUrl.split(',')[1]||'');
  return Math.ceil(base64.length*3/4);
}

async function compressImage(file,maxWidth=1600,quality=.78,maxBytes=460800){
  if(!file || !String(file.type||'').startsWith('image/')) throw new Error('รองรับเฉพาะไฟล์รูปภาพ');
  if(file.size>25*1024*1024) throw new Error('รูปต้นฉบับต้องมีขนาดไม่เกิน 25 MB');

  const bitmap=await createImageBitmap(file, {imageOrientation:'from-image'}).catch(()=>null);
  let source=bitmap;
  if(!source){
    source=await new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('ไม่สามารถอ่านรูปนี้ได้'));};
      img.src=url;
    });
  }

  let width=source.width||source.naturalWidth;
  let height=source.height||source.naturalHeight;
  const scale=Math.min(1,maxWidth/Math.max(width,height));
  width=Math.max(1,Math.round(width*scale));
  height=Math.max(1,Math.round(height*scale));

  const render=(w,h,q)=>{
    const canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    ctx.drawImage(source,0,0,w,h);
    return canvas.toDataURL('image/jpeg',q);
  };

  let q=Math.min(.9,Math.max(.45,quality));
  let data=render(width,height,q);
  while(dataUrlBytes(data)>maxBytes && q>.5){q-=.08;data=render(width,height,q);}
  while(dataUrlBytes(data)>maxBytes && width>720){
    width=Math.round(width*.82);height=Math.round(height*.82);
    data=render(width,height,Math.max(.5,q));
  }
  if(bitmap?.close) bitmap.close();
  return data;
}


function updateEntryRateHint(){
  const from=$('entryCurrency')?.value||'THB';
  const wrap=$('entryRateWrap'),rateInput=$('entryExchangeRate'),hint=$('entryRateHint');
  if(!wrap||!rateInput||!hint)return;
  const isTHB=from==='THB';
  wrap.classList.toggle('hidden',isTHB);
  if(isTHB){rateInput.value=1;hint.textContent='บันทึกเป็นเงินบาท';return}
  const rate=Number(rateInput.value||0),amount=Number($('amount')?.value||0);
  hint.textContent=`1 ${from} = ${rate||0} THB · ยอดประมาณ ${money(amount*(rate||0))}`;
}
$('entryCurrency')?.addEventListener('change',()=>{
  if($('entryCurrency').value==='THB')$('entryExchangeRate').value=1;
  else $('entryExchangeRate').value='';
  updateEntryRateHint();
});
$('entryExchangeRate')?.addEventListener('input',updateEntryRateHint);
$('amount')?.addEventListener('input',updateEntryRateHint);
$('entryFetchRateBtn')?.addEventListener('click',async()=>{
  const from=$('entryCurrency')?.value||'THB';
  if(from==='THB'){$('entryExchangeRate').value=1;updateEntryRateHint();return}
  const button=$('entryFetchRateBtn');button.disabled=true;button.textContent='กำลังดึง...';
  try{
    const res=await fetch(`https://api.frankfurter.dev/v2/rate/${from}/THB`);
    if(!res.ok)throw new Error('rate unavailable');
    const data=await res.json(),rate=Number(data.rate);
    if(!rate)throw new Error('invalid rate');
    $('entryExchangeRate').value=rate;updateEntryRateHint();
  }catch(err){alert('ไม่สามารถดึงเรทอัตโนมัติได้ กรุณากรอกเรทด้วยตนเอง')}
  finally{button.disabled=false;button.textContent='ดึงเรท'}
});

$('entryForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const splits=[...document.querySelectorAll('.split-row')].map(row=>({
    name:row.querySelector('.split-name').value.trim(),
    amount:Number(row.querySelector('.split-amount').value||0),
    status:row.querySelector('.split-status').value
  })).filter(x=>x.name&&x.amount>0);
  const amount=Number($('amount').value);
  const categoryPath=selectedCategoryPath('entry');
  const tags=parseTagInput($('entryTags')?.value);
  const merchant=$('merchant').value.trim();
  if(!categoryPath.length)return alert('กรุณาเลือกหมวดหมู่');

  const entryCurrency=$('entryCurrency').value;
  const entryRate=entryCurrency==='THB'?1:Number($('entryExchangeRate').value);
  if(entryCurrency!=='THB' && (!entryRate || entryRate<=0)){
    alert('กรุณาระบุเรทแลกเปลี่ยน');
    return;
  }

  if($('type').value==='expense'){
    const splitTotal=splits.reduce((s,x)=>s+x.amount,0);
    if(splitTotal-amount>0.01){
      alert('ยอดของผู้ร่วมแชร์รวมต้องไม่เกินยอดบิล');
      return;
    }
  }
  const entry={
    id:newId(), createdAt:new Date().toISOString(), createdBy:activeUser || $('currentUser').value,
    type:$('type').value,date:$('date').value,amount,
    currency:$('entryCurrency').value,
    exchangeRate:$('entryCurrency').value==='THB'?1:Number($('entryExchangeRate').value||0),
    baseAmount:amount*($('entryCurrency').value==='THB'?1:Number($('entryExchangeRate').value||0)),
    category:categoryPath[0]||'อื่น ๆ',
    subcategory:categoryPath[1]||'',
    detailCategory:categoryPath[2]||'',
    categoryPath,
    tags,
    merchant,payer:$('payer').value,payment:$('payment').value,
    status:$('status').value,note:$('note').value.trim(),images:imageData,splits
  };
  entries.unshift(entry);
  rememberMerchantCategory(merchant,categoryPath,tags);
  rememberTags(tags);
  save();
  e.target.reset(); $('date').value=today(); imageData=[]; $('preview').innerHTML=''; $('splitRows').innerHTML=''; $('splitSection').classList.add('hidden');
  $('entryCurrency').value='THB'; $('entryExchangeRate').value=1; updateEntryRateHint(); updateSplitTotal();
  populateCategoryPicker('entry',[categoryCatalog[0]?.name]);
  if($('merchantCategoryHint'))$('merchantCategoryHint').innerHTML='';
  refreshTagLibrary();renderMerchantMemory();
  alert('บันทึกเรียบร้อย'); showPage('dashboard');
});

function summaryPeriod(){
  const year=Number($('summaryYear').value || new Date().getFullYear());
  if(currentPeriod==='month'){
    const month=$('summaryMonth').value || today().slice(0,7);
    const [y,m]=month.split('-').map(Number);
    return {start:`${y}-${String(m).padStart(2,'0')}-01`,end:new Date(y,m,0).toISOString().slice(0,10),label:new Date(y,m-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'})};
  }
  if(currentPeriod==='quarter'){
    const q=Number($('summaryQuarter').value||1), sm=(q-1)*3+1, em=sm+2;
    return {start:`${year}-${String(sm).padStart(2,'0')}-01`,end:new Date(year,em,0).toISOString().slice(0,10),label:`ไตรมาส ${q} ปี ${year+543}`};
  }
  return {start:`${year}-01-01`,end:`${year}-12-31`,label:`ปี ${year+543}`};
}
function periodEntries(){
  const p=summaryPeriod();
  return entries.filter(e=>e.date>=p.start && e.date<=p.end);
}
function renderDashboard(){
  const data=periodEntries();
  const period=summaryPeriod();
  $('periodLabel').textContent=period.label;
  $('chartPeriodLabel').textContent=period.label;
  const income=data.filter(e=>e.type==='income').reduce((s,e)=>s+entryBaseAmount(e),0);
  const expense=data.filter(e=>e.type==='expense').reduce((s,e)=>s+entryBaseAmount(e),0);
  $('sumIncome').textContent=money(income); $('sumExpense').textContent=money(expense); $('sumBalance').textContent=money(income-expense);
  const pending=entries.flatMap(e=>e.type==='expense'?e.splits.map(s=>({...s,payer:e.payer})):[])
    .filter(s=>s.status==='unpaid'&&s.name!==s.payer).reduce((a,s)=>a+s.amount,0);
  $('sumPending').textContent=money(pending);

  const cats={};
  data.filter(e=>e.type==='expense').forEach(e=>{const main=e.category||entryCategoryPath(e)[0]||'อื่น ๆ';cats[main]=(cats[main]||0)+entryBaseAmount(e)});
  const max=Math.max(...Object.values(cats),1);
  $('categoryChart').innerHTML=Object.keys(cats).length?Object.entries(cats).map(([k,v])=>`
    <div class="bar-wrap"><div class="muted">${money(v)}</div><div class="bar" style="height:${Math.max(6,v/max*130)}px"></div><div class="bar-label">${k}</div></div>`).join(''):'<div class="empty" style="width:100%">ยังไม่มีข้อมูลเดือนนี้</div>';

  $('latestList').innerHTML=entries.length?entries.slice(0,5).map(e=>`
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openDetail('${e.id}')">
      <div><strong>${escapeHtml(e.merchant)}</strong><div class="muted">${e.date} · ${escapeHtml(entryCategoryLabel(e))} · โดย ${escapeHtml(profiles[e.createdBy]?.name||e.createdBy)}</div></div>
      <strong class="${e.type==='income'?'income':'expense'}">${e.type==='income'?'+':'-'}${money(e.amount)}</strong>
    </div>`).join(''):'<div class="empty">ยังไม่มีรายการ</div>';
}

function historyRangeLabel(start,end){
  if(!start&&!end)return 'กำลังแสดงทุกช่วงเวลา';
  const fmt=v=>v?new Date(v+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'ไม่จำกัด';
  return `ช่วง ${fmt(start)} ถึง ${fmt(end)}`;
}
function setHistoryPeriodPreset(value){
  const now=new Date(), start=$('historyStartDate'), end=$('historyEndDate');
  const set=(a,b)=>{start.value=a||'';end.value=b||'';};
  if(value==='custom'){renderHistory();return;}
  if(value==='all')set('','');
  else if(value==='today'){const d=ymd(now);set(d,d);}
  else if(value==='7days'){const d=new Date(now);d.setDate(d.getDate()-6);set(ymd(d),ymd(now));}
  else if(value==='30days'){const d=new Date(now);d.setDate(d.getDate()-29);set(ymd(d),ymd(now));}
  else if(value==='currentMonth')set(ymd(new Date(now.getFullYear(),now.getMonth(),1)),ymd(new Date(now.getFullYear(),now.getMonth()+1,0)));
  else if(value==='previousMonth')set(ymd(new Date(now.getFullYear(),now.getMonth()-1,1)),ymd(new Date(now.getFullYear(),now.getMonth(),0)));
  else if(value==='currentYear')set(`${now.getFullYear()}-01-01`,`${now.getFullYear()}-12-31`);
  renderHistory();
}
function filteredEntries(){
  const q=($('search')?.value||'').trim().toLowerCase(), type=$('filterType')?.value||'';
  const start=$('historyStartDate')?.value||'', end=$('historyEndDate')?.value||'';
  if(start&&end&&start>end)return [];
  return entries.filter(e=>{
    const date=String(e.date||'');
    const hay=[e.merchant,entryCategoryLabel(e),e.note,e.payer,...(e.tags||[])].filter(Boolean).join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!type||e.type===type)&&(!start||date>=start)&&(!end||date<=end)
  }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function renderHistory(){
  const data=filteredEntries();
  const start=$('historyStartDate')?.value||'', end=$('historyEndDate')?.value||'';
  const invalid=start&&end&&start>end;
  if($('historyFilterSummary')) $('historyFilterSummary').textContent=invalid?'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด':`${historyRangeLabel(start,end)} · พบ ${data.length} รายการ`;
  $('historyTable').innerHTML=data.length?`<table><thead><tr><th>วันที่</th><th>รายการ</th><th>ผู้จ่าย</th><th>ประเภท</th><th>ยอด</th><th>บิล</th><th></th></tr></thead><tbody>${
    data.map(e=>`<tr>
      <td>${e.date}</td><td><strong>${escapeHtml(e.merchant)}</strong><div class="muted">${escapeHtml(entryCategoryLabel(e))}</div>${(e.tags||[]).length?`<div class="history-tags">${e.tags.map(tag=>`<span>#${escapeHtml(tag)}</span>`).join('')}</div>`:''}</td>
      <td>${profiles[e.payer]?.name||e.payer}</td><td><span class="badge ${e.type==='income'?'in':'out'}">${e.type==='income'?'รายรับ':'รายจ่าย'}</span></td>
      <td class="${e.type==='income'?'income':'expense'}">${e.currency&&e.currency!=='THB'?`${projectCurrency({currency:e.currency},e.amount)}<div class="muted">≈ ${money(entryBaseAmount(e))}</div>`:money(e.amount)}</td>
      <td>${e.images?.length||0} รูป</td>
      <td><div class="actions"><button class="btn btn-light" onclick="openDetail('${e.id}')">ดู</button><button class="btn btn-danger" onclick="removeEntry('${e.id}')">ลบ</button></div></td>
    </tr>`).join('')
  }</tbody></table>`:'<div class="empty">ไม่พบรายการในช่วงเวลาที่เลือก</div>';
}
let historyRenderTimer=null;
['search','filterType','historyStartDate','historyEndDate'].forEach(id=>$(id)?.addEventListener('input',()=>{
  if((id==='historyStartDate'||id==='historyEndDate')&&$('historyPeriodPreset'))$('historyPeriodPreset').value='custom';
  clearTimeout(historyRenderTimer);historyRenderTimer=setTimeout(renderHistory,100);
}));
$('historyPeriodPreset')?.addEventListener('change',e=>setHistoryPeriodPreset(e.target.value));
$('clearHistoryRangeBtn')?.addEventListener('click',()=>{$('historyPeriodPreset').value='all';setHistoryPeriodPreset('all')});

function renderSettle(){
  const obligations=[];
  entries.filter(e=>e.type==='expense').forEach(e=>(e.splits||[]).forEach(s=>{
    if(s.name!==e.payer) obligations.push({entry:e,from:s.name,to:e.payer,amount:s.amount,status:s.status});
  }));
  const unpaid=obligations.filter(o=>o.status==='unpaid');
  const agg={};
  unpaid.forEach(o=>{const key=o.from+'|'+o.to;agg[key]=(agg[key]||0)+o.amount});
  $('settleCards').innerHTML=Object.keys(agg).length?Object.entries(agg).map(([k,v])=>{
    const [from,to]=k.split('|');return `<div class="card settle-card"><div class="muted">${from} ต้องคืนให้ ${to}</div><div class="value" style="font-size:24px;font-weight:800;margin-top:6px">${money(v)}</div></div>`;
  }).join(''):'<div class="card empty">ไม่มียอดค้าง</div>';
  $('settleTable').innerHTML=obligations.length?`<table><thead><tr><th>วันที่</th><th>รายการ</th><th>ผู้คืน</th><th>ผู้รับ</th><th>ยอด</th><th>สถานะ</th></tr></thead><tbody>${
    obligations.map(o=>`<tr><td>${o.entry.date}</td><td>${o.entry.merchant}</td><td>${o.from}</td><td>${o.to}</td><td>${money(o.amount)}</td><td><span class="badge ${o.status==='paid'?'in':'out'}">${o.status==='paid'?'คืนแล้ว':'ยังไม่คืน'}</span></td></tr>`).join('')
  }</tbody></table>`:'<div class="empty">ยังไม่มีข้อมูลแบ่งยอด</div>';
}

function openDetail(id){
  const e=entries.find(x=>x.id===id); if(!e)return;
  $('detailBody').innerHTML=`
    <h2 style="margin-top:0">${escapeHtml(e.merchant)}</h2>
    <p><strong>${e.currency&&e.currency!=='THB'?projectCurrency({currency:e.currency},e.amount):money(e.amount)}</strong> · ${e.type==='income'?'รายรับ':'รายจ่าย'} · ${e.date}</p>
    ${e.currency&&e.currency!=='THB'?`<p class="muted">คิดเป็นประมาณ ${money(entryBaseAmount(e))} · เรท ${Number(e.exchangeRate||1).toLocaleString()}</p>`:''}
    <p>หมวดหมู่: ${escapeHtml(entryCategoryLabel(e))}<br>ผู้จ่าย: ${escapeHtml(profiles[e.payer]?.name||e.payer)}<br>วิธีชำระ: ${escapeHtml(e.payment)}<br>ผู้บันทึก: ${escapeHtml(profiles[e.createdBy]?.name||e.createdBy)}</p>
    ${(e.tags||[]).length?`<p>แท็ก: ${(e.tags||[]).map(tag=>`<span class="tag">#${escapeHtml(tag)}</span>`).join(' ')}</p>`:''}
    ${e.note?`<p>หมายเหตุ: ${escapeHtml(e.note)}</p>`:''}
    ${e.splits?.length?`<h3>การแบ่งยอด</h3><table><tbody>${e.splits.map(s=>`<tr><td>${s.name}</td><td>${money(s.amount)}</td><td>${s.status==='paid'?'คืนแล้ว':'ยังไม่คืน'}</td></tr>`).join('')}</tbody></table>`:''}
    <h3>รูปบิล / หลักฐาน</h3>
    <div class="bill-grid">${e.images?.length?e.images.map(src=>`<img src="${src}">`).join(''):'<div class="muted">ไม่มีรูปแนบ</div>'}</div>`;
  $('detailDialog').showModal();
}
function removeEntry(id){ if(appSettings.confirmDelete===false || confirm('ต้องการลบรายการนี้หรือไม่?')){ entries=entries.filter(e=>e.id!==id); save(); } }

$('exportBtn').onclick=()=>{
  const rows=[['วันที่','ประเภท','รายการ','หมวดหลัก','หมวดหมู่แบบละเอียด','แท็ก','จำนวนเงิน','ผู้จ่าย','ผู้บันทึก','หมายเหตุ']];
  filteredEntries().forEach(e=>rows.push([e.date,e.type,e.merchant,e.category,entryCategoryLabel(e),(e.tags||[]).join(' | '),e.amount,e.payer,e.createdBy,e.note]));
  const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='home-expense.csv';a.click();
};
$('clearBtn').onclick=()=>{if(confirm('ล้างข้อมูลส่วนกลางบน Cloud ทั้งหมดหรือไม่?')){
  entries=[];budgets=[];recurringItems=[];creditCards=[];projects=[];saveFeatureData();saveProjects();save();
}};
$('demoBtn').onclick=()=>{
  const d=today();
  entries=[
    {id:newId(),createdAt:new Date().toISOString(),createdBy:'Toey',type:'expense',date:d,amount:1850,category:'ของใช้ในบ้าน',merchant:"Lotus's",payer:'Toey',payment:'บัตรเครดิต',status:'paid',note:'ซื้อของเข้าบ้าน',images:[],splits:[{name:'Toey',amount:925,status:'paid'},{name:'Perla',amount:925,status:'unpaid'}]},
    {id:newId(),createdAt:new Date().toISOString(),createdBy:'Perla',type:'expense',date:d,amount:3200,category:'ค่าน้ำค่าไฟ',merchant:'ค่าไฟเดือนนี้',payer:'Perla',payment:'โอนเงิน',status:'paid',note:'',images:[],splits:[{name:'Toey',amount:1600,status:'unpaid'},{name:'Perla',amount:1600,status:'paid'}]},
    {id:newId(),createdAt:new Date().toISOString(),createdBy:'Toey',type:'income',date:d,amount:50000,category:'รายได้',merchant:'เงินเดือน',payer:'Toey',payment:'โอนเงิน',status:'paid',note:'',images:[],splits:[]}
  ]; save();
};


async function readProfileImage(input, key){
  if(!input.files?.[0]) return;
  try{
    const data=await compressImage(input.files[0],640,.82,184320);
    profiles[key].photo=data;
    refreshProfilesUI();
  }catch(err){alert(err.message);}finally{input.value='';}
}
$('profileUploadToey')?.addEventListener('change',e=>readProfileImage(e.target,'Toey'));
$('profileUploadPerla')?.addEventListener('change',e=>readProfileImage(e.target,'Perla'));

$('saveProfilesBtn').onclick=()=>{
  profiles.Toey.name=$('profileNameToey').value.trim()||'Toey';
  profiles.Perla.name=$('profileNamePerla').value.trim()||'Perla';
  queueCloudSave();
  refreshProfilesUI();
  renderAll();
  alert('บันทึกข้อมูลผู้ใช้แล้ว');
};
$('saveDashboardBtn').onclick=()=>{
  appSettings.dashboard={
    income:$('dashIncome').checked,expense:$('dashExpense').checked,balance:$('dashBalance').checked,
    pending:$('dashPending').checked,chart:$('dashChart').checked
  };
  queueCloudSave();
  applyDashboardSettings();
  alert('บันทึกการแสดงผลแล้ว');
};
$('saveGeneralBtn').onclick=()=>{
  appSettings.useBuddhistYear=$('useBuddhistYear').checked;
  appSettings.rememberUser=$('rememberUser').checked;
  appSettings.confirmDelete=$('confirmDelete').checked;
  queueCloudSave();
  if(!appSettings.rememberUser) localStorage.removeItem('home-expense-user');
  alert('บันทึกการตั้งค่าแล้ว');
};
$('addMainCategoryBtn')?.addEventListener('click',addMainCategory);
$('addSubCategoryBtn')?.addEventListener('click',addSubCategory);
$('addDetailCategoryBtn')?.addEventListener('click',addDetailCategory);
$('categoryParentMain')?.addEventListener('change',refreshCategorySubParentOptions);
$('addTagBtn')?.addEventListener('click',()=>{
  const input=$('newTag'),tag=input?.value.trim();if(!tag)return;
  if(tagLibrary.some(x=>x.toLocaleLowerCase('th-TH')===tag.toLocaleLowerCase('th-TH')))return alert('มีแท็กนี้อยู่แล้ว');
  tagLibrary.push(tag);tagLibrary.sort((a,b)=>a.localeCompare(b,'th'));input.value='';queueCloudSave();refreshTagLibrary();
});
$('clearMerchantMemoryBtn')?.addEventListener('click',clearMerchantMemory);



function saveProjects(){ queueCloudSave(); }
function projectById(id=currentProjectId){ return projects.find(p=>p.id===id); }
function projectCurrency(p,amount){
  const c=p?.currency||'THB';
  const symbol={THB:'฿',USD:'$',JPY:'¥',EUR:'€',GBP:'£',CNY:'¥',HKD:'HK$',SGD:'S$',KRW:'₩',VND:'₫',MYR:'RM',TWD:'NT$',AUD:'A$',CHF:'CHF '}[c]||c+' ';
  return symbol+Number(amount||0).toLocaleString('th-TH',{maximumFractionDigits:2});
}

function openProjectCreate(){
  $('newProjectName').value='';
  $('newProjectStart').value=today();
  $('newProjectEnd').value='';
  $('newProjectMembers').value='Toey, Perla';
  $('newProjectNote').value='';
  $('projectCreateDialog').showModal();
}
function createProject(){
  const name=$('newProjectName').value.trim();
  if(!name)return alert('กรุณาระบุชื่อโปรเจกต์');
  const names=$('newProjectMembers').value.split(',').map(x=>x.trim()).filter(Boolean);
  const uniq=[...new Set(names)];
  const p={
    id:newId(),name,start:$('newProjectStart').value,end:$('newProjectEnd').value,
    currency:$('newProjectCurrency').value,note:$('newProjectNote').value.trim(),status:'active',
    createdAt:new Date().toISOString(),owner:activeUser||'Toey',
    members:uniq.map(n=>({id:newId(),name:n,active:true})),
    expenses:[],pending:[],settlements:[]
  };
  projects.unshift(p);saveProjects();$('projectCreateDialog').close();renderProjects();openProject(p.id);
}
function renderProjects(){
  $('projectList').innerHTML=projects.length?projects.map(p=>{
    const total=(p.expenses||[]).reduce((s,e)=>s+expenseBaseAmount(e),0);
    return `<div class="project-card">
      <div class="muted"><span class="status-dot ${p.status!=='active'?'closed':''}"></span> ${p.status==='closed'?'จบแล้ว':p.status==='cancelled'?'ยกเลิกแล้ว':'กำลังดำเนินการ'}</div>
      <h3>${p.name}</h3>
      <div class="muted">${p.start||'-'} ${p.end?'ถึง '+p.end:''}</div>
      <div style="margin:12px 0"><strong>${projectCurrency(p,total)}</strong> · ${p.expenses?.length||0} รายการ · ${p.members?.length||0} คน</div>
      <button class="btn btn-primary" onclick="openProject('${p.id}')">เปิดโปรเจกต์</button>
    </div>`;
  }).join(''):'<div class="card empty">ยังไม่มีโปรเจกต์ กด “สร้างโปรเจกต์” เพื่อเริ่มใช้งาน</div>';
}
function openProject(id){
  currentProjectId=id;
  renderProjectDetail();
  showPage('projectDetail');
}
function renderProjectDetail(){
  const p=projectById(); if(!p)return;
  $('projectTitle').textContent=p.name;
  $('projectTotal').textContent=projectCurrency(p,(p.expenses||[]).reduce((s,e)=>s+expenseBaseAmount(e),0));
  $('projectCount').textContent=p.expenses?.length||0;
  $('projectMemberCount').textContent=p.members?.length||0;
  $('projectStatus').textContent=p.status==='closed'?'จบโปรเจกต์แล้ว':p.status==='cancelled'?'ยกเลิกแล้ว':'กำลังดำเนินการ';
  $('deleteCancelledProjectBtn').classList.toggle('hidden',p.status!=='cancelled');
  $('closeProjectBtn').textContent=p.status==='closed'?'เปิดโปรเจกต์อีกครั้ง':'ปิดโปรเจกต์';
  $('closeProjectBtn').disabled=p.status==='cancelled';
  $('cancelProjectBtn').disabled=p.status==='cancelled';
  $('cancelProjectBtn').classList.toggle('hidden',p.status==='cancelled');
  renderProjectExpenses();
  renderProjectBalances();
  renderProjectSettlements();
  renderProjectPending();
}
document.querySelectorAll('[data-project-tab]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('[data-project-tab]').forEach(b=>b.classList.toggle('active',b===btn));
  document.querySelectorAll('.project-tab-panel').forEach(x=>x.classList.add('hidden'));
  $('projectTab'+btn.dataset.projectTab.charAt(0).toUpperCase()+btn.dataset.projectTab.slice(1)).classList.remove('hidden');
}));

function openMemberManager(){
  renderMemberManager();
  $('memberDialog').showModal();
}
function renderMemberManager(){
  const p=projectById(); if(!p)return;
  $('memberManagerList').innerHTML=p.members.map(m=>{
    const used=memberHasFinancialHistory(p,m.id);
    return `<div class="list-row"><div><strong>${m.name}</strong><div class="muted">${m.active?'ใช้งานอยู่':'ไม่ใช้งาน'}${used?' · มีประวัติทางการเงิน':''}</div></div>
      <div class="actions">
        <button class="btn btn-light" onclick="toggleProjectMember('${m.id}')">${m.active?'ปิดใช้งาน':'เปิดใช้งาน'}</button>
        <button class="btn btn-danger" onclick="deleteProjectMember('${m.id}')">ลบ</button>
      </div></div>`;
  }).join('');
}
function addProjectMember(){
  const p=projectById(),name=$('newMemberName').value.trim();
  if(!name)return;
  if(p.members.some(m=>m.name.toLowerCase()===name.toLowerCase()))return alert('มีชื่อนี้แล้ว');
  p.members.push({id:newId(),name,active:true});$('newMemberName').value='';saveProjects();renderMemberManager();renderProjectDetail();
}
function memberHasFinancialHistory(p,memberId){
  const approved=(p.expenses||[]).some(e=>e.payerId===memberId || (e.shares||[]).some(s=>s.memberId===memberId));
  const settled=(p.settlements||[]).some(s=>s.fromId===memberId||s.toId===memberId);
  return approved||settled;
}
function deleteProjectMember(id){
  const p=projectById();
  if(memberHasFinancialHistory(p,id))return alert('ไม่สามารถลบสมาชิกนี้ได้ เนื่องจากมีประวัติค่าใช้จ่ายหรือยอดชำระในโปรเจกต์');
  const hasPending=(p.pending||[]).some(e=>e.submitterId===id||e.payerId===id||(e.participantIds||[]).includes(id));
  if(hasPending && !confirm('สมาชิกนี้มีรายการรอตรวจสอบ ต้องการลบสมาชิกและยกเลิกรายการรอทั้งหมดหรือไม่?'))return;
  p.pending=(p.pending||[]).filter(e=>e.submitterId!==id&&e.payerId!==id&&!(e.participantIds||[]).includes(id));
  p.members=p.members.filter(m=>m.id!==id);saveProjects();renderMemberManager();renderProjectDetail();
}
function toggleProjectMember(id){
  const p=projectById(),m=p.members.find(x=>x.id===id);m.active=!m.active;saveProjects();renderMemberManager();renderProjectDetail();
}

function openProjectExpense(){
  const p=projectById(); if(!p)return;
  if(p.status!=='active')return alert(p.status==='cancelled'?'โปรเจกต์นี้ถูกยกเลิกแล้ว':'โปรเจกต์นี้ปิดแล้ว');
  $('projectExpenseDate').value=today();$('projectExpenseAmount').value='';$('projectExpenseName').value='';$('projectExpenseNote').value='';
  if($('projectExpenseTags'))$('projectExpenseTags').value='';
  if($('projectMerchantCategoryHint'))$('projectMerchantCategoryHint').innerHTML='';
  populateCategoryPicker('projectExpense',[categoryCatalog[0]?.name]);
  $('projectExpenseCurrency').innerHTML=currencyOptions(p.currency);
  $('projectExpenseCurrency').value=p.currency;
  $('projectExchangeRate').value=1;
  updateExchangeHint();
  const active=p.members.filter(m=>m.active);
  $('projectExpensePayer').innerHTML=active.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  $('projectParticipantChecks').innerHTML=active.map(m=>{
    const initial=escapeHtml((m.name||'?').trim().charAt(0).toUpperCase());
    return `<label class="project-participant-card"><input type="checkbox" class="project-participant" value="${m.id}" checked><span class="project-participant-avatar">${initial}</span><span class="project-participant-name">${escapeHtml(m.name)}</span></label>`;
  }).join('');
  $('projectSplitMode').value='equal';$('customSplitWrap').classList.add('hidden');$('customSplitRows').innerHTML='';
  projectExpenseImagesData=[];$('projectExpensePreview').innerHTML='';
  updateProjectExpensePreviewMeta();
  updateProjectSplitSummary();
  $('projectExpenseImages').value='';$('projectExpenseCamera').value='';
  $('projectExpenseDialog').showModal();
}

function updateExchangeHint(){
  const p=projectById(); if(!p)return;
  const from=$('projectExpenseCurrency').value, rate=Number($('projectExchangeRate').value||0), amount=Number($('projectExpenseAmount').value||0);
  $('exchangeRateHint').textContent=from===p.currency
    ?`สกุลเดียวกับโปรเจกต์ เรท = 1`
    :`1 ${from} = ${rate||0} ${p.currency} · ยอดสรุปประมาณ ${projectCurrency(p,amount*rate)}`;
}
$('projectExpenseCurrency')?.addEventListener('change',()=>{
  const p=projectById();
  $('projectExchangeRate').value=$('projectExpenseCurrency').value===p.currency?1:'';
  updateExchangeHint();
  updateProjectSplitSummary();
});
$('projectExpenseAmount')?.addEventListener('input',()=>{updateExchangeHint();updateProjectSplitSummary();});
$('projectExchangeRate')?.addEventListener('input',updateExchangeHint);
$('fetchRateBtn')?.addEventListener('click',async()=>{
  const p=projectById(),from=$('projectExpenseCurrency').value,to=p.currency;
  if(from===to){$('projectExchangeRate').value=1;updateExchangeHint();return;}
  $('fetchRateBtn').disabled=true;$('fetchRateBtn').textContent='กำลังดึง...';
  try{
    const res=await fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}`);
    if(!res.ok)throw new Error('rate unavailable');
    const data=await res.json();
    const rate=Number(data.rate);
    if(!rate)throw new Error('invalid rate');
    $('projectExchangeRate').value=rate;
    updateExchangeHint();
  }catch(err){
    alert('ไม่สามารถดึงเรทอัตโนมัติได้ กรุณากรอกเรทด้วยตนเอง');
  }finally{
    $('fetchRateBtn').disabled=false;$('fetchRateBtn').textContent='ดึงเรท';
  }
});

$('projectSplitMode')?.addEventListener('change',()=>{
  const custom=$('projectSplitMode').value==='custom';
  $('customSplitWrap').classList.toggle('hidden',!custom);
  if(custom)renderCustomSplitRows();
  updateProjectSplitSummary();
});
$('projectParticipantChecks')?.addEventListener('change',()=>{if($('projectSplitMode').value==='custom')renderCustomSplitRows();updateProjectSplitSummary();});
function renderCustomSplitRows(){
  const p=projectById();
  const ids=[...document.querySelectorAll('.project-participant:checked')].map(x=>x.value);
  $('customSplitRows').innerHTML=ids.map(id=>{
    const m=p.members.find(x=>x.id===id);
    return `<div class="expense-split-row"><div>${escapeHtml(m.name)}</div><input class="project-custom-share" data-member="${id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"><div></div></div>`;
  }).join('');
  $('customSplitRows').querySelectorAll('.project-custom-share').forEach(input=>input.addEventListener('input',updateProjectSplitSummary));
  updateProjectSplitSummary();
}
function updateProjectSplitSummary(){
  const p=projectById(); if(!p)return;
  const amount=Number($('projectExpenseAmount')?.value||0);
  const ids=[...document.querySelectorAll('.project-participant:checked')].map(x=>x.value);
  let each=ids.length?amount/ids.length:0;
  if($('projectSplitMode')?.value==='custom'){
    const values=[...document.querySelectorAll('.project-custom-share')].map(x=>Number(x.value||0));
    each=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  }
  $('projectSplitTotal').textContent=projectCurrency({currency:$('projectExpenseCurrency')?.value||p.currency},amount);
  $('projectSplitCount').textContent=`${ids.length} คน`;
  $('projectSplitEach').textContent=projectCurrency({currency:$('projectExpenseCurrency')?.value||p.currency},each);
}
function projectImageBytes(dataUrl){
  const base64=String(dataUrl||'').split(',')[1]||'';
  return Math.max(0,Math.floor(base64.length*0.75));
}
function formatProjectImageSize(bytes){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function updateProjectExpensePreviewMeta(){
  const el=$('projectExpensePreviewMeta'); if(!el)return;
  if(!projectExpenseImagesData.length){el.textContent='ยังไม่ได้แนบรูป';return;}
  const total=projectExpenseImagesData.reduce((sum,data)=>sum+projectImageBytes(data),0);
  el.textContent=`แนบแล้ว ${projectExpenseImagesData.length} รูป · ขนาดประมาณ ${formatProjectImageSize(total)} · ระบบบีบอัดอัตโนมัติแล้ว`;
}
$('projectUploadImageBtn')?.addEventListener('click',()=> $('projectExpenseImages').click());
$('projectCameraImageBtn')?.addEventListener('click',()=> $('projectExpenseCamera').click());

async function addProjectExpenseImages(files){
  for(const file of [...files]){
    let data;
    try{data=await compressImage(file,1600,.78,460800);}catch(err){alert(`${file.name||'รูปภาพ'}: ${err.message}`);continue;}
    projectExpenseImagesData.push(data);
    updateProjectExpensePreviewMeta();
    const wrap=document.createElement('div');
    wrap.style.position='relative';
    wrap.innerHTML=`<img src="${data}" class="preview"><button type="button" class="btn btn-danger" style="position:absolute;right:4px;top:4px;padding:4px 7px;border-radius:8px">×</button>`;
    wrap.querySelector('button').onclick=()=>{
      const index=[...$('projectExpensePreview').children].indexOf(wrap);
      if(index>=0) projectExpenseImagesData.splice(index,1);
      wrap.remove();
      updateProjectExpensePreviewMeta();
    };
    $('projectExpensePreview').appendChild(wrap);
  }
}
$('projectExpenseImages')?.addEventListener('change',async e=>{
  await addProjectExpenseImages(e.target.files);
  e.target.value='';
});
$('projectExpenseCamera')?.addEventListener('change',async e=>{
  await addProjectExpenseImages(e.target.files);
  e.target.value='';
});
function saveProjectExpense(){
  const p=projectById(),amount=Number($('projectExpenseAmount').value),name=$('projectExpenseName').value.trim();
  if(!projectExpenseImagesData.length)return alert('กรุณาแนบรูปบิลหรือหลักฐานอย่างน้อย 1 รูป');
  const participantIds=[...document.querySelectorAll('.project-participant:checked')].map(x=>x.value);
  if(!name||!amount||!participantIds.length)return alert('กรอกข้อมูลและเลือกผู้ร่วมหารอย่างน้อย 1 คน');
  const categoryPath=selectedCategoryPath('projectExpense');
  const tags=parseTagInput($('projectExpenseTags')?.value);
  if(!categoryPath.length)return alert('กรุณาเลือกหมวดหมู่');
  let shares=[];
  if($('projectSplitMode').value==='equal'){
    const each=amount/participantIds.length;
    shares=participantIds.map((id,i)=>({memberId:id,amount:i===participantIds.length-1?amount-each*(participantIds.length-1):each}));
  }else{
    shares=[...document.querySelectorAll('.project-custom-share')].map(x=>({memberId:x.dataset.member,amount:Number(x.value||0)}));
    const total=shares.reduce((s,x)=>s+x.amount,0);
    if(Math.abs(total-amount)>0.01)return alert('ยอดแบ่งรวมต้องเท่ากับยอดรายการ');
  }
  const currency=$('projectExpenseCurrency').value;
  const exchangeRate=currency===p.currency?1:Number($('projectExchangeRate').value);
  if(!exchangeRate||exchangeRate<=0)return alert('กรุณาระบุเรทแลกเปลี่ยน');
  const baseAmount=amount*exchangeRate;
  const baseShares=shares.map(s=>({memberId:s.memberId,amount:s.amount*exchangeRate}));
  const expense={
    id:newId(),date:$('projectExpenseDate').value,amount,currency,exchangeRate,baseAmount,name,
    category:categoryPath[0]||'อื่น ๆ',subcategory:categoryPath[1]||'',detailCategory:categoryPath[2]||'',categoryPath,tags,
    payerId:$('projectExpensePayer').value,shares:baseShares,originalShares:shares,note:$('projectExpenseNote').value.trim(),
    images:projectExpenseImagesData,createdBy:activeUser||'owner',createdAt:new Date().toISOString(),source:'owner'
  };
  p.expenses.unshift(expense);
  rememberMerchantCategory(name,categoryPath,tags);rememberTags(tags);
  saveProjects();$('projectExpenseDialog').close();renderProjectDetail();refreshTagLibrary();renderMerchantMemory();
}
function renderProjectExpenses(){
  const p=projectById();
  $('projectExpenseList').innerHTML=p.expenses?.length?`<table><thead><tr><th>วันที่</th><th>รายการ</th><th>ผู้จ่าย</th><th>ยอด</th><th>หาร</th><th></th></tr></thead><tbody>${
    p.expenses.map(e=>{
      const payer=p.members.find(m=>m.id===e.payerId)?.name||'-';
      const names=e.shares.map(s=>p.members.find(m=>m.id===s.memberId)?.name).filter(Boolean).join(', ');
      return `<tr><td>${e.date}</td><td><strong>${escapeHtml(e.name)}</strong><div class="muted">${escapeHtml(entryCategoryLabel(e))}</div>${(e.tags||[]).length?`<div class="history-tags">${e.tags.map(tag=>`<span>#${escapeHtml(tag)}</span>`).join('')}</div>`:''}${e.note?`<div class="muted">${escapeHtml(e.note)}</div>`:''}</td><td>${escapeHtml(payer)}</td><td>${projectCurrency({currency:e.currency||p.currency},e.amount)}${(e.currency&&e.currency!==p.currency)?`<div class="muted">≈ ${projectCurrency(p,expenseBaseAmount(e))} · เรท ${Number(e.exchangeRate||1).toLocaleString()}</div>`:''}</td><td>${escapeHtml(names)}</td><td><button class="btn btn-danger" onclick="deleteProjectExpense('${e.id}')">ลบ</button></td></tr>`;
    }).join('')
  }</tbody></table>`:'<div class="empty">ยังไม่มีค่าใช้จ่าย</div>';
}
function deleteProjectExpense(id){
  const p=projectById();
  if(p.status!=='active')return alert('โปรเจกต์นี้ไม่อยู่ในสถานะใช้งาน');
  if(!confirm('ลบรายการนี้หรือไม่?'))return;
  p.expenses=p.expenses.filter(e=>e.id!==id);saveProjects();renderProjectDetail();
}
function calculateProjectBalances(p){
  const map={};p.members.forEach(m=>map[m.id]={member:m,paid:0,owed:0,net:0});
  (p.expenses||[]).forEach(e=>{
    if(map[e.payerId])map[e.payerId].paid+=expenseBaseAmount(e);
    (e.shares||[]).forEach(s=>{if(map[s.memberId])map[s.memberId].owed+=s.amount;});
  });
  Object.values(map).forEach(x=>x.net=x.paid-x.owed);
  return map;
}
function renderProjectBalances(){
  const p=projectById(),map=calculateProjectBalances(p);
  $('projectBalances').innerHTML=Object.values(map).map(x=>`<div class="member-balance"><div><strong>${x.member.name}</strong><div class="muted">จ่ายจริง ${projectCurrency(p,x.paid)} · รับผิดชอบ ${projectCurrency(p,x.owed)}</div></div><strong class="${x.net>=0?'income':'expense'}">${x.net>=0?'ต้องได้คืน ':'ต้องจ่าย '}${projectCurrency(p,Math.abs(x.net))}</strong></div>`).join('');
}
function calculateSettlements(p){
  const vals=Object.values(calculateProjectBalances(p));
  const creditors=vals.filter(x=>x.net>0.005).map(x=>({id:x.member.id,name:x.member.name,amount:x.net})).sort((a,b)=>b.amount-a.amount);
  const debtors=vals.filter(x=>x.net<-0.005).map(x=>({id:x.member.id,name:x.member.name,amount:-x.net})).sort((a,b)=>b.amount-a.amount);
  const result=[];let i=0,j=0;
  while(i<debtors.length&&j<creditors.length){
    const amount=Math.min(debtors[i].amount,creditors[j].amount);
    result.push({fromId:debtors[i].id,from:debtors[i].name,toId:creditors[j].id,to:creditors[j].name,amount});
    debtors[i].amount-=amount;creditors[j].amount-=amount;
    if(debtors[i].amount<0.005)i++;
    if(creditors[j].amount<0.005)j++;
  }
  return result;
}
function renderProjectSettlements(){
  const p=projectById(),rows=calculateSettlements(p);
  $('projectSettlements').innerHTML=rows.length?rows.map((s,i)=>`<div class="settlement-line"><div><strong>${s.from}</strong> จ่ายให้ <strong>${s.to}</strong></div><strong>${projectCurrency(p,s.amount)}</strong></div>`).join(''):'<div class="empty">ไม่มีเงินต้องโอนระหว่างกัน</div>';
}
function closeCurrentProject(){
  const p=projectById(); if(!p)return;
  if(p.status==='cancelled')return alert('โปรเจกต์ถูกยกเลิกแล้ว หากต้องการใช้งานอีกครั้งให้สร้างโปรเจกต์ใหม่');
  if(p.status==='closed'){ if(confirm('เปิดโปรเจกต์นี้อีกครั้งหรือไม่?'))p.status='active'; else return; }
  else{ if(!confirm('ปิดโปรเจกต์และล็อกการแก้ไขรายการหรือไม่?'))return;p.status='closed'; }
  saveProjects();renderProjectDetail();renderProjects();
  alert(p.status==='closed'?'ปิดโปรเจกต์แล้ว':'เปิดโปรเจกต์อีกครั้งแล้ว');
}
function cancelCurrentProject(){
  const p=projectById(); if(!p)return;
  if(p.status==='cancelled')return alert('โปรเจกต์นี้ยกเลิกแล้ว');
  if(!confirm('ยกเลิกโปรเจกต์นี้หรือไม่? ข้อมูลจะยังคงอยู่และสามารถลบได้หลังยกเลิก'))return;
  p.status='cancelled';saveProjects();renderProjectDetail();renderProjects();
  alert('ยกเลิกโปรเจกต์แล้ว สามารถกดลบโปรเจกต์ได้');
}
function deleteCancelledProject(){
  const p=projectById(); if(!p||p.status!=='cancelled')return;
  if(!confirm('ลบโปรเจกต์ที่ยกเลิกนี้ถาวรหรือไม่? ข้อมูลและรูปบิลทั้งหมดจะหายไป'))return;
  projects=projects.filter(x=>x.id!==p.id);currentProjectId=null;saveProjects();renderProjects();showPage('projects');
}

$('closeProjectBtn')?.addEventListener('click',closeCurrentProject);
$('cancelProjectBtn')?.addEventListener('click',cancelCurrentProject);
$('deleteCancelledProjectBtn')?.addEventListener('click',deleteCancelledProject);

function openProjectShare(){
  const p=projectById(); if(!p)return;
  const token=p.shareToken||(p.shareToken=Math.random().toString(36).slice(2)+Date.now().toString(36));
  saveProjects();
  const link=`https://example.local/project/${p.id}?invite=${token}`;
  $('projectShareLink').value=link;
  $('projectQrImage').src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(link);
  $('projectShareDialog').showModal();
}
function copyProjectLink(){
  const input=$('projectShareLink');
  navigator.clipboard?.writeText(input.value).then(()=>alert('คัดลอกลิงก์แล้ว')).catch(()=>{input.select();document.execCommand('copy');alert('คัดลอกลิงก์แล้ว');});
}
function simulateGuestEntry(){
  const p=projectById();if(p.status!=='active')return alert('โปรเจกต์นี้ไม่เปิดรับรายการแล้ว');
  const active=p.members.filter(m=>m.active);
  const opts=active.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  $('guestMember').innerHTML=opts;$('guestPayer').innerHTML=opts;
  $('guestDate').value=today();$('guestAmount').value='';$('guestExpenseName').value='';$('guestNote').value='';
  $('guestParticipants').innerHTML=active.map(m=>`<label style="display:inline-flex;align-items:center;gap:6px;margin:6px 12px 6px 0"><input type="checkbox" class="guest-participant" value="${m.id}" checked>${m.name}</label>`).join('');
  $('projectShareDialog').close();$('guestDialog').showModal();
}
function submitGuestExpense(){
  const p=projectById(),amount=Number($('guestAmount').value),name=$('guestExpenseName').value.trim();
  const participantIds=[...document.querySelectorAll('.guest-participant:checked')].map(x=>x.value);
  if(!amount||!name||!participantIds.length)return alert('กรอกข้อมูลให้ครบ');
  p.pending.unshift({id:newId(),submitterId:$('guestMember').value,payerId:$('guestPayer').value,date:$('guestDate').value,amount,name,participantIds,note:$('guestNote').value.trim(),createdAt:new Date().toISOString()});
  saveProjects();$('guestDialog').close();renderProjectDetail();alert('ส่งรายการรอตรวจสอบแล้ว');
}
function renderProjectPending(){
  const p=projectById();
  $('projectPending').innerHTML=p.pending?.length?p.pending.map(x=>{
    const submitter=p.members.find(m=>m.id===x.submitterId)?.name||'-';
    const payer=p.members.find(m=>m.id===x.payerId)?.name||'-';
    return `<div class="list-row"><div><strong>${x.name}</strong><div class="muted">${x.date} · ผู้ส่ง ${submitter} · คนจ่าย ${payer} · ${projectCurrency(p,x.amount)}</div></div><div class="actions"><button class="btn btn-primary" onclick="approvePending('${x.id}')">อนุมัติ</button><button class="btn btn-danger" onclick="rejectPending('${x.id}')">ปฏิเสธ</button></div></div>`;
  }).join(''):'<div class="empty">ไม่มีรายการรอตรวจสอบ</div>';
}
function approvePending(id){
  const p=projectById(),x=p.pending.find(e=>e.id===id);if(!x)return;
  const each=x.amount/x.participantIds.length;
  const shares=x.participantIds.map((mid,i)=>({memberId:mid,amount:i===x.participantIds.length-1?x.amount-each*(x.participantIds.length-1):each}));
  p.expenses.unshift({id:newId(),date:x.date,amount:x.amount,currency:p.currency,exchangeRate:1,baseAmount:x.amount,name:x.name,payerId:x.payerId,shares,note:x.note,images:[],createdBy:x.submitterId,createdAt:x.createdAt,source:'guest'});
  p.pending=p.pending.filter(e=>e.id!==id);saveProjects();renderProjectDetail();
}
function rejectPending(id){
  const p=projectById();p.pending=p.pending.filter(e=>e.id!==id);saveProjects();renderProjectDetail();
}

function saveFeatureData(){ queueCloudSave(); }
function renderBudgets(){
  const month=today().slice(0,7);
  $('budgetList').innerHTML=budgets.length?budgets.map((b,i)=>{
    const path=entryCategoryPath(b),label=categoryPathLabel(path)||b.category||'ไม่ระบุ';
    const spent=entries.filter(e=>e.type==='expense'&&matchesCategoryPath(e,path)&&e.date.startsWith(month)).reduce((s,e)=>s+entryBaseAmount(e),0);
    const pct=b.amount?Math.round(spent/b.amount*100):0;
    return `<div class="card"><div class="list-row"><div><strong>${escapeHtml(label)}</strong><div class="muted">ใช้ ${money(spent)} จาก ${money(b.amount)}</div></div><button class="btn btn-danger" onclick="removeBudget(${i})">ลบ</button></div><div class="progress ${pct>100?'over':''}"><div style="width:${Math.min(pct,100)}%"></div></div><div class="muted" style="margin-top:6px">${pct}%</div></div>`;
  }).join(''):'<div class="card empty">ยังไม่ได้ตั้งงบประมาณ</div>';
}
function removeBudget(i){budgets.splice(i,1);saveFeatureData();renderBudgets();renderNotifications();}
$('addBudgetBtn').onclick=()=>{
  const path=parseCategoryPathValue($('budgetCategory').value), amount=Number($('budgetAmount').value);
  if(!path.length)return alert('กรุณาเลือกหมวดหมู่');
  if(!amount)return alert('กรุณาระบุงบประมาณ');
  const key=categoryPathLabel(path),old=budgets.find(b=>categoryPathLabel(entryCategoryPath(b))===key);
  if(old){old.amount=amount;old.alert=Number($('budgetAlert').value);old.category=path[0];old.categoryPath=path;}
  else budgets.push({category:path[0],categoryPath:path,amount,alert:Number($('budgetAlert').value)});
  saveFeatureData();$('budgetAmount').value='';renderBudgets();renderNotifications();
};

function nextDueDate(day){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  let d=new Date(y,m,Math.min(day,new Date(y,m+1,0).getDate()));
  if(d<new Date(now.toDateString())) d=new Date(y,m+1,Math.min(day,new Date(y,m+2,0).getDate()));
  return d;
}
function renderRecurring(){
  $('recurringList').innerHTML=recurringItems.length?recurringItems.map((r,i)=>{
    const due=nextDueDate(r.day);
    const diff=Math.ceil((due-new Date())/86400000);
    const label=categoryPathLabel(entryCategoryPath(r))||r.category||'ไม่ระบุ';
    return `<div class="list-row"><div><strong>${escapeHtml(r.name)}</strong><div class="muted">${money(r.amount)} · ${escapeHtml(label)} · ครบกำหนดวันที่ ${r.day} · อีก ${Math.max(diff,0)} วัน</div></div><div class="actions"><button class="btn btn-primary" onclick="postRecurring(${i})">บันทึกเป็นรายจ่าย</button><button class="btn btn-danger" onclick="removeRecurring(${i})">ลบ</button></div></div>`;
  }).join(''):'<div class="empty">ยังไม่มีรายการประจำ</div>';
}
$('addRecurringBtn').onclick=()=>{
  const name=$('recurringName').value.trim(),amount=Number($('recurringAmount').value),day=Number($('recurringDay').value);
  const path=parseCategoryPathValue($('recurringCategory').value);
  if(!name||!amount||!day||!path.length)return alert('กรอกข้อมูลให้ครบ');
  recurringItems.push({name,amount,day,category:path[0],subcategory:path[1]||'',detailCategory:path[2]||'',categoryPath:path,payer:$('recurringPayer').value,payment:$('recurringPayment').value,notify:Number($('recurringNotify').value)});
  saveFeatureData();$('recurringName').value='';$('recurringAmount').value='';renderRecurring();renderNotifications();
};
function removeRecurring(i){recurringItems.splice(i,1);saveFeatureData();renderRecurring();renderNotifications();}
function postRecurring(i){
  const r=recurringItems[i],path=entryCategoryPath(r);
  entries.unshift({id:newId(),createdAt:new Date().toISOString(),createdBy:activeUser||r.payer,type:'expense',date:today(),amount:r.amount,baseAmount:r.amount,currency:'THB',exchangeRate:1,category:path[0]||r.category||'อื่น ๆ',subcategory:path[1]||'',detailCategory:path[2]||'',categoryPath:path,merchant:r.name,payer:r.payer,payment:r.payment,status:'paid',note:'สร้างจากรายการประจำ',images:[],splits:[],tags:['รายเดือน']});
  rememberMerchantCategory(r.name,path,['รายเดือน']);rememberTags(['รายเดือน']);
  save();alert('บันทึกเป็นรายจ่ายแล้ว');
}

function renderCards(){
  $('cardList').innerHTML=creditCards.length?creditCards.map((c,i)=>{
    const month=today().slice(0,7);
    const total=entries.filter(e=>e.type==='expense'&&e.payment==='บัตรเครดิต'&&e.payer===c.owner&&e.date.startsWith(month)).reduce((s,e)=>s+entryBaseAmount(e),0);
    return `<div class="card"><div class="list-row"><div><strong>${c.name}</strong><div class="muted">${profiles[c.owner]?.name||c.owner} · ตัดรอบวันที่ ${c.cutDay} · ชำระวันที่ ${c.dueDay}</div></div><button class="btn btn-danger" onclick="removeCard(${i})">ลบ</button></div><div class="metric"><div class="label">ยอดรูดเดือนนี้</div><div class="value expense">${money(total)}</div></div></div>`;
  }).join(''):'<div class="card empty">ยังไม่มีข้อมูลบัตรเครดิต</div>';
}
$('addCardBtn').onclick=()=>{
  const name=$('cardName').value.trim();
  if(!name)return alert('กรุณาระบุชื่อบัตร');
  creditCards.push({name,owner:$('cardOwner').value,cutDay:Number($('cardCutDay').value),dueDay:Number($('cardDueDay').value)});
  saveFeatureData();$('cardName').value='';renderCards();renderNotifications();
};
function removeCard(i){creditCards.splice(i,1);saveFeatureData();renderCards();renderNotifications();}

function renderNotifications(){
  const notices=[];
  if(appSettings.notifyBudget!==false){
    const month=today().slice(0,7);
    budgets.forEach(b=>{
      const path=entryCategoryPath(b),label=categoryPathLabel(path)||b.category||'ไม่ระบุ';
      const spent=entries.filter(e=>e.type==='expense'&&matchesCategoryPath(e,path)&&e.date.startsWith(month)).reduce((s,e)=>s+entryBaseAmount(e),0);
      const pct=b.amount?spent/b.amount*100:0;
      if(pct>=b.alert) notices.push({danger:pct>=100,text:`งบ ${label} ใช้ไป ${Math.round(pct)}% (${money(spent)} จาก ${money(b.amount)})`});
    });
  }
  if(appSettings.notifyRecurring!==false){
    recurringItems.forEach(r=>{
      const diff=Math.ceil((nextDueDate(r.day)-new Date())/86400000);
      if(diff<=r.notify) notices.push({danger:false,text:`${r.name} ครบกำหนดใน ${Math.max(diff,0)} วัน จำนวนประมาณ ${money(r.amount)}`});
    });
  }
  if(appSettings.notifyCard!==false){
    creditCards.forEach(c=>{
      const now=new Date(), due=new Date(now.getFullYear(),now.getMonth(),Math.min(c.dueDay,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()));
      let diff=Math.ceil((due-new Date(now.toDateString()))/86400000);
      if(diff<0) diff+=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      if(diff<=5) notices.push({danger:false,text:`บัตร ${c.name} ใกล้ถึงวันชำระ อีก ${diff} วัน`});
    });
  }
  $('notificationArea').innerHTML=notices.map(n=>`<div class="notice ${n.danger?'danger':''}">${n.text}</div>`).join('');
}

$('saveNotifyBtn').onclick=()=>{
  appSettings.notifyRecurring=$('notifyRecurring').checked;
  appSettings.notifyBudget=$('notifyBudget').checked;
  appSettings.notifyCard=$('notifyCard').checked;
  queueCloudSave();
  renderNotifications();alert('บันทึกการแจ้งเตือนแล้ว');
};
$('backupBtn').onclick=()=>{
  const data={version:3,exportedAt:new Date().toISOString(),entries,appSettings,profiles,categories,categoryCatalog,tagLibrary,merchantCategoryMemory,budgets,recurringItems,creditCards,projects,calendarItems,appNotifications};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download='home-expense-backup.json';a.click();
};
$('restoreFile')?.addEventListener('change',async e=>{
  try{
    const data=JSON.parse(await e.target.files[0].text());
    if(!confirm('นำเข้าข้อมูลนี้และแทนที่ข้อมูลปัจจุบันหรือไม่?'))return;
    entries=data.entries||[];appSettings=data.appSettings||{};profiles=data.profiles||profiles;categories=data.categories||categories;
    categoryCatalog=normalizeCategoryCatalog(data.categoryCatalog,categories);syncFlatCategories();
    tagLibrary=Array.isArray(data.tagLibrary)?data.tagLibrary:[];
    merchantCategoryMemory=data.merchantCategoryMemory&&typeof data.merchantCategoryMemory==='object'?data.merchantCategoryMemory:{};
    budgets=data.budgets||[];recurringItems=data.recurringItems||[];creditCards=data.creditCards||[];projects=data.projects||[];
    calendarItems=data.calendarItems||[];appNotifications=data.appNotifications||[];
    refreshProfilesUI();refreshCategories();renderAll();queueCloudSave();alert('นำเข้าข้อมูลแล้วและกำลังบันทึกขึ้น Cloud');
  }catch(err){alert('ไฟล์ข้อมูลไม่ถูกต้อง');}
  e.target.value='';
});


function formatBytes(bytes){
  const n=Number(bytes||0);
  if(n<1024)return n.toLocaleString('th-TH')+' B';
  if(n<1048576)return (n/1024).toLocaleString('th-TH',{maximumFractionDigits:1})+' KB';
  if(n<1073741824)return (n/1048576).toLocaleString('th-TH',{maximumFractionDigits:1})+' MB';
  return (n/1073741824).toLocaleString('th-TH',{maximumFractionDigits:2})+' GB';
}
function browserStorageStats(){
  let bytes=0;
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i),value=localStorage.getItem(key)||'';
    bytes+=(key.length+value.length)*2;
  }
  $('browserStorageUsed').textContent=formatBytes(bytes)+' (Session/Cache)';
  return bytes;
}
async function loadStorageUsage(){
  $('storageUsageNote').textContent='กำลังโหลดข้อมูลจาก Supabase...';
  try{
    const res=await fetch('/api/storage/summary',{cache:'no-store'});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'โหลดข้อมูลไม่สำเร็จ');
    $('storageUsed').textContent=formatBytes(data.usedBytes);
    $('storageRemaining').textContent=formatBytes(data.remainingBytes);
    $('storageFileCount').textContent=Number(data.fileCount||0).toLocaleString('th-TH');
    $('storageProgress').querySelector('div').style.width=Math.min(Number(data.percentUsed||0),100)+'%';
    $('storageUsageNote').textContent=`ใช้ไป ${Number(data.percentUsed||0).toLocaleString('th-TH',{maximumFractionDigits:1})}% · อัปเดต ${new Date(data.calculatedAt).toLocaleString('th-TH')}`;
  }catch(err){
    $('storageUsageNote').textContent='โหลด Supabase Storage ไม่สำเร็จ: '+err.message;
    $('storageUsed').textContent='-';$('storageRemaining').textContent='-';$('storageFileCount').textContent='-';
  }
  browserStorageStats();
}
async function scanOldStorageFiles(){
  const days=Number($('attachmentAge').value||365);
  $('storageFileList').innerHTML='<div class="empty">กำลังค้นหาไฟล์...</div>';
  try{
    const res=await fetch(`/api/storage/files?bucket=receipts&olderThanDays=${days}&limit=500`,{cache:'no-store'});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'ค้นหาไฟล์ไม่สำเร็จ');
    const files=data.files||[];
    $('deleteSelectedStorageBtn').disabled=!files.length;
    $('storageFileList').innerHTML=files.length?`<div class="muted" style="margin-bottom:8px">พบ ${files.length.toLocaleString('th-TH')} ไฟล์ รวม ${formatBytes(data.totalBytes)}</div>${files.map(f=>`<label class="storage-file-row"><input class="storage-file-check" type="checkbox" value="${encodeURIComponent(f.path)}"><div><strong>${f.path.split('/').pop()}</strong><div class="muted">${new Date(f.createdAt).toLocaleDateString('th-TH')}</div></div><span class="storage-size muted">${formatBytes(f.size)}</span></label>`).join('')}`:'<div class="empty">ไม่พบไฟล์ตามช่วงอายุที่เลือก</div>';
  }catch(err){
    $('storageFileList').innerHTML=`<div class="notice danger">${err.message}</div>`;
    $('deleteSelectedStorageBtn').disabled=true;
  }
}
async function deleteSelectedStorageFiles(){
  const paths=[...document.querySelectorAll('.storage-file-check:checked')].map(x=>decodeURIComponent(x.value));
  if(!paths.length)return alert('กรุณาเลือกไฟล์ที่ต้องการลบ');
  if(!confirm(`ลบไฟล์ ${paths.length} รายการจาก Supabase ถาวรหรือไม่?`))return;
  const btn=$('deleteSelectedStorageBtn');btn.disabled=true;btn.textContent='กำลังลบ...';
  try{
    const res=await fetch('/api/storage/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bucket:'receipts',paths})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'ลบไฟล์ไม่สำเร็จ');
    alert(`ลบไฟล์แล้ว ${data.deleted} รายการ`);
    await scanOldStorageFiles();await loadStorageUsage();
  }catch(err){alert(err.message)}
  finally{btn.textContent='ลบไฟล์ที่เลือกจาก Supabase';btn.disabled=false;}
}
function deleteOldLocalAttachments(){
  const days=Number($('attachmentAge').value||365);
  const cutoff=Date.now()-days*86400000;
  let removed=0;
  entries.forEach(e=>{
    const date=new Date(e.date||e.createdAt||0).getTime();
    if(date&&date<cutoff&&Array.isArray(e.images)&&e.images.length){removed+=e.images.length;e.images=[];}
  });
  projects.forEach(p=>(p.expenses||[]).forEach(e=>{
    const date=new Date(e.date||e.createdAt||0).getTime();
    if(date&&date<cutoff&&Array.isArray(e.images)&&e.images.length){removed+=e.images.length;e.images=[];}
  }));
  if(!removed)return alert('ไม่พบรูปเก่าแบบเดิมตามช่วงเวลาที่เลือก');
  if(!confirm(`พบรูปเก่า ${removed} รูป ต้องการลบเฉพาะรูปและเก็บรายการไว้หรือไม่?`))return;
  queueCloudSave();
  saveProjects();renderAll();browserStorageStats();
  queueCloudSave();alert(`ลบรูปเก่าแล้ว ${removed} รูป และกำลังอัปเดต Cloud`);
}
$('refreshStorageBtn')?.addEventListener('click',loadStorageUsage);
$('scanAttachmentsBtn')?.addEventListener('click',scanOldStorageFiles);
$('deleteSelectedStorageBtn')?.addEventListener('click',deleteSelectedStorageFiles);
$('deleteLocalOldAttachmentsBtn')?.addEventListener('click',deleteOldLocalAttachments);
document.addEventListener('change',e=>{
  if(e.target.classList?.contains('storage-file-check')){
    $('deleteSelectedStorageBtn').disabled=!document.querySelector('.storage-file-check:checked');
  }
});


function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function calendarOccurrences(item,start,end){
  const base=new Date(item.date+'T12:00:00'), out=[]; if(isNaN(base))return out;
  let d=new Date(base),guard=0;
  while(d<start&&guard++<500){if(item.repeat==='daily')d.setDate(d.getDate()+1);else if(item.repeat==='weekly')d.setDate(d.getDate()+7);else if(item.repeat==='monthly')d.setMonth(d.getMonth()+1);else if(item.repeat==='yearly')d.setFullYear(d.getFullYear()+1);else break;}
  while(d<=end&&guard++<800){if(d>=start)out.push({...item,occurrenceDate:ymd(d)});if(item.repeat==='daily')d.setDate(d.getDate()+1);else if(item.repeat==='weekly')d.setDate(d.getDate()+7);else if(item.repeat==='monthly')d.setMonth(d.getMonth()+1);else if(item.repeat==='yearly')d.setFullYear(d.getFullYear()+1);else break;}
  return out;
}
function filteredCalendarItems(start,end){
  return calendarItems.flatMap(i=>calendarOccurrences(i,start,end)).filter(i=>calendarFilter==='all'||calendarFilter===i.type||(calendarFilter==='mine'&&(i.assignees||[]).includes(activeUser)));
}
function renderCalendar(){
  const y=calendarViewDate.getFullYear(),m=calendarViewDate.getMonth(),first=new Date(y,m,1),gridStart=new Date(y,m,1-first.getDay()),gridEnd=new Date(gridStart);gridEnd.setDate(gridEnd.getDate()+41);
  $('calendarMonthTitle').textContent=calendarViewDate.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  const occ=filteredCalendarItems(gridStart,gridEnd);
  $('calendarGrid').innerHTML=Array.from({length:42},(_,n)=>{const d=new Date(gridStart);d.setDate(d.getDate()+n);const ds=ymd(d),items=occ.filter(x=>x.occurrenceDate===ds);return `<div class="calendar-day ${d.getMonth()!==m?'other':''} ${ds===today()?'today':''} ${ds===selectedCalendarDate?'selected':''}" onclick="selectCalendarDate('${ds}')"><div class="day-number">${d.getDate()}</div>${items.slice(0,3).map(i=>`<div class="day-event ${i.type} ${i.status==='done'?'done':''}">${i.time?i.time+' ':''}${escapeHtml(i.name)}</div>`).join('')}${items.length>3?`<div class="muted">+${items.length-3} รายการ</div>`:''}</div>`}).join('');
  renderCalendarAgenda();renderUpcomingAgenda();updateNotificationBadge();
}
function selectCalendarDate(ds){selectedCalendarDate=ds;renderCalendar()}
function moveCalendarMonth(n){calendarViewDate.setMonth(calendarViewDate.getMonth()+n);renderCalendar()}
function itemOccurrenceOn(item,ds){return calendarOccurrences(item,new Date(ds+'T00:00:00'),new Date(ds+'T23:59:59')).length>0}
function renderCalendarAgenda(){
  const items=calendarItems.filter(i=>itemOccurrenceOn(i,selectedCalendarDate)&&(calendarFilter==='all'||calendarFilter===i.type||(calendarFilter==='mine'&&(i.assignees||[]).includes(activeUser))));
  $('agendaTitle').textContent=new Date(selectedCalendarDate+'T12:00:00').toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'});
  $('calendarAgenda').innerHTML=items.length?items.map(i=>calendarItemHtml(i,selectedCalendarDate)).join(''):'<div class="empty">ไม่มีรายการในวันนี้</div>';
}
function renderUpcomingAgenda(){const start=new Date(),end=new Date();end.setDate(end.getDate()+30);const items=filteredCalendarItems(start,end).filter(i=>i.status!=='done').sort((a,b)=>(a.occurrenceDate+a.time).localeCompare(b.occurrenceDate+b.time)).slice(0,8);$('upcomingAgenda').innerHTML=items.length?items.map(i=>`<div class="list-row"><div><strong>${escapeHtml(i.name)}</strong><div class="muted">${new Date(i.occurrenceDate+'T12:00:00').toLocaleDateString('th-TH')} ${i.time||''}</div></div>${i.amount?`<strong>${money(i.amount)}</strong>`:''}</div>`).join(''):'<div class="empty">ไม่มีรายการใกล้ถึง</div>'}
function calendarItemHtml(i,ds){
  const overdue=ds<today()&&i.status!=='done',categoryLabel=entryCategoryLabel(i);
  return `<div class="agenda-item ${overdue?'overdue':''} ${i.status==='done'?'done':''}"><div style="display:flex;justify-content:space-between;gap:8px"><div><strong>${i.type==='bill'?'💳':i.type==='task'?'✅':'📌'} ${escapeHtml(i.name)}</strong><div class="muted">${i.time||'ทั้งวัน'} · ${(i.assignees||[]).map(a=>profiles[a]?.name||a).join(', ')||'ไม่ได้ระบุผู้รับผิดชอบ'}</div>${i.type==='bill'?`<div class="small">${escapeHtml(categoryLabel)}</div>`:''}${i.note?`<div class="small">${escapeHtml(i.note)}</div>`:''}</div>${i.amount?`<strong>${money(i.amount)}</strong>`:''}</div><div class="actions" style="margin-top:9px">${i.status!=='done'?`<button class="btn btn-primary" onclick="completeCalendarItem('${i.id}','${ds}')">${i.type==='bill'?'ชำระแล้ว':'เสร็จแล้ว'}</button>`:'<span class="badge in">เสร็จแล้ว</span>'}<button class="btn btn-light" onclick="openCalendarEditor('${i.id}')">แก้ไข</button></div></div>`;
}
function openCalendarEditor(id=''){
  const i=calendarItems.find(x=>x.id===id);
  $('calendarEditId').value=id;
  $('calendarEditorTitle').textContent=i?'แก้ไขกำหนดการ':'เพิ่มกำหนดการ';
  $('calendarName').value=i?.name||'';
  $('calendarType').value=i?.type||'bill';
  $('calendarPriority').value=i?.priority||'normal';
  $('calendarDate').value=i?.date||selectedCalendarDate||today();
  $('calendarTime').value=i?.time||'';
  $('calendarAmount').value=i?.amount||'';
  const calendarPath=i?entryCategoryPath(i):['อื่น ๆ'];
  $('calendarCategory').innerHTML=detailedCategoryOptions(calendarPath);
  $('calendarRepeat').value=i?.repeat||'none';
  $('calendarRemind').value=String(i?.remindDays??1);
  $('calendarPayment').value=i?.payment||'โอนเงิน';
  $('calendarNote').value=i?.note||'';
  $('calendarProject').innerHTML='<option value="">ไม่เชื่อมโปรเจกต์</option>'+projects.map(p=>`<option value="${p.id}" ${p.id===i?.projectId?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  $('calendarAssignees').innerHTML=Object.keys(profiles).map(k=>`<label><input type="checkbox" value="${k}" ${(i?.assignees||[activeUser]).includes(k)?'checked':''}> ${escapeHtml(profiles[k]?.name||k)}</label>`).join('');
  $('deleteCalendarBtn').classList.toggle('hidden',!i);
  calendarEditorDialog.showModal();
}
$('calendarForm').onsubmit=e=>{
  e.preventDefault();
  const id=$('calendarEditId').value||newId(),old=calendarItems.find(x=>x.id===id);
  const path=parseCategoryPathValue($('calendarCategory').value);
  const item={
    id,name:$('calendarName').value.trim(),type:$('calendarType').value,priority:$('calendarPriority').value,
    date:$('calendarDate').value,time:$('calendarTime').value,amount:Number($('calendarAmount').value||0),
    category:path[0]||'อื่น ๆ',subcategory:path[1]||'',detailCategory:path[2]||'',categoryPath:path,
    repeat:$('calendarRepeat').value,remindDays:Number($('calendarRemind').value||0),
    assignees:[...$('calendarAssignees').querySelectorAll('input:checked')].map(x=>x.value),
    projectId:$('calendarProject').value,payment:$('calendarPayment').value,note:$('calendarNote').value.trim(),
    status:old?.status||'pending',completedOccurrences:old?.completedOccurrences||[],
    createdBy:old?.createdBy||activeUser,createdAt:old?.createdAt||new Date().toISOString()
  };
  if(old)calendarItems=calendarItems.map(x=>x.id===id?item:x);else calendarItems.unshift(item);
  queueCloudSave();calendarEditorDialog.close();renderCalendar();
  createNotification(item.assignees,`เพิ่มกำหนดการ: ${item.name}`,item.date,item.id);
};
$('deleteCalendarBtn').onclick=()=>deleteCalendarItem();
function completeCalendarItem(id,occurrenceDate){
  const i=calendarItems.find(x=>x.id===id);if(!i)return;
  if(i.repeat&&i.repeat!=='none')i.completedOccurrences=[...(i.completedOccurrences||[]),occurrenceDate];
  else i.status='done';
  if(i.type==='bill'&&i.amount){
    const path=entryCategoryPath(i);
    entries.unshift({
      id:newId(),date:occurrenceDate,type:'expense',amount:i.amount,baseAmount:i.amount,currency:'THB',exchangeRate:1,
      category:path[0]||'อื่น ๆ',subcategory:path[1]||'',detailCategory:path[2]||'',categoryPath:path,
      tags:['ปฏิทิน'],payer:activeUser,payment:i.payment||'โอนเงิน',merchant:i.name,note:'สร้างจากปฏิทิน',
      images:[],splits:[],createdAt:new Date().toISOString(),createdBy:activeUser
    });
    rememberMerchantCategory(i.name,path,['ปฏิทิน']);rememberTags(['ปฏิทิน']);
  }
  createNotification(i.assignees,`${i.type==='bill'?'ชำระ':'ทำงาน'}แล้ว: ${i.name}`,occurrenceDate,i.id);
  queueCloudSave();renderAll();
}
function deleteCalendarItem(){
  const id=$('calendarEditId').value;
  if(confirm('ลบกำหนดการนี้หรือไม่?')){
    calendarItems=calendarItems.filter(x=>x.id!==id);
    queueCloudSave();calendarEditorDialog.close();renderCalendar();
  }
}
function createNotification(users,title,date,itemId){if(!(users||[]).includes(activeUser))return;const n={id:newId(),title,date,itemId,read:false,createdAt:new Date().toISOString()};appNotifications.unshift(n);showToast(title);sendBrowserNotification(title,date);queueCloudSave();updateNotificationBadge()}
function showToast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toastStack').appendChild(el);setTimeout(()=>el.remove(),4500)}
async function sendBrowserNotification(title,body=''){if(!('Notification'in window))return;if(Notification.permission==='default')await Notification.requestPermission();if(Notification.permission==='granted'){try{const reg=await navigator.serviceWorker?.ready;if(reg)reg.showNotification(title,{body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:'/app.html?page=calendar'}});else new Notification(title,{body})}catch{new Notification(title,{body})}}}
function checkDueCalendarReminders(){const now=new Date();calendarItems.forEach(i=>{if(!(i.assignees||[]).includes(activeUser)||i.status==='done')return;const horizon=new Date(now);horizon.setDate(horizon.getDate()+Number(i.remindDays||0));const occ=calendarOccurrences(i,new Date(now.getFullYear(),now.getMonth(),now.getDate()),horizon);occ.forEach(o=>{const key=`${i.id}:${o.occurrenceDate}:${activeUser}`;if(appNotifications.some(n=>n.reminderKey===key))return;const n={id:newId(),title:`ใกล้ถึงกำหนด: ${i.name}`,date:o.occurrenceDate,itemId:i.id,read:false,reminderKey:key,createdAt:new Date().toISOString()};appNotifications.unshift(n);showToast(n.title);sendBrowserNotification(n.title,`กำหนด ${new Date(o.occurrenceDate+'T12:00:00').toLocaleDateString('th-TH')}`)})});queueCloudSave();updateNotificationBadge()}
function updateNotificationBadge(){const count=appNotifications.filter(n=>!n.read).length;$('notificationBadge')?.classList.toggle('hidden',!count);if($('notificationBadge'))$('notificationBadge').textContent=count;$('calendarNavBadge')?.classList.toggle('hidden',!count);if($('calendarNavBadge'))$('calendarNavBadge').textContent=count}
function openNotificationCenter(){renderNotificationCenter();notificationCenterDialog.showModal()}
function renderNotificationCenter(){$('notificationCenterList').innerHTML=appNotifications.length?appNotifications.map(n=>`<div class="list-row"><div><strong>${escapeHtml(n.title)}</strong><div class="muted">${n.date||''} · ${new Date(n.createdAt).toLocaleString('th-TH')}</div></div>${n.read?'<span class="badge">อ่านแล้ว</span>':`<button class="btn btn-light" onclick="markNotificationRead('${n.id}')">อ่านแล้ว</button>`}</div>`).join(''):'<div class="empty">ไม่มีการแจ้งเตือน</div>'}
function markNotificationRead(id){const n=appNotifications.find(x=>x.id===id);if(n)n.read=true;queueCloudSave();renderNotificationCenter();updateNotificationBadge()}
function markAllNotificationsRead(){appNotifications.forEach(n=>n.read=true);queueCloudSave();renderNotificationCenter();updateNotificationBadge()}
document.querySelectorAll('[data-cal-filter]').forEach(b=>b.onclick=()=>{calendarFilter=b.dataset.calFilter;document.querySelectorAll('[data-cal-filter]').forEach(x=>x.classList.toggle('active',x===b));renderCalendar()});
if(navigator.serviceWorker?.register)navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('Service Worker:',err));
setInterval(checkDueCalendarReminders,60*60*1000);
setTimeout(checkDueCalendarReminders,2500);

function renderAll(){
  const jobs=[['Dashboard',renderDashboard],['History',renderHistory],['Settle',renderSettle],['Projects',renderProjects],['Calendar',renderCalendar],['Budgets',renderBudgets],['Recurring',renderRecurring],['Cards',renderCards],['Notifications',renderNotifications],['Badge',updateNotificationBadge],['Settings',applyDashboardSettings]];
  jobs.forEach(([name,fn])=>{try{fn()}catch(err){console.error('Render '+name+' failed',err)}});
}
$('retryBootBtn')?.addEventListener('click',()=>bootstrapCloudState());
$('backToLoginBtn')?.addEventListener('click',()=>{if(!appLifecycle.redirecting)appLifecycle.redirecting=true;location.replace('/')});
window.addEventListener('error',event=>reportRuntimeError('ระบบพบข้อผิดพลาด: '+(event.error?.message||event.message),event.error));
window.addEventListener('unhandledrejection',event=>reportRuntimeError('การทำงานบางส่วนไม่สำเร็จ: '+(event.reason?.message||String(event.reason)),event.reason));
window.addEventListener('pageshow',event=>{if(event.persisted&&appLifecycle.ready)renderAll()});
bootstrapCloudState();
