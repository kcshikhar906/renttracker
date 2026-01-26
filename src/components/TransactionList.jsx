import React from "react";
import { db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import {
    HiOutlineTrash,
    HiOutlineExternalLink,
    HiOutlineCollection,
    HiOutlineInbox,
    HiOutlineArchive
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionList({ transactions, loading }) {

    async function handleDelete(id) {
        if (window.confirm("Are you sure you want to delete this record? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "transactions", id));
            } catch (err) {
                console.error("Deletion failed:", err);
            }
        }
    }

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-slate-800 border-t-brand rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Updating Ledger</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-3xl py-20 flex flex-col items-center text-center">
                <HiOutlineArchive className="text-5xl text-slate-700 mb-4" />
                <h4 className="text-lg font-bold text-slate-300">No records found</h4>
                <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                    Your transaction ledger is currently empty. Start by adding a new record.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop View: Table */}
            <div className="hidden lg:block overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-800">
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Notes</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-success"></span>
                                        <span className="text-xs font-medium text-slate-400">Settled</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${t.type === "RENT" ? "bg-brand/10 text-brand border border-brand/20" : "bg-warning/10 text-warning border border-warning/20"
                                        }`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate italic">
                                    {t.notes || "—"}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-200">
                                    ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {t.fileUrl && (
                                            <a
                                                href={t.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-500 hover:text-brand transition-colors bg-slate-950 rounded-lg border border-slate-800 hover:border-brand/40"
                                                title="View Receipt"
                                            >
                                                <HiOutlineExternalLink className="text-lg" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 text-slate-500 hover:text-danger transition-colors bg-slate-950 rounded-lg border border-slate-800 hover:border-danger/40"
                                            title="Delete Record"
                                        >
                                            <HiOutlineTrash className="text-lg" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile/Tablet View: Cards */}
            <div className="lg:hidden space-y-4">
                {transactions.map((t) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="stats-card relative overflow-hidden"
                    >
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${t.type === "RENT" ? "bg-brand" : "bg-warning"}`}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${t.type === "RENT" ? "text-brand" : "text-warning"}`}>
                                    {t.type}
                                </span>
                                <span className="text-lg font-bold text-slate-100 italic">
                                    {new Date(t.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-white leading-none">
                                    ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-2 mt-2 justify-end">
                                    {t.fileUrl && (
                                        <a href={t.fileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 active:text-brand">
                                            <HiOutlineExternalLink className="text-xl" />
                                        </a>
                                    )}
                                    <button onClick={() => handleDelete(t.id)} className="text-slate-500 active:text-danger">
                                        <HiOutlineTrash className="text-xl" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {t.notes && (
                            <p className="text-xs text-slate-500 italic mt-2 line-clamp-2 border-t border-slate-800 pt-3">
                                "{t.notes}"
                            </p>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
