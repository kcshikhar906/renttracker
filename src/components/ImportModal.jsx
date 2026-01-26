import React, { useState, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { HiOutlineX, HiOutlineUpload, HiOutlineDownload, HiOutlineCheckCircle, HiOutlineExclamation } from "react-icons/hi";
import * as XLSX from 'xlsx';
import { db } from "../firebase";
import { writeBatch, collection, doc, Timestamp } from "firebase/firestore";
import { format, parseISO, isValid } from "date-fns";

export default function ImportModal({ isOpen, onClose, user, properties }) {
    const [file, setFile] = useState(null);
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
                const data = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });

                if (data.length === 0) {
                    setError("The selected file is empty.");
                    return;
                }

                // Map preview rows
                const preview = data.slice(0, 5).map(row => mapRow(row));
                setPreviewData(preview);
            } catch (err) {
                setError("Failed to parse file. Ensure it's a valid Excel or CSV.");
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const mapRow = (row) => {
        // Find keys case-insensitively
        const findKey = (keys) => {
            const entry = Object.entries(row).find(([k]) =>
                keys.some(key => k.toLowerCase().includes(key.toLowerCase()))
            );
            return entry ? entry[1] : null;
        };

        const rawDate = findKey(["date", "payment"]);
        const type = findKey(["type"])?.toUpperCase() || "RENT";
        const amount = parseFloat(findKey(["amount"])?.toString().replace(/[^0-9.]/g, '') || 0);
        const notes = findKey(["notes", "description"]) || "";
        const propertyName = findKey(["property"]) || "Unknown";
        const tenant = findKey(["tenant"]) || "";

        // Attempt to match property ID
        const matchedProperty = properties.find(p => p.name.toLowerCase() === propertyName.toLowerCase());

        return {
            date: rawDate,
            type: type === "BILL" ? "BILL" : "RENT",
            amount,
            notes,
            propertyName,
            propertyId: matchedProperty?.id || "",
            tenant
        };
    };

    const handleImport = async () => {
        if (!file || !user) return;
        setImporting(true);
        setProgress(10);
        setError("");

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                const batchSize = 500;
                let processed = 0;

                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = data.slice(i, i + batchSize);

                    chunk.forEach(rawRow => {
                        const mapped = mapRow(rawRow);
                        const docRef = doc(collection(db, "transactions"));

                        // Parse date properly
                        let finalDate;
                        if (mapped.date instanceof Date) {
                            finalDate = mapped.date;
                        } else if (typeof mapped.date === "string") {
                            const parsed = parseISO(mapped.date);
                            finalDate = isValid(parsed) ? parsed : new Date();
                        } else {
                            finalDate = new Date();
                        }

                        batch.set(docRef, {
                            uid: user.uid,
                            date: Timestamp.fromDate(finalDate),
                            amount: mapped.amount,
                            type: mapped.type,
                            notes: mapped.notes,
                            propertyName: mapped.propertyName,
                            propertyId: mapped.propertyId,
                            tenant: mapped.tenant,
                            status: "PAID", // Default for import
                            createdAt: Timestamp.now()
                        });
                    });

                    await batch.commit();
                    processed += chunk.length;
                    setProgress(Math.round((processed / data.length) * 100));
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
                                            <p className="text-sm text-slate-400">Upload your bank export or existing spreadsheet.</p>
                                            <button
                                                onClick={downloadTemplate}
                                                className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest hover:text-brand-light transition-colors"
                                            >
                                                <HiOutlineDownload className="text-lg" /> Download Template
                                            </button>
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
                                                                    <td className="px-4 py-2">{row.date || "N/A"}</td>
                                                                    <td className={`px-4 py-2 font-bold ${row.type === 'RENT' ? 'text-brand' : 'text-warning'}`}>{row.type}</td>
                                                                    <td className="px-4 py-2 truncate max-w-[120px]">{row.propertyName}</td>
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
                </div>
            </Dialog>
        </Transition>
    );
}
