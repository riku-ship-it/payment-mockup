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

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
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
