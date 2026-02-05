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
import { format, isValid, parseISO, differenceInDays } from "date-fns";

export default function TransactionDetailModal({ isOpen, onClose, transaction, onDelete }) {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    if (!transaction) return null;

    const safeFormat = (dateStr, formatStr) => {
        if (!dateStr) return "N/A";
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr.toDate();
        return isValid(date) ? format(date, formatStr) : "Invalid Date";
    };

    const getDurationMetrics = () => {
        if (!transaction.periodStart || !transaction.periodEnd) return null;

        const start = typeof transaction.periodStart === 'string' ? parseISO(transaction.periodStart) : transaction.periodStart.toDate();
        const end = typeof transaction.periodEnd === 'string' ? parseISO(transaction.periodEnd) : transaction.periodEnd.toDate();

        if (!isValid(start) || !isValid(end)) return null;

        // adding 1 because the range is inclusive
        const totalDays = differenceInDays(end, start) + 1;
        const weeks = Math.floor(totalDays / 7);
        const remainingDays = totalDays % 7;

        return {
            totalDays,
            weeks,
            remainingDays,
            displayText: `${weeks > 0 ? `${weeks} Week${weeks > 1 ? 's' : ''}` : ''}${weeks > 0 && remainingDays > 0 ? ' & ' : ''}${remainingDays > 0 ? `${remainingDays} Day${remainingDays > 1 ? 's' : ''}` : ''}`
        };
    };

    const metrics = getDurationMetrics();

    return (
        <>
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
                                <DialogPanel className="relative transform overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl transition-all w-full max-w-4xl border border-slate-800/50">
                                    <div className="bg-slate-900 px-5 py-8 sm:p-12">
                                        <div className="flex items-center justify-between mb-8">
                                            <DialogTitle as="h3" className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-4">
                                                Transaction Statement
                                            </DialogTitle>
                                            <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-850 p-3 rounded-2xl transition-all active:scale-90">
                                                <HiOutlineX className="text-xl" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            {/* Left Side: Info */}
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <HiOutlineOfficeBuilding className="text-brand" /> Asset Property
                                                        </label>
                                                        <p className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">{transaction.propertyName}</p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <HiOutlineUserCircle className="text-brand" /> Resident / Tenant
                                                        </label>
                                                        <p className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">{transaction.tenant || "System Record"}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <HiOutlineCurrencyDollar className="text-brand" /> Total Amount
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <p className={`text-2xl sm:text-3xl font-black ${transaction.status === 'PAID' ? 'text-success' : 'text-danger'}`}>
                                                                <span className="text-lg mr-0.5">$</span>
                                                                {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </p>
                                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${transaction.status === 'PAID' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger animate-pulse'}`}>
                                                                {transaction.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <HiOutlineCalendar className="text-brand" /> Filing Date
                                                        </label>
                                                        <p className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">{safeFormat(transaction.date, "MMMM dd, yyyy")}</p>
                                                    </div>
                                                </div>

                                                {transaction.type === "RENT" && (
                                                    <div className="bg-slate-950/50 rounded-[2rem] p-8 border border-slate-800 space-y-6 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
                                                            <HiOutlineClock className="text-7xl text-brand" />
                                                        </div>
                                                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Period Start</p>
                                                                <p className="text-lg font-bold text-white">{safeFormat(transaction.periodStart, "MMM dd, yyyy")}</p>
                                                            </div>
                                                            <div className="hidden sm:block">
                                                                <div className="w-12 h-px bg-slate-800 group-hover:bg-brand/30 transition-colors"></div>
                                                            </div>
                                                            <div className="space-y-1 text-left sm:text-right">
                                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Period End</p>
                                                                <p className="text-lg font-bold text-white">{safeFormat(transaction.periodEnd, "MMM dd, yyyy")}</p>
                                                            </div>
                                                        </div>

                                                        {metrics && (
                                                            <div className="pt-6 border-t border-slate-800/50 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-brand/10 rounded-lg">
                                                                        <HiOutlineClock className="text-brand" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Duration</p>
                                                                        <p className="text-sm font-black text-white">{metrics.displayText}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="px-4 py-1.5 bg-slate-900 rounded-full border border-slate-800">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                        {metrics.totalDays} Total Days
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {transaction.type === "BILL" && (
                                                    <div className="bg-slate-950/50 rounded-[2rem] p-8 border border-warning/20 space-y-6 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                                            <HiOutlineCurrencyDollar className="text-7xl text-warning" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Utility Classification</p>
                                                            <h4 className="text-2xl font-black text-warning tracking-tight">
                                                                {transaction.utilityType || "UTILITY BILL"}
                                                            </h4>
                                                            <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Validated Invoice Record</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineDocumentText className="text-brand" /> Filing Notes
                                                    </label>
                                                    <div className="bg-slate-950/30 rounded-2xl p-6 border border-slate-800/50">
                                                        <p className="text-sm text-slate-400 italic leading-relaxed">
                                                            {transaction.notes || "No additional audit notes provided for this settlement."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Side: Receipt */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                                                    Legal Documentation / Proof
                                                </label>
                                                <div
                                                    onClick={() => transaction.fileUrl && setIsFullscreen(true)}
                                                    className={`bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden flex items-center justify-center min-h-[400px] relative group cursor-zoom-in transition-all active:scale-[0.99]`}
                                                >
                                                    {transaction.fileUrl ? (
                                                        <>
                                                            <img
                                                                src={transaction.fileUrl}
                                                                alt="Receipt"
                                                                className="w-full h-full max-h-[500px] object-contain transition-transform duration-700 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-white font-bold text-xs uppercase tracking-widest">
                                                                    Click to Expand Full-Window
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-12">
                                                            <HiOutlineDocumentText className="text-6xl text-slate-800 mx-auto mb-6" />
                                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">No Verified Document</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                                        Cryptographic Proof ID: {transaction.id.slice(0, 12)}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                                        Record Created: {safeFormat(transaction.createdAt, "MMM dd, yyyy @ hh:mm a")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-slate-800">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("ARE YOU SURE? THIS WILL PERMANENTLY ERASE THE RECORD.")) {
                                                        onDelete(transaction);
                                                        onClose();
                                                    }
                                                }}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-5 bg-danger/5 text-danger border border-danger/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-danger hover:text-white transition-all shadow-lg active:scale-95"
                                            >
                                                <HiOutlineTrash className="text-lg" />
                                                Erase Record
                                            </button>
                                            <button
                                                onClick={onClose}
                                                className="w-full sm:flex-1 py-5 bg-slate-800 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                                            >
                                                Return to Ledger
                                            </button>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Full Window Preview Overlay */}
            <Transition show={isFullscreen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsFullscreen(false)}>
                    <TransitionChild
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4">
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="absolute top-8 right-8 z-[110] bg-white/10 hover:bg-white/20 p-4 rounded-full text-white backdrop-blur-xl transition-all active:scale-90"
                            >
                                <HiOutlineX className="text-2xl" />
                            </button>
                            <img
                                src={transaction.fileUrl}
                                alt="Full Receipt"
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            />
                        </div>
                    </TransitionChild>
                </Dialog>
            </Transition>
        </>
    );
}
