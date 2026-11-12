const mejaAwal = [{
    id: "A101",
    jenis: "Meja",
    gedung: "Gedung B",
    ruang: "Ruangan 204"
  },
  {
    id: "A102",
    jenis: "Meja",
    gedung: "Gedung B",
    ruang: "Ruangan 204"
  },
  {
    id: "B205",
    jenis: "Meja",
    gedung: "Gedung A",
    ruang: "Ruangan 101"
  },
  {
    id: "C310",
    jenis: "Meja",
    gedung: "Gedung C",
    ruang: "Ruangan 310"
  }
];

const laporanContoh = [{
    id: "FMD-1001",
    mejaId: "B205",
    lokasi: "Gedung A - Ruangan 101 - Meja #B205",
    masalah: "Sandaran Rusak",
    urgensi: "Tinggi",
    detail: "Sandaran patah di sisi kiri",
    foto: "",
    pelapor: "Dina (contoh)",
    status: "Sedang Diproses",
    waktu: "2026-10-26 09:15"
  },
  {
    id: "FMD-1002",
    mejaId: "C310",
    lokasi: "Gedung C - Ruangan 310 - Meja #C310",
    masalah: "Goyang",
    urgensi: "Sedang",
    detail: "Kaki meja kiri pendek",
    foto: "",
    pelapor: "Budi (contoh)",
    status: "Dikirim",
    waktu: "2026-10-27 13:40"
  },
  {
    id: "FMD-1003",
    mejaId: "A102",
    lokasi: "Gedung B - Ruangan 204 - Meja #A102",
    masalah: "Sandaran Lengan Hilang",
    urgensi: "Rendah",
    detail: "",
    foto: "",
    pelapor: "Sinta (contoh)",
    status: "Selesai Diperbaiki",
    waktu: "2026-10-22 08:05"
  }
];

let firestore = null;
let cacheLaporan = [];
let cacheProperti = [];
let siapLaporan = false;
let siapProperti = false;
const daftarPendengar = [];

function bacaLaporan() {
  return cacheLaporan;
}

function bacaMeja() {
  return cacheProperti;
}

function dataSiap() {
  return siapLaporan && siapProperti;
}

function saatDataBerubah(fungsi) {
  daftarPendengar.push(fungsi);
}

function kabari() {
  daftarPendengar.forEach(f => f());
}

function buatIdLaporan() {
  return "FMD-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase();
}

async function loginMahasiswa(username, password) {
  if (!firestore) {
    throw new Error("Database belum terhubung. Periksa koneksi internet.");
  }
  const u = String(username || "").trim();
  const p = String(password || "").trim();

  if (!u || !p) {
    throw new Error("Username dan password wajib diisi.");
  }

  // 1. Cari exact match username di koleksi 'users'
  let snap = await firestore.collection("users").where("username", "==", u).get();

  // 2. Jika huruf besar/kecil berbeda, coba cari versi lowercase
  if (snap.empty && u.toLowerCase() !== u) {
    snap = await firestore.collection("users").where("username", "==", u.toLowerCase()).get();
  }

  if (snap.empty) {
    throw new Error("Username '" + u + "' tidak terdaftar.");
  }

  let akunDitemukan = null;
  snap.forEach(doc => {
    const data = doc.data();
    if (String(data.password || "").trim() === p) {
      akunDitemukan = {
        docId: doc.id,
        id: data.id,
        username: data.username,
        nama: data.nama || data.username
      };
    }
  });

  if (!akunDitemukan) {
    throw new Error("Password salah. Silakan periksa kembali.");
  }

  return akunDitemukan;
}

function tulisLaporan(lap) {
  return firestore.collection("laporan").doc(lap.id).set(lap);
}

function ubahStatusDb(id, statusBaru) {
  return firestore.collection("laporan").doc(id).update({
    status: statusBaru
  });
}

function tulisMeja(meja) {
  return firestore.collection("properti").doc(meja.id).set(meja);
}

async function simpanPropertiDb(dataBaru, idLama = null) {
  if (!firestore) throw new Error("Database belum siap.");
  if (idLama && idLama !== dataBaru.id) {
    const batch = firestore.batch();
    batch.delete(firestore.collection("properti").doc(idLama));
    batch.set(firestore.collection("properti").doc(dataBaru.id), dataBaru);
    return batch.commit();
  }
  return firestore.collection("properti").doc(dataBaru.id).set(dataBaru);
}

function hapusMeja(id) {
  return firestore.collection("properti").doc(id).delete();
}

async function resetMeja() {
  const batch = firestore.batch();
  const lama = await firestore.collection("properti").get();
  lama.forEach(d => batch.delete(d.ref));
  mejaAwal.forEach(m => batch.set(firestore.collection("properti").doc(m.id), m));
  return batch.commit();
}

function tampilGalatDb(pesan) {
  const kotak = document.createElement("div");
  kotak.style.cssText = "background:#fdecea;color:#8a1f1c;padding:12px 16px;font:14px system-ui,Arial;border-bottom:2px solid #c0504d;position:sticky;top:0;z-index:99";
  kotak.textContent = "⚠ " + pesan;
  const pasang = () => document.body.prepend(kotak);
  if (document.body) pasang();
  else document.addEventListener("DOMContentLoaded", pasang);
}

function mulaiDb() {
  if (typeof firebase === "undefined") {
    tampilGalatDb("Library Firebase gagal dimuat. Periksa koneksi internet lalu refresh.");
    return false;
  }
  if (typeof FIREBASE_CONFIG === "undefined" || FIREBASE_CONFIG.apiKey.startsWith("ISI")) {
    tampilGalatDb("Belum terhubung ke database: isi dulu file firebase-config.js dengan konfigurasi Firebase kamu.");
    return false;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  firestore = firebase.firestore();
  const galat = e => tampilGalatDb("Gagal membaca database: " + e.message + " (cek Rules Firestore & konfigurasi)");

  let pertamaProperti = true;
  firestore.collection("properti").onSnapshot(snap => {
    cacheProperti = snap.docs.map(d => d.data());
    if (pertamaProperti && snap.empty) {
      mejaAwal.forEach(m => tulisMeja(m));
    }
    pertamaProperti = false;
    siapProperti = true;
    kabari();
  }, galat);

  let pertamaLaporan = true;
  firestore.collection("laporan").onSnapshot(snap => {
    cacheLaporan = snap.docs.map(d => d.data());
    if (pertamaLaporan && snap.empty) {
      laporanContoh.forEach(l => tulisLaporan(l));
    }
    pertamaLaporan = false;
    siapLaporan = true;
    kabari();
  }, galat);
  return true;
}