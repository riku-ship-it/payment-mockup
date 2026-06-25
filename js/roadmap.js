// 開發路線圖 邏輯
const rmStatusMeta = {
  done:   { cls: 'rm-done',   icon: '✅', label: '已完成' },
  active: { cls: 'rm-active', icon: '⚠',  label: '進行中・卡關' },
  next:   { cls: 'rm-next',   icon: '⬜', label: '下一步' },
  later:  { cls: 'rm-later',  icon: '🔵', label: '後續優化' },
  goal:   { cls: 'rm-goal-n', icon: '🎯', label: '最終目標' }
};

const rmDefaultNodes = [
  { id: 'start', ver: 'START\nv1', lbl: '核心流程', size: 84, status: 'done',
    t: 'v1　核心流程　✅ 已完成',
    b: '資金分配申請單基本欄位（申請人、單位、幣別、用途、金額）\n多層主管審核（課級、處級、議會主席等）\n核准或退回功能・後台流程角色自由設定' },
  { id: 'v2', ver: 'v2', lbl: '基礎功能', size: 78, status: 'done',
    t: 'v2　基礎功能　✅ 已完成',
    b: '自動產生單號・單據檔案上傳・日期選擇・申請範本設定\n基本搜尋・CSV 匯出・稅金計算欄位架構（規則尚未完整）' },
  { id: 'v3', ver: 'v3', lbl: '稅金計算\n完整化', size: 98, status: 'active', blocker: '⚠ 卡關・待財務確認',
    t: 'v3　稅金計算完整化　⚠ 卡關中',
    b: '付款對象類型選單（本國個人 / 外國個人 / 境外公司 / 員工自墊）\n所得稅自動判斷（10% / 20% / 專屬稅率）\n補充保費門檻（≥$20,000 扣 2.11%）\n特定公司稅率（Meta 3%、HubSpot 15%）\n🔴 待財務提供：境外公司完整清單 + 國內費用類型對照表' },
  { id: 'v4', ver: 'v4', lbl: '付款憑單\n整合', size: 78, status: 'next',
    t: 'v4　付款憑單整合　⬜ 下一步',
    b: '申請單審核通過後，付款明細自動同步到憑單\n同一申請可建立多張憑單（對應不同付款對象）\n系統自動為各對象產生獨立單號' },
  { id: 'v5', ver: 'v5', lbl: '審核編輯\n＆軌跡', size: 78, status: 'next',
    t: 'v5　審核編輯與軌跡　⬜ 下一步',
    b: '審核人員可在審核中編輯申請內容\n每次儲存記錄編輯人姓名＋時間戳記\n核准後顯示核准人與時間\n暫付款沖銷流程（活動後補發票、核銷預付）' },
  { id: 'v6', ver: 'v6', lbl: '報表搜尋\n優化', size: 78, status: 'later',
    t: 'v6　報表搜尋優化　🔵 後續',
    b: '進階多條件搜尋（日期區間、狀態、申請人、單位）\n財務自訂匯出報表欄位\n申請者查看剩餘可用金額・統計儀表板' },
  { id: 'goal', ver: 'GOAL', lbl: '財務系統\n全面上線', size: 88, status: 'goal',
    t: 'GOAL　財務系統全面上線　🎯',
    b: '申請流程順暢，不再需要外部工具計算稅金\n財務單位可快速搜尋、彙整、匯出資料\n付款憑單一站完成，多對象自動拆單\n所有審核留有完整軌跡' }
];

let rmCurrent = null;
let rmNodes = null;

function rmLoadNodes() {
  if (rmNodes) return rmNodes;
  try {
    const r = localStorage.getItem('bci_roadmap_v2');
    rmNodes = r ? JSON.parse(r) : rmDefaultNodes.map(n => ({ ...n }));
  } catch (e) {
    rmNodes = rmDefaultNodes.map(n => ({ ...n }));
  }
  return rmNodes;
}
function rmSaveNodes() {
  try { localStorage.setItem('bci_roadmap_v2', JSON.stringify(rmNodes)); } catch (e) {}
}
function rmGetNode(id) {
  return rmLoadNodes().find(n => n.id === id);
}

