'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Download, X, AlertTriangle } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode } from '@/types';
import { DataService } from '@/lib/dataService';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  enrollment_no: string;
  name: string;
  house: HostelHouseCode;
  room_no: string;
  course: string;
  email: string;
  previous_room?: string;
  isValid: boolean;
  validationError?: string;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ added: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to normalize house input (e.g. accepts "HM", "HM-Hasrat Mohani", "Hasrat Mohani", etc.)
  const normalizeHouseCode = (rawHouse: string): HostelHouseCode | null => {
    if (!rawHouse) return null;
    const clean = rawHouse.trim().toUpperCase();
    if (['HM', 'BH', 'QH', 'KH', 'AK', 'MB'].includes(clean)) {
      return clean as HostelHouseCode;
    }
    // Prefix match
    if (clean.startsWith('HM')) return 'HM';
    if (clean.startsWith('BH')) return 'BH';
    if (clean.startsWith('QH')) return 'QH';
    if (clean.startsWith('KH')) return 'KH';
    if (clean.startsWith('AK')) return 'AK';
    if (clean.startsWith('MB')) return 'MB';

    if (clean.includes('HASRAT')) return 'HM';
    if (clean.includes('BHOPAL')) return 'BH';
    if (clean.includes('QIDWAI')) return 'QH';
    if (clean.includes('KASHMIR')) return 'KH';
    if (clean.includes('AGHA')) return 'AK';
    if (clean.includes('MAHAMOOD')) return 'MB';

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processCsv(selectedFile);
    }
  };

  const processCsv = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadSummary(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = results.data.map((raw: any, index: number) => {
          // Normalize column names regardless of exact casing or spaces
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const found = Object.keys(raw).find(
                rk => rk.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
              );
              if (found && raw[found]) return String(raw[found]).trim();
            }
            return '';
          };

          const enrollment = getVal(['enrollmentno', 'enrolmentno', 'enrollment', 'enrollmentnumber', 'enrolment']);
          const name = getVal(['name', 'studentname', 'fullname']) || `Student ${enrollment || index + 1}`;
          const rawHouse = getVal(['house', 'hostelhouse', 'hostel']);
          const room = getVal(['roomnumber', 'roomno', 'room']);
          const course = getVal(['course', 'couse', 'branch', 'programme']) || 'Undergraduate';
          const email = getVal(['email', 'emailid', 'mail']) || `${enrollment.toLowerCase()}@myamu.ac.in`;
          const prevRoom = getVal(['previousroom', 'prevroom', 'oldroom']) || 'N/A';

          const houseCode = normalizeHouseCode(rawHouse);
          let isValid = true;
          let validationError = '';

          if (!enrollment) {
            isValid = false;
            validationError = 'Missing Enrollment Number';
          } else if (!houseCode) {
            isValid = false;
            validationError = `Invalid House "${rawHouse}". Must be HM, BH, QH, KH, AK, or MB.`;
          } else if (!room) {
            isValid = false;
            validationError = 'Missing Room Number';
          }

          return {
            enrollment_no: enrollment.toUpperCase(),
            name,
            house: (houseCode || 'HM') as HostelHouseCode,
            room_no: room,
            course,
            email,
            previous_room: prevRoom,
            isValid,
            validationError
          };
        });

        setParsedRows(rows);
      },
      error: (error) => {
        alert('Failed to parse CSV file: ' + error.message);
      }
    });
  };

  const handleCommitUpload = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid student records found to import.');
      return;
    }

    setIsProcessing(true);
    const result = await DataService.bulkAddStudents(validRows);
    setIsProcessing(false);
    setUploadSummary(result);

    if (result.added > 0) {
      onSuccess();
    }
  };

  const downloadSampleTemplate = () => {
    const headers = 'Enrollment Number,Name,House,Room Number,Course,Email,Previous room\n';
    const sample1 = 'GJ1021,Tariq Anwar,HM,14,B.Tech Computer Engg,tariq.anwar@myamu.ac.in,08\n';
    const sample2 = 'GJ1045,Zaid Farooqui,BH,22,MCA,zaid.farooqui@myamu.ac.in,15\n';
    const sample3 = 'GK2219,Saad Qureshi,QH,05,M.Sc Physics,saad.qureshi@myamu.ac.in,New Allotment\n';
    const sample4 = 'GL3412,Hamza Rizvi,KH,31,MBBS,hamza.rizvi@myamu.ac.in,19\n';
    const sample5 = 'GM5501,Arham Siddiqui,AK,12,B.A. English,arham.siddiqui@myamu.ac.in,03\n';
    const sample6 = 'GN6782,Bilal Masood,MB,40,B.Com Hons,bilal.masood@myamu.ac.in,33\n';

    const blob = new Blob([headers + sample1 + sample2 + sample3 + sample4 + sample5 + sample6], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'amu_students_dining_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800 rounded-lg">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Import Students via CSV</h3>
              <p className="text-xs text-emerald-200">
                Bulk register students for the dining hall with hostel house codes
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* House Reference Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
            <div className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Valid House Codes Supported:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {Object.values(HOSTEL_HOUSES).map(h => (
                <div key={h.code} className="bg-white px-2.5 py-1.5 rounded border border-emerald-100 flex items-center gap-2">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                    {h.code}
                  </span>
                  <span className="text-slate-700 truncate">{h.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row: Sample Template & File Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {file ? file.name : 'Choose a CSV file or drag it here'}
                </p>
                <p className="text-xs text-slate-500">
                  Required columns: Enrollment Number, House, Room Number, Course, Email, Previous room
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                Sample CSV Template
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-sm"
              >
                Select File
              </button>
            </div>
          </div>

          {/* Upload Summary Feedback */}
          {uploadSummary && (
            <div className={`p-4 rounded-xl border text-sm ${
              uploadSummary.added > 0 
                ? 'bg-green-50 border-green-200 text-green-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="font-bold flex items-center gap-2">
                {uploadSummary.added > 0 ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                {uploadSummary.added} students successfully registered to dining database!
              </div>
              {uploadSummary.errors.length > 0 && (
                <div className="mt-2 text-xs space-y-1 text-red-700">
                  <p className="font-semibold">Import Warnings/Skipped:</p>
                  {uploadSummary.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Parsed Records ({parsedRows.length} Total)
                </span>
                <div className="flex gap-2">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    {validCount} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {invalidCount} Invalid Rows
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Enrollment</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">House</th>
                      <th className="p-2.5">Room</th>
                      <th className="p-2.5">Course</th>
                      <th className="p-2.5">Previous Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="p-2.5 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold" title={row.validationError}>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              {row.validationError}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{row.enrollment_no}</td>
                        <td className="p-2.5 text-slate-800">{row.name}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${HOSTEL_HOUSES[row.house]?.color || 'bg-slate-100'}`}>
                            {row.house} - {HOSTEL_HOUSES[row.house]?.shortName}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">{row.room_no}</td>
                        <td className="p-2.5 text-slate-600">{row.course}</td>
                        <td className="p-2.5 text-slate-500">{row.previous_room || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={validCount === 0 || isProcessing}
            onClick={handleCommitUpload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? 'Importing into Database...' : `Import ${validCount} Students`}
          </button>
        </div>
      </div>
    </div>
  );
};
