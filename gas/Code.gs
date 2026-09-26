/**
 * ============================================================================
 * HUB KEDIRI LOGISTICS - GOOGLE APPS SCRIPT (Code.gs)
 * Sinkronisasi Tanpa Kuota API: Google Sheets <-> GitHub <-> Web App
 * ============================================================================
 *
 * CARA PAKAI DI GOOGLE SHEETS:
 * 1. Buka Google Spreadsheet Hub Kediri Logistics Anda.
 * 2. Klik menu: Ekstensi (Extensions) > Apps Script.
 * 3. Hapus kode yang ada di `Code.gs`, lalu tempel (Paste) seluruh kode ini.
 * 4. Klik ikon Simpan (Save).
 * 5. Untuk Web App Endpoint (Tanpa Kuota API):
 *    - Klik tombol "Terapkan" (Deploy) > "Deployment baru" (New deployment).
 *    - Pilih jenis: "Aplikasi Web" (Web app).
 *    - Jalankan sebagai (Execute as): "Saya" (Me).
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone).
 *    - Klik Terapkan (Deploy), lalu salin URL Web App ke pengaturan Web App Anda.
 * 6. Untuk Auto-Sync ke GitHub & Webhook:
 *    - Muat ulang (Refresh) halaman Google Sheets Anda.
 *    - Akan muncul menu baru di atas: "🚚 Hub Kediri Sync".
 *    - Klik "⚙️ Konfigurasi GitHub & Web App" untuk mengisi Repo GitHub / URL Web App.
 * ============================================================================
 */

var SPREADSHEET_ID = '1nywoI4jT7ih12mdeRLFqgld6HGLdDIaJDBuiKvaX6o8';
var PERSONIL_SHEET_ID = 1831064929;
var PENGIRIMAN_SHEET_ID = 1375575560;
var ANALISIS_SHEET_ID = 774474728;
var CACHE_KEY = 'HUB_KEDIRI_PAYLOAD_V2';
var CACHE_TTL_SECONDS = 60; // Cache di memori Apps Script selama 60 detik

/**
 * Membuat menu kustom di Google Sheets saat file dibuka
 */
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

/**
 * Mengambil seluruh data dari 3 Sheet (OnDuty, Pengiriman, Tren)
 * Tanpa batasan 100 baris (membaca seluruh baris aktif secara penuh)
 */
function buildLogisticsPayload(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cached = cache.get(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Lanjut ambil dari sheet jika cache korup
      }
    }
  }

  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
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

  // 1. Sheet Pertama: Jadwal Personil On Duty (Termasuk baris 1 untuk header tanggal)
  var onDutySheet = findSheetById(PERSONIL_SHEET_ID, 0);
  var onDutyRows = onDutySheet ? onDutySheet.getDataRange().getDisplayValues() : [];

  // 2. Sheet Kedua: Data Pengiriman / Surat Jalan (Mulai dari baris ke-2 / tanpa header)
  var shippingSheet = findSheetById(PENGIRIMAN_SHEET_ID, 1);
  var shippingAll = shippingSheet ? shippingSheet.getDataRange().getDisplayValues() : [];
  var shippingRows = shippingAll.length > 1 ? shippingAll.slice(1) : [];

  // 3. Sheet Ketiga: Analisis Tren (Mulai dari baris ke-2 / tanpa header)
  var trendSheet = findSheetById(ANALISIS_SHEET_ID, 2);
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
  // Simpan ke CacheService jika ukuran di bawah batas 100KB Apps Script
  if (jsonString.length < 95000) {
    cache.put(CACHE_KEY, jsonString, CACHE_TTL_SECONDS);
  }

  return payload;
}

/**
 * Endpoint HTTP GET untuk diakses langsung oleh Web App (Bebas Kuota Google Cloud API)
 * URL: https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
 */
