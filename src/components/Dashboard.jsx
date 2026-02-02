import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import ExpenseCharts from "./ExpenseCharts";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";
import { HiOutlineTrendingUp, HiOutlineCreditCard, HiOutlineLightningBolt, HiOutlineCalendar } from "react-icons/hi";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { format, addDays, parseISO } from "date-fns";

const StatCard = ({ title, amount, icon: Icon, colorClass, children }) => (
    <div className="stats-card">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${colorClass}`}>
                <Icon className="text-xl" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-100 mt-1">
            {typeof amount === 'number'
                ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : amount}
        </h3>
        {children}
    </div>
);

export default function Dashboard() {
    const [transactions, setTransactions] = useState([]);
    const [properties, setProperties] = useState([]);
    const [totals, setTotals] = useState({ rent: 0, bills: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Delete states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

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
            const allDocs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter out soft-deleted items on the client side
            const data = allDocs.filter(t => t.isDeleted !== true);

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

        // Fetch Properties
        const qProps = query(collection(db, "properties"), where("uid", "==", user.uid));
        const unsubscribeProps = onSnapshot(qProps, (snapshot) => {
            setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeData();
            unsubscribeProps();
        };
    }, [user]);

    const handleDelete = (transaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!transactionToDelete) return;
        try {
            await updateDoc(doc(db, "transactions", transactionToDelete.id), {
                isDeleted: true
            });
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        } catch (err) {
            console.error("Soft delete failed:", err);
            alert("Failed to move records to trash.");
        }
    };

    const getNextRentDue = () => {
        const rentTx = transactions.filter(t => t.type === "RENT").sort((a, b) => {
            const dateA = a.endDate?.toDate ? a.endDate.toDate() : (a.endDate ? parseISO(a.endDate) : new Date(0));
            const dateB = b.endDate?.toDate ? b.endDate.toDate() : (b.endDate ? parseISO(b.endDate) : new Date(0));
            return dateB - dateA;
        })[0];

        if (!rentTx) return null;

        const lastEndDate = rentTx.endDate?.toDate ? rentTx.endDate.toDate() : (typeof rentTx.endDate === 'string' ? parseISO(rentTx.endDate) : null);
        if (!lastEndDate) return null;

        const nextDate = addDays(lastEndDate, 1);

        return {
            date: nextDate,
            propertyName: rentTx.propertyName || "Property"
        };
    };

    const addToCalendar = () => {
        const nextDue = getNextRentDue();
        if (!nextDue) return;

        const title = `Pay Rent: ${nextDue.propertyName}`;
        const startDate = format(nextDue.date, "yyyyMMdd");
        const details = `Rent due for period starting ${format(nextDue.date, "MMM dd, yyyy")}.`;

        // Google Calendar URL
        const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${startDate}&details=${encodeURIComponent(details)}&sf=true&output=xml`;

        window.open(gCalUrl, '_blank');
    };

    const nextDueInfo = getNextRentDue();
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
                    <StatCard
                        title="Next Rent Due"
                        amount={nextDueInfo ? format(nextDueInfo.date, "MMM dd") : "No Due Date"}
                        icon={HiOutlineCalendar}
                        colorClass="text-brand"
                    >
                        {nextDueInfo && (
                            <button
                                onClick={addToCalendar}
                                className="mt-4 w-full py-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-brand/50 transition-all flex items-center justify-center gap-2"
                            >
                                <HiOutlineCalendar className="text-lg" />
                                Add to Calendar
                            </button>
                        )}
                    </StatCard>
                </div>

                {/* Visual Analytics */}
                <ExpenseCharts transactions={transactions} />

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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                transaction={transactionToDelete}
            />
        </Layout>
    );
}
