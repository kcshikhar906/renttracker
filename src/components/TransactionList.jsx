import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { ExternalLink, Receipt, Calendar, Info, Clock, ArrowUpRight, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionList() {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "transactions"),
            where("uid", "==", currentUser.uid),
            orderBy("date", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(data);
            setLoading(false);
        }, (err) => {
            console.error("Firestore error:", err);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

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
        <div className="space-y-4">
            <AnimatePresence mode="popLayout">
                {transactions.map((t, index) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative overflow-hidden"
                    >
                        <div className="card !p-5 group-hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${t.type === "RENT" ? "bg-indigo-500/10 text-indigo-400" : "bg-purple-500/10 text-purple-400"
                                        }`}>
                                        {t.type === "RENT" ? <Home className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${t.type === "RENT" ? "bg-indigo-500/20 text-indigo-400" : "bg-purple-500/20 text-purple-400"
                                                }`}>
                                                {t.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {t.fileUrl ? (
                                        <a
                                            href={t.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 transition-all border border-slate-700/50"
                                            title="View Receipt"
                                        >
                                            <ArrowUpRight className="w-5 h-5" />
                                        </a>
                                    ) : (
                                        <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Clock className="w-5 h-5 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {t.notes && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50">
                                    <p className="text-sm text-slate-300 line-clamp-2 italic">"{t.notes}"</p>
                                </div>
                            )}
                        </div>

                        {/* Subtle accents */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === "RENT" ? "bg-indigo-500" : "bg-purple-500"
                            } opacity-40`}></div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
