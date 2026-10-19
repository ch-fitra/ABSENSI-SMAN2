<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportStudentsRequest;
use App\Http\Requests\StudentRequest;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\StudentImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class RosterController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate(['class_id' => 'nullable|integer', 'search' => 'nullable|string|max:100', 'page' => 'nullable|integer|min:1']);
        $token = $request->session()->get('import_token');

        return Inertia::render('teacher/roster', [
            'students' => Student::with('schoolClass')->when($filters['class_id'] ?? null, fn ($q, $v) => $q->where('class_id', $v))
                ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($q) => $q->where('full_name', 'like', '%'.$v.'%')->orWhere('nisn', 'like', '%'.$v.'%')))
                ->orderBy('full_name')->paginate(20)->withQueryString(),
            'classes' => SchoolClass::orderBy('name')->get(), 'filters' => $filters,
            'importPreview' => $token ? Cache::get('import:'.$request->user()->id.':'.$token) : null,
            'importToken' => $token,
        ]);
    }

    public function createClass(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:40|unique:classes', 'grade_level' => 'required|in:X,XI,XII']);
        SchoolClass::create($data);

        return back()->with('success', 'Kelas berhasil ditambahkan.');
    }

    public function store(StudentRequest $request)
    {
        DB::transaction(function () use ($request) {
            SchoolClass::lockForUpdate()->findOrFail($request->integer('class_id'));
            Student::create($request->validated());
        }, 5);

        return back()->with('success', 'Siswa berhasil ditambahkan ke daftar bersama.');
    }

    public function update(StudentRequest $request, Student $student)
    {
        DB::transaction(function () use ($request, $student) {
            // Lock both classes in a deterministic order, then the student row.
            SchoolClass::whereIn('id', [$student->class_id, $request->integer('class_id')])->orderBy('id')->lockForUpdate()->get();
            $student = Student::lockForUpdate()->findOrFail($student->id);
            $old = $student->only(['nisn', 'full_name', 'class_id', 'is_active']);
            $student->update($request->validated());
            DB::table('student_change_logs')->insert(['student_id' => $student->id, 'teacher_id' => $request->user()->id,
                'old_values' => json_encode($old), 'new_values' => json_encode($student->only(array_keys($old))), 'changed_at' => now()]);
        }, 5);

        return back()->with('success', 'Data siswa diperbarui. Riwayat absensi tetap tersimpan.');
    }

    public function template()
    {
        return response()->streamDownload(function () {
            $book = new Spreadsheet;
            $sheet = $book->getActiveSheet();
            $sheet->setTitle('Data Siswa');
            $sheet->fromArray(['NISN', 'Nama Lengkap'], null, 'A1');
            $sheet->setCellValueExplicit('A2', '0012345678', DataType::TYPE_STRING);
            $sheet->setCellValue('B2', 'Contoh Siswa (hapus baris ini)');
            $sheet->getStyle('A2:A5001')->getNumberFormat()->setFormatCode('@');
            $sheet->getStyle('A1:B1')->getFont()->setBold(true);
            $sheet->getColumnDimension('A')->setWidth(20);
            $sheet->getColumnDimension('B')->setWidth(45);
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, 'template-siswa-sman2.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    public function preview(ImportStudentsRequest $request, StudentImportService $import)
    {
        $rows = $import->preview($request->file('file'));
        $old = $request->session()->get('import_token');
        if ($old) {
            Cache::forget('import:'.$request->user()->id.':'.$old);
        }
        $token = Str::random(48);
        Cache::put('import:'.$request->user()->id.':'.$token, ['rows' => $rows, 'class_id' => $request->integer('class_id'), 'class_name' => SchoolClass::findOrFail($request->integer('class_id'))->name], now()->addMinutes(15));
        $request->session()->put('import_token', $token);

        return redirect('/guru/siswa');
    }

    public function import(Request $request, StudentImportService $import)
    {
        $request->validate(['token' => 'required|string|size:48']);
        $key = 'import:'.$request->user()->id.':'.$request->input('token');
        $preview = Cache::get($key);
        if (! $preview || $request->input('token') !== $request->session()->get('import_token')) {
            throw ValidationException::withMessages(['file' => 'Pratinjau kedaluwarsa. Unggah ulang file Excel.']);
        }
        $count = $import->commit($preview['class_id'], $preview['rows']);
        Cache::forget($key);
        $request->session()->forget('import_token');
        $skipped = count($preview['rows']) - $count;

        return redirect('/guru/siswa')->with('success', "$count siswa berhasil diimpor. $skipped baris tidak valid atau duplikat dilewati.");
    }

    public function cancelImport(Request $request)
    {
        $token = $request->session()->pull('import_token');
        if ($token) {
            Cache::forget('import:'.$request->user()->id.':'.$token);
        }

        return redirect('/guru/siswa');
    }
}
