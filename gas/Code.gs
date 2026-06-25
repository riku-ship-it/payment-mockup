/**
 * Backend for the payment mockup's "費用項目設定", backed by this
 * spreadsheet. Deploy as a Web App (Anyone can access) and put the
 * resulting URL into GAS_URL in index.html.
 *
 * Setup:
 * 1. Open this Google Sheet > Extensions > Apps Script.
 * 2. Replace the default Code.gs content with this file.
 * 3. Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL and give it to whoever maintains index.html.
 * 5. Re-deploy (Manage deployments > Edit > New version) after any
 *    change to this script.
 */

var SHEET_NAME = 'ConfigData';
var TYPE_KEYS = ['companyDomestic', 'individualDomestic', 'companyForeign', 'individualForeign'];
var HEADER = ['Type', 'Name', 'HasFormula', 'Rate', 'Payee'];

var ROLES_SHEET_NAME = 'RolesData';
var ROLES_HEADER = ['RoleOrder', 'RoleName', 'TaskOrder', 'TaskName', 'TaskDetails'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
  }
  return sheet;
}

function getRolesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ROLES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROLES_SHEET_NAME);
    sheet.appendRow(ROLES_HEADER);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.type === 'roles') {
    return jsonOutput_(getRoles_());
  }
  var sheet = getSheet_();
  var rows = sheet.getDataRange().getValues();
  var config = {};
  TYPE_KEYS.forEach(function (t) { config[t] = { items: [] }; });

  for (var i = 1; i < rows.length; i++) {
    var type = rows[i][0];
    var name = rows[i][1];
    var hasFormula = rows[i][2];
    var rate = rows[i][3];
    var payee = rows[i][4];
    if (!type || !config[type]) continue;
    config[type].items.push({
      name: String(name || ''),
      hasFormula: hasFormula === true || hasFormula === 'TRUE',
      rate: Number(rate) || 0,
      payee: String(payee || '')
    });
  }

  return jsonOutput_(config);
}

function doPost(e) {
  if (e && e.parameter && e.parameter.type === 'roles') {
    return jsonOutput_(saveRoles_(JSON.parse(e.postData.contents)));
  }
  var config = JSON.parse(e.postData.contents);
  var sheet = getSheet_();

  sheet.clearContents();
  sheet.appendRow(HEADER);

  var rowsToWrite = [];
  TYPE_KEYS.forEach(function (type) {
    var items = (config[type] && config[type].items) || [];
    items.forEach(function (item) {
      rowsToWrite.push([type, item.name, !!item.hasFormula, item.rate, item.payee]);
    });
  });

  if (rowsToWrite.length) {
    sheet.getRange(2, 1, rowsToWrite.length, HEADER.length).setValues(rowsToWrite);
  }

  return jsonOutput_({ ok: true });
}

// roles = [ { name: '角色名稱', tasks: [ { name: '工作項目', details: ['細節', ...] }, ... ] }, ... ]
function getRoles_() {
  var sheet = getRolesSheet_();
  var rows = sheet.getDataRange().getValues();
  var roleByOrder = {};
  var roleOrders = [];

  for (var i = 1; i < rows.length; i++) {
    var roleOrder = rows[i][0];
    var roleName = rows[i][1];
    var taskName = rows[i][3];
    var taskDetailsRaw = rows[i][4];
    if (roleOrder === '' || roleOrder === null || roleOrder === undefined) continue;
    if (!roleByOrder[roleOrder]) {
      roleByOrder[roleOrder] = { name: String(roleName || ''), tasks: [] };
      roleOrders.push(roleOrder);
    }
    if (taskName !== '' && taskName !== null && taskName !== undefined) {
      var details = [];
      if (taskDetailsRaw) {
        try {
          details = JSON.parse(taskDetailsRaw);
        } catch (err) {
          details = [];
        }
      }
      roleByOrder[roleOrder].tasks.push({ name: String(taskName), details: details });
    }
  }

  roleOrders.sort(function (a, b) { return Number(a) - Number(b); });
  return { roles: roleOrders.map(function (o) { return roleByOrder[o]; }) };
}

function saveRoles_(data) {
  var roles = (data && data.roles) || [];
  var sheet = getRolesSheet_();

  sheet.clearContents();
  sheet.appendRow(ROLES_HEADER);

  var rowsToWrite = [];
  roles.forEach(function (role, roleIdx) {
    var tasks = role.tasks || [];
    if (tasks.length === 0) {
      rowsToWrite.push([roleIdx, role.name, '', '', '']);
    } else {
      tasks.forEach(function (task, taskIdx) {
        var taskName = (task && typeof task === 'object') ? task.name : task;
        var details = (task && typeof task === 'object') ? (task.details || []) : [];
        rowsToWrite.push([roleIdx, role.name, taskIdx, taskName, JSON.stringify(details)]);
      });
    }
  });

  if (rowsToWrite.length) {
    sheet.getRange(2, 1, rowsToWrite.length, ROLES_HEADER.length).setValues(rowsToWrite);
  }

  return { ok: true };
}
