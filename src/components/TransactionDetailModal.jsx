import React from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogBackdrop, DialogTitle } from "@headlessui/react";
import { Fragment } from "react";
import {
    HiOutlineX,
    HiOutlineTrash,
    HiOutlineOfficeBuilding,
    HiOutlineUserCircle,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlineDocumentText,
    HiOutlineClock
} from "react-icons/hi";
import { format, isValid, parseISO } from "date-fns";

export default function TransactionDetailModal({ isOpen, onClose, transaction, onDelete }) {
    if (!transaction) return null;

    const safeFormat = (dateStr, formatStr) => {
        if (!dateStr) return "N/A";
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr.toDate();
        return isValid(date) ? format(date, formatStr) : "Invalid Date";
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <DialogBackdrop transition className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-300" />

                <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-12 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-12 scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl transition-all w-full max-w-3xl border border-slate-800/50">
                                <div className="bg-slate-900 px-6 pt-10 pb-8 sm:p-12">
                                    <div className="flex items-center justify-between mb-8">
                                        <DialogTitle as="h3" className="text-2xl font-black text-white tracking-tight flex items-center gap-4">
                                            Transaction Details
                                        </DialogTitle>
                                        <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-850 p-3 rounded-2xl transition-all active:scale-90">
                                            <HiOutlineX className="text-xl" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left Side: Info */}
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineOfficeBuilding /> Property
                                                    </label>
                                                    <p className="text-lg font-bold text-slate-100">{transaction.propertyName}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineUserCircle /> Paid By
                                                    </label>
                                                    <p className="text-lg font-bold text-slate-100">{transaction.tenant || "N/A"}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineCurrencyDollar /> Amount
                                                    </label>
                                                    <p className="text-2xl font-black text-success">
                                                        ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineCalendar /> Settlement Date
                                                    </label>
                                                    <p className="text-lg font-bold text-slate-100">{safeFormat(transaction.date, "MMM dd, yyyy")}</p>
                                                </div>
                                            </div>

                                            {transaction.type === "RENT" && (
                                                <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 space-y-4">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
                                                        <HiOutlineClock /> Coverage Period
                                                    </label>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-center flex-1">
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase">From</p>
                                                            <p className="text-sm font-bold text-white">{safeFormat(transaction.periodStart, "MMM dd, yyyy")}</p>
                                                        </div>
                                                        <div className="h-4 w-px bg-slate-800 mx-4"></div>
                                                        <div className="text-center flex-1">
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase">To</p>
                                                            <p className="text-sm font-bold text-white">{safeFormat(transaction.periodEnd, "MMM dd, yyyy")}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <HiOutlineDocumentText /> Notes
                                                </label>
                                                <p className="text-sm text-slate-400 italic leading-relaxed">
                                                    {transaction.notes || "No additional comments provided."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side: Receipt */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                                                Documentation / Proof
                                            </label>
                                            <div className="bg-slate-950 rounded-[2rem] border border-slate-800 overflow-hidden flex items-center justify-center min-h-[300px] relative group">
                                                {transaction.fileUrl ? (
                                                    <img
                                                        src={transaction.fileUrl}
                                                        alt="Receipt"
                                                        className="w-full h-full max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="text-center p-8">
                                                        <HiOutlineDocumentText className="text-5xl text-slate-800 mx-auto mb-4" />
                                                        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">No Document Attached</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 flex items-center gap-4 pt-8 border-t border-slate-800">
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Delete this transaction permanently?")) {
                                                    onDelete(transaction.id);
                                                    onClose();
                                                }
                                            }}
                                            className="flex items-center gap-2 px-6 py-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-danger hover:text-white transition-all"
                                        >
                                            <HiOutlineTrash className="text-lg" />
                                            Delete Entry
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                                        >
                                            Close Details
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
