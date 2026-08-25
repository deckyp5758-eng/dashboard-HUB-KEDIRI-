export interface Personil {
  nip: string;
  nama: string;
  jabatan: string;
  wa: string;
  jadwal: string;
}

export interface Pengiriman {
  noOrder: string;
  noReceive: string;
  address: string;
  name: string;
  telp: string;
  reqShipDate: string;
  armada: string;
  driver: string;
  kenek: string;
  cbm: string;
  createdAt: string; // ISO format string
}

export interface HubKediriData {
  tanggal: string;
  sts: number;
  grw: number;
  cust: number;
  totalDo: number;
  ujp: number;
  titikPengiriman: number;
  cbm: number;
}
