import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { HiOutlineSearch, HiOutlineFilter } from "react-icons/hi";

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Filters
    const [filterType, setFilterType] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
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
            setTransactions(data);
            setLoading(false);
        }, (err) => {
            console.error("Firestore error:", err);
            setLoading(false);
        });

        return () => unsubscribeData();
    }, [user]);

    useEffect(() => {
        let result = [...transactions];

        if (filterType !== "ALL") {
            result = result.filter(t => t.type === filterType);
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.notes && t.notes.toLowerCase().includes(query)) ||
                (t.amount && t.amount.toString().includes(query))
            );
        }

        setFilteredTransactions(result);
    }, [transactions, filterType, searchQuery]);

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Transactions</h2>
                        <p className="text-slate-500 mt-1">Full audit log of your rental environment.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                className="input-field pl-11 py-2.5 text-sm sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative">
                            <HiOutlineFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                                className="input-field pl-11 py-2.5 text-sm appearance-none pr-10"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">All Categories</option>
                                <option value="RENT">Rent Only</option>
                                <option value="BILL">Bills Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="stats-card p-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                        <h3 className="font-bold text-slate-100 uppercase tracking-widest text-xs">Full Ledger</h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                            {filteredTransactions.length} Total Records
                        </span>
                    </div>
                    <div className="p-6">
                        <TransactionList transactions={filteredTransactions} loading={loading} />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
