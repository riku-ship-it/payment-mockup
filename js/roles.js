// 角色與職務 邏輯
// Same GAS deployment as payment.js, routed to the roles dataset via ?type=roles.
const ROLES_GAS_URL = (typeof GAS_URL !== "undefined" ? GAS_URL : "") + "?type=roles";

const DEFAULT_ROLES = [
  { name: "HR Systems Support", tasks: [] },
  {
    name: "Planning and Recruitment",
    tasks: ["Organization Structure Design", "Manpower Planning", "Planning and Recruitment"]
  },
  {
    name: "Employee Development and Remuneration",
    tasks: ["Compensation and Benefits", "Appraisal and Career Development", "Training"]
  },
  {
    name: "Employee Services",
    tasks: ["HR Policies and Procedures", "HR Administration and Support Services", "Employee Relations and Counseling Office"]
  }
];

let rolesUidCounter = 1;
function rolesNextId() {
  return rolesUidCounter++;
}

let ROLES = [];

function rolesIsGasConfigured() {
  return typeof isGasConfigured === "function" ? isGasConfigured() : false;
}

function seedRoles(plain) {
  ROLES = plain.map(r => ({
    id: rolesNextId(),
    name: r.name,
    tasks: (r.tasks || []).map(t => {
      const isObj = t && typeof t === "object";
      const details = (isObj ? t.details : []) || [];
      return {
        id: rolesNextId(),
        name: isObj ? (t.name || "") : t,
        expanded: false,
        details: details.map(d => ({ id: rolesNextId(), name: d }))
      };
    })
  }));
}

function fetchRoles() {
  seedRoles(DEFAULT_ROLES);
  if (!rolesIsGasConfigured()) return Promise.resolve();
  return fetch(ROLES_GAS_URL)
    .then(res => res.json())
    .then(data => {
      if (data && Array.isArray(data.roles) && data.roles.length) {
        seedRoles(data.roles);
      }
    })
    .catch(err => {
      console.error("讀取角色與職務設定失敗，改用預設值", err);
    });
}

function findRole(roleId) {
  return ROLES.find(r => r.id === roleId);
}

function addRole() {
  ROLES.push({ id: rolesNextId(), name: "新角色", tasks: [] });
  renderRoles();
}

function removeRole(roleId) {
  ROLES = ROLES.filter(r => r.id !== roleId);
  renderRoles();
}

function updateRoleName(roleId, value) {
  const role = findRole(roleId);
  if (role) role.name = value;
}

function addTask(roleId) {
  const role = findRole(roleId);
  if (!role) return;
  role.tasks.push({ id: rolesNextId(), name: "新工作項目", expanded: false, details: [] });
  renderRoles();
}

function removeTask(roleId, taskId) {
  const role = findRole(roleId);
  if (!role) return;
  role.tasks = role.tasks.filter(t => t.id !== taskId);
  renderRoles();
}

function updateTaskName(roleId, taskId, value) {
  const role = findRole(roleId);
  if (!role) return;
  const task = role.tasks.find(t => t.id === taskId);
  if (task) task.name = value;
}

function findTask(roleId, taskId) {
  const role = findRole(roleId);
  if (!role) return null;
  return role.tasks.find(t => t.id === taskId) || null;
}

function toggleTaskExpanded(roleId, taskId) {
  const task = findTask(roleId, taskId);
  if (!task) return;
  task.expanded = !task.expanded;
  renderRoles();
}

function addDetail(roleId, taskId) {
  const task = findTask(roleId, taskId);
  if (!task) return;
  task.expanded = true;
  task.details.push({ id: rolesNextId(), name: "" });
  renderRoles();
}

function removeDetail(roleId, taskId, detailId) {
  const task = findTask(roleId, taskId);
  if (!task) return;
  task.details = task.details.filter(d => d.id !== detailId);
  renderRoles();
}

function updateDetailName(roleId, taskId, detailId, value) {
  const task = findTask(roleId, taskId);
  if (!task) return;
  const detail = task.details.find(d => d.id === detailId);
  if (detail) detail.name = value;
}

function syncRolesOrderFromDom() {
  const board = document.getElementById("rolesBoard");
  ROLES = Array.prototype.map.call(board.children, cardEl => {
    const roleId = Number(cardEl.dataset.roleId);
    const role = findRole(roleId);
    const taskList = cardEl.querySelector(".task-list");
    role.tasks = Array.prototype.map.call(taskList.children, taskEl => {
      const taskId = Number(taskEl.dataset.taskId);
      return role.tasks.find(t => t.id === taskId);
    });
    return role;
  });
}

