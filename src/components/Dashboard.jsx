import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";
import { HiOutlineTrendingUp, HiOutlineCreditCard, HiOutlineLightningBolt } from "react-icons/hi";

const StatCard = ({ title, amount, icon: Icon, colorClass }) => (
    <div className="stats-card">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${colorClass}`}>
                <Icon className="text-xl" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-100 mt-1">
            ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
    </div>
);

export default function Dashboard() {
    const [transactions, setTransactions] = useState([]);
    const [totals, setTotals] = useState({ rent: 0, bills: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Critical Fix: Only fetch data once user is authenticated
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "transactions"),
            where("uid", "==", user.uid),
            orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
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
            console.error("Firestore error:", err);
            setLoading(false);
        });

        return () => unsubscribeData();
    }, [user]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            await deleteDoc(doc(db, "transactions", id));
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete record.");
        }
    };

    if (loading && !user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse text-sm uppercase tracking-widest">Initializing Session</p>
                </div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Overview</h2>
                        <p className="text-slate-500 mt-1">Snapshot of your spending and rental obligations.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                        Real-time Monitoring
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <StatCard
                        title="Total Rent Paid"
                        amount={totals.rent}
                        icon={HiOutlineTrendingUp}
                        colorClass="text-brand"
                    />
                    <StatCard
                        title="Total Bills Paid"
                        amount={totals.bills}
                        icon={HiOutlineCreditCard}
                        colorClass="text-warning"
                    />
                    <StatCard
                        title="Combined Expenses"
                        amount={totals.rent + totals.bills}
                        icon={HiOutlineLightningBolt}
                        colorClass="text-success"
                    />
                </div>

                {/* Recent Transactions */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-100">Transaction History</h3>
                    </div>
                    <TransactionList
                        transactions={transactions}
                        loading={loading}
                        onDelete={handleDelete}
                    />
                </section>
            </div>
        </Layout>
    );
}
