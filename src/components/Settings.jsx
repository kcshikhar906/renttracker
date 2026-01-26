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
    HiOutlineCalendar,
    HiOutlineTrash,
    HiOutlinePencilAlt,
    HiOutlinePlus,
    HiOutlineCheckCircle
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Settings() {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    // Property Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        tenantName: "",
        paidUpTo: format(new Date(), "yyyy-MM-dd")
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

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                uid: currentUser.uid,
                name: formData.name,
                rentAmount: parseFloat(formData.rentAmount),
                tenantName: formData.tenantName,
                paidUpTo: formData.paidUpTo, // Store as ISO string
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
            tenantName: p.tenantName,
            paidUpTo: p.paidUpTo
        });
        setShowAddForm(true);
    }

    function resetForm() {
        setFormData({
            name: "",
            rentAmount: "",
            tenantName: "",
            paidUpTo: format(new Date(), "yyyy-MM-dd")
        });
        setEditingId(null);
        setShowAddForm(false);
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Property Management</h2>
                        <p className="text-slate-500 mt-1">Manage your rental units and tenant details.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-primary gap-2 py-3 px-6"
                    >
                        <HiOutlinePlus className="text-xl" />
                        Add Property
                    </button>
                </div>

                {/* Form Section */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="stats-card p-8 border-brand/30"
                        >
                            <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                                {editingId ? "Edit Property" : "Add New Property"}
                            </h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2 col-span-1 md:col-span-1 border-r border-slate-800 pr-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Property Name</label>
                                    <input
                                        required
                                        className="input-field py-2.5 text-sm"
                                        placeholder="e.g. Ultimo Room"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 border-r border-slate-800 pr-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rent p/w</label>
                                    <div className="relative">
                                        <HiOutlineCurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            required
                                            type="number"
                                            className="input-field pl-9 py-2.5 text-sm"
                                            placeholder="280"
                                            value={formData.rentAmount}
                                            onChange={e => setFormData({ ...formData, rentAmount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 border-r border-slate-800 pr-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant Name</label>
                                    <input
                                        required
                                        className="input-field py-2.5 text-sm"
                                        placeholder="John Doe"
                                        value={formData.tenantName}
                                        onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paid Up To</label>
                                    <input
                                        required
                                        type="date"
                                        className="input-field py-2.5 text-sm"
                                        value={formData.paidUpTo}
                                        onChange={e => setFormData({ ...formData, paidUpTo: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-6 pt-6 border-t border-slate-800">
                                    <button type="button" onClick={resetForm} className="btn-ghost text-xs">Cancel</button>
                                    <button type="submit" className="btn-primary py-2 px-8 text-xs font-bold uppercase tracking-widest">
                                        {editingId ? "Update Record" : "Save Property"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Properties List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center">
                            <HiOutlineHome className="text-6xl text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-500">No properties registered. Add one to start tracking rent.</p>
                        </div>
                    )}

                    {properties.map(p => (
                        <motion.div
                            layout
                            key={p.id}
                            className="stats-card group hover:border-brand/40"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-brand/10 border border-brand/20 rounded-2xl text-brand">
                                    <HiOutlineHome className="text-2xl" />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(p)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                        <HiOutlinePencilAlt />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-500 hover:text-danger transition-colors">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-200">{p.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <HiOutlineUser className="text-slate-600" />
                                <span className="text-sm font-medium text-slate-500">{p.tenantName}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-800">
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Weekly Rent</p>
                                    <p className="text-lg font-bold text-slate-100">${p.rentAmount}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Paid Up To</p>
                                    <p className="text-sm font-bold text-slate-300">
                                        {format(new Date(p.paidUpTo), "MMM dd, yyyy")}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
