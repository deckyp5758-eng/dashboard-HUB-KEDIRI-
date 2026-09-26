import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check, Database, Github, FileCode2, ShieldCheck, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { CODE_GS_TEMPLATE } from '../lib/gasTemplate';

interface SyncConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: string;
  lastUpdated: string | null;
  stats?: {
    onDutyCount: number;
    shippingCount: number;
    trendCount: number;
  };
  onForceRefresh: () => Promise<void>;
}

export const SyncConfigModal: React.FC<SyncConfigModalProps> = ({
  isOpen,
  onClose,
  currentSource,
  lastUpdated,
  stats,
  onForceRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'codegs' | 'github'>('status');
  const [gasWebAppUrl, setGasWebAppUrl] = useState('');
  const [githubRawUrl, setGithubRawUrl] = useState('');
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

  const webhookUrl = `${window.location.origin}/api/sync/webhook`;

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/sync/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.config) {
          setGasWebAppUrl(data.config.gasWebAppUrl || '');
          setGithubRawUrl(data.config.githubRawUrl || '');
          setCacheTtlSeconds(data.config.cacheTtlSeconds || 60);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasWebAppUrl,
          githubRawUrl,
          cacheTtlSeconds,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSaveMessage({ type: 'ok', text: 'Konfigurasi berhasil disimpan & data telah disinkronkan!' });
        await onForceRefresh();
      } else {
        setSaveMessage({
          type: 'warn',
          text: `Konfigurasi disimpan, namun sinkronisasi memberi catatan: ${data.warning || 'Cek kembali URL Anda'}`,
        });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'warn', text: err.message || 'Gagal menyimpan konfigurasi' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSaveMessage(null);
    try {
      await onForceRefresh();
      setSaveMessage({ type: 'ok', text: 'Data berhasil diperbarui langsung dari sumber utama!' });
    } catch (err: any) {
      setSaveMessage({ type: 'warn', text: err.message || 'Gagal menyinkronkan data' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_GS_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'google-apps-script':
        return { label: 'Code.gs (Apps Script)', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Bebas Kuota API 100% — Terhubung langsung ke Script Spreadsheet' };
      case 'github-sync':
        return { label: 'GitHub Repo Sync', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', desc: 'Bebas Kuota API 100% — Membaca file JSON hasil push Code.gs di GitHub' };
      case 'webhook-push':
        return { label: 'Real-Time Webhook Push', badge: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'Bebas Kuota API 100% — Diterima instan dari trigger perubahan Google Sheets' };
      case 'sheets-api-cached':
        return { label: 'Server Batch Cache', badge: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'Hemat Kuota 98% — 1x Batch Request di-cache di Server untuk semua pengguna' };
      case 'local-snapshot':
      case 'browser-cache':
        return { label: 'Cadangan Offline Lokal', badge: 'bg-zinc-100 text-zinc-700 border-zinc-300', desc: 'Mode Tahan Gangguan — Menampilkan snapshot data terakhir yang tersimpan' };
      default:
        return { label: src || 'Memuat...', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200', desc: 'Menunggu sinkronisasi data...' };
    }
  };

  const sourceInfo = getSourceLabel(currentSource);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
                Engine Sinkronisasi Tanpa Kuota
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Code.gs + GitHub
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Google Sheets ↔ Apps Script (Code.gs) ↔ GitHub Repository ↔ Web App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Status & URL Koneksi
          </button>
          <button
            onClick={() => setActiveTab('codegs')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'codegs'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Kode Apps Script (Code.gs)
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            Panduan Alur GitHub
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-zinc-800">
          {saveMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                saveMessage.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveMessage.text}</span>
            </div>
          )}

          {activeTab === 'status' && (
            <>
              {/* Current Active Source Card */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Sumber Data Aktif:
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${sourceInfo.badge}`}>
                      {sourceInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600">{sourceInfo.desc}</p>
                  {lastUpdated && (
                    <p className="text-[11px] text-zinc-400">
                      Pembaruan terakhir: <span className="font-semibold text-zinc-600">{lastUpdated}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
              </div>

              {/* Row Stats (Showing full unlocked capacity) */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-zinc-200 bg-white text-center">
                    <div className="text-[10px] font-bold uppercase text-zinc-400">Baris Personil</div>
                    <div className="text-lg font-black text-zinc-900 mt-0.5">{stats.onDutyCount}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Tanpa Batas Baris</div>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-200 bg-white text-center">
                    <div className="text-[10px] font-bold uppercase text-zinc-400">Baris Surat Jalan</div>
                    <div className="text-lg font-black text-blue-600 mt-0.5">{stats.shippingCount}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Full Data Sheet</div>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-200 bg-white text-center">
                    <div className="text-[10px] font-bold uppercase text-zinc-400">Baris Tren Harian</div>
                    <div className="text-lg font-black text-indigo-600 mt-0.5">{stats.trendCount}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Full Riwayat</div>
                  </div>
                </div>
              )}

              {/* Form Settings */}
              <form onSubmit={handleSaveConfig} className="space-y-4 pt-2 border-t border-zinc-200">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    1. URL Web App Google Apps Script (`Code.gs`) — <span className="text-emerald-600">Prioritas Utama (Bebas Kuota)</span>
                  </label>
                  <input
                    type="url"
                    value={gasWebAppUrl}
                    onChange={(e) => setGasWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Dapatkan URL ini setelah men-deploy file <code className="bg-zinc-100 px-1 rounded">Code.gs</code> sebagai <strong>Web App</strong> di Google Sheets Anda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    2. URL Raw JSON GitHub (`logistics-sync.json`) — <span className="text-indigo-600">Cadangan Sinkronisasi GitHub</span>
                  </label>
                  <input
                    type="url"
                    value={githubRawUrl}
                    onChange={(e) => setGithubRawUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/username/repo/main/public/data/logistics-sync.json"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Jika diisi, Web App juga dapat menarik file JSON yang di-push otomatis oleh <code className="bg-zinc-100 px-1 rounded">Code.gs</code> ke repository GitHub Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      URL Webhook Server Ini (Untuk diisi di Google Sheets)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="w-full px-3 py-2 text-[11px] rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyWebhook}
                        className="px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedWebhook ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Durasi Cache Server (Detik)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={3600}
                      value={cacheTtlSeconds}
                      onChange={(e) => setCacheTtlSeconds(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan Konfigurasi'}
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'codegs' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-blue-600" />
                  File <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">/gas/Code.gs</code> Sudah Tersedia di Project & Siap Dipasang di Google Sheets
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800">
                  <li>Buka Google Spreadsheet Hub Kediri Anda, lalu klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Klik tombol <strong>Salin Kode Code.gs</strong> di bawah ini, lalu tempel (Paste) menggantikan seluruh isi <code className="bg-white px-1 rounded">Code.gs</code>.</li>
                  <li>Klik <strong>Terapkan (Deploy) &gt; Deployment Baru &gt; Pilih jenis: Aplikasi Web (Web App)</strong>.</li>
                  <li>Atur <em>Execute as:</em> <strong>Me (Saya)</strong> dan <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong>, lalu klik <strong>Deploy</strong>.</li>
                  <li>Salin <strong>URL Web App</strong> yang muncul dan tempelkan pada tab <strong>Status &amp; URL Koneksi</strong> di sebelahnya.</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between bg-zinc-800 text-zinc-200 px-4 py-2 rounded-t-xl text-xs font-mono">
                  <span>/gas/Code.gs</span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-sans font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Berhasil Disalin!' : 'Salin Kode Code.gs'}
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-emerald-300 text-[11px] font-mono rounded-b-xl overflow-x-auto max-h-80 leading-relaxed">
                  {CODE_GS_TEMPLATE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-zinc-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  Cara Kerja Sinkronisasi 2 Arah: Google Sheets ↔ GitHub ↔ Web App
                </h3>
                <p>
                  Dengan arsitektur baru ini, Anda tidak lagi bergantung pada kuota gratis Google Sheets API yang mudah habis jika dibuka banyak orang:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
                  <li>
                    <strong>Jalur 1 (Langsung via Code.gs Web App):</strong> Server memanggil URL <code className="bg-zinc-200 px-1 rounded">Code.gs</code> yang sudah dilengkapi <code className="bg-zinc-200 px-1 rounded">CacheService</code>. Berapa pun jumlah karyawan/driver yang membuka Web App bersamaan, beban request tetap ringan dan bebas kuota Google Cloud API.
                  </li>
                  <li>
                    <strong>Jalur 2 (Auto-Commit ke GitHub Repository):</strong> Setelah <code className="bg-zinc-200 px-1 rounded">Code.gs</code> dipasang di Spreadsheet, muat ulang Spreadsheet Anda. Akan muncul menu baru <strong>🚚 Hub Kediri Sync</strong> di bagian atas Google Sheets.
                  </li>
                  <li>
                    Klik <strong>⚙️ Konfigurasi GitHub &amp; Web App URL</strong> di menu Google Sheets tersebut, lalu masukkan nama repo GitHub Anda (misal <code className="bg-zinc-200 px-1 rounded">username/hub-kediri</code>) beserta <em>Personal Access Token (PAT)</em> GitHub Anda.
                  </li>
                  <li>
                    Setiap kali admin gudang mengubah jadwal atau menambah Surat Jalan di Google Sheets, <code className="bg-zinc-200 px-1 rounded">Code.gs</code> akan otomatis meng-update file <code className="bg-zinc-200 px-1 rounded">public/data/logistics-sync.json</code> di GitHub Anda sekaligus mendorong data terbaru ke Webhook Web App ini!
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-bold">Keuntungan Sistem Baru Ini:</div>
                <ul className="list-disc list-inside text-[11px] space-y-1 text-emerald-800">
                  <li><strong>Batas 100 Baris Dihapus:</strong> Membaca seluruh baris Surat Jalan &amp; Tren Harian secara utuh (ribuan baris sekalipun).</li>
                  <li><strong>Hemat Kuota Firebase Firestore 100%:</strong> Menghapus pembacaan berulang 30 detik ke Firestore yang sebelumnya menguras 50.000 kuota harian.</li>
                  <li><strong>Anti Layar Merah Saat Sinyal Hilang:</strong> Data terakhir otomatis tersimpan di penyimpanan lokal perangkat (Offline-First) dan di disk server (<code className="bg-white px-1 rounded">public/data/logistics-sync.json</code>).</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
