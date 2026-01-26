import React, { useState } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Calendar, DollarSign, FileText, Upload, CheckCircle2, Loader2 } from "lucide-react";

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


            // Reset form
            setType("RENT");
            setDate(new Date().toISOString().split("T")[0]);
            setAmount("");
            setNotes("");
            setFile(null);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Error adding transaction:", err);
            alert("Failed to save transaction.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Toggle */}
                <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700">
                    <button
                        type="button"
                        onClick={() => setType("RENT")}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${type === "RENT"
                            ? "bg-indigo-600 text-white shadow-lg"
                            : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        RENT
                    </button>
                    <button
                        type="button"
                        onClick={() => setType("BILL")}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${type === "BILL"
                            ? "bg-purple-600 text-white shadow-lg"
                            : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        BILL
                    </button>
                </div>

                {/* Date */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="date"
                            required
                            className="input-field pl-12"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Amount</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="input-field pl-12"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Notes</label>
                    <div className="relative">
                        <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                        <textarea
                            className="input-field pl-12 resize-none h-24"
                            placeholder="What was this for?"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Proof (File) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Proof (Optional)</label>
                    <div className="group relative border-2 border-dashed border-slate-700 rounded-xl p-4 hover:border-indigo-500/50 transition-colors">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-indigo-500/10 transition-colors">
                                <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                            </div>
                            <span className="text-sm text-slate-400 group-hover:text-slate-300 truncate max-w-[200px]">
                                {file ? file.name : "Upload receipt / PDF"}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        "Save Transaction"
                    )}
                </button>
            </form>
        </div>
    );
}
