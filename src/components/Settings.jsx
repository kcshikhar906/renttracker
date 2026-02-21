import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { useAuth } from "../contexts/AuthContext";
import { db, storage, auth } from "../firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    Timestamp,
    getDocs,
    orderBy,
    serverTimestamp,
    writeBatch,
    setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
    HiOutlineRefresh,
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineSearchCircle,
    HiOutlineOfficeBuilding,
    HiOutlineFolder,
    HiOutlineFolderOpen,
    HiOutlineViewGrid,
    HiOutlineViewList,
    HiOutlineChevronRight,
    HiOutlineArrowLeft,
    HiOutlineShieldCheck,
    HiOutlineUserGroup,
    HiOutlineArchive
} from "react-icons/hi";
import PropertyHistoryModal from "./PropertyHistoryModal";
import DocumentUploadModal from "./DocumentUploadModal";
import DocumentPreviewModal from "./DocumentPreviewModal";
import PropertyArchiveModal from "./PropertyArchiveModal";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isValid, isBefore, addDays } from "date-fns";
import DataMigration from "./DataMigration";

export default function Settings() {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [reportProfiles, setReportProfiles] = useState([]);
    const [archivedTransactions, setArchivedTransactions] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [activeTab, setActiveTab] = useState("portfolio"); // portfolio, storage, security, advanced
    const [loading, setLoading] = useState(true);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Property Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedPropertyForHistory, setSelectedPropertyForHistory] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    // Document Vault State
    const [docSearch, setDocSearch] = useState("");
    const [docFilter, setDocFilter] = useState("ALL");
    const [currentFolder, setCurrentFolder] = useState("ROOT"); // ROOT, or Property ID, or GENERAL
    const [viewMode, setViewMode] = useState("GRID"); // GRID or LIST
    const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);

    // Team Management State
    const [userProfile, setUserProfile] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [tenantInput, setTenantInput] = useState("");
    const [profileInput, setProfileInput] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
        tenantNames: [],
        rentHistory: []
    });

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [selectedPropertyForArchive, setSelectedPropertyForArchive] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const qProps = query(collection(db, "users", currentUser.uid, "properties"));
        const qProfs = query(collection(db, "users", currentUser.uid, "profiles"));

        const unsubProps = onSnapshot(qProps, (snapshot) => {
            setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubProfs = onSnapshot(qProfs, (snapshot) => {
            setReportProfiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Fetch Trash Collection (Documents physically moved here)
        const qArchived = query(
            collection(db, "users", currentUser.uid, "trash"),
            orderBy("deletedAt", "desc")
        );

        const unsubArchived = onSnapshot(qArchived, (snapshot) => {
            setArchivedTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Documents
        const qDocs = query(collection(db, "users", currentUser.uid, "documents"));
        const unsubDocs = onSnapshot(qDocs, (snapshot) => {
            setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch User Profile
        const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
            setUserProfile(doc.data());
        });

        // Fetch Guest List (Only if admin, otherwise it will fail silently due to rules)
        const unsubWhitelist = onSnapshot(collection(db, "whitelists"), (snapshot) => {
            setInvitations(snapshot.docs.map(d => ({ email: d.id, ...d.data() })));
        }, (err) => {
            console.log("Team management restricted to administrators.");
        });

        return () => {
            unsubProps();
            unsubProfs();
            unsubArchived();
            unsubDocs();
            unsubUser();
            unsubWhitelist();
        };
    }, [currentUser]);

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
        try {
            await setDoc(doc(db, "whitelists", inviteEmail.toLowerCase().trim()), {
                role: "user",
                invitedBy: currentUser.email,
                invitedAt: serverTimestamp()
            });
            setInviteEmail("");
        } catch (err) {
            console.error("Invite failed:", err);
            alert("Invite failed: Permission denied.");
        }
    };

    const handleRemoveInvite = async (email) => {
        if (!window.confirm(`Revoke access for ${email}?`)) return;
        try {
            await deleteDoc(doc(db, "whitelists", email));
        } catch (err) {
            console.error("Revoke failed:", err);
        }
    };

    const handleAddProfile = async () => {
        if (!profileInput.trim()) return;
        try {
            await addDoc(collection(db, "users", currentUser.uid, "profiles"), {
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
            await deleteDoc(doc(db, "users", currentUser.uid, "profiles", id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRestore = async (id) => {
        try {
            const trashRef = doc(db, "users", currentUser.uid, "trash", id);
            const snap = await getDoc(trashRef);

            if (snap.exists()) {
                const data = snap.data();
                // Clean up metadata
                delete data.deletedAt;

                // Move back to transactions
                await setDoc(doc(db, "users", currentUser.uid, "transactions", id), {
                    ...data,
                    updatedAt: serverTimestamp()
                });

                // Clean up trash
                await deleteDoc(trashRef);
            }
        } catch (err) {
            console.error("Restore failed:", err);
            alert("Restoration sequence failed.");
        }
    };

    // Cleaned up handleUploadDocument as it's now in the Modal component

    const handleDeleteDocument = async (docObj) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            const storageRef = ref(storage, docObj.storagePath);
            await deleteObject(storageRef);
            await deleteDoc(doc(db, "users", currentUser.uid, "documents", docObj.id));
        } catch (err) {
            console.error("Delete failed:", err);
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

            updatedHistory.sort((a, b) => b.effectiveDate.seconds - a.effectiveDate.seconds);

            const payload = {
                name: formData.name,
                rentAmount: newAmount,
                tenantNames: formData.tenantNames,
                rentHistory: updatedHistory,
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, "users", currentUser.uid, "properties", editingId), payload);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "properties"), payload);
            }

            resetForm();
        } catch (err) {
            console.error("Property error:", err);
            alert("Failed to save property.");
        } finally {
            setLoading(false);
        }
    }

    async function toggleArchive(property) {
        if (property.status === 'ARCHIVED') {
            if (!window.confirm("Restore this property to active status?")) return;
            try {
                await updateDoc(doc(db, "users", currentUser.uid, "properties", property.id), {
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error("Restore failed:", err);
            }
        } else {
            setSelectedPropertyForArchive(property);
            setIsArchiveModalOpen(true);
        }
    }

    async function handleDelete(id) {
        if (window.confirm("Are you sure? This will delete the property record.")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "properties", id));
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
            <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-12 pb-20">

                {/* Side Commands Navigation */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-8">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Configuration</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                            Command Center
                        </p>
                    </div>

                    <nav className="flex lg:flex-col p-1.5 bg-slate-900/30 border border-slate-800/50 rounded-[2rem] lg:space-y-1.5 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setActiveTab("portfolio")}
                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap lg:w-full ${activeTab === 'portfolio' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                        >
                            <HiOutlineHome className="text-base" />
                            Portfolio
                        </button>
                        <button
                            onClick={() => setActiveTab("storage")}
                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap lg:w-full ${activeTab === 'storage' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                        >
                            <HiOutlineFolderOpen className="text-base" />
                            Secure Vault
                        </button>
                        {userProfile?.role === 'admin' && (
                            <button
                                onClick={() => setActiveTab("security")}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap lg:w-full ${activeTab === 'security' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                            >
                                <HiOutlineShieldCheck className="text-base" />
                                Security
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab("advanced")}
                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap lg:w-full ${activeTab === 'advanced' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                        >
                            <HiOutlineArchive className="text-base" />
                            Advanced
                        </button>
                    </nav>

                    <div className="hidden lg:block p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Environment Health</h4>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold text-slate-400">Database Engine</span>
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">STABLE</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400">Vault Encryption</span>
                            <span className="text-[9px] font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg border border-brand/20">AES-256</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Separator - Desktop */}
                <div className="hidden lg:block w-px bg-slate-800/50 self-stretch"></div>

                {/* Content Stream */}
                <div className="flex-1 w-full">

                    <AnimatePresence mode="wait">
                        {activeTab === "portfolio" && (
                            <motion.div
                                key="portfolio-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-12"
                            >
                                {/* Property Section Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Assets & Properties</h3>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Register and manage your real estate units. Start here to define your rental income sources and tenant details.</p>
                                    </div>
                                    {!showAddForm && (
                                        <button
                                            onClick={() => setShowAddForm(true)}
                                            className="flex items-center gap-3 px-8 py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand/20"
                                        >
                                            <HiOutlinePlus className="text-xl" />
                                            Register Property
                                        </button>
                                    )}
                                </div>

                                {showAddForm && (
                                    <div className="stats-card p-5 sm:p-8 border-brand/30 ring-1 ring-brand/10 bg-slate-950/40">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-3">
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
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                                                <div className="space-y-8">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Unique Property Name</label>
                                                        <input required className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rent Amount (AUD)</label>
                                                            <input required type="number" className="input-field" value={formData.rentAmount} onChange={e => setFormData({ ...formData, rentAmount: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Effective Date</label>
                                                            <input required type="date" className="input-field" value={formData.rentEffectiveDate} onChange={e => setFormData({ ...formData, rentEffectiveDate: e.target.value })} />
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
                                                                            <span className="text-[11px] font-bold text-slate-400">{formatHistoryDate(h.effectiveDate)}</span>
                                                                            <span className="text-xs font-black text-white">${h.amount} <span className="text-[9px] text-slate-600 font-bold">/ WK</span></span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Multi-Tenant List</label>
                                                        <div className="flex gap-2">
                                                            <input className="input-field flex-1" placeholder="Resident Name" value={tenantInput} onChange={e => setTenantInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTenant())} />
                                                            <button type="button" onClick={addTenant} className="p-3 bg-slate-800 hover:bg-brand text-white rounded-2xl transition-all"><HiOutlinePlus /></button>
                                                        </div>
                                                        <div className="bg-slate-950 rounded-[2rem] p-6 border border-slate-800 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                                                            {formData.tenantNames.length === 0 ? (
                                                                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs gap-3"><HiOutlineUser className="text-3xl opacity-20" />No residents assigned</div>
                                                            ) : (
                                                                formData.tenantNames.map((name, i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl group transition-all hover:border-brand/40">
                                                                        <span className="text-sm font-bold text-slate-300">{name}</span>
                                                                        <button type="button" onClick={() => removeTenant(i)} className="p-2 text-slate-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"><HiOutlineTrash /></button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 mt-12 border-t border-slate-800">
                                                <button type="button" onClick={resetForm} className="btn-ghost px-10 order-2 sm:order-1">Discard</button>
                                                <button type="submit" className="btn-primary py-5 px-16 text-[10px] font-black uppercase tracking-widest order-1 sm:order-2">SAVE ASSET</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Property List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {properties.map(p => (
                                        <div key={p.id} className="stats-card group">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="p-4 bg-brand/10 border border-brand/20 rounded-2xl text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-brand/30">
                                                    <HiOutlineHome className="text-2xl" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPropertyForHistory(p);
                                                            setIsHistoryOpen(true);
                                                        }}
                                                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-brand hover:text-white hover:bg-brand transition-all shadow-sm"
                                                        title="View History"
                                                    >
                                                        <HiOutlineSearchCircle className="text-lg" />
                                                    </button>
                                                    <button onClick={() => toggleArchive(p)} className={`p-3 bg-slate-950 border border-slate-800 rounded-xl transition-all shadow-sm ${p.status === 'ARCHIVED' ? 'text-emerald-500 hover:text-white hover:bg-emerald-500' : 'text-amber-500 hover:text-white hover:bg-amber-500'}`} title={p.status === 'ARCHIVED' ? 'Unarchive Asset' : 'Archive Asset'}>
                                                        <HiOutlineArchive className="text-lg" />
                                                    </button>
                                                    <button onClick={() => handleEdit(p)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:border-brand/50 transition-all shadow-sm"><HiOutlinePencilAlt /></button>
                                                    <button onClick={() => handleDelete(p.id)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-danger hover:border-danger/30 transition-all shadow-sm"><HiOutlineTrash /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className={`text-2xl font-black tracking-tighter leading-tight ${p.status === 'ARCHIVED' ? 'text-slate-500 line-through decoration-slate-700' : 'text-slate-100'}`}>{p.name}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {(p.tenantNames || []).map((name, i) => (
                                                        <span key={i} className="text-[9px] font-black bg-slate-900 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800 uppercase tracking-tighter">{name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Weekly Rate</p>
                                                    <p className="text-2xl font-black text-white leading-none tracking-tighter">${p.rentAmount}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Asset Status</p>
                                                    {p.status === 'ARCHIVED' ? (
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 tracking-tighter shadow-sm">PAST / ARCHIVED</span>
                                                            {p.moveOutDate && <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Exited: {format(parseISO(p.moveOutDate), "MMM dd, yyyy")}</p>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20 tracking-tighter shadow-sm">ACTIVE UNIT</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Report Profiles */}
                                <div className="stats-card p-8 border-slate-800 bg-slate-900/40 mt-12">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-white tracking-tight">Report Profiles</h3>
                                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black leading-relaxed">
                                                Define the "Filing Entities" used for generating reports (e.g., 'Shikhar\'s Personal Ledger'). These names appear on exported financial statements.
                                            </p>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <input className="input-field py-3 flex-1 md:w-64" placeholder="e.g. Shikhar's Rental Profile" value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddProfile())} />
                                            <button onClick={handleAddProfile} className="p-3 bg-brand text-white rounded-2xl hover:scale-105 transition-all"><HiOutlinePlus className="text-xl" /></button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {reportProfiles.map(prof => (
                                            <div key={prof.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl group hover:border-brand/40 transition-all">
                                                <span className="text-sm font-bold text-slate-300">{prof.name}</span>
                                                <button onClick={() => handleDeleteProfile(prof.id)} className="p-1.5 text-slate-600 hover:text-danger rounded-lg"><HiOutlineTrash /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </motion.div>
                        )}

                        {activeTab === "storage" && (
                            <motion.div
                                key="storage-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/50">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            <button onClick={() => setCurrentFolder("ROOT")} className="hover:text-brand transition-colors">Vault</button>
                                            {currentFolder !== "ROOT" && (
                                                <>
                                                    <HiOutlineChevronRight className="text-[8px]" />
                                                    <span className="text-white">{currentFolder === 'GENERAL' ? 'General Files' : properties.find(p => p.id === currentFolder)?.name || 'Folder'}</span>
                                                </>
                                            )}
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
                                            {currentFolder === "ROOT" ? "Secure Vault" : properties.find(p => p.id === currentFolder)?.name || "General Records"}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">
                                            {currentFolder === "ROOT"
                                                ? "Central repository for legal documents, leases, and receipts. Organised by property for easy audit compliance."
                                                : "Viewing secured documents specifically linked to this asset."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                            <button
                                                onClick={() => setViewMode("GRID")}
                                                className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                <HiOutlineViewGrid className="text-xl" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode("LIST")}
                                                className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                <HiOutlineViewList className="text-xl" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsDocModalOpen(true)}
                                            className="flex items-center gap-3 px-6 py-3.5 bg-brand text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand/20 text-[10px]"
                                        >
                                            <HiOutlinePlus className="text-lg" />
                                            Deposit
                                        </button>
                                    </div>
                                </div>

                                {/* Navigation & Filters */}
                                <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-2 rounded-2xl border border-slate-800/50">
                                    {currentFolder !== "ROOT" && (
                                        <button
                                            onClick={() => setCurrentFolder("ROOT")}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                                        >
                                            <HiOutlineArrowLeft /> Back
                                        </button>
                                    )}
                                    <div className="flex-1 relative min-w-[200px]">
                                        <HiOutlineSearchCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                        <input
                                            className="input-field pl-12 py-3 bg-transparent border-none text-[11px]"
                                            placeholder="Search records..."
                                            value={docSearch}
                                            onChange={(e) => setDocSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:border-brand/40"
                                        value={docFilter}
                                        onChange={(e) => setDocFilter(e.target.value)}
                                    >
                                        <option value="ALL">ALL TYPES</option>
                                        <option value="LEASE">LEASE</option>
                                        <option value="INSURANCE">INSURANCE</option>
                                        <option value="BOND">BOND</option>
                                    </select>
                                </div>

                                {currentFolder === "ROOT" ? (
                                    /* ROOT VIEW: Folder Categories */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Asset Folders */}
                                        {properties.map(p => {
                                            const count = documents.filter(d => d.propertyId === p.id).length;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setCurrentFolder(p.id)}
                                                    className="group p-6 bg-slate-900/40 border border-slate-800 hover:border-brand/40 hover:bg-brand/5 rounded-[2rem] transition-all text-left space-y-4"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-3 bg-brand/10 text-brand rounded-2xl group-hover:bg-brand group-hover:text-white transition-all">
                                                            <HiOutlineFolder className="text-2xl" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 uppercase tracking-widest">{count} Files</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-black uppercase tracking-tight truncate">{p.name}</h4>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Property Assets</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {/* General Folder */}
                                        <button
                                            onClick={() => setCurrentFolder("GENERAL")}
                                            className="group p-6 bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 rounded-[2rem] transition-all text-left space-y-4"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-slate-700 group-hover:text-white transition-all">
                                                    <HiOutlineFolder className="text-2xl" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-600 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 uppercase tracking-widest">
                                                    {documents.filter(d => !d.propertyId || d.propertyId === 'GENERAL').length} Files
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-tight truncate">General & Misc</h4>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Unsorted Records</p>
                                            </div>
                                        </button>
                                    </div>
                                ) : (
                                    /* INSIDE FOLDER VIEW */
                                    <div className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                                        {documents
                                            .filter(d => {
                                                const matchesFolder = currentFolder === 'GENERAL' ? (!d.propertyId || d.propertyId === '') : (d.propertyId === currentFolder);
                                                const matchesSearch = d.name.toLowerCase().includes(docSearch.toLowerCase());
                                                const matchesType = docFilter === 'ALL' || d.type === docFilter;
                                                return matchesFolder && matchesSearch && matchesType;
                                            }).length === 0 ? (
                                            <div className="col-span-full py-20 text-center bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                                <HiOutlineDocumentText className="text-6xl text-slate-800 mx-auto mb-4 opacity-10" />
                                                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Folder is Empty</p>
                                            </div>
                                        ) : (
                                            documents
                                                .filter(d => {
                                                    const matchesFolder = currentFolder === 'GENERAL' ? (!d.propertyId || d.propertyId === '') : (d.propertyId === currentFolder);
                                                    const matchesSearch = d.name.toLowerCase().includes(docSearch.toLowerCase());
                                                    const matchesType = docFilter === 'ALL' || d.type === docFilter;
                                                    return matchesFolder && matchesSearch && matchesType;
                                                })
                                                .map(docObj => {
                                                    const expiry = docObj.expiryDate ? parseISO(docObj.expiryDate) : null;
                                                    const isExpired = expiry && isBefore(expiry, new Date());

                                                    if (viewMode === 'LIST') {
                                                        return (
                                                            <div
                                                                key={docObj.id}
                                                                onClick={() => setSelectedPreviewDoc(docObj)}
                                                                className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/50 hover:border-brand/30 hover:bg-slate-900 rounded-2xl transition-all cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-4 flex-1 truncate">
                                                                    <div className={`p-2 rounded-xl border ${isExpired ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-brand transition-colors'}`}>
                                                                        <HiOutlineDocumentText className="text-xl" />
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate">{docObj.name}</h4>
                                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{docObj.type} • {docObj.uploadedAt?.toDate ? format(docObj.uploadedAt.toDate(), "MMM dd") : '---'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {expiry && <span className={`text-[8px] font-black uppercase ${isExpired ? 'text-danger' : 'text-slate-600'}`}>{isExpired ? 'Expired' : format(expiry, "MMM yy")}</span>}
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(docObj); }} className="p-2 text-slate-500 hover:text-danger"><HiOutlineTrash /></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div
                                                            key={docObj.id}
                                                            onClick={() => setSelectedPreviewDoc(docObj)}
                                                            className="stats-card group cursor-pointer relative overflow-hidden"
                                                        >
                                                            {isExpired && <div className="absolute top-0 left-0 w-full h-1 bg-danger"></div>}
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className={`p-3 border rounded-2xl ${isExpired ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-brand/10 border-brand/20 text-brand'}`}>
                                                                    <HiOutlineDocumentText className="text-xl" />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(docObj); }} className="text-slate-600 hover:text-danger p-1"><HiOutlineTrash /></button>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h3 className="text-sm font-black text-white truncate">{docObj.name}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/10 uppercase">{docObj.type}</span>
                                                                    {expiry && <span className={`text-[8px] font-black uppercase ${isExpired ? 'text-danger' : 'text-slate-500'}`}>{isExpired ? 'Expired' : `Exp: ${format(expiry, "MMM dd, yyyy")}`}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === "security" && userProfile?.role === "admin" && (
                            <motion.div
                                key="security-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/50">
                                    <div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Team Management</h3>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 italic leading-relaxed">
                                            Control who can access this environment. Add trusted emails to the guest list to allow them to register and contribute to the ledger.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Invite Form */}
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="stats-card bg-slate-950/40 border-brand/20">
                                            <h4 className="text-white font-black uppercase tracking-tight mb-2 flex items-center gap-2">
                                                <HiOutlinePlus className="text-brand" /> Provision Access
                                            </h4>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-6">Authorize new collaborators via email</p>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Identifier</label>
                                                    <input
                                                        className="input-field"
                                                        placeholder="user@domain.com"
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleInvite}
                                                    className="btn-primary w-full py-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20"
                                                >
                                                    Add to Guest List
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                People on the guest list can register a new account. Once they sign up, they will appear in your team directory.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Guest List */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Authorized Accounts</h4>
                                        <div className="space-y-2">
                                            {invitations.length === 0 ? (
                                                <div className="py-20 text-center bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                                    <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">No active invitations</p>
                                                </div>
                                            ) : (
                                                invitations.map(invite => (
                                                    <div key={invite.email} className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-slate-950 rounded-2xl text-slate-500 group-hover:text-brand transition-colors">
                                                                <HiOutlineUser />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black text-white">{invite.email}</h5>
                                                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Authorized Guest • {invite.role}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[10px] font-bold text-slate-600">Invited By {invite.invitedBy === 'system' ? 'System' : invite.invitedBy.split('@')[0]}</span>
                                                            <button
                                                                onClick={() => handleRemoveInvite(invite.email)}
                                                                className="p-2 text-slate-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <HiOutlineTrash />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "advanced" && (
                            <motion.div
                                key="advanced-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-12"
                            >
                                {/* Data Maintenance Section */}
                                <div className="pb-8 border-b border-slate-800/50">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Environment Maintenance</h3>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Sensitive system tools for data integrity, version migrations, and disaster recovery.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="stats-card bg-slate-900/40 p-0 overflow-hidden border-slate-800">
                                        <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                                            <h4 className="text-white font-black uppercase tracking-tight flex items-center gap-2">
                                                <HiOutlineRefresh className="text-brand" /> Database Migration
                                            </h4>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">Upgrade legacy records to the latest schema version.</p>
                                        </div>
                                        <div className="p-8">
                                            <DataMigration />
                                        </div>
                                    </div>

                                    <div className="stats-card bg-slate-900/40 p-0 overflow-hidden border-slate-800">
                                        <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                                            <h4 className="text-white font-black uppercase tracking-tight flex items-center gap-2">
                                                <HiOutlineTrash className="text-danger" /> Asset Restoration
                                            </h4>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">Recover transactions that were accidentally moved to the trash.</p>
                                        </div>
                                        <div className="p-8">
                                            {archivedTransactions.length === 0 ? (
                                                <div className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">Vault trash empty</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {archivedTransactions.map(t => (
                                                        <div key={t.id} className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{t.propertyName}</p>
                                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">${t.amount} Unit</p>
                                                            </div>
                                                            <button onClick={() => handleRestore(t.id)} className="p-2.5 bg-brand/10 text-brand rounded-xl hover:bg-brand hover:text-white transition-all">
                                                                <HiOutlineRefresh className="text-xs" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <PropertyHistoryModal
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                        property={selectedPropertyForHistory}
                        currentUser={currentUser}
                    />

                    <DocumentUploadModal
                        isOpen={isDocModalOpen}
                        onClose={() => setIsDocModalOpen(false)}
                        properties={properties}
                        currentUser={currentUser}
                    />

                    <DocumentPreviewModal
                        isOpen={!!selectedPreviewDoc}
                        onClose={() => setSelectedPreviewDoc(null)}
                        document={selectedPreviewDoc}
                        onDelete={handleDeleteDocument}
                    />

                    <PropertyArchiveModal
                        isOpen={isArchiveModalOpen}
                        onClose={() => setIsArchiveModalOpen(false)}
                        property={selectedPropertyForArchive}
                        properties={properties}
                        currentUser={currentUser}
                        onComplete={() => {
                            console.log("Archive complete");
                        }}
                    />
                </div>
            </div>
        </Layout>
    );
}
