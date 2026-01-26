import React, { useState } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Calendar, DollarSign, FileText, Upload, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddTransactionForm() {
    const { currentUser } = useAuth();
    const [type, setType] = useState("RENT");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!currentUser) return;

        try {
            setLoading(true);
            let fileUrl = "";

            if (file) {
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const storageRef = ref(storage, `receipts/${currentUser.uid}/${fileName}`);
                const uploadResult = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadResult.ref);
            }

            const transactionData = {
                uid: currentUser.uid,
                type,
                date,
                amount: parseFloat(amount),
                notes,
                createdAt: serverTimestamp(),
            };

            if (fileUrl) {
                transactionData.fileUrl = fileUrl;
            }

            await addDoc(collection(db, "transactions"), transactionData);

            // Reset form fields
            setAmount("");
            setNotes("");
            setFile(null);
            // Optionally keep the date and type as is for multiple entries

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Error adding transaction:", err);
            alert("Failed to save transaction. " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card relative overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Toggle */}
                <div className="flex p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/50">
                    <button
                        type="button"
                        onClick={() => setType("RENT")}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${type === "RENT"
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                    >
                        RENT
                    </button>
                    <button
                        type="button"
                        onClick={() => setType("BILL")}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${type === "BILL"
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                    >
                        BILL
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="date"
                                required
                                className="input-field pl-11 py-3.5 text-sm"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="input-field pl-11 py-3.5 text-sm"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Optional Notes</label>
                    <div className="relative">
                        <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                        <textarea
                            className="input-field pl-11 resize-none h-24 pt-4 text-sm"
                            placeholder="Enter details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Proof (File) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Receipt / Proof</label>
                    <div className="group relative border-2 border-dashed border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04]">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <div className="p-3 bg-slate-800 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                                {file ? file.name : "Drop file or click to upload"}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="btn-primary w-full py-4 flex items-center justify-center gap-3 relative group"
                >
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Securing Transaction...</span>
                            </motion.div>
                        ) : success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 text-emerald-300"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Successfully Saved!</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="default"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <PlusCircle className="w-5 h-5" />
                                <span>Record Transaction</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </form>

            {/* Subtle progress indicator for loading */}
            {loading && (
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    className="absolute bottom-0 left-0 h-1 bg-indigo-500"
                />
            )}
        </div>
    );
}
