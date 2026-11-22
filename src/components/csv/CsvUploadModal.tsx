'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Download, X, AlertTriangle } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode } from '@/types';
import { DataService } from '@/lib/dataService';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** The CSV must have exactly these columns, in this order (same as the Excel register, plus EMAIL). */
export const CSV_HEADERS = ['EN. ID', 'HOUSE', 'R.NO.', 'NAME OF STUDENTS', 'COURSE', 'REMARK', 'EMAIL'] as const;

interface ParsedRow {
  enrollment_no: string;
  house: HostelHouseCode;
  room_no: string;
  name: string;
  course: string;
  remarks: string;
  email: string;
  emailGenerated: boolean;
  isValid: boolean;
  validationError?: string;
}

const normaliseHeader = (h: unknown) =>
  String(h ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

/** "J.K." -> JK, "H.M." -> HM, "Q.H" -> QH, also the full hostel names. */
const normalizeHouseCode = (rawHouse: string): HostelHouseCode | null => {
  const clean = rawHouse.trim().toUpperCase();
  if (!clean) return null;
  const letters = clean.replace(/[^A-Z]/g, '');
  if (letters in HOSTEL_HOUSES) return letters as HostelHouseCode;

  if (clean.includes('HASRAT')) return 'HM';
  if (clean.includes('JAI KISHAN') || clean.includes('JAIKISHAN') || clean.includes('JAI-KISHAN')) return 'JK';
  if (clean.includes('BHOPAL')) return 'BH';
  if (clean.includes('QIDWAI')) return 'QH';
  if (clean.includes('KASHMIR')) return 'KH';
  if (clean.includes('AGHA')) return 'AK';
  if (clean.includes('MAHAMOOD')) return 'MB';
  return null;
};

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headerError, setHeaderError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ added: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processCsv(selectedFile);
    e.target.value = '';
  };

  const processCsv = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadSummary(null);
    setHeaderError('');
    setParsedRows([]);

    Papa.parse<string[]>(selectedFile, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const [head, ...body] = results.data;
        const found = (head ?? []).map(normaliseHeader);

        const sameColumns =
          found.length === CSV_HEADERS.length && CSV_HEADERS.every((h, i) => found[i] === h);
        if (!sameColumns) {
          setHeaderError(
            `The CSV columns must be exactly: ${CSV_HEADERS.join(', ')} (in this order). ` +
              `Your file has: ${found.length ? found.join(', ') : 'no header row'}.`
          );
          return;
        }

        const seen = new Set<string>();
        const rows: ParsedRow[] = body.map((cells) => {
          const [en, rawHouse, room, name, course, remark, email] = CSV_HEADERS.map((_, i) => String(cells[i] ?? '').trim());

          const enrollment = en.toUpperCase();
          const houseCode = normalizeHouseCode(rawHouse);
          let validationError = '';
          if (!enrollment) validationError = 'Missing EN. ID';
          else if (seen.has(enrollment)) validationError = 'EN. ID repeated in this file';
          else if (!houseCode) validationError = `Invalid HOUSE "${rawHouse}"`;
          else if (!room) validationError = 'Missing R.NO.';
          else if (!name) validationError = 'Missing NAME OF STUDENTS';
          else if (email && !email.includes('@')) validationError = 'EMAIL is not valid';
          if (enrollment) seen.add(enrollment);

          const emailGenerated = !email;
          return {
            enrollment_no: enrollment,
            house: (houseCode || 'HM') as HostelHouseCode,
            room_no: room,
            name,
            course: course.replace(/\.+$/, '') || 'General Course',
            remarks: remark,
            email: (email || `${enrollment.toLowerCase()}@myamu.ac.in`).toLowerCase(),
            emailGenerated,
            isValid: !validationError,
            validationError
          };
        });

        setParsedRows(rows);
      },
      error: (error) => {
        setHeaderError('Could not read the CSV file: ' + error.message);
      }
    });
  };

  const handleCommitUpload = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    const result = await DataService.bulkAddStudents(
      validRows.map((r) => ({
        enrollment_no: r.enrollment_no,
        name: r.name,
        house: r.house,
        room_no: r.room_no,
        course: r.course,
        email: r.email,
        remarks: r.remarks || undefined
      }))
    );
    setIsProcessing(false);
    setUploadSummary(result);
    if (result.added > 0) onSuccess();
  };

  const downloadSampleTemplate = () => {
    const lines = [
      CSV_HEADERS.join(','),
      'GN0702,J.K.,2,SAMEER RAJA,B.ARCH,,sameer@gmail.com',
      'GP8003,J.K.,2,YASIR MASOOM,B.TECH,BY UMAISH SID.,yasir@gmail.com',
      'GM8713,J.K.,2,MOHD ATIF NOOR,B.TECH,"FRM KHWR 24.08.26, FRM HM09 08.11.26",atif@gmail.com'
    ];
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'amu_students_dining_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const generatedEmails = parsedRows.filter((r) => r.isValid && r.emailGenerated).length;

  return (
    <div className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4">
      <div className="sheet-enter flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-emerald-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-800 p-2">
              <UploadCloud className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Import Students via CSV</h3>
              <p className="text-xs text-emerald-200">Same columns as the Excel register, plus EMAIL</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="press rounded-lg p-2 text-emerald-200 active:bg-emerald-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              The first row must be exactly these columns, in this order:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CSV_HEADERS.map((h, i) => (
                <span key={h} className="rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-[11px] font-bold">
                  {i + 1}. {h}
                </span>
              ))}
            </div>
            <p className="mt-2 text-emerald-900/80">
              HOUSE can be written like the sheet (J.K., H.M., B.H., Q.H., K.H., A.K., M.B.) or as JK, HM and so on. REMARK and
              EMAIL may be left empty; an empty EMAIL becomes <span className="font-mono">enrollment@myamu.ac.in</span>.
            </p>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-700" />
              <p className="text-sm font-semibold text-slate-800">{file ? file.name : 'Choose a CSV file'}</p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="press flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800"
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="press rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
              >
                Select File
              </button>
            </div>
          </div>

          {headerError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              {headerError}
            </div>
          )}

          {uploadSummary && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                uploadSummary.added > 0 ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {uploadSummary.added > 0 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                {uploadSummary.added} students registered.
              </div>
              {uploadSummary.errors.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-red-700">
                  <p className="font-semibold">Skipped:</p>
                  {uploadSummary.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700">Rows in the file: {parsedRows.length}</span>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">{validCount} ready to import</span>
                  {generatedEmails > 0 && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">{generatedEmails} without EMAIL</span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">
                      <AlertTriangle className="h-3 w-3" />
                      {invalidCount} invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 text-xs">
                <table className="w-full min-w-[640px] divide-y divide-slate-200 text-left">
                  <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">EN. ID</th>
                      <th className="p-2.5">HOUSE</th>
                      <th className="p-2.5">R.NO.</th>
                      <th className="p-2.5">NAME OF STUDENTS</th>
                      <th className="p-2.5">COURSE</th>
                      <th className="p-2.5">REMARK</th>
                      <th className="p-2.5">EMAIL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="whitespace-nowrap p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                              {row.validationError}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{row.enrollment_no}</td>
                        <td className="p-2.5">
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[row.house]?.color || 'bg-slate-100'}`}>
                            {row.house}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">{row.room_no}</td>
                        <td className="p-2.5 text-slate-800">{row.name}</td>
                        <td className="p-2.5 text-slate-600">{row.course}</td>
                        <td className="max-w-[10rem] truncate p-2.5 text-slate-500" title={row.remarks}>{row.remarks}</td>
                        <td className={`p-2.5 font-mono ${row.emailGenerated ? 'text-amber-700' : 'text-slate-600'}`}>{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="press px-4 py-2 text-xs font-semibold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={validCount === 0 || isProcessing}
            onClick={handleCommitUpload}
            className="press flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow disabled:opacity-50"
          >
            {isProcessing ? 'Importing…' : `Import ${validCount} Students`}
          </button>
        </div>
      </div>
    </div>
  );
};
