import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import {
    HiOutlineHome,
    HiOutlineUser,
    HiOutlineCurrencyDollar,
    HiOutlineTrash,
    HiOutlinePencilAlt,
    HiOutlinePlus,
    HiOutlineX,
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlineRefresh
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";

export default function Settings() {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [reportProfiles, setReportProfiles] = useState([]);
    const [archivedTransactions, setArchivedTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Property Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [tenantInput, setTenantInput] = useState("");
    const [profileInput, setProfileInput] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
        tenantNames: [],
        rentHistory: []
    });

    useEffect(() => {
        if (!currentUser) return;

        const qProps = query(collection(db, "properties"), where("uid", "==", currentUser.uid));
        const qProfs = query(collection(db, "profiles"), where("uid", "==", currentUser.uid));

        const unsubProps = onSnapshot(qProps, (snapshot) => {
            setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubProfs = onSnapshot(qProfs, (snapshot) => {
            setReportProfiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Fetch Archived Transactions
        const qArchived = query(
            collection(db, "transactions"),
            where("uid", "==", currentUser.uid),
            where("isDeleted", "==", true)
        );

        const unsubArchived = onSnapshot(qArchived, (snapshot) => {
            setArchivedTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubProps();
            unsubProfs();
            unsubArchived();
        };
    }, [currentUser]);

    const handleAddProfile = async () => {
        if (!profileInput.trim()) return;
        try {
            await addDoc(collection(db, "profiles"), {
                uid: currentUser.uid,
                name: profileInput.trim(),
                createdAt: Timestamp.now()
            });
            setProfileInput("");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteProfile = async (id) => {
        if (!window.confirm("Remove this report profile?")) return;
        try {
            await deleteDoc(doc(db, "profiles", id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRestore = async (id) => {
        try {
            await updateDoc(doc(db, "transactions", id), {
                isDeleted: false
            });
        } catch (err) {
            console.error("Restore failed:", err);
        }
    };

    const addTenant = () => {
        if (!tenantInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            tenantNames: [...prev.tenantNames, tenantInput.trim()]
        }));
        setTenantInput("");
    };

    const removeTenant = (idx) => {
        setFormData(prev => ({
            ...prev,
            tenantNames: prev.tenantNames.filter((_, i) => i !== idx)
        }));
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (formData.tenantNames.length === 0) {
            alert("Please add at least one tenant.");
            return;
        }

        try {
            setLoading(true);
            const newAmount = parseFloat(formData.rentAmount);
            const effectiveDateParsed = parseISO(formData.rentEffectiveDate);
            const effectiveTimestamp = Timestamp.fromDate(isValid(effectiveDateParsed) ? effectiveDateParsed : new Date());

            let updatedHistory = [...(formData.rentHistory || [])];

            // Check if this amount/date combination already exists to avoid duplicates
            const exists = updatedHistory.some(h =>
                h.amount === newAmount &&
                (h.effectiveDate?.seconds === effectiveTimestamp.seconds)
            );

            if (!exists) {
                updatedHistory.push({
                    amount: newAmount,
                    effectiveDate: effectiveTimestamp
                });
            }

            // Sort history by date descending for UI and consistency
            updatedHistory.sort((a, b) => b.effectiveDate.seconds - a.effectiveDate.seconds);

            const payload = {
                uid: currentUser.uid,
                name: formData.name,
                rentAmount: newAmount,
                tenantNames: formData.tenantNames,
                rentHistory: updatedHistory,
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, "properties", editingId), payload);
            } else {
                await addDoc(collection(db, "properties"), payload);
            }

            resetForm();
        } catch (err) {
            console.error("Property error:", err);
            alert("Failed to save property.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (window.confirm("Are you sure? This will delete the property record.")) {
            try {
                await deleteDoc(doc(db, "properties", id));
            } catch (err) {
                console.error(err);
            }
        }
    }

    function handleEdit(p) {
        setEditingId(p.id);
        setFormData({
            name: p.name,
            rentAmount: p.rentAmount.toString(),
            rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
            tenantNames: p.tenantNames || [],
            rentHistory: p.rentHistory || []
        });
        setShowAddForm(true);
    }

    function resetForm() {
        setFormData({
            name: "",
            rentAmount: "",
            rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
            tenantNames: [],
            rentHistory: []
        });
        setTenantInput("");
        setEditingId(null);
        setShowAddForm(false);
    }

    function formatHistoryDate(ts) {
        if (!ts) return "---";
        const date = ts.toDate ? ts.toDate() : new Date();
        return format(date, "MMM dd, yyyy");
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Assets & Properties</h2>
                        <p className="text-slate-500 mt-1">Configure your managed units and active residents.</p>
                    </div>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn-primary gap-2 py-3.5 px-6 shadow-xl shadow-brand/20"
                        >
                            <HiOutlinePlus className="text-xl" />
                            Register Property
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="stats-card p-8 border-brand/30 ring-1 ring-brand/10"
                        >
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                                    <div className="p-2 bg-brand/10 rounded-lg text-brand">
                                        <HiOutlineHome />
                                    </div>
                                    {editingId ? "Modify Asset" : "Register New Asset"}
                                </h3>
                                <button onClick={resetForm} className="text-slate-500 hover:text-white transition-colors">
                                    <HiOutlineX className="text-2xl" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Left Column: Core Details */}
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Unique Property Name</label>
                                            <input
                                                required
                                                className="input-field"
                                                placeholder="e.g. Ultimo Level 5 Room"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rent Amount (AUD)</label>
                                                <div className="relative">
                                                    <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl" />
                                                    <input
                                                        required
                                                        type="number"
                                                        className="input-field pl-12"
                                                        placeholder="0.00"
                                                        value={formData.rentAmount}
                                                        onChange={e => setFormData({ ...formData, rentAmount: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Effective Date</label>
                                                <div className="relative">
                                                    <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl" />
                                                    <input
                                                        required
                                                        type="date"
                                                        className="input-field pl-12"
                                                        value={formData.rentEffectiveDate}
                                                        onChange={e => setFormData({ ...formData, rentEffectiveDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rent History Timeline */}
                                        {formData.rentHistory?.length > 0 && (
                                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <HiOutlineClock className="text-brand" /> Rent Rate History
                                                </label>
                                                <div className="space-y-3 pl-2">
                                                    {formData.rentHistory.map((h, i) => (
                                                        <div key={i} className="flex items-center gap-3 group">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand/40 group-first:bg-brand shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
                                                            <div className="flex-1 flex items-center justify-between bg-slate-950/40 px-4 py-2 rounded-xl border border-slate-800/50">
                                                                <span className="text-[11px] font-bold text-slate-400">
                                                                    {formatHistoryDate(h.effectiveDate)}
                                                                </span>
                                                                <span className="text-xs font-black text-white">
                                                                    ${h.amount} <span className="text-[9px] text-slate-600 font-bold">/ WK</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Tenants */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Multi-Tenant List</label>
                                            <div className="flex gap-2">
                                                <input
                                                    className="input-field flex-1"
                                                    placeholder="Resident Name"
                                                    value={tenantInput}
                                                    onChange={e => setTenantInput(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTenant())}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addTenant}
                                                    className="p-3 bg-slate-800 hover:bg-brand text-white rounded-2xl transition-all"
                                                >
                                                    <HiOutlinePlus />
                                                </button>
                                            </div>

                                            <div className="bg-slate-950 rounded-[2rem] p-6 border border-slate-800 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                                                {formData.tenantNames.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs gap-3">
                                                        <HiOutlineUser className="text-3xl opacity-20" />
                                                        No residents assigned
                                                    </div>
                                                ) : (
                                                    formData.tenantNames.map((name, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl group transition-all hover:border-brand/40">
                                                            <span className="text-sm font-bold text-slate-300">
                                                                {name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTenant(i)}
                                                                className="p-2 text-slate-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                            >
                                                                <HiOutlineTrash />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-8 mt-12 border-t border-slate-800">
                                    <button type="button" onClick={resetForm} className="btn-ghost px-10">Discard</button>
                                    <button type="submit" className="btn-primary py-5 px-16 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand/20">
                                        {editingId ? "COMMIT CHANGES" : "REGISTER ASSET"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Report Profiles Section */}
                <div className="stats-card p-8 border-slate-800 bg-slate-900/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Report Profiles</h3>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Authorized Audit Entity Names</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input
                                className="input-field py-3 flex-1 md:w-64"
                                placeholder="e.g. Shikhar's Rental Profile"
                                value={profileInput}
                                onChange={e => setProfileInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddProfile())}
                            />
                            <button onClick={handleAddProfile} className="p-3 bg-brand text-white rounded-2xl hover:scale-105 transition-all">
                                <HiOutlinePlus className="text-xl" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {reportProfiles.length === 0 && (
                            <div className="w-full py-8 text-center text-slate-600 italic text-sm border-2 border-dashed border-slate-800 rounded-3xl">
                                No report profiles added. Add a name to enable branded PDF exports.
                            </div>
                        )}
                        {reportProfiles.map(prof => (
                            <div key={prof.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl group hover:border-brand/40 transition-all">
                                <span className="text-sm font-bold text-slate-300">{prof.name}</span>
                                <button onClick={() => handleDeleteProfile(prof.id)} className="p-1.5 text-slate-600 hover:text-danger rounded-lg">
                                    <HiOutlineTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.length === 0 && !loading && (
                        <div className="col-span-full py-32 text-center stats-card border-dashed">
                            <HiOutlineHome className="text-7xl text-slate-800 mx-auto mb-6 opacity-20" />
                            <p className="text-slate-500 font-medium">Your managed ledger is empty. Register your first property unit.</p>
                        </div>
                    )}

                    {properties.map(p => (
                        <motion.div
                            layout
                            key={p.id}
                            className="stats-card group hover:scale-[1.02] transition-transform duration-300"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="p-4 bg-brand/10 border border-brand/20 rounded-2xl text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-brand/30">
                                    <HiOutlineHome className="text-2xl" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(p)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:border-brand/50 transition-all shadow-sm">
                                        <HiOutlinePencilAlt />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-danger hover:border-danger/30 transition-all shadow-sm">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-slate-100 tracking-tighter leading-tight">{p.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(p.tenantNames || []).map((name, i) => (
                                        <span key={i} className="text-[9px] font-black bg-slate-900 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800 uppercase tracking-tighter">
                                            {name}
                                        </span>
                                    ))}
                                    {(!p.tenantNames || p.tenantNames.length === 0) && (
                                        <span className="text-[9px] font-black text-warning uppercase bg-warning/5 px-3 py-1.5 rounded-lg border border-warning/10">No Residents</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Weekly Rate</p>
                                    <p className="text-2xl font-black text-white leading-none tracking-tighter">${p.rentAmount}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Asset Status</p>
                                    <span className="text-[10px] font-black text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20 tracking-tighter shadow-sm">ACTIVE UNIT</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Archived Transactions (Trash Can) */}
                <div className="mt-16 pt-16 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-500">
                            <HiOutlineTrash className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Archived Records</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trash Can & Restoration</p>
                        </div>
                    </div>

                    {archivedTransactions.length === 0 ? (
                        <div className="p-12 text-center rounded-[2.5rem] bg-slate-950/30 border border-slate-800/50 border-dashed">
                            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No deleted records found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {archivedTransactions.map(t => (
                                <div key={t.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                {t.date?.toDate ? format(t.date.toDate(), "MMM dd, yyyy") : format(parseISO(t.date), "MMM dd, yyyy")}
                                            </span>
                                            <span className="text-sm font-black text-white">${t.amount?.toLocaleString()}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(t.id)}
                                            className="p-3 bg-emerald-600/10 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-600/20 border border-emerald-600/20 flex items-center gap-2 group/restore"
                                            title="Restore to Ledger"
                                        >
                                            <HiOutlineRefresh className="text-lg group-hover:rotate-180 transition-transform duration-500" />
                                            <span className="text-[10px] font-black uppercase">Restore</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${t.type === 'RENT' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                            {t.type}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 truncate max-w-[100px]">{t.propertyName || "Unknown"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout >
    );
}
