import React, { useState, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { HiOutlineX, HiOutlineUpload, HiOutlineDownload, HiOutlineCheckCircle, HiOutlineExclamation } from "react-icons/hi";
import * as XLSX from 'xlsx';
import { db } from "../firebase";
import { writeBatch, collection, doc, Timestamp } from "firebase/firestore";
import { format, parseISO, isValid } from "date-fns";

export default function ImportModal({ isOpen, onClose, user, properties }) {
    const [file, setFile] = useState(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [previewData, setPreviewData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [successCount, setSuccessCount] = useState(0);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setError("");

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                if (data.length === 0) {
                    setError("The selected file is empty.");
                    return;
                }

                // Process preview
                const previewItems = [];
                data.slice(0, 5).forEach(row => {
                    const mapped = mapSpecificRow(row);
                    if (mapped.rent) previewItems.push(mapped.rent);
                    if (mapped.bill) previewItems.push(mapped.bill);
                });
                setPreviewData(previewItems.slice(0, 5));
            } catch (err) {
                console.error(err);
                setError("Failed to parse file. Ensure it's a valid Excel or CSV.");
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const parseExcelDate = (dateVal) => {
        if (!dateVal) return new Date();
        const d = new Date(dateVal);
        return isValid(d) ? d : new Date();
    };

    const mapSpecificRow = (row) => {
        // Find keys case-insensitively or by common fragments
        const findVal = (fragments) => {
            const entry = Object.entries(row).find(([k]) =>
                fragments.some(f => k.toLowerCase().includes(f.toLowerCase()))
            );
            return entry ? entry[1] : null;
        };

        const dateStr = findVal(["date of payment"]) || Object.values(row)[0]; // Fallback to first column
        const paymentDate = parseExcelDate(dateStr);

        const rentAmount = parseFloat(findVal(["amount"])?.toString().replace(/[^0-9.]/g, '') || 0);
        const billAmount = parseFloat(findVal(["bills"])?.toString().replace(/[^0-9.]/g, '') || 0);
        const tenant = findVal(["paid to"]) || "";
        const startDate = findVal(["start date"]);
        const endDate = findVal(["end date"]);

        const result = { rent: null, bill: null };

        if (rentAmount > 0) {
            result.rent = {
                type: "RENT",
                amount: rentAmount,
                date: paymentDate,
                startDate: startDate ? parseExcelDate(startDate) : null,
                endDate: endDate ? parseExcelDate(endDate) : null,
                tenant: tenant,
                notes: "Imported from Excel"
            };
        }

        if (billAmount > 0) {
            result.bill = {
                type: "BILL",
                amount: billAmount,
                date: paymentDate,
                tenant: tenant,
                notes: "Bill Imported from Excel"
            };
        }

        return result;
    };

    const handleImport = async () => {
        if (!file || !user || !selectedPropertyId) {
            if (!selectedPropertyId) setError("Please select a target property first.");
            return;
        }
        setImporting(true);
        setProgress(5);
        setError("");

        const targetProperty = properties.find(p => p.id === selectedPropertyId);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                const allTransactions = [];
                data.forEach(row => {
                    const { rent, bill } = mapSpecificRow(row);
                    if (rent) allTransactions.push(rent);
                    if (bill) allTransactions.push(bill);
                });

                if (allTransactions.length === 0) {
                    setError("No valid transactions found in the file.");
                    setImporting(false);
                    return;
                }

                const batchSize = 500;
                let processed = 0;

                for (let i = 0; i < allTransactions.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = allTransactions.slice(i, i + batchSize);

                    chunk.forEach(t => {
                        const docRef = doc(collection(db, "transactions"));
                        const dataToSave = {
                            uid: user.uid,
                            date: Timestamp.fromDate(t.date),
                            amount: t.amount,
                            type: t.type,
                            notes: t.notes,
                            propertyName: targetProperty?.name || "Unknown",
                            propertyId: selectedPropertyId,
                            tenant: t.tenant,
                            status: "PAID",
                            createdAt: Timestamp.now()
                        };

                        if (t.type === "RENT" && t.startDate && t.endDate) {
                            dataToSave.startDate = Timestamp.fromDate(t.startDate);
                            dataToSave.endDate = Timestamp.fromDate(t.endDate);
                            dataToSave.periodStart = format(t.startDate, "yyyy-MM-dd");
                            dataToSave.periodEnd = format(t.endDate, "yyyy-MM-dd");
                        }

                        batch.set(docRef, dataToSave);
                    });

                    await batch.commit();
                    processed += chunk.length;
                    setProgress(Math.round((processed / allTransactions.length) * 100));
                }

                setSuccessCount(processed);
                setImporting(false);
                setTimeout(() => {
                    onClose();
                    resetState();
                }, 2000);
            } catch (err) {
                console.error(err);
                setError("An error occurred during import.");
                setImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const resetState = () => {
        setFile(null);
        setSelectedPropertyId("");
        setPreviewData([]);
        setProgress(0);
        setSuccessCount(0);
        setError("");
    };

    const downloadTemplate = () => {
        const template = [
            { Date: "2026-01-01", Type: "Rent", Amount: 500, Property: "Sunshine Apts", Tenant: "John Doe", Notes: "Initial Payment" },
            { Date: "2026-01-05", Type: "Bill", Amount: 85.50, Property: "Sunshine Apts", Tenant: "John Doe", Notes: "Electricity" }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "RentTracker_Import_Template.xlsx");
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" />
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <DialogTitle as="h3" className="text-2xl font-black text-white uppercase tracking-tighter">
                                        Import Transactions
                                    </DialogTitle>
                                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                        <HiOutlineX className="text-2xl" />
                                    </button>
                                </div>

                                {successCount > 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <HiOutlineCheckCircle className="text-7xl text-success mb-4 animate-bounce" />
                                        <h4 className="text-xl font-bold text-white">Import Complete!</h4>
                                        <p className="text-slate-500 mt-2">Successfully migrated {successCount} records to your ledger.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-400">Upload your historical records.</p>
                                            <button
                                                onClick={downloadTemplate}
                                                className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest hover:text-brand-light transition-colors"
                                            >
                                                <HiOutlineDownload className="text-lg" /> Template
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Assign to Property</label>
                                            <select
                                                value={selectedPropertyId}
                                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm font-bold focus:border-brand/40 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="">Choose target Unit/Asset...</option>
                                                {properties.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="border-2 border-dashed border-slate-700 group-hover:border-brand/50 rounded-3xl p-10 flex flex-col items-center justify-center transition-all bg-slate-950/30">
                                                <HiOutlineUpload className="text-4xl text-slate-500 group-hover:text-brand mb-4" />
                                                <span className="text-slate-400 font-bold">{file ? file.name : "Drop file here or click to browse"}</span>
                                                <span className="text-[10px] text-slate-600 mt-2 tracking-widest uppercase">Excel or CSV files only</span>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger text-sm font-bold">
                                                <HiOutlineExclamation className="text-xl" /> {error}
                                            </div>
                                        )}

                                        {previewData.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Preview (First 5 records)</h4>
                                                <div className="overflow-hidden border border-slate-800 rounded-2xl">
                                                    <table className="w-full text-left text-[10px]">
                                                        <thead className="bg-slate-950/50 text-slate-500 border-b border-slate-800">
                                                            <tr>
                                                                <th className="px-4 py-3 font-black uppercase">Date</th>
                                                                <th className="px-4 py-3 font-black uppercase">Type</th>
                                                                <th className="px-4 py-3 font-black uppercase">Property</th>
                                                                <th className="px-4 py-3 font-black uppercase">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800/50">
                                                            {previewData.map((row, idx) => (
                                                                <tr key={idx} className="text-slate-300">
                                                                    <td className="px-4 py-2">{row.date ? format(row.date, "MMM dd, yyyy") : "N/A"}</td>
                                                                    <td className={`px-4 py-2 font-bold ${row.type === 'RENT' ? 'text-brand' : 'text-warning'}`}>{row.type}</td>
                                                                    <td className="px-4 py-2 truncate max-w-[120px]">
                                                                        {properties.find(p => p.id === selectedPropertyId)?.name || "—"}
                                                                    </td>
                                                                    <td className="px-4 py-2 font-black">${row.amount.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {importing && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                                                    <span>Migrating Records...</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-success transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 flex gap-4">
                                            <button
                                                onClick={onClose}
                                                className="flex-1 py-4 bg-slate-800 text-slate-300 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleImport}
                                                disabled={!file || importing}
                                                className="flex-2 px-12 py-4 bg-success text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-success/20"
                                            >
                                                {importing ? "Processing..." : "Start Import"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div >
            </Dialog >
        </Transition >
    );
}
