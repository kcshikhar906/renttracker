import React, { useState } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { Fragment } from "react";
import {
    HiOutlineX,
    HiOutlineUpload,
    HiOutlineDocumentText,
    HiOutlineOfficeBuilding,
    HiOutlineCalendar,
    HiOutlineTag
} from "react-icons/hi";
import { db, storage } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function DocumentUploadModal({ isOpen, onClose, properties, currentUser }) {
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState("LEASE");
    const [propertyId, setPropertyId] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !currentUser) return;

        setLoading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = `documents/${currentUser.uid}/${fileName}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            const propertyName = propertyId ? properties.find(p => p.id === propertyId)?.name : "General / Multiple";

            await addDoc(collection(db, "documents"), {
                uid: currentUser.uid,
                name: file.name,
                type: docType,
                propertyId: propertyId || null,
                propertyName,
                expiryDate: expiryDate || null,
                url: downloadUrl,
                storagePath,
                uploadedAt: Timestamp.now()
            });

            handleClose();
        } catch (err) {
            console.error("Vault Deposit Exception:", err);
            if (err.code?.includes('storage/')) {
                alert("Storage Error: Permission denied or bucket full.");
            } else if (err.code?.includes('permission-denied')) {
                alert("Security Error: Firestore database rules rejected the entry.");
            } else {
                alert(`Upload failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setDocType("LEASE");
        setPropertyId("");
        setExpiryDate("");
        onClose();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={handleClose}>
                <DialogBackdrop transition className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm transition-opacity" />

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
                            <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-brand/10 border border-brand/20 rounded-2xl text-brand">
                                            <HiOutlineDocumentText className="text-2xl" />
                                        </div>
                                        <div>
                                            <DialogTitle as="h3" className="text-xl font-black text-white uppercase tracking-tighter">
                                                Vault Deposit
                                            </DialogTitle>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secure compliance storage</p>
                                        </div>
                                    </div>
                                    <button onClick={handleClose} className="text-slate-500 hover:text-white bg-slate-850 p-2 rounded-xl transition-all">
                                        <HiOutlineX className="text-xl" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* File Drop */}
                                    <div className="relative group border-2 border-dashed border-slate-800 hover:border-brand/50 rounded-[2rem] p-8 transition-all bg-slate-950/30 text-center">
                                        <input
                                            type="file"
                                            required={!file}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => setFile(e.target.files[0])}
                                        />
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                <HiOutlineUpload className="text-3xl text-brand" />
                                            </div>
                                            <p className="text-sm font-bold text-white uppercase tracking-tight truncate">
                                                {file ? file.name : "Select Compliance Document"}
                                            </p>
                                            <p className="text-[9px] text-slate-600 font-extrabold uppercase tracking-widest">Supports PDF & Image Files</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Classification</label>
                                            <div className="relative">
                                                <HiOutlineTag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <select
                                                    className="input-field pl-10"
                                                    value={docType}
                                                    onChange={(e) => setDocType(e.target.value)}
                                                >
                                                    <option value="LEASE">Lease Agreement</option>
                                                    <option value="INSURANCE">Insurance Policy</option>
                                                    <option value="BOND">Bond Lodgement</option>
                                                    <option value="CONDITION_REPORT">Condition Report</option>
                                                    <option value="TAX">Tax Correspondence</option>
                                                    <option value="OTHER">Other / Misc</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Linked Asset</label>
                                            <div className="relative">
                                                <HiOutlineOfficeBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <select
                                                    className="input-field pl-10"
                                                    value={propertyId}
                                                    onChange={(e) => setPropertyId(e.target.value)}
                                                >
                                                    <option value="">General Purpose</option>
                                                    {properties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Renewal / Expiry Date</label>
                                        <div className="relative">
                                            <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="date"
                                                className="input-field pl-10"
                                                value={expiryDate}
                                                onChange={(e) => setExpiryDate(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase px-1 italic">Leave blank if no expiry exists</p>
                                    </div>

                                    <button
                                        disabled={loading || !file}
                                        type="submit"
                                        className="btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            "Secure to Vault"
                                        )}
                                    </button>
                                </form>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
