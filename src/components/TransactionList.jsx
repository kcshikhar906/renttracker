import React from "react";
import { db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { Receipt, Calendar, Info, Trash2, ExternalLink, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionList({ transactions, loading }) {

    async function handleDelete(id) {
        if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "transactions", id));
            } catch (err) {
                console.error("Error deleting document: ", err);
                alert("Failed to delete transaction.");
            }
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Loading history...</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="card text-center py-16">
                <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
                    <Info className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-slate-400 max-w-xs mx-auto">
                    Add your first rent or bill payment to keep track of your expenses.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-8">
            <AnimatePresence mode="popLayout">
                {transactions.map((t, index) => {
                    const isRent = t.type === "RENT";
                    return (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="group relative"
                        >
                            <div className="card !p-5 group-hover:bg-white/5 transition-all duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${isRent ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"
                                            }`}>
                                            {isRent ? <Home className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xl text-white">
                                                    ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isRent ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"
                                                    }`}>
                                                    {t.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:self-center">
                                        {t.fileUrl && (
                                            <a
                                                href={t.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-all border border-slate-700/50"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                View Proof
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all duration-200 border border-red-500/20"
                                            title="Delete Transaction"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {t.notes && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-sm text-slate-400 italic">"{t.notes}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Accent Line */}
                            <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${isRent ? "bg-emerald-500" : "bg-orange-500"
                                } opacity-60`}></div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
