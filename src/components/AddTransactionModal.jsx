import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    HiOutlineX,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlineDocumentText,
    HiOutlineUpload,
    HiOutlineCheckCircle
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function AddTransactionModal({ isOpen, onClose }) {
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

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setAmount("");
                setNotes("");
                setFile(null);
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Error adding transaction:", err);
            alert("Failed to save transaction.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className="inline-block align-bottom bg-slate-900 rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-800">
                            <div className="bg-slate-900 px-6 pt-6 pb-4 sm:p-8 sm:pb-4">
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-100">
                                        Add Transaction
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                        <HiOutlineX className="text-2xl" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Type Selector */}
                                    <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800/50">
                                        <button
                                            type="button"
                                            onClick={() => setType("RENT")}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${type === "RENT" ? "bg-brand text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                                }`}
                                        >
                                            RENT
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType("BILL")}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${type === "BILL" ? "bg-warning text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                                }`}
                                        >
                                            BILL
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Date</label>
                                            <div className="relative">
                                                <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                <input
                                                    type="date"
                                                    required
                                                    className="input-field pl-12"
                                                    value={date}
                                                    onChange={(e) => setDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Amount</label>
                                            <div className="relative">
                                                <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    placeholder="0.00"
                                                    className="input-field pl-12"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Notes</label>
                                        <div className="relative">
                                            <HiOutlineDocumentText className="absolute left-4 top-4 text-slate-500 text-lg" />
                                            <textarea
                                                placeholder="What was this for?"
                                                className="input-field pl-12 h-24 resize-none pt-4"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Attachment</label>
                                        <div className="group relative border-2 border-dashed border-slate-800 rounded-2xl p-6 hover:border-brand/40 transition-all bg-slate-950/50">
                                            <input
                                                type="file"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={(e) => setFile(e.target.files[0])}
                                            />
                                            <div className="flex flex-col items-center gap-2">
                                                <HiOutlineUpload className="text-2xl text-slate-600 group-hover:text-brand transition-colors" />
                                                <span className="text-xs text-slate-500 group-hover:text-slate-300 truncate max-w-full">
                                                    {file ? file.name : "Upload receipt / proof"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            disabled={loading || success}
                                            type="submit"
                                            className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            ) : success ? (
                                                <div className="flex items-center gap-2">
                                                    <HiOutlineCheckCircle className="text-xl" />
                                                    Saved Successfully
                                                </div>
                                            ) : (
                                                "Confirm Transaction"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
