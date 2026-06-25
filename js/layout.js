// 側邊欄收合展開 ＆ 頁面切換
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
