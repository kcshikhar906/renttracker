import React, { useState, useEffect } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { Fragment } from "react";
import {
    HiOutlineX,
    HiOutlineDocumentText,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlinePaperClip,
    HiOutlineClock,
    HiOutlineArrowNarrowRight
} from "react-icons/hi";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { format, isValid } from "date-fns";

export default function PropertyHistoryModal({ isOpen, onClose, property, currentUser }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && property && currentUser) {
            setLoading(true);
            const q = query(
                collection(db, "transactions"),
                where("uid", "==", currentUser.uid),
                where("propertyId", "==", property.id),
                orderBy("date", "desc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTransactions(data);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching property history:", err);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [isOpen, property, currentUser]);

    const safeFormat = (dateData, formatStr) => {
        if (!dateData) return "—";
        const date = typeof dateData === 'string' ? new Date(dateData) : dateData.toDate();
        return isValid(date) ? format(date, formatStr) : "Invalid";
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
                            <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-5 sm:p-8 shadow-2xl transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-brand/10 border border-brand/20 rounded-2xl text-brand">
                                            <HiOutlineClock className="text-2xl" />
                                        </div>
                                        <div>
                                            <DialogTitle as="h3" className="text-xl font-black text-white uppercase tracking-tighter">
                                                Audit Trail: {property?.name}
                                            </DialogTitle>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Historical verification & receipts</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-850 p-2 rounded-xl transition-all">
                                        <HiOutlineX className="text-xl" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-slate-800 border-t-brand rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Compiling Records</p>
                                        </div>
                                    ) : transactions.length === 0 ? (
                                        <div className="py-20 text-center bg-slate-950/30 border-2 border-dashed border-slate-800 rounded-[2rem]">
                                            <HiOutlineDocumentText className="text-5xl text-slate-800 mx-auto mb-4 opacity-20" />
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No historical data found for this asset.</p>
                                        </div>
                                    ) : (
                                        transactions.map((t) => (
                                            <div key={t.id} className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl group hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${t.type === 'RENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {t.type === 'RENT' ? <HiOutlineCalendar className="text-xl" /> : <HiOutlineDocumentText className="text-xl" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-white">${t.amount.toLocaleString()}</span>
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${t.type === 'RENT' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/5 border-amber-500/20 text-amber-500'}`}>
                                                                {t.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-0.5">
                                                            {safeFormat(t.date, "MMMM dd, yyyy")} • {t.tenant || "System Record"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {t.fileUrl ? (
                                                        <a
                                                            href={t.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand border border-brand/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-lg shadow-brand/10"
                                                        >
                                                            <HiOutlinePaperClip className="text-sm" />
                                                            View Receipt
                                                        </a>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-700 uppercase italic px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">No Digital Copy</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-800">
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 bg-slate-800 text-slate-300 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                                    >
                                        Close Audit Trail
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
