// 開發路線圖 邏輯
const rmDefaults = {
  start: { t: 'v1　核心流程　✅ 已完成', b: '資金分配申請單基本欄位（申請人、單位、幣別、用途、金額）\n多層主管審核（課級、處級、議會主席等）\n核准或退回功能・後台流程角色自由設定' },
  v2: { t: 'v2　基礎功能　✅ 已完成', b: '自動產生單號・單據檔案上傳・日期選擇・申請範本設定\n基本搜尋・CSV 匯出・稅金計算欄位架構（規則尚未完整）' },
  v3: { t: 'v3　稅金計算完整化　⚠ 卡關中', b: '付款對象類型選單（本國個人 / 外國個人 / 境外公司 / 員工自墊）\n所得稅自動判斷（10% / 20% / 專屬稅率）\n補充保費門檻（≥$20,000 扣 2.11%）\n特定公司稅率（Meta 3%、HubSpot 15%）\n🔴 待財務提供：境外公司完整清單 + 國內費用類型對照表' },
  v4: { t: 'v4　付款憑單整合　⬜ 下一步', b: '申請單審核通過後，付款明細自動同步到憑單\n同一申請可建立多張憑單（對應不同付款對象）\n系統自動為各對象產生獨立單號' },
  v5: { t: 'v5　審核編輯與軌跡　⬜ 下一步', b: '審核人員可在審核中編輯申請內容\n每次儲存記錄編輯人姓名＋時間戳記\n核准後顯示核准人與時間\n暫付款沖銷流程（活動後補發票、核銷預付）' },
  v6: { t: 'v6　報表搜尋優化　🔵 後續', b: '進階多條件搜尋（日期區間、狀態、申請人、單位）\n財務自訂匯出報表欄位\n申請者查看剩餘可用金額・統計儀表板' },
  goal: { t: 'GOAL　財務系統全面上線　🎯', b: '申請流程順暢，不再需要外部工具計算稅金\n財務單位可快速搜尋、彙整、匯出資料\n付款憑單一站完成，多對象自動拆單\n所有審核留有完整軌跡' }
};

let rmCurrent = null;

function rmLoadData() {
  try { const r = localStorage.getItem('bci_roadmap'); return r ? JSON.parse(r) : {}; } catch (e) { return {}; }
}
function rmSaveData(obj) {
  try { localStorage.setItem('bci_roadmap', JSON.stringify(obj)); } catch (e) {}
}
function rmGetData(k) {
  const s = rmLoadData(); return s[k] || rmDefaults[k];
}
function rmShow(k) {
  rmCurrent = k;
  const d = rmGetData(k);
  document.getElementById('rm-pt').textContent = d.t;
  document.getElementById('rm-pb').innerHTML = d.b.replace(/\n/g, '<br>');
  document.getElementById('rm-editBtn').style.display = 'inline-block';
  document.getElementById('rm-view-area').style.display = 'block';
  document.getElementById('rm-edit-area').classList.remove('show');
}
function rmToggleEdit() {
  const d = rmGetData(rmCurrent);
  document.getElementById('rm-e-title').value = d.t;
  document.getElementById('rm-e-body').value = d.b;
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
  const t = document.getElementById('rm-e-title').value;
  const b = document.getElementById('rm-e-body').value;
  const s = rmLoadData();
  s[rmCurrent] = { t, b };
  rmSaveData(s);
  document.getElementById('rm-pt').textContent = t;
  document.getElementById('rm-pb').innerHTML = b.replace(/\n/g, '<br>');
  rmCancelEdit();
  const sn = document.getElementById('rm-sn');
  sn.classList.add('show');
  setTimeout(() => sn.classList.remove('show'), 2000);
}
