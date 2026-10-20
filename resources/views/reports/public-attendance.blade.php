<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>Rekap Absensi via Link</title>
<style>
@page { margin: 28px 28px 42px; }
body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #203642; }
h1 { font-size: 17px; margin: 0 0 5px; } h2 { font-size: 12px; margin: 5px 0; }
.header { border-bottom: 3px solid #f2a365; padding-bottom: 12px; margin-bottom: 14px; }
p { line-height: 1.7; } .summary { background: #edf4f1; padding: 10px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 15px; }
th { background: #153747; color: #fff; text-align: left; padding: 7px 5px; }
td { padding: 7px 5px; border-bottom: 1px solid #e4ebee; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
thead { display: table-header-group; } tr { page-break-inside: avoid; }
.footer { position: fixed; bottom: -25px; font-size: 8px; color: #61727e; }
</style></head><body>
<div class="header"><h1>SMAN 2 RANTAU SELATAN</h1><h2>REKAP ABSENSI VIA LINK</h2></div>
<p><strong>Nama formulir:</strong> {{ $form->title }}<br>
<strong>Guru pembuat:</strong> {{ $form->teacher->name }}<br>
<strong>Dibuat:</strong> {{ $form->starts_at->timezone('Asia/Jakarta')->format('d/m/Y H:i') }} WIB<br>
<strong>Masa aktif:</strong> {{ $form->starts_at->timezone('Asia/Jakarta')->format('d/m/Y H:i') }} – {{ $form->expires_at->timezone('Asia/Jakarta')->format('d/m/Y H:i') }} WIB ({{ $form->duration_minutes }} menit)<br>
<strong>Laporan dibuat:</strong> {{ $generatedAt }}<br>
<strong>Filter:</strong> Nama: {{ $filters['search'] ?? 'Semua' }} · Kelas: {{ $filters['class_name'] ?? 'Semua' }} · Status: {{ $filters['status'] ?? 'Semua' }} · Tanggal: {{ $filters['from'] ?? 'Awal' }} s.d. {{ $filters['to'] ?? 'Sekarang' }}</p>
<div class="summary">Total respons: <strong>{{ $summary['total'] }}</strong> &nbsp; Hadir: <strong>{{ $summary['hadir'] }}</strong> &nbsp; Izin: <strong>{{ $summary['izin'] }}</strong> &nbsp; Sakit: <strong>{{ $summary['sakit'] }}</strong> &nbsp; Alpa: <strong>{{ $summary['alpa'] }}</strong></div>
<table><thead><tr><th style="width:3%">No.</th><th style="width:8%">Tanggal</th><th style="width:6%">Jam WIB</th><th style="width:17%">Nama siswa</th><th style="width:7%">Kelas</th><th style="width:16%">Mata pelajaran</th><th style="width:5%">Les ke-</th><th style="width:7%">Status</th><th>Keterangan</th></tr></thead><tbody>
@forelse($records as $record)<tr>
<td>{{ $loop->iteration }}</td><td>{{ $record->submitted_at->timezone('Asia/Jakarta')->format('d/m/Y') }}</td><td>{{ $record->submitted_at->timezone('Asia/Jakarta')->format('H:i') }}</td>
<td>{{ $record->student_name }}</td><td>{{ $record->class_name }}</td><td>{{ $record->subject_name }}</td><td>{{ $record->lesson_number }}</td><td>{{ ucfirst($record->attendance_status) }}</td><td>{{ $record->notes ?: '-' }}</td>
</tr>@empty<tr><td colspan="9">Belum ada respons sesuai filter.</td></tr>@endforelse
</tbody></table>
<p>Data diisi melalui formulir tanpa login. Nama dan kelas yang sama perlu ditinjau; identitas pengisi belum terverifikasi.</p>
<div class="footer">Dibuat {{ $generatedAt }} · Portal Absensi SMAN 2 Rantau Selatan</div>
</body></html>
