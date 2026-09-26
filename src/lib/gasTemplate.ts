export const CODE_GS_TEMPLATE = `/**
 * ============================================================================
 * HUB KEDIRI LOGISTICS - GOOGLE APPS SCRIPT (Code.gs)
 * Sinkronisasi Tanpa Kuota API: Google Sheets <-> GitHub <-> Web App
 * ============================================================================
 */

var SPREADSHEET_ID = '1nywoI4jT7ih12mdeRLFqgld6HGLdDIaJDBuiKvaX6o8';
var PERSONIL_SHEET_ID = 1831064929;
var PENGIRIMAN_SHEET_ID = 1375575560;
var ANALISIS_SHEET_ID = 774474728;
var CACHE_KEY = 'HUB_KEDIRI_PAYLOAD_V2';
var CACHE_TTL_SECONDS = 60;

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚚 Hub Kediri Sync')
    .addItem('🔄 Sinkronkan Sekarang (GitHub & Web App)', 'manualSyncAll')
    .addSeparator()
    .addItem('⚙️ Konfigurasi GitHub & Web App URL', 'showConfigDialog')
    .addItem('⏱️ Aktifkan Auto-Sync (Tiap 5 Menit & Saat Edit)', 'installTriggers')
    .addItem('🛑 Matikan Auto-Sync', 'removeTriggers')
    .addToUi();
}

function buildLogisticsPayload(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cached = cache.get(CACHE_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
  }

  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(s) { return s.getName(); });

  function findSheetById(targetId, fallbackIndex) {
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === targetId) return sheets[i];
    }
    return sheets[fallbackIndex] || null;
  }

  var onDutySheet = findSheetById(PERSONIL_SHEET_ID, 0);
  var shippingSheet = findSheetById(PENGIRIMAN_SHEET_ID, 1);
  var trendSheet = findSheetById(ANALISIS_SHEET_ID, 2);

  // 1. Sheet Pertama: Jadwal Personil On Duty (Termasuk baris 1 untuk header tanggal)
  var onDutyRows = onDutySheet ? onDutySheet.getDataRange().getDisplayValues() : [];

  // 2. Sheet Kedua: Data Pengiriman / Surat Jalan (Mulai dari baris ke-2 / tanpa header)
  var shippingAll = shippingSheet ? shippingSheet.getDataRange().getDisplayValues() : [];
  var shippingRows = shippingAll.length > 1 ? shippingAll.slice(1) : [];

  // 3. Sheet Ketiga: Analisis Tren (Mulai dari baris ke-2 / tanpa header)
  var trendAll = trendSheet ? trendSheet.getDataRange().getDisplayValues() : [];
  var trendRows = trendAll.length > 1 ? trendAll.slice(1) : [];

  var payload = {
    status: 'ok',
    source: 'google-apps-script',
    updatedAt: new Date().toISOString(),
    spreadsheetId: ss.getId(),
    sheetNames: sheetNames,
    onDutyRows: onDutyRows,
    shippingRows: shippingRows,
    trendRows: trendRows,
    stats: {
      onDutyCount: Math.max(0, onDutyRows.length - 1),
      shippingCount: shippingRows.length,
      trendCount: trendRows.length
    }
  };

  var jsonString = JSON.stringify(payload);
  if (jsonString.length < 95000) {
    cache.put(CACHE_KEY, jsonString, CACHE_TTL_SECONDS);
  }
  return payload;
}

function doGet(e) {
  try {
    var force = e && e.parameter && (e.parameter.force === '1' || e.parameter.nocache === '1');
    var payload = buildLogisticsPayload(force);
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = buildLogisticsPayload(true);
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function pushPayloadToGitHub(payload) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('GITHUB_REPO');
  var branch = props.getProperty('GITHUB_BRANCH') || 'main';
  var filePath = props.getProperty('GITHUB_FILE_PATH') || 'public/data/logistics-sync.json';

  if (!token || !repo) {
    return { skipped: true, reason: 'GITHUB_TOKEN atau GITHUB_REPO belum diatur.' };
  }

  var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + filePath;
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  var sha = null;
  var getRes = UrlFetchApp.fetch(apiUrl + '?ref=' + encodeURIComponent(branch), {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  var jsonPretty = JSON.stringify(payload, null, 2);
  var base64Content = Utilities.base64Encode(Utilities.newBlob(jsonPretty, 'application/json').getBytes());

  var putBody = {
    message: 'chore(sync): update data logistik Hub Kediri [' + new Date().toLocaleString('id-ID') + ']',
    content: base64Content,
    branch: branch
  };
  if (sha) putBody.sha = sha;

  var putRes = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(putBody),
    muteHttpExceptions: true
  });

  var code = putRes.getResponseCode();
  if (code >= 200 && code < 300) {
    return { success: true, code: code, repo: repo, filePath: filePath };
  }
  throw new Error('Gagal push ke GitHub (' + code + '): ' + putRes.getContentText());
}

function pushPayloadToWebhook(payload) {
  var props = PropertiesService.getScriptProperties();
  var webhookUrl = props.getProperty('WEBAPP_WEBHOOK_URL');
  var secret = props.getProperty('SYNC_WEBHOOK_SECRET') || '';

  if (!webhookUrl) return { skipped: true };

  var res = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sync-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return { success: res.getResponseCode() >= 200 && res.getResponseCode() < 300, code: res.getResponseCode() };
}

function autoSyncAll() {
  var payload = buildLogisticsPayload(true);
  var results = {};
  try { results.webhook = pushPayloadToWebhook(payload); } catch (e) { results.webhookError = e.toString(); }
  try { results.github = pushPayloadToGitHub(payload); } catch (e) { results.githubError = e.toString(); }
  return results;
}

function manualSyncAll() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = autoSyncAll();
    ui.alert('✅ Sinkronisasi Berhasil', JSON.stringify(res, null, 2), ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('❌ Gagal Sinkronisasi', err.toString(), ui.ButtonSet.OK);
  }
}

function showConfigDialog() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var repoRes = ui.prompt('1/3 - Repository GitHub (username/repo)', 'Saat ini: ' + (props.getProperty('GITHUB_REPO') || '-'), ui.ButtonSet.OK_CANCEL);
  if (repoRes.getSelectedButton() === ui.Button.OK && repoRes.getResponseText().trim()) {
    props.setProperty('GITHUB_REPO', repoRes.getResponseText().trim());
  }

  var tokenRes = ui.prompt('2/3 - GitHub Personal Access Token (PAT)', 'Masukkan Token GitHub (izin Contents Read & Write):', ui.ButtonSet.OK_CANCEL);
  if (tokenRes.getSelectedButton() === ui.Button.OK && tokenRes.getResponseText().trim()) {
    props.setProperty('GITHUB_TOKEN', tokenRes.getResponseText().trim());
  }

  var webhookRes = ui.prompt('3/3 - URL Webhook Web App (/api/sync/webhook)', 'Saat ini: ' + (props.getProperty('WEBAPP_WEBHOOK_URL') || '-'), ui.ButtonSet.OK_CANCEL);
  if (webhookRes.getSelectedButton() === ui.Button.OK && webhookRes.getResponseText().trim()) {
    props.setProperty('WEBAPP_WEBHOOK_URL', webhookRes.getResponseText().trim());
  }

  ui.alert('✅ Pengaturan Disimpan', 'Konfigurasi berhasil disimpan!', ui.ButtonSet.OK);
}

function installTriggers() {
  removeTriggers();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('autoSyncAll').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('autoSyncAll').timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert('✅ Auto-Sync Aktif', 'Sinkronisasi otomatis telah diaktifkan.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoSyncAll') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
`;
