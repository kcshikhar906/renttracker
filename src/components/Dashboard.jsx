import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
    deleteDoc,
    getDocs,
    limit,
    serverTimestamp
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
    HiOutlineArrowTrendingUp,
    HiOutlineCreditCard,
    HiOutlineBolt,
    HiOutlineCalendar,
    HiOutlineShieldCheck,
    HiOutlineBell,
    HiOutlineArrowRight,
    HiOutlineHome, HiOutlinePlus, HiOutlineCurrencyDollar, HiOutlineClipboardDocumentList
} from "react-icons/hi2";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { format, parseISO, isAfter, subDays, addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import DataMigration from "./DataMigration";
import PropertyComparisonTable from "./PropertyComparisonTable";

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
    const navigate = useNavigate();
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
            const docRef = doc(db, "users", user.uid, "transactions", transactionToDelete.id);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                await setDoc(doc(db, "users", user.uid, "trash", transactionToDelete.id), {
                    ...snap.data(),
                    deletedAt: serverTimestamp()
                });
                await deleteDoc(docRef);
            }

            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        } catch (err) {
            console.error("Move to trash failed:", err);
            alert("Failed to move record to trash vault.");
        }
    };

    const getNextRentDue = () => {
        const activePropIds = properties.filter(p => p.status !== 'ARCHIVED').map(p => p.id);

        const rentTx = transactions
            .filter(t => t.type === "RENT" && activePropIds.includes(t.propertyId))
            .sort((a, b) => {
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
                return isWithinInterval(d, { start, end });
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
                <DataMigration />

                {/* System Initialization Banner */}
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
                        <h2 className="text-4xl font-black text-white tracking-tighter">Executive Overview</h2>
                        <p className="text-slate-500 font-medium text-sm">Strategic insight into your property portfolio & liabilities.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Ledger Sync
                        </div>
                    </div>
                </div>

                {/* Primary Intelligence: Urgent Actions & Quick Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {nextDueInfo ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden bg-brand/10 border border-brand/20 p-8 rounded-[2.5rem] group"
                        >
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-4 bg-brand text-white rounded-[1.25rem] shadow-xl shadow-brand/30">
                                        <HiOutlineBell className="text-2xl" />
                                    </div>
                                    <button
                                        onClick={addToCalendar}
                                        className="p-3 bg-slate-950 border border-slate-800 text-slate-500 hover:text-white hover:border-brand/40 rounded-xl transition-all"
                                    >
                                        <HiOutlineCalendar className="text-xl" />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-brand uppercase tracking-[0.25em]">Critical Payment Due</p>
                                    <h4 className="text-3xl font-black text-white mt-1">{format(nextDueInfo.date, "EEEE, MMM dd")}</h4>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                                        {nextDueInfo.propertyName}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand/5 rounded-full blur-3xl"></div>
                        </motion.div>
                    ) : (
                        <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] flex flex-col justify-center gap-4">
                            <div className="p-4 bg-slate-800/50 text-slate-500 rounded-[1.25rem] w-fit">
                                <HiOutlineShieldCheck className="text-2xl" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Ledger Status</p>
                                <h4 className="text-2xl font-black text-slate-400 mt-1">Status Nominal</h4>
                            </div>
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[2.5rem] flex flex-col justify-between"
                    >
                        <div className="p-4 bg-emerald-500 text-white rounded-[1.25rem] w-fit shadow-xl shadow-emerald-500/20">
                            <HiOutlineArrowTrendingUp className="text-2xl" />
                        </div>
                        <div className="mt-6">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em]">Burn Rate (30D)</p>
                            <h4 className="text-3xl font-black text-white mt-1">${monthlyForecast.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{format(new Date(), "MMMM")} Projection</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-indigo-500/5 border border-indigo-500/10 p-8 rounded-[2.5rem] flex flex-col justify-between"
                    >
                        <div className="p-4 bg-indigo-500 text-white rounded-[1.25rem] w-fit shadow-xl shadow-indigo-500/20">
                            <HiOutlineHome className="text-2xl" />
                        </div>
                        <div className="mt-6">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">Managed Assets</p>
                            <h4 className="text-3xl font-black text-white mt-1">{properties.length} Units</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Active Portfolio Count</p>
                        </div>
                    </motion.div>
                </div>

                {/* Secondary Metrics: Historical Aggregate Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Lifetime Rent Contributions"
                        amount={totals.rent}
                        icon={HiOutlineArrowTrendingUp}
                        colorClass="text-brand"
                    />
                    <StatCard
                        title="Lifetime Utility Liabilities"
                        amount={totals.bills}
                        icon={HiOutlineCreditCard}
                        colorClass="text-warning"
                    />
                    <StatCard
                        title="Total Portfolio Outflow"
                        amount={totals.rent + totals.bills}
                        icon={HiOutlineBolt}
                        colorClass="text-success"
                    />
                </div>

                {/* Deep Analytics: Visuals & Asset Comparisons */}
                <div className="space-y-6">
                    <ExpenseCharts transactions={transactions} />
                    <PropertyComparisonTable transactions={transactions} properties={properties} />
                </div>

                {/* Recent Activity: Limited Ledger View */}
                <section className="bg-slate-900/30 border border-slate-800/50 rounded-[3rem] p-8 lg:p-12">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500">
                                <HiOutlineClipboardDocumentList className="text-2xl" />
                            </div>
                            <div className="mt-6">
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase">Recent Settlements</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Last 5 Verified Entries</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/transactions")}
                            className="flex items-center gap-3 px-6 py-4 bg-slate-950 border border-slate-800 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-brand hover:border-brand/40 transition-all group"
                        >
                            View Entire Ledger
                            <HiOutlineArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <TransactionList
                        transactions={transactions.slice(0, 5)}
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