function renderRoles() {
  const board = document.getElementById("rolesBoard");
  board.innerHTML = "";

  const ROLE_COLOR_COUNT = 7;
  ROLES.forEach((role, index) => {
    const card = document.createElement("div");
    card.className = "role-card";
    card.draggable = true;
    card.dataset.roleId = role.id;
    card.dataset.color = index % ROLE_COLOR_COUNT;

    const header = document.createElement("div");
    header.className = "role-card-header";
    header.innerHTML =
      '<span class="role-drag-handle">⠿</span>' +
      '<input type="text" class="role-name-input" value="' + escapeHtml(role.name) + '">' +
      '<button class="role-del-btn">✕</button>';
    header.querySelector(".role-name-input").addEventListener("input", e => updateRoleName(role.id, e.target.value));
    header.querySelector(".role-del-btn").addEventListener("click", () => removeRole(role.id));
    card.appendChild(header);

    const taskList = document.createElement("div");
    taskList.className = "task-list";

    role.tasks.forEach(task => {
      const wrap = document.createElement("div");
      wrap.className = "task-wrap";
      wrap.dataset.taskId = task.id;

      const row = document.createElement("div");
      row.className = "task-row";
      row.dataset.taskId = task.id;
      const hasDetails = task.details.length > 0;
      row.innerHTML =
        '<span class="task-drag-handle">⠿</span>' +
        '<button class="task-expand-btn' + (hasDetails ? "" : " is-empty") + '">' + (task.expanded ? "▾" : "▸") + '</button>' +
        '<input type="text" class="task-name-input" value="' + escapeHtml(task.name) + '">' +
        '<button class="task-del-btn">✕</button>';
      row.querySelector(".task-name-input").addEventListener("input", e => updateTaskName(role.id, task.id, e.target.value));
      row.querySelector(".task-del-btn").addEventListener("click", () => removeTask(role.id, task.id));
      row.querySelector(".task-expand-btn").addEventListener("click", () => toggleTaskExpanded(role.id, task.id));
      wrap.draggable = true;
      attachTaskDrag(wrap, taskList);
      wrap.appendChild(row);

      if (task.expanded) {
        const detailList = document.createElement("div");
        detailList.className = "detail-list";

        task.details.forEach(detail => {
          const detailRow = document.createElement("div");
          detailRow.className = "detail-row";
          detailRow.dataset.detailId = detail.id;
          detailRow.innerHTML =
            '<span class="detail-bullet">•</span>' +
            '<input type="text" class="detail-name-input" placeholder="細節說明" value="' + escapeHtml(detail.name) + '">' +
            '<button class="detail-del-btn">✕</button>';
          detailRow.querySelector(".detail-name-input").addEventListener("input", e => updateDetailName(role.id, task.id, detail.id, e.target.value));
          detailRow.querySelector(".detail-del-btn").addEventListener("click", () => removeDetail(role.id, task.id, detail.id));
          detailList.appendChild(detailRow);
        });

        const addDetailBtn = document.createElement("button");
        addDetailBtn.className = "detail-add-btn";
        addDetailBtn.textContent = "＋ 新增細節";
        addDetailBtn.addEventListener("click", () => addDetail(role.id, task.id));
        detailList.appendChild(addDetailBtn);

        wrap.appendChild(detailList);
      }

      taskList.appendChild(wrap);
    });

    card.appendChild(taskList);

    const addTaskBtn = document.createElement("button");
    addTaskBtn.className = "task-add-btn";
    addTaskBtn.textContent = "＋ 新增工作項目";
    addTaskBtn.addEventListener("click", () => addTask(role.id));
    card.appendChild(addTaskBtn);

    attachRoleDrag(card, board);
    board.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let draggedRoleCard = null;
function attachRoleDrag(card, board) {
  card.addEventListener("dragstart", e => {
    if (e.target.closest("input, button")) { e.preventDefault(); return; }
    draggedRoleCard = card;
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    draggedRoleCard = null;
    syncRolesOrderFromDom();
  });
  card.addEventListener("dragover", e => {
    e.preventDefault();
    if (!draggedRoleCard || draggedRoleCard === card) return;
    const rect = card.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    board.insertBefore(draggedRoleCard, before ? card : card.nextSibling);
  });
}

let draggedTaskRow = null;
function attachTaskDrag(row, taskList) {
  row.addEventListener("dragstart", e => {
    if (e.target.closest("input, button")) { e.preventDefault(); return; }
    e.stopPropagation();
    draggedTaskRow = row;
    row.classList.add("dragging");
  });
  row.addEventListener("dragend", e => {
    e.stopPropagation();
    row.classList.remove("dragging");
    draggedTaskRow = null;
    syncRolesOrderFromDom();
  });
  row.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTaskRow || draggedTaskRow === row || draggedTaskRow.parentElement !== taskList) return;
    const rect = row.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    taskList.insertBefore(draggedTaskRow, before ? row : row.nextSibling);
  });
}

function saveRoles() {
  const toast = document.getElementById("rolesSaveToast");
  if (!rolesIsGasConfigured()) {
    alert("尚未設定 GAS_URL，請先依 gas/Code.gs 的說明部署後端並填入網址");
    return;
  }
  const payload = {
    roles: ROLES.map(r => ({
      name: r.name,
      tasks: r.tasks.map(t => ({ name: t.name, details: t.details.map(d => d.name) }))
    }))
  };
  fetch(ROLES_GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(() => {
      toast.textContent = "已儲存（已同步給所有人）";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1800);
    })
    .catch(err => {
      alert("儲存失敗，請檢查網路連線或 GAS 部署設定：" + err);
    });
}

fetchRoles().then(() => {
  renderRoles();
});
