import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import AddTransactionForm from "./AddTransactionForm";
import TransactionList from "./TransactionList";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { TrendingUp, CreditCard, Wallet } from "lucide-react";

const SummaryCard = ({ title, amount, type, icon: Icon }) => {
    const isRent = type === "RENT";
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card relative overflow-hidden flex flex-col justify-between group h-full`}
        >
            <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon size={80} />
            </div>
            <div>
                <p className="text-slate-400 font-medium mb-1">{title}</p>
                <h3 className={`text-4xl font-bold tracking-tight ${isRent ? "text-emerald-400" : "text-orange-400"}`}>
                    ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRent ? "bg-emerald-500" : "bg-orange-500"} animate-pulse`}></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Balance</span>
            </div>

            {/* Visual background gradient accent */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isRent ? "from-emerald-500/5 to-transparent" : "from-orange-500/5 to-transparent"} pointer-events-none`}></div>
        </motion.div>
    );
};

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [totals, setTotals] = useState({ rent: 0, bills: 0 });
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

            const rentTotal = data
                .filter(t => t.type === "RENT")
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            const billsTotal = data
                .filter(t => t.type === "BILL")
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            setTransactions(data);
            setTotals({ rent: rentTotal, bills: billsTotal });
            setLoading(false);
        }, (err) => {
            console.error("Dashboard data fetch error:", err);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                {/* Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <SummaryCard
                        title="Total Rent Paid"
                        amount={totals.rent}
                        type="RENT"
                        icon={TrendingUp}
                    />
                    <SummaryCard
                        title="Total Bills Paid"
                        amount={totals.bills}
                        type="BILL"
                        icon={CreditCard}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column - Add Transaction */}
                    <div className="lg:col-span-12 xl:col-span-5 order-2 xl:order-1">
                        <div className="xl:sticky xl:top-28">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-indigo-500 rounded-full"></span>
                                New Transaction
                            </h2>
                            <AddTransactionForm />
                        </div>
                    </div>

                    {/* Right Column - History */}
                    <div className="lg:col-span-12 xl:col-span-7 order-1 xl:order-2">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-purple-500 rounded-full"></span>
                            Recent History
                        </h2>
                        <div className="max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                            <TransactionList transactions={transactions} loading={loading} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
