import React, { useEffect, useState, useMemo } from "react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import ExpenseCharts from "./ExpenseCharts";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    setDoc,
    getDoc,
    getDocs,
    limit,
    serverTimestamp
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
    HiOutlineTrendingUp,
    HiOutlineCreditCard,
    HiOutlineLightningBolt,
    HiOutlineCalendar,
    HiOutlineShieldCheck,
    HiOutlineBell,
    HiOutlineArrowRight
} from "react-icons/hi";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { format, addDays, parseISO, isSameMonth, startOfMonth, endOfMonth } from "date-fns";

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

    // System setup states
    const [needsSetup, setNeedsSetup] = useState(false);
    const [isProcessingSetup, setIsProcessingSetup] = useState(false);

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
            collection(db, "users", user.uid, "transactions"),
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
        });

        // Fetch Properties
        const qProps = query(collection(db, "users", user.uid, "properties"));
        const unsubscribeProps = onSnapshot(qProps, (snapshot) => {
            setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
            console.error("Properties error:", err);
        });

        // Check for System Ownership
        const checkSetup = async () => {
            try {
                const whitelistSnap = await getDocs(query(collection(db, "whitelists"), limit(1)));
                if (whitelistSnap.empty) {
                    setNeedsSetup(true);
                }
            } catch (err) {
                console.log("Whitelist check skipped (restricted).");
            }
        };
        checkSetup();

        return () => {
            unsubscribeData();
            unsubscribeProps();
        };
    }, [user]);

    const handleDelete = (transaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteModalOpen(true);
    };

    const handleSystemSetup = async () => {
        if (!user) return;
        try {
            setIsProcessingSetup(true);
            const userEmail = user.email.toLowerCase();

            // 1. First, establish the user as an Admin in the 'users' collection
            await setDoc(doc(db, "users", user.uid), {
                email: userEmail,
                role: "admin",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // 2. Then, provision them in the 'whitelists' to authorized future access
            await setDoc(doc(db, "whitelists", userEmail), {
                role: "admin",
                invitedBy: "system",
                invitedAt: serverTimestamp()
            });

            setNeedsSetup(false);
            alert("System Initialized! You now have Administrative privileges.");
            // Force a reload of the profile in local state if needed (snapshot will handle it)
        } catch (err) {
            console.error("Setup sequence failed:", err);
            alert("Setup failed: " + (err.message || "Permission restricted. Check rules."));
        } finally {
            setIsProcessingSetup(false);
        }
    };

    const confirmDelete = async () => {
        if (!transactionToDelete) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "transactions", transactionToDelete.id), {
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

    // Calculate Monthly Forecast (Current Month Burn)
    const monthlyForecast = useMemo(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        const thisMonthTotal = transactions
            .filter(t => {
                const d = t.date?.toDate ? t.date.toDate() : (typeof t.date === 'string' ? parseISO(t.date) : new Date(0));
                return isSameMonth(d, now);
            })
            .reduce((acc, t) => acc + (t.amount || 0), 0);

        // Expected additional rent for the month
        const pendingRent = properties.reduce((acc, p) => {
            const rate = p.rentAmount || 0;
            // Simplified logic: assume weekly payments
            // In a real app, we'd check if a payment covers the rest of the month
            return acc + 0; // Placeholder for more complex logic
        }, 0);

        return thisMonthTotal;
    }, [transactions, properties]);

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
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                {needsSetup && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-brand/10 border border-brand/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-brand text-white rounded-3xl animate-bounce">
                                <HiOutlineShieldCheck className="text-2xl" />
                            </div>
                            <div>
                                <h4 className="text-white font-black uppercase tracking-tight">System Ownership Unclaimed</h4>
                                <p className="text-xs text-slate-500 font-medium">Claim administrator rights to manage guest lists and team access.</p>
                            </div>
                        </div>
                        <button
                            disabled={isProcessingSetup}
                            onClick={handleSystemSetup}
                            className="btn-primary py-4 px-10 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl shadow-brand/20"
                        >
                            {isProcessingSetup ? "Initializing..." : "Claim Admin Rights"}
                        </button>
                    </motion.div>
                )}

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

                {/* High Visibility Quick Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nextDueInfo ? (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative overflow-hidden bg-brand/10 border border-brand/20 p-6 rounded-[2.5rem] flex items-center justify-between group"
                        >
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="p-4 bg-brand text-white rounded-3xl shadow-xl shadow-brand/30 group-hover:scale-110 transition-transform">
                                    <HiOutlineBell className="text-2xl" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">Next Payment Due</p>
                                    <h4 className="text-2xl font-black text-white">{format(nextDueInfo.date, "EEEE, MMM dd")}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span> {nextDueInfo.propertyName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={addToCalendar}
                                className="relative z-10 p-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-brand/40 rounded-2xl transition-all"
                                title="Add to Calendar"
                            >
                                <HiOutlineCalendar className="text-xl" />
                            </button>
                            {/* Decorative background flair */}
                            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-colors"></div>
                        </motion.div>
                    ) : (
                        <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-[2.5rem] flex items-center gap-6">
                            <div className="p-4 bg-slate-800 text-slate-600 rounded-3xl">
                                <HiOutlineShieldCheck className="text-2xl" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Compliance Status</p>
                                <h4 className="text-xl font-black text-slate-400">All Obligations Met</h4>
                            </div>
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem] flex items-center justify-between"
                    >
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-500/20">
                                <HiOutlineTrendingUp className="text-2xl" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Monthly Velocity</p>
                                <h4 className="text-2xl font-black text-white">${monthlyForecast.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Expenses: {format(new Date(), "MMMM")}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest leading-none">Healthy</span>
                        </div>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Historical Rent"
                        amount={totals.rent}
                        icon={HiOutlineTrendingUp}
                        colorClass="text-brand"
                    />
                    <StatCard
                        title="Historical Bills"
                        amount={totals.bills}
                        icon={HiOutlineCreditCard}
                        colorClass="text-warning"
                    />
                    <StatCard
                        title="Gross Expenditure"
                        amount={totals.rent + totals.bills}
                        icon={HiOutlineLightningBolt}
                        colorClass="text-success"
                    />
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