function rmRender() {
  const road = document.getElementById('rm-road');
  if (!road) return;
  road.innerHTML = '';
  rmLoadNodes().forEach((n, i) => {
    if (i > 0) {
      const conn = document.createElement('div');
      conn.className = 'rm-conn-h';
      road.appendChild(conn);
    }
    const meta = rmStatusMeta[n.status] || rmStatusMeta.next;
    const wrap = document.createElement('div');
    wrap.className = 'rm-node-wrap';

    const node = document.createElement('div');
    node.className = 'rm-node ' + meta.cls;
    node.style.width = (n.size || 78) + 'px';
    node.style.height = (n.size || 78) + 'px';
    node.onclick = () => rmShow(n.id);
    (n.ver || '').split('\n').forEach(line => {
      const s = document.createElement('span');
      s.className = 'rm-n-ver';
      s.textContent = line;
      node.appendChild(s);
    });
    (n.lbl || '').split('\n').forEach(line => {
      const s = document.createElement('span');
      s.className = 'rm-n-lbl';
      s.textContent = line;
      node.appendChild(s);
    });
    wrap.appendChild(node);

    if (n.blocker) {
      const tag = document.createElement('div');
      tag.className = 'rm-blocker-tag';
      tag.textContent = n.blocker;
      wrap.appendChild(tag);
    }
    road.appendChild(wrap);
  });
}

function rmShow(id) {
  rmCurrent = id;
  const d = rmGetNode(id);
  if (!d) return;
  document.getElementById('rm-pt').textContent = d.t;
  document.getElementById('rm-pb').innerHTML = d.b.replace(/\n/g, '<br>');
  document.getElementById('rm-editBtn').style.display = 'inline-block';
  document.getElementById('rm-view-area').style.display = 'block';
  document.getElementById('rm-edit-area').classList.remove('show');
}

function rmFillStatusSelect(current) {
  const sel = document.getElementById('rm-e-status');
  sel.innerHTML = '';
  Object.keys(rmStatusMeta).forEach(key => {
    const meta = rmStatusMeta[key];
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = meta.icon + ' ' + meta.label;
    if (key === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function rmToggleEdit() {
  const d = rmGetNode(rmCurrent);
  if (!d) return;
  document.getElementById('rm-e-ver').value = (d.ver || '').replace(/\n/g, '\\n');
  document.getElementById('rm-e-lbl').value = (d.lbl || '').replace(/\n/g, '\\n');
  document.getElementById('rm-e-title').value = d.t;
  document.getElementById('rm-e-body').value = d.b;
  rmFillStatusSelect(d.status);
  document.getElementById('rm-view-area').style.display = 'none';
  document.getElementById('rm-edit-area').classList.add('show');
  document.getElementById('rm-editBtn').style.display = 'none';
}
function rmCancelEdit() {
  document.getElementById('rm-view-area').style.display = 'block';
  document.getElementById('rm-edit-area').classList.remove('show');
  document.getElementById('rm-editBtn').style.display = 'inline-block';
}
function rmSaveEdit() {
  const d = rmGetNode(rmCurrent);
  if (!d) return;
  d.ver = document.getElementById('rm-e-ver').value.replace(/\\n/g, '\n');
  d.lbl = document.getElementById('rm-e-lbl').value.replace(/\\n/g, '\n');
  d.t = document.getElementById('rm-e-title').value;
  d.b = document.getElementById('rm-e-body').value;
  d.status = document.getElementById('rm-e-status').value;
  rmSaveNodes();
  rmRender();
  document.getElementById('rm-pt').textContent = d.t;
  document.getElementById('rm-pb').innerHTML = d.b.replace(/\n/g, '<br>');
  rmCancelEdit();
  const sn = document.getElementById('rm-sn');
  sn.classList.add('show');
  setTimeout(() => sn.classList.remove('show'), 2000);
}

function rmAddNode() {
  const nodes = rmLoadNodes();
  const id = 'node_' + Date.now();
  const n = { id, ver: '新節點', lbl: '未命名', size: 78, status: 'next', t: '新節點', b: '點擊編輯填寫內容' };
  nodes.splice(Math.max(nodes.length - 1, 0), 0, n);
  rmSaveNodes();
  rmRender();
  rmShow(id);
  rmToggleEdit();
}

rmRender();
