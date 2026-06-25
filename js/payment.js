// 付款明細表單 + 費用項目設定 邏輯
// Web App URL from the GAS deployment described in gas/Code.gs.
const GAS_URL = "https://script.google.com/macros/s/AKfycbxzZxjzESlL2vmi4mJICZM6G0Z_IwG1r9L0NALmg7u3R0l3-zzwoCggqOeEywKInpeTXw/exec";

const TYPE_KEYS = ["companyDomestic", "individualDomestic", "companyForeign", "individualForeign"];
const TYPE_LABELS = {
  companyDomestic: "國內公司",
  individualDomestic: "國內個人",
  companyForeign: "國外公司",
  individualForeign: "國外個人"
};

const DEFAULT_CONFIG = {
  companyDomestic: {
    items: [
      { name: "SBBG", hasFormula: false, rate: 5, payee: "國稅局" }
    ]
  },
  individualDomestic: {
    items: [
      { name: "顧問費（二代健保）", hasFormula: true, rate: 2.11, payee: "健保署" }
    ]
  },
  companyForeign: {
    items: [
      { name: "Fireflies", hasFormula: false, rate: 0, payee: "" },
      { name: "Claude", hasFormula: true, rate: 20, payee: "國稅局" }
    ]
  },
  individualForeign: {
    items: [
      { name: "非本國個人 租金/勞務/執行業務報酬", hasFormula: true, rate: 20, payee: "國稅局" }
    ]
  }
};

function isValidConfig(parsed) {
  if (!parsed) return false;
  return TYPE_KEYS.every(t => parsed[t] && Array.isArray(parsed[t].items));
}

function isGasConfigured() {
  return GAS_URL && GAS_URL.indexOf("PUT_YOUR_GAS_WEB_APP_URL_HERE") === -1;
}

function fetchConfig() {
  if (!isGasConfigured()) return Promise.resolve();
  return fetch(GAS_URL)
    .then(res => res.json())
    .then(data => {
      if (isValidConfig(data)) CONFIG = data;
    })
    .catch(err => {
      console.error("讀取共用設定失敗，改用預設值", err);
    });
}

let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

let currentType = "companyDomestic";
let feeItemText = "";
let currency = "TWD";
const CURRENCY_OPTIONS = [
  { value: "TWD", label: "TWD 新台幣" },
  { value: "USD", label: "USD 美金" },
  { value: "GBP", label: "GBP 英鎊" }
];
let items = [
  { base: 10000, fee: 0, note: "", fileName: "", taxOverride: null },
  { base: 3000, fee: 0, note: "", fileName: "", taxOverride: null }
];