function doGet(e) {
  try {
    var force = e && e.parameter && (e.parameter.force === '1' || e.parameter.nocache === '1');
    var payload = buildLogisticsPayload(force);
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: err.toString(),
        updatedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint HTTP POST untuk menerima perintah refresh atau update dari Web App
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    if (body.action === 'sync_github') {
      var ghResult = pushPayloadToGitHub(buildLogisticsPayload(true));
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', github: ghResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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

/**
 * Push data JSON langsung ke Repository GitHub (public/data/logistics-sync.json)
 * Sehingga Web App & GitHub selalu tersinkronisasi otomatis tanpa kuota API
 */
function pushPayloadToGitHub(payload) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('GITHUB_REPO'); // contoh: "username/hub-kediri-logistics"
  var branch = props.getProperty('GITHUB_BRANCH') || 'main';
  var filePath = props.getProperty('GITHUB_FILE_PATH') || 'public/data/logistics-sync.json';

  if (!token || !repo) {
    return { skipped: true, reason: 'GITHUB_TOKEN atau GITHUB_REPO belum diatur di Script Properties.' };
  }

  var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + filePath;
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // 1. Cek SHA file lama jika sudah ada di GitHub
  var sha = null;
  var getRes = UrlFetchApp.fetch(apiUrl + '?ref=' + encodeURIComponent(branch), {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    var existing = JSON.parse(getRes.getContentText());
    sha = existing.sha;
  }

  // 2. Encode payload JSON ke Base64 (UTF-8 aman)
  var jsonPretty = JSON.stringify(payload, null, 2);
  var base64Content = Utilities.base64Encode(Utilities.newBlob(jsonPretty, 'application/json').getBytes());

  var putBody = {
    message: 'chore(sync): update data logistik Hub Kediri [' + new Date().toLocaleString('id-ID') + ']',
    content: base64Content,
    branch: branch
  };
  if (sha) {
    putBody.sha = sha;
  }

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
  } else {
    throw new Error('Gagal push ke GitHub (' + code + '): ' + putRes.getContentText());
  }
}

/**
 * Push data JSON secara Real-Time ke Webhook Server Web App (/api/sync/webhook)
 */
function pushPayloadToWebhook(payload) {
  var props = PropertiesService.getScriptProperties();
  var webhookUrl = props.getProperty('WEBAPP_WEBHOOK_URL'); // contoh: "https://domain-anda.run.app/api/sync/webhook"
  var secret = props.getProperty('SYNC_WEBHOOK_SECRET') || '';

  if (!webhookUrl) {
    return { skipped: true, reason: 'WEBAPP_WEBHOOK_URL belum diatur.' };
  }

  var res = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-sync-secret': secret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return {
    success: res.getResponseCode() >= 200 && res.getResponseCode() < 300,
    code: res.getResponseCode()
  };
}

/**
 * Memicu GitHub Actions Workflow (.github/workflows/sync-logistics-data.yml)
 * Melalui event repository_dispatch "sheets-updated"
 */
function triggerGitHubWorkflow() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('GITHUB_REPO');

  if (!token || !repo) {
    return { skipped: true, reason: 'GITHUB_TOKEN atau GITHUB_REPO belum diatur.' };
  }

  var dispatchUrl = 'https://api.github.com/repos/' + repo + '/dispatches';
  var res = UrlFetchApp.fetch(dispatchUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({
      event_type: 'sheets-updated',
      client_payload: {
        triggeredAt: new Date().toISOString()
      }
    }),
    muteHttpExceptions: true
  });

  return {
    dispatched: res.getResponseCode() === 204,
    code: res.getResponseCode()
  };
}

/**
 * Fungsi utama untuk sinkronisasi otomatis (dipanggil oleh Trigger atau Menu)
 */
function autoSyncAll() {
  var payload = buildLogisticsPayload(true);
  var results = {};
  try {
    results.workflowDispatch = triggerGitHubWorkflow();
  } catch (e) {
    results.workflowDispatchError = e.toString();
  }
  try {
    results.webhook = pushPayloadToWebhook(payload);
  } catch (e) {
    results.webhookError = e.toString();
  }
  try {
    results.github = pushPayloadToGitHub(payload);
  } catch (e) {
    results.githubError = e.toString();
  }
  return results;
}

/**
 * Sinkronisasi manual dari menu Google Sheets dengan notifikasi pop-up
 */
function manualSyncAll() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = autoSyncAll();
    ui.alert(
      '✅ Sinkronisasi Berhasil',
      'Data Spreadsheet telah diperbarui ke cache Apps Script.\n\n' +
      'Status GitHub: ' + JSON.stringify(res.github || res.githubError) + '\n' +
      'Status Web App Webhook: ' + JSON.stringify(res.webhook || res.webhookError),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('❌ Gagal Sinkronisasi', err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Dialog pengaturan mudah di dalam Google Sheets
 */
function showConfigDialog() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var repoRes = ui.prompt(
    '1/3 - Repository GitHub',
    'Masukkan nama repo GitHub (format: username/nama-repo)\nSaat ini: ' + (props.getProperty('GITHUB_REPO') || '(belum diatur)'),
    ui.ButtonSet.OK_CANCEL
  );
  if (repoRes.getSelectedButton() === ui.Button.OK && repoRes.getResponseText().trim()) {
    props.setProperty('GITHUB_REPO', repoRes.getResponseText().trim());
  }

  var tokenRes = ui.prompt(
    '2/3 - GitHub Personal Access Token (PAT)',
    'Masukkan GitHub Token (dengan izin Contents Read & Write)\nKosongkan jika tidak ingin mengubah.',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenRes.getSelectedButton() === ui.Button.OK && tokenRes.getResponseText().trim()) {
    props.setProperty('GITHUB_TOKEN', tokenRes.getResponseText().trim());
  }

  var webhookRes = ui.prompt(
    '3/3 - URL Webhook Web App (Opsional)',
    'Masukkan URL Webhook Web App (contoh: https://.../api/sync/webhook)\nSaat ini: ' + (props.getProperty('WEBAPP_WEBHOOK_URL') || '(belum diatur)'),
    ui.ButtonSet.OK_CANCEL
  );
  if (webhookRes.getSelectedButton() === ui.Button.OK && webhookRes.getResponseText().trim()) {
    props.setProperty('WEBAPP_WEBHOOK_URL', webhookRes.getResponseText().trim());
  }

  ui.alert('✅ Pengaturan Disimpan', 'Konfigurasi sinkronisasi GitHub & Web App berhasil disimpan!', ui.ButtonSet.OK);
}

/**
 * Memasang Trigger Otomatis setiap ada perubahan & setiap 5 menit
 */
function installTriggers() {
  removeTriggers();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('autoSyncAll')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  ScriptApp.newTrigger('autoSyncAll')
    .timeBased()
    .everyMinutes(5)
    .create();

  SpreadsheetApp.getUi().alert('✅ Auto-Sync Aktif', 'Data akan otomatis disinkronkan ke GitHub & Web App setiap ada perubahan atau setiap 5 menit.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menghapus semua Trigger Otomatis
 */
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoSyncAll') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
