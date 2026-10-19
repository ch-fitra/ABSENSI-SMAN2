<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>Laporan Absensi</title>
<style>
@page { margin: 28px 30px 42px; }
body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #172b3a; }
h1 { font-size: 17px; margin-bottom: 4px; color: #142e45; } h2 { font-size: 12px; margin-top: 5px; }
.header { border-bottom: 3px solid #ed914c; padding-bottom: 12px; margin-bottom: 16px; }
.muted { color: #64748b; } table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
th { background: #142e45; color: white; text-align: left; padding: 8px 5px; } td { padding: 7px 5px; border-bottom: 1px solid #e2e8f0; word-wrap: break-word; vertical-align: top; }
thead { display: table-header-group; } tr { page-break-inside: avoid; } .summary { background: #f4f7fa; padding: 12px; margin-top: 14px; }
.footer { position: fixed; bottom: -25px; font-size: 8px; color: #64748b; }
</style></head><body>
<div class="header"><h1>SMAN 2 RANTAU SELATAN</h1><h2>Laporan Kehadiran {{ $role === 'teacher' ? 'Guru' : 'Siswa' }}</h2><span class="muted">Hanya memuat hasil yang telah dikonfirmasi</span></div>
<p><strong>{{ $role === 'teacher' ? $owner->name : $owner->full_name }}</strong>
@if($role === 'student')<br>NISN: {{ $owner->nisn }} · Kelas saat ini: {{ $owner->schoolClass?->name }}@endif<br>
Periode: {{ !empty($filters['from']) ? \Carbon\Carbon::parse($filters['from'])->translatedFormat('d F Y') : 'Awal pencatatan' }} - {{ !empty($filters['to']) ? \Carbon\Carbon::parse($filters['to'])->translatedFormat('d F Y') : 'Sekarang' }}
@if(!empty($filters['subject']))<br>Mata pelajaran: {{ $filters['subject'] }}@endif</p>
<div class="summary">Total catatan: <strong>{{ $summary['total'] }}</strong> &nbsp; Hadir: <strong>{{ $summary['hadir'] }}</strong> &nbsp; Izin: <strong>{{ $summary['izin'] }}</strong> &nbsp; Sakit: <strong>{{ $summary['sakit'] }}</strong> &nbsp; Alpa: <strong>{{ $summary['alpa'] }}</strong></div>
<table><thead><tr><th style="width:17%">Tanggal / Sesi</th><th style="width:20%">Siswa / NISN</th><th style="width:26%">Pelajaran / Kelas / Guru</th><th style="width:10%">Status</th><th>Keterangan</th></tr></thead><tbody>
@forelse($records as $record)<tr>
<td>{{ $record->attendanceSession->starts_at->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i') }} WIB<br><span class="muted">Sesi #{{ $record->attendance_session_id }}</span></td>
<td>{{ $record->student_name_snapshot }}<br><span class="muted">{{ $record->nisn_snapshot }}</span></td>
<td>{{ $record->attendanceSession->subject_name }}<br>{{ $record->attendanceSession->class_name_snapshot }} · {{ $record->attendanceSession->teacher->name }}</td>
<td>{{ ucfirst($record->status) }}</td><td>{{ $record->notes ?: '-' }}</td></tr>
@empty<tr><td colspan="5">Belum ada catatan terkonfirmasi pada periode ini.</td></tr>@endforelse
</tbody></table><div class="footer">Dibuat {{ $generatedAt }} · Portal Absensi SMAN 2 Rantau Selatan</div>
</body></html>