function setupCombobox(opts) {
  let open = false;
  let filtering = false;

  function renderPanel() {
    const filterText = filtering ? opts.input.value.toLowerCase() : "";
    const filtered = opts.getOptions().filter(o => o.label.toLowerCase().includes(filterText));
    opts.panel.innerHTML = filtered.length
      ? filtered.map(o => {
          const selected = o.value === opts.getCurrentValue();
          return '<div class="combo-option' + (selected ? " selected" : "") + '" data-value="' +
            String(o.value).replace(/"/g, "&quot;") + '">' +
            '<span class="combo-check">' + (selected ? "✓" : "") + '</span>' +
            '<span>' + o.label + '</span></div>';
        }).join("")
      : '<div class="combo-empty">沒有符合的選項</div>';
  }

  function openPanel() {
    open = true;
    filtering = false;
    opts.panel.classList.add("show");
    renderPanel();
  }

  function closePanel() {
    open = false;
    filtering = false;
    opts.panel.classList.remove("show");
  }

  opts.input.addEventListener("focus", openPanel);
  opts.input.addEventListener("click", () => { if (!open) openPanel(); });
  opts.input.addEventListener("input", () => {
    open = true;
    filtering = true;
    opts.panel.classList.add("show");
    renderPanel();
    if (opts.onInput) opts.onInput(opts.input.value);
  });
  opts.input.addEventListener("blur", () => setTimeout(closePanel, 120));
  opts.panel.addEventListener("mousedown", e => {
    const optEl = e.target.closest(".combo-option");
    if (!optEl) return;
    e.preventDefault();
    opts.onSelect(optEl.getAttribute("data-value"));
    closePanel();
  });

  return { refresh: () => { if (open) renderPanel(); } };
}

const feeItemCombo = setupCombobox({
  input: document.getElementById("feeItemInput"),
  panel: document.getElementById("feeItemPanel"),
  getOptions: () => CONFIG[currentType].items.map(o => ({ value: o.name, label: o.name })),
  getCurrentValue: () => feeItemText,
  onSelect: value => {
    feeItemText = value;
    document.getElementById("feeItemInput").value = value;
    items.forEach(it => { it.taxOverride = null; });
    render();
  },
  onInput: value => {
    feeItemText = value;
    items.forEach(it => { it.taxOverride = null; });
    render();
  }
});

const currencyCombo = setupCombobox({
  input: document.getElementById("currencyInput"),
  panel: document.getElementById("currencyPanel"),
  getOptions: () => CURRENCY_OPTIONS,
  getCurrentValue: () => currency,
  onSelect: value => {
    currency = value;
    document.getElementById("currencyInput").value = CURRENCY_OPTIONS.find(o => o.value === value).label;
    render();
  }
});
document.getElementById("currencyInput").value = CURRENCY_OPTIONS.find(o => o.value === currency).label;

function switchTab(tab) {
  document.getElementById("tabForm").classList.toggle("active", tab === "form");
  document.getElementById("tabSettings").classList.toggle("active", tab === "settings");
  document.getElementById("tabBtnForm").classList.toggle("active", tab === "form");
  document.getElementById("tabBtnSettings").classList.toggle("active", tab === "settings");
  if (tab === "settings") renderSettings();
}

function setType(type) {
  if (type === currentType) return;
  currentType = type;
  feeItemText = "";
  items = [{ base: 0, fee: 0, note: "", fileName: "", taxOverride: null }];
  render();
}

function getCurrentFeeItem() {
  const list = CONFIG[currentType].items;
  return list.find(o => o.name === feeItemText) || null;
}

function addItem() {
  items.push({ base: 0, fee: 0, note: "", fileName: "", taxOverride: null });
  render();
}

function removeItem(idx) {
  if (items.length <= 1) return;
  items.splice(idx, 1);
  render();
}

function updateItem(idx, field, value) {
  items[idx][field] = parseFloat(value) || 0;
  items[idx].taxOverride = null;
  render();
}

function updateTax(idx, value) {
  items[idx].taxOverride = value === "" ? null : (parseFloat(value) || 0);
  render();
}

function resetTax(idx) {
  items[idx].taxOverride = null;
  render();
}

function updateNote(idx, value) {
  items[idx].note = value;
}

function pickFile(idx, input) {
  if (input.files && input.files[0]) {
    items[idx].fileName = input.files[0].name;
    render();
  }
}

function clearFile(idx, evt) {
  evt.stopPropagation();
  items[idx].fileName = "";
  render();
}

function fmt(n) {
  return Math.round(n).toLocaleString();
}

function render() {
  TYPE_KEYS.forEach(t => {
    document.getElementById("type_" + t).classList.toggle("active", currentType === t);
  });

  const feeItem = getCurrentFeeItem();
  const hasFormula = !!(feeItem && feeItem.hasFormula);
  const rate = hasFormula ? feeItem.rate / 100 : 0;

  const feeItemInput = document.getElementById("feeItemInput");
  if (document.activeElement !== feeItemInput) feeItemInput.value = feeItemText;
  feeItemCombo.refresh();

  const hint = document.getElementById("feeItemHint");
  if (feeItemText && !feeItem) {
    hint.textContent = "找不到這個費用項目，會以「不套用公式」處理（可到「費用項目設定」新增）";
  } else if (feeItem && feeItem.hasFormula) {
    hint.textContent = "套用公式：稅率 " + feeItem.rate + "%・收款單位 " + (feeItem.payee || "未設定");
  } else {
    hint.textContent = "";
  }

  const itemsWrap = document.getElementById("items");
  const focusInfo = captureFocus(itemsWrap, "item-idx", "item-field");
  itemsWrap.innerHTML = "";

  let sumFee = 0, sumTax = 0, sumTotal = 0;

  items.forEach((it, idx) => {
    const autoTax = hasFormula ? Math.round(it.base * rate * 100) / 100 : 0;
    const tax = hasFormula ? ((it.taxOverride !== null && it.taxOverride !== undefined) ? it.taxOverride : autoTax) : 0;
    const isOverridden = hasFormula && it.taxOverride !== null && it.taxOverride !== undefined;
    const fee = hasFormula ? it.fee : 0;
    const total = it.base + fee + tax;

    sumFee += it.base;
    sumTax += tax;
    sumTotal += total;

    const card = document.createElement("div");
    card.className = "item-card";

    let fieldsHtml = '<div class="item-grid ' + (hasFormula ? "item-grid-3" : "item-grid-1") + '">';
    fieldsHtml += '<div><label class="field-label">費用</label><input type="text" inputmode="decimal" data-item-idx="' + idx + '" data-item-field="base" value="' + it.base + '" oninput="updateItem(' + idx + ',\'base\',this.value)"></div>';
    if (hasFormula) {
      fieldsHtml += '<div><label class="field-label">手續費</label><input type="text" inputmode="decimal" data-item-idx="' + idx + '" data-item-field="fee" value="' + it.fee + '" oninput="updateItem(' + idx + ',\'fee\',this.value)"></div>';
      fieldsHtml +=
        '<div><label class="field-label">稅額' + (isOverridden ? '（已手動修改）' : '（系統試算）') + '</label>' +
        '<input type="text" inputmode="decimal" class="' + (isOverridden ? 'calc-input overridden' : 'calc-input') + '" data-item-idx="' + idx + '" data-item-field="tax" value="' + tax + '" oninput="updateTax(' + idx + ',this.value)">' +
        (isOverridden ? '<div class="reset-link" onclick="resetTax(' + idx + ')">恢復系統試算（' + fmt(autoTax) + '）</div>' : '') +
        '</div>';
    }
    fieldsHtml += '</div>';

    const uploadHtml = it.fileName
      ? '<div class="upload-box has-file"><span class="filename">📎 ' + it.fileName + '</span><span class="clear-file" onclick="clearFile(' + idx + ', event)">✕</span></div>'
      : '<label class="upload-box" style="margin:0;">＋ 上傳憑證<input type="file" style="display:none" onchange="pickFile(' + idx + ', this)"></label>';

    const extraRowHtml =
      '<div class="item-extra-row">' +
        '<div><label class="field-label">摘要/用途說明</label><input type="text" data-item-idx="' + idx + '" data-item-field="note" placeholder="例如：8月顧問費" value="' + it.note + '" oninput="updateNote(' + idx + ',this.value)"></div>' +
        '<div><label class="field-label">附件</label>' + uploadHtml + '</div>' +
      '</div>';

    card.innerHTML =
      (items.length > 1 ? '<button class="remove-btn" onclick="removeItem(' + idx + ')">✕</button>' : '') +
      '<div class="item-no">第 ' + (idx + 1) + ' 筆</div>' +
      fieldsHtml + extraRowHtml;

    itemsWrap.appendChild(card);
  });

  document.getElementById("sumFee").textContent = fmt(sumFee);
  document.getElementById("sumTax").textContent = fmt(sumTax);
  document.getElementById("totalValue").textContent = currency + " " + fmt(sumTotal);

  restoreFocus(itemsWrap, "item-idx", "item-field", focusInfo);
}

function captureFocus(wrap, idxAttr, fieldAttr) {
  const el = document.activeElement;
  if (!el || !wrap.contains(el)) return null;
  return {
    idx: el.getAttribute("data-" + idxAttr),
    field: el.getAttribute("data-" + fieldAttr),
    selectionStart: el.selectionStart,
    selectionEnd: el.selectionEnd
  };
}

function restoreFocus(wrap, idxAttr, fieldAttr, info) {
  if (!info) return;
  const selector = '[data-' + idxAttr + '="' + info.idx + '"][data-' + fieldAttr + '="' + info.field + '"]';
  const el = wrap.querySelector(selector);
  if (!el) return;
  el.focus();
  if (typeof info.selectionStart === "number") {
    try {
      el.setSelectionRange(info.selectionStart, info.selectionEnd);
    } catch (e) {
      // input[type=number] doesn't support selection ranges in some browsers
    }
  }
}

function renderSettings() {
  TYPE_KEYS.forEach(type => renderConfigList(type));
}

function renderConfigList(type) {
  const wrap = document.getElementById("cfgList_" + type);
  const focusInfo = captureFocus(wrap, "cfg-idx", "cfg-field");
  wrap.innerHTML = "";
  CONFIG[type].items.forEach((o, i) => {
    const row = document.createElement("div");
    row.className = "opt-row";
    row.innerHTML =
      '<input type="text" data-cfg-idx="' + i + '" data-cfg-field="name" value="' + o.name + '" oninput="updateConfigItem(\'' + type + '\',' + i + ',\'name\',this.value)">' +
      '<div class="opt-check"><input type="checkbox" ' + (o.hasFormula ? "checked" : "") + ' onchange="toggleConfigFormula(\'' + type + '\',' + i + ',this.checked)"></div>' +
      '<input type="number" step="0.01" data-cfg-idx="' + i + '" data-cfg-field="rate" value="' + o.rate + '" ' + (o.hasFormula ? "" : "disabled") + ' oninput="updateConfigItem(\'' + type + '\',' + i + ',\'rate\',this.value)">' +
      '<input type="text" data-cfg-idx="' + i + '" data-cfg-field="payee" value="' + o.payee + '" ' + (o.hasFormula ? "" : "disabled") + ' oninput="updateConfigItem(\'' + type + '\',' + i + ',\'payee\',this.value)">' +
      '<button class="opt-del-btn" onclick="removeConfigItem(\'' + type + '\',' + i + ')">✕</button>';
    wrap.appendChild(row);
  });
  restoreFocus(wrap, "cfg-idx", "cfg-field", focusInfo);
}

function updateConfigItem(type, idx, field, value) {
  if (field === "rate") {
    CONFIG[type].items[idx][field] = parseFloat(value) || 0;
  } else {
    CONFIG[type].items[idx][field] = value;
  }
}

function toggleConfigFormula(type, idx, checked) {
  CONFIG[type].items[idx].hasFormula = checked;
  renderConfigList(type);
}

function addConfigItem(type) {
  CONFIG[type].items.push({ name: "新費用項目", hasFormula: false, rate: 0, payee: "" });
  renderConfigList(type);
}

function removeConfigItem(type, idx) {
  if (CONFIG[type].items.length <= 1) return;
  CONFIG[type].items.splice(idx, 1);
  renderConfigList(type);
}

function saveConfig() {
  const toast = document.getElementById("saveToast");
  if (!isGasConfigured()) {
    alert("尚未設定 GAS_URL，請先依 gas/Code.gs 的說明部署後端並填入網址");
    return;
  }
  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(CONFIG)
  })
    .then(res => res.json())
    .then(() => {
      render();
      toast.textContent = "已儲存（已同步給所有人）";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1800);
    })
    .catch(err => {
      alert("儲存失敗，請檢查網路連線或 GAS 部署設定：" + err);
    });
}

fetchConfig().then(() => {
  render();
});
