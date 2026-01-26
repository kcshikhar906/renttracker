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
    doc
} from "firebase/firestore";
import {
    HiOutlineHome,
    HiOutlineUser,
    HiOutlineCurrencyDollar,
    HiOutlineTrash,
    HiOutlinePencilAlt,
    HiOutlinePlus,
    HiOutlineX
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    // Property Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [tenantInput, setTenantInput] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        tenantNames: [] // Now an array
    });

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "properties"),
            where("uid", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProperties(data);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

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
            const payload = {
                uid: currentUser.uid,
                name: formData.name,
                rentAmount: parseFloat(formData.rentAmount),
                tenantNames: formData.tenantNames,
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
            tenantNames: p.tenantNames || []
        });
        setShowAddForm(true);
    }

    function resetForm() {
        setFormData({
            name: "",
            rentAmount: "",
            tenantNames: []
        });
        setTenantInput("");
        setEditingId(null);
        setShowAddForm(false);
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Basic Info */}
                                    <div className="space-y-6">
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
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Weekly Rent (AUD)</label>
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
                                    </div>

                                    {/* Tenant Management */}
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

                                        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 min-h-[120px] max-h-[200px] overflow-y-auto space-y-2">
                                            {formData.tenantNames.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
                                                    No tenants added yet
                                                </div>
                                            ) : (
                                                formData.tenantNames.map((name, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl group transition-all hover:border-brand/40">
                                                        <span className="text-sm font-medium text-slate-300">{name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTenant(i)}
                                                            className="text-slate-600 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <HiOutlineTrash />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-800">
                                    <button type="button" onClick={resetForm} className="btn-ghost px-8">Discard</button>
                                    <button type="submit" className="btn-primary py-4 px-12 text-xs font-black uppercase tracking-widest">
                                        {editingId ? "Commit Changes" : "Confirm Registration"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-4 bg-brand/10 border border-brand/20 rounded-2xl text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300">
                                    <HiOutlineHome className="text-2xl" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(p)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:border-brand/50 transition-all">
                                        <HiOutlinePencilAlt />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-danger hover:border-danger/30 transition-all">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{p.name}</h3>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {(p.tenantNames || []).map((name, i) => (
                                        <span key={i} className="text-[10px] font-bold bg-slate-900 text-slate-400 px-2 py-1 rounded-md border border-slate-800 uppercase tracking-tighter">
                                            {name}
                                        </span>
                                    ))}
                                    {(!p.tenantNames || p.tenantNames.length === 0) && (
                                        <span className="text-[10px] font-bold text-warning uppercase">No Residents</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Weekly Rent</p>
                                    <p className="text-xl font-black text-white leading-none">${p.rentAmount}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</p>
                                    <span className="text-[10px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">Active</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
