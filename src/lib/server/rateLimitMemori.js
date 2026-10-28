// Pembatas laju in-memory untuk endpoint yang tidak punya tabel khusus.
// Berlaku per instance server; cukup untuk meredam brute force pada prototipe.
const catatan = new Map();
const BATAS_ENTRI = 5000;

function bersihkanKedaluwarsa() {
  if (catatan.size < BATAS_ENTRI) return;
  const sekarang = Date.now();

  for (const [kunci, nilai] of catatan) {
    if (nilai.reset <= sekarang) catatan.delete(kunci);
  }
}

export function cekBatas(kunci, maks) {
  const nilai = catatan.get(kunci);
  if (!nilai) return { boleh: true, hit: 0, sisa: maks };

  if (nilai.reset <= Date.now()) {
    catatan.delete(kunci);
    return { boleh: true, hit: 0, sisa: maks };
  }

  return {
    boleh: nilai.hit < maks,
    hit: nilai.hit,
    sisa: Math.max(0, maks - nilai.hit),
    tungguMs: Math.max(0, nilai.reset - Date.now()),
  };
}

export function tambahHit(kunci, maks, jendelaMs) {
  bersihkanKedaluwarsa();
  const sekarang = Date.now();
  const nilai = catatan.get(kunci);

  if (!nilai || nilai.reset <= sekarang) {
    catatan.set(kunci, { hit: 1, reset: sekarang + jendelaMs });
    return { boleh: true, hit: 1, sisa: Math.max(0, maks - 1) };
  }

  nilai.hit += 1;
  return {
    boleh: nilai.hit <= maks,
    hit: nilai.hit,
    sisa: Math.max(0, maks - nilai.hit),
    tungguMs: Math.max(0, nilai.reset - sekarang),
  };
}

export function hapusKunci(kunci) {
  catatan.delete(kunci);
}
