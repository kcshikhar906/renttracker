import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import TransactionDetailModal from "./TransactionDetailModal";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { HiOutlineSearch, HiOutlineFilter, HiOutlineCollection } from "react-icons/hi";

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Selection for Detail Modal
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

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

        // Sorting by date (Timestamp)
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
            const search = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.notes && t.notes.toLowerCase().includes(search)) ||
                (t.propertyName && t.propertyName.toLowerCase().includes(search)) ||
                (t.tenant && t.tenant.toLowerCase().includes(search)) ||
                (t.amount && t.amount.toString().includes(search))
            );
        }

        setFilteredTransactions(result);
    }, [transactions, filterType, searchQuery]);

    const handleSelect = (transaction) => {
        setSelectedTransaction(transaction);
        setIsDetailOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "transactions", id));
            setIsDetailOpen(false);
        } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete record.");
        }
    };

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand rounded-3xl shadow-xl shadow-brand/20">
                            <HiOutlineCollection className="text-3xl text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tighter">Audit Ledger</h2>
                            <p className="text-slate-500 font-medium text-sm">Full cryptographic record of rental settlements.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative group">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by property, tenant, notes..."
                                className="input-field pl-11 py-3.5 text-xs sm:w-80 group-focus-within:border-brand/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative">
                            <HiOutlineFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                                className="input-field pl-11 py-3.5 text-xs appearance-none pr-10 font-bold uppercase tracking-widest"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">All Flows</option>
                                <option value="RENT">Rent Settlements</option>
                                <option value="BILL">Utility Bills</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-slate-800/50 bg-slate-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Active Ledger</h3>
                        </div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-tighter bg-brand/10 border border-brand/20 px-4 py-1.5 rounded-full">
                            {filteredTransactions.length} Verified Entries
                        </span>
                    </div>

                    <div className="p-4 sm:p-8 overflow-x-auto">
                        <TransactionList
                            transactions={filteredTransactions}
                            loading={loading}
                            onSelect={handleSelect}
                        />
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <TransactionDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                transaction={selectedTransaction}
                onDelete={handleDelete}
            />
        </Layout>
    );
}
