import React, { useEffect, useState, Fragment } from "react";
import { Transition, Dialog, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import Layout from "./Layout";
import TransactionList from "./TransactionList";
import TransactionDetailModal from "./TransactionDetailModal";
import EditTransactionModal from "./EditTransactionModal";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { HiOutlineSearch, HiOutlineFilter, HiOutlineCollection, HiOutlineX, HiOutlineDocumentDownload } from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [properties, setProperties] = useState([]);
    const [reportProfiles, setReportProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Selection/Edit state
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // PDF Export States
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [exportEntityName, setExportEntityName] = useState("");
    const [exportOptions, setExportOptions] = useState({
        showNotes: true,
        showSummary: true,
        showSettledBy: true,
        reportTitle: "FINANCIAL STATEMENT",
        headerColor: [15, 23, 42] // slate-900
    });

    // Filters
    const [filterType, setFilterType] = useState("ALL");
    const [filterProperty, setFilterProperty] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterUtility, setFilterUtility] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
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

        // Fetch Properties & Profiles for filter/export
        const fetchData = async () => {
            const qProps = query(collection(db, "properties"), where("uid", "==", user.uid));
            const qProfs = query(collection(db, "profiles"), where("uid", "==", user.uid));

            const [snapProps, snapProfs] = await Promise.all([getDocs(qProps), getDocs(qProfs)]);

            setProperties(snapProps.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setReportProfiles(snapProfs.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchData();

        const q = query(
            collection(db, "transactions"),
            where("uid", "==", user.uid),
            orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Firestore error:", err);
            setLoading(false);
        });

        return () => unsubscribeData();
    }, [user]);

    useEffect(() => {
        let result = [...transactions];

        // Type Filter
        if (filterType !== "ALL") {
            result = result.filter(t => t.type === filterType);
        }

        // Property Filter
        if (filterProperty !== "ALL") {
            result = result.filter(t => t.propertyId === filterProperty);
        }

        // Status Filter
        if (filterStatus !== "ALL") {
            result = result.filter(t => t.status === filterStatus);
        }

        // Utility Filter
        if (filterUtility !== "ALL" && filterType === "BILL") {
            result = result.filter(t => t.utilityType === filterUtility);
        }

        // Date Range
        if (startDate && endDate) {
            const start = startOfDay(parseISO(startDate));
            const end = endOfDay(parseISO(endDate));
            result = result.filter(t => {
                const filingDate = t.date?.toDate ? t.date.toDate() : new Date();
                return isWithinInterval(filingDate, { start, end });
            });
        }

        // Search
        if (searchQuery.trim() !== "") {
            const search = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.notes?.toLowerCase().includes(search)) ||
                (t.propertyName?.toLowerCase().includes(search)) ||
                (t.tenant?.toLowerCase().includes(search)) ||
                (t.amount?.toString().includes(search))
            );
        }

        setFilteredTransactions(result);
    }, [transactions, filterType, filterProperty, filterStatus, filterUtility, startDate, endDate, searchQuery]);

    const clearFilters = () => {
        setFilterType("ALL");
        setFilterProperty("ALL");
        setFilterStatus("ALL");
        setFilterUtility("ALL");
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
    };

    const handleSelect = (transaction) => {
        setSelectedTransaction(transaction);
        setIsDetailOpen(true);
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        setIsEditOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("ARE YOU SURE? THIS WILL PERMANENTLY ERASE THE RECORD.")) return;
        try {
            await deleteDoc(doc(db, "transactions", id));
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete record.");
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const dateStr = format(new Date(), "MMM dd, yyyy");
        const fileName = `${exportOptions.reportTitle.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

        // 1. Header & Aesthetics
        // Background accent
        doc.setFillColor(exportOptions.headerColor[0], exportOptions.headerColor[1], exportOptions.headerColor[2]);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text(exportOptions.reportTitle.toUpperCase(), 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Official Ledger Record • Generated ${dateStr}`, 105, 30, { align: "center" });

        // Account Details
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("ACCOUNT HOLDER/TENANT", 14, 55);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`${exportEntityName || user?.displayName || user?.email || "System User"}`, 14, 62);
        doc.text(`Internal Reference: ${user?.uid?.substring(0, 8).toUpperCase()}`, 14, 67);

        // 2. Data Preparation
        const tableRows = filteredTransactions.map(t => {
            const filingDate = t.date?.toDate ? t.date.toDate() : (typeof t.date === 'string' ? parseISO(t.date) : new Date());
            const periodStr = t.type === "RENT"
                ? `${t.periodStart ? format(typeof t.periodStart === 'string' ? parseISO(t.periodStart) : t.periodStart.toDate(), "MMM dd") : "—"} to ${t.periodEnd ? format(typeof t.periodEnd === 'string' ? parseISO(t.periodEnd) : t.periodEnd.toDate(), "MMM dd") : "—"}`
                : t.utilityType || "Utility";

            const row = [
                format(filingDate, "MMM dd, yyyy"),
                t.propertyName || "Other",
                t.type,
                periodStr,
                `$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                t.status
            ];

            if (exportOptions.showSettledBy) {
                row.push(t.tenant || "System");
            }

            if (exportOptions.showNotes) {
                row.push(t.notes || "—");
            }

            return row;
        });

        const tableHead = [['Date', 'Unit/Asset', 'Category', 'Description', 'Amount', 'Status']];
        if (exportOptions.showSettledBy) {
            tableHead[0].push('Settled By');
        }
        if (exportOptions.showNotes) {
            tableHead[0].push('Memo/Notes');
        }

        // 3. Table
        autoTable(doc, {
            startY: 75,
            head: tableHead,
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: exportOptions.headerColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                valign: 'middle'
            },
            columnStyles: {
                [tableHead[0].indexOf('Amount')]: { fontStyle: 'bold', halign: 'right' },
                [tableHead[0].indexOf('Status')]: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        // 4. Calculations & Footer
        if (exportOptions.showSummary) {
            const finalY = (doc).lastAutoTable.finalY + 20;

            const totalRent = filteredTransactions
                .filter(t => t.type === "RENT")
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const totalBills = filteredTransactions
                .filter(t => t.type === "BILL")
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            // Recap Box
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(14, finalY - 5, 182, 40, 'F');

            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(`CUMULATIVE FINANCIAL SUMMARY`, 20, finalY + 5);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(`Total Rental Obligations: $${totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 15);
            doc.text(`Total Utility/Bill Settlements: $${totalBills.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 22);

            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`NET AGGREGATE TOTAL: $${(totalRent + totalBills).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 32);
        }

        // Verification Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont(undefined, 'italic');
        doc.text("This is an automated report generated by the RentTracker Ledger System. No signature required.", 105, 285, { align: "center" });

        // 5. Save
        doc.save(fileName);
    };


    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                    <div className="flex items-center gap-5">
                        <div className="p-5 bg-brand rounded-3xl shadow-2xl shadow-brand/20">
                            <HiOutlineCollection className="text-4xl text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tighter">Audit Ledger</h2>
                            <p className="text-slate-500 font-medium text-sm">Active cryptographic record of all settlements.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative group w-full sm:w-80">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" />
                            <input
                                type="text"
                                placeholder="Search ledger entries..."
                                className="input-field pl-11 py-4 text-xs group-focus-within:border-brand/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                        >
                            <HiOutlineDocumentDownload className="text-lg" /> Export PDF Report
                        </button>
                        <button
                            onClick={clearFilters}
                            className="w-full sm:w-auto px-6 py-4 bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2"
                        >
                            <HiOutlineX /> Reset
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 bg-slate-900/30 p-6 rounded-[2rem] border border-slate-800/50">
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Category</label>
                        <div className="relative">
                            <select
                                className="input-field py-3 text-[10px] appearance-none font-bold uppercase tracking-wider"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">All Settlements</option>
                                <option value="RENT">Rent Only</option>
                                <option value="BILL">Utility Bills</option>
                            </select>
                        </div>
                    </div>

                    {/* Property */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Target Asset</label>
                        <select
                            className="input-field py-3 text-[10px] appearance-none font-bold uppercase tracking-wider"
                            value={filterProperty}
                            onChange={(e) => setFilterProperty(e.target.value)}
                        >
                            <option value="ALL">All Properties</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Status</label>
                        <select
                            className="input-field py-3 text-[10px] appearance-none font-bold uppercase tracking-wider"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">All States</option>
                            <option value="PAID">Settle/Paid</option>
                            <option value="UNPAID">Pending/Unpaid</option>
                        </select>
                    </div>

                    {/* Utility Type - Conditional */}
                    <div className={`space-y-2 transition-opacity duration-300 ${filterType !== "BILL" ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Utility Type</label>
                        <select
                            className="input-field py-3 text-[10px] appearance-none font-bold uppercase tracking-wider"
                            value={filterUtility}
                            onChange={(e) => setFilterUtility(e.target.value)}
                        >
                            <option value="ALL">All Utilities</option>
                            <option value="ELECTRICITY">Electricity</option>
                            <option value="GAS">Gas</option>
                            <option value="WIFI">Wifi</option>
                            <option value="WATER">Water</option>
                            <option value="COUNCIL">Council</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    {/* Date Range Start */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">From Date</label>
                        <input
                            type="date"
                            className="input-field py-2 text-[10px]"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    {/* Date Range End */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">To Date</label>
                        <input
                            type="date"
                            className="input-field py-2 text-[10px]"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-slate-800/50 bg-slate-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Active Ledger</h3>
                        </div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-tighter bg-brand/10 border border-brand/20 px-4 py-1.5 rounded-full">
                            {filteredTransactions.length} Matches Found
                        </span>
                    </div>

                    <div className="p-4 sm:p-8 overflow-x-auto min-h-[400px]">
                        <TransactionList
                            transactions={filteredTransactions}
                            loading={loading}
                            onSelect={handleSelect}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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

            {/* Edit Modal */}
            <EditTransactionModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                transaction={editingTransaction}
            />

            {/* Profile Selection Modal */}
            <Transition show={isProfileModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setIsProfileModalOpen(false)}>
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl transition-all">
                                    <div className="flex items-center justify-between mb-8">
                                        <DialogTitle as="h3" className="text-xl font-black text-white uppercase tracking-tighter">
                                            Select Export Name
                                        </DialogTitle>
                                        <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-500 hover:text-white">
                                            <HiOutlineX className="text-2xl" />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest pl-1 mb-4">Choose the name to appear on the PDF:</p>

                                        {/* Default option */}
                                        <button
                                            onClick={() => {
                                                setExportEntityName(user?.displayName || user?.email);
                                                setIsProfileModalOpen(false);
                                                setIsOptionsModalOpen(true);
                                            }}
                                            className="w-full text-left p-5 bg-slate-850 hover:bg-brand hover:text-white border border-slate-800 rounded-2xl transition-all group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-200 group-hover:text-white">Default Entity</span>
                                                <span className="text-[10px] text-slate-500 group-hover:text-brand-light">{user?.email}</span>
                                            </div>
                                        </button>

                                        {reportProfiles.map(prof => (
                                            <button
                                                key={prof.id}
                                                onClick={() => {
                                                    setExportEntityName(prof.name);
                                                    setIsProfileModalOpen(false);
                                                    setIsOptionsModalOpen(true);
                                                }}
                                                className="w-full text-left p-5 bg-slate-950/40 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-2xl transition-all"
                                            >
                                                <span className="text-sm font-black">{prof.name}</span>
                                            </button>
                                        ))}

                                        {reportProfiles.length === 0 && (
                                            <p className="text-[10px] text-slate-600 italic text-center py-4">
                                                Go to Settings to add more persistent report profiles.
                                            </p>
                                        )}
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Step 2: Export Options Modal */}
            <Transition show={isOptionsModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setIsOptionsModalOpen(false)}>
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl transition-all">
                                    <div className="flex items-center justify-between mb-8">
                                        <DialogTitle as="h3" className="text-xl font-black text-white uppercase tracking-tighter">
                                            Report Configuration
                                        </DialogTitle>
                                        <button onClick={() => setIsOptionsModalOpen(false)} className="text-slate-500 hover:text-white">
                                            <HiOutlineX className="text-2xl" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Report Title */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Report Heading</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={exportOptions.reportTitle}
                                                onChange={(e) => setExportOptions(prev => ({ ...prev, reportTitle: e.target.value }))}
                                            />
                                        </div>

                                        {/* Color Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Branding Accent</label>
                                            <div className="flex gap-3">
                                                {[
                                                    { name: 'Slate', color: [15, 23, 42] },
                                                    { name: 'Indigo', color: [79, 70, 229] },
                                                    { name: 'Emerald', color: [16, 185, 129] },
                                                    { name: 'Rose', color: [225, 29, 72] }
                                                ].map(c => (
                                                    <button
                                                        key={c.name}
                                                        onClick={() => setExportOptions(prev => ({ ...prev, headerColor: c.color }))}
                                                        className={`w-10 h-10 rounded-full border-2 transition-all ${JSON.stringify(exportOptions.headerColor) === JSON.stringify(c.color)
                                                            ? 'border-white scale-110 shadow-lg'
                                                            : 'border-transparent opacity-50 hover:opacity-100'
                                                            }`}
                                                        style={{ backgroundColor: `rgb(${c.color.join(',')})` }}
                                                        title={c.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <button
                                                onClick={() => setExportOptions(prev => ({ ...prev, showNotes: !prev.showNotes }))}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col gap-1 text-left ${exportOptions.showNotes
                                                    ? 'bg-brand/10 border-brand/40'
                                                    : 'bg-slate-950 border-slate-800 opacity-60'
                                                    }`}
                                            >
                                                <span className="text-xs font-black text-white">Include Notes</span>
                                                <span className="text-[9px] text-slate-500">Memo column</span>
                                            </button>

                                            <button
                                                onClick={() => setExportOptions(prev => ({ ...prev, showSettledBy: !prev.showSettledBy }))}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col gap-1 text-left ${exportOptions.showSettledBy
                                                    ? 'bg-brand/10 border-brand/40'
                                                    : 'bg-slate-950 border-slate-800 opacity-60'
                                                    }`}
                                            >
                                                <span className="text-xs font-black text-white">Settled By</span>
                                                <span className="text-[9px] text-slate-500">Resident column</span>
                                            </button>

                                            <button
                                                onClick={() => setExportOptions(prev => ({ ...prev, showSummary: !prev.showSummary }))}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col gap-1 text-left ${exportOptions.showSummary
                                                    ? 'bg-brand/10 border-brand/40'
                                                    : 'bg-slate-950 border-slate-800 opacity-60'
                                                    }`}
                                            >
                                                <span className="text-xs font-black text-white">Financial Summary</span>
                                                <span className="text-[9px] text-slate-500">Footer totals</span>
                                            </button>
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                onClick={() => {
                                                    generatePDF();
                                                    setIsOptionsModalOpen(false);
                                                }}
                                                className="w-full py-5 bg-brand text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                            >
                                                <HiOutlineDocumentDownload className="text-xl" />
                                                Finalize & Download PDF
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsOptionsModalOpen(false);
                                                    setIsProfileModalOpen(true);
                                                }}
                                                className="w-full py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 hover:text-slate-300"
                                            >
                                                ← Back to Entity Selection
                                            </button>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </Layout >
    );
}
