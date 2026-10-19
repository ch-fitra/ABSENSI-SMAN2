<?php

namespace App\Services;

use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx;
use ZipArchive;

class StudentImportService
{
    public function preview(UploadedFile $file): array
    {
        $zip = new ZipArchive;
        if ($zip->open($file->getRealPath()) !== true) {
            $this->invalidFile();
        }
        $expanded = 0;
        if ($zip->numFiles > 200) {
            $zip->close();
            $this->invalidFile();
        }
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $expanded += $zip->statIndex($i)['size'];
        }
        $zip->close();
        if ($expanded > 30 * 1024 * 1024) {
            $this->invalidFile();
        }
        try {
            $reader = new Xlsx;
            $info = $reader->listWorksheetInfo($file->getRealPath());
            if (count($info) < 1 || $info[0]['totalRows'] > 5001 || $info[0]['totalColumns'] > 20) {
                $this->invalidFile();
            }
            $reader->setLoadSheetsOnly($info[0]['worksheetName']);
            $book = $reader->load($file->getRealPath());
            $sheet = $book->getSheet(0);
            if (trim((string) $sheet->getCell('A1')->getValue()) !== 'NISN' || trim((string) $sheet->getCell('B1')->getValue()) !== 'Nama Lengkap') {
                throw ValidationException::withMessages(['file' => 'Gunakan template dengan kolom NISN dan Nama Lengkap.']);
            }
            $rows = [];
            $seen = [];
            $existing = Student::pluck('nisn')->flip();
            for ($i = 2; $i <= $sheet->getHighestDataRow(); $i++) {
                $a = $sheet->getCell('A'.$i);
                $b = $sheet->getCell('B'.$i);
                $nisn = trim((string) $a->getFormattedValue());
                $name = trim((string) $b->getValue());
                if ($nisn === '' && $name === '') {
                    continue;
                }
                $errors = [];
                if ($a->getDataType() === 'f' || $b->getDataType() === 'f') {
                    $errors[] = 'Rumus tidak diizinkan.';
                }
                if (! preg_match('/^[0-9]{10}$/', $nisn)) {
                    $errors[] = 'NISN harus 10 digit. Gunakan format teks untuk mempertahankan nol awal.';
                }
                if (mb_strlen($name) > 150 || ! preg_match('/\p{L}/u', $name)) {
                    $errors[] = 'Nama harus berisi huruf, maksimal 150 karakter.';
                }
                if ($existing->has($nisn) || isset($seen[$nisn])) {
                    $errors[] = 'NISN duplikat; baris ini tidak akan diimpor.';
                }
                $seen[$nisn] = true;
                $rows[] = ['row' => $i, 'nisn' => $nisn, 'full_name' => $name, 'errors' => $errors];
            }
            $book->disconnectWorksheets();
            if (! $rows) {
                throw ValidationException::withMessages(['file' => 'File belum berisi data siswa.']);
            }

            return $rows;
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            $this->invalidFile();
        }
    }

    private function invalidFile(): never
    {
        throw ValidationException::withMessages(['file' => 'File Excel tidak dapat dibaca atau melebihi batas. Gunakan template .xlsx, maksimal 5.000 siswa.']);
    }

    public function commit(int $classId, array $rows): int
    {
        $valid = array_values(array_filter($rows, fn ($r) => ! $r['errors']));
        if (! $valid) {
            throw ValidationException::withMessages(['file' => 'Tidak ada baris valid untuk diimpor.']);
        }
        try {
            return DB::transaction(function () use ($classId, $valid) {
                SchoolClass::where('is_active', true)->lockForUpdate()->findOrFail($classId);
                if (Student::whereIn('nisn', array_column($valid, 'nisn'))->exists()) {
                    throw ValidationException::withMessages(['file' => 'Data siswa berubah sejak pratinjau. Unggah ulang file untuk memeriksa duplikasi. Tidak ada data disimpan.']);
                }
                foreach (array_chunk($valid, 500) as $chunk) {
                    Student::insert(array_map(fn ($r) => ['nisn' => $r['nisn'], 'full_name' => $r['full_name'], 'class_id' => $classId, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()], $chunk));
                }

                return count($valid);
            }, 5);
        } catch (QueryException $e) {
            if (! in_array((string) $e->getCode(), ['23000', '23505'])) {
                throw $e;
            }
            throw ValidationException::withMessages(['file' => 'Terjadi konflik NISN. Tidak ada data disimpan; unggah ulang file.']);
        }
    }
}
