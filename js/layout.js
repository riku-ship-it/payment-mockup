// 側邊欄收合展開 ＆ 頁面切換 ＆ 拖曳排序
function toggleSidebar() {
  document.getElementById('appSidebar').classList.toggle('collapsed');
}

function switchPage(page) {
  document.querySelectorAll('.app-page').forEach(function (el) {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  document.querySelectorAll('.sidebar-nav-item').forEach(function (el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

var SIDEBAR_ORDER_KEY = 'bci_sidebar_order';

function loadSidebarOrder_() {
  try {
    var raw = localStorage.getItem(SIDEBAR_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveSidebarOrder_() {
  var nav = document.querySelector('.sidebar-nav');
  var order = Array.prototype.map.call(nav.children, function (el) { return el.dataset.page; });
  try { localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

function applySidebarOrder_() {
  var nav = document.querySelector('.sidebar-nav');
  var order = loadSidebarOrder_();
  if (!order) return;
  order.forEach(function (page) {
    var el = nav.querySelector('[data-page="' + page + '"]');
    if (el) nav.appendChild(el);
  });
}

function initSidebarDrag_() {
  var nav = document.querySelector('.sidebar-nav');
  var dragEl = null;

  nav.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', function () {
      dragEl = item;
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', function () {
      item.classList.remove('dragging');
      dragEl = null;
      saveSidebarOrder_();
    });

    item.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (!dragEl || dragEl === item) return;
      var rect = item.getBoundingClientRect();
      var before = (e.clientY - rect.top) < rect.height / 2;
      nav.insertBefore(dragEl, before ? item : item.nextSibling);
    });
  });
}

applySidebarOrder_();
initSidebarDrag_();
