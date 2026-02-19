import React, { useState, useEffect } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogBackdrop, DialogTitle } from "@headlessui/react";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { HiOutlineArchive, HiOutlineX, HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock } from "react-icons/hi";
import { db } from "../firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc
} from "firebase/firestore";
import { format } from "date-fns";

export default function PropertyArchiveModal({ isOpen, onClose, property, properties, currentUser, onComplete }) {
    const [step, setStep] = useState("validating"); // validating, list_debts, set_date, error
    const [debts, setDebts] = useState([]);
    const [moveOutDate, setMoveOutDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && property) {
            validateArchive();
        } else {
            setStep("validating");
            setDebts([]);
            setError("");
        }
    }, [isOpen, property]);

    async function validateArchive() {
        try {
            setError("");

            // 1. Check for other active properties
            const otherActive = properties.filter(p => p.id !== property.id && p.status !== 'ARCHIVED');
            if (otherActive.length === 0) {
                setError("PORTFOLIO_CONTINUITY_ERROR");
                setStep("error");
                return;
            }

            // 2. Check for outstanding debts
            const q = query(
                collection(db, "users", currentUser.uid, "transactions"),
                where("propertyId", "==", property.id),
                where("status", "in", ["DUE", "OVERDUE"])
            );

            const snap = await getDocs(q);
            const unpaid = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (unpaid.length > 0) {
                setDebts(unpaid);
                setStep("list_debts");
            } else {
                setStep("set_date");
            }
        } catch (err) {
            console.error("Validation error:", err);
            setError("SYSTEM_ERROR");
            setStep("error");
        }
    }

    async function handleConfirm() {
        try {
            setLoading(true);
            await updateDoc(doc(db, "users", currentUser.uid, "properties", property.id), {
                status: 'ARCHIVED',
                moveOutDate: moveOutDate,
                archivedAt: new Date().toISOString()
            });
            onComplete();
            onClose();
        } catch (err) {
            console.error("Archive failed:", err);
            alert("Failed to archive property.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <DialogBackdrop className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
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
                            <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                                            <HiOutlineArchive />
                                        </div>
                                        Asset Retirement Audit
                                    </DialogTitle>
                                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                                        <HiOutlineX className="text-xl" />
                                    </button>
                                </div>

                                {step === "validating" && (
                                    <div className="py-12 flex flex-col items-center gap-4 text-center">
                                        <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin"></div>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Performing Financial Audit...</p>
                                    </div>
                                )}

                                {step === "error" && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4">
                                            <HiOutlineExclamationCircle className="text-2xl text-red-500 flex-shrink-0" />
                                            <div>
                                                <h4 className="text-red-500 font-black uppercase tracking-tight">Validation Failed</h4>
                                                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                                    {error === "PORTFOLIO_CONTINUITY_ERROR"
                                                        ? "You must have at least one other Active property before archiving this one. Register your new residence in Settings first."
                                                        : "An unexpected system error occurred during the audit. Please try again later."}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={onClose} className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">Close Audit Window</button>
                                    </div>
                                )}

                                {step === "list_debts" && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-start gap-4">
                                            <HiOutlineExclamation className="text-2xl text-amber-500 flex-shrink-0" />
                                            <div>
                                                <h4 className="text-amber-500 font-black uppercase tracking-tight">Outstanding Debts Detected</h4>
                                                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                                    The following transactions are marked as DUE or OVERDUE. Please settle these records before closing this asset account.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 rounded-[2rem] border border-slate-800 overflow-hidden max-h-[200px] overflow-y-auto">
                                            {debts.map(d => (
                                                <div key={d.id} className="p-4 border-b border-slate-800 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${d.type === 'RENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-warning/10 text-warning'}`}>
                                                            <HiOutlineClock className="text-xs" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{d.type === 'RENT' ? 'Rental Period' : (d.utilityType || 'Utility')}</p>
                                                            <p className="text-[9px] text-slate-500 font-bold">{format(d.date?.toDate ? d.date.toDate() : new Date(d.date), "MMM dd, yyyy")}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-white">${d.amount}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-4">
                                            <button onClick={onClose} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl">Back to Ledger</button>
                                            <button
                                                onClick={() => setStep("set_date")}
                                                className="flex-1 py-4 bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl"
                                            >
                                                Ignore & Proceed
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === "set_date" && (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
                                                <HiOutlineCheckCircle className="text-2xl text-emerald-500" />
                                                <p className="text-xs text-emerald-500 font-bold uppercase tracking-tight">Audit Passed: Ready for Archive</p>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Final Move-Out Date</label>
                                                <div className="relative group">
                                                    <HiOutlineClock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                                                    <input
                                                        type="date"
                                                        className="input-field pl-12"
                                                        value={moveOutDate}
                                                        onChange={(e) => setMoveOutDate(e.target.value)}
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-bold italic pl-1">This will be the official "Retirement" date for {property?.name}.</p>
                                            </div>
                                        </div>

                                        <button
                                            disabled={loading}
                                            onClick={handleConfirm}
                                            className="w-full py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                                        >
                                            {loading ? "Finalizing Audit..." : "Seal Archive Ledger"}
                                        </button>
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
