import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    doc,
    serverTimestamp
} from "firebase/firestore";
import { HiOutlineDatabase, HiOutlineChevronRight, HiOutlineExclamationCircle, HiOutlineCheckCircle } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function DataMigration() {
    const { currentUser } = useAuth();
    const [status, setStatus] = useState("checking"); // checking, found, migrating, completed, none
    const [orphanCount, setOrphanCount] = useState(0);
    const [details, setDetails] = useState({ transactions: 0, properties: 0, profiles: 0, documents: 0 });

    useEffect(() => {
        if (!currentUser) return;
        checkForOrphanData();
    }, [currentUser]);

    async function checkForOrphanData() {
        try {
            setStatus("checking");
            const collections = ["transactions", "properties", "profiles", "documents"];
            let total = 0;
            let counts = { transactions: 0, properties: 0, profiles: 0, documents: 0 };

            for (const collName of collections) {
                const q = query(collection(db, collName), where("uid", "==", currentUser.uid));
                const snap = await getDocs(q);
                counts[collName] = snap.docs.length;
                total += snap.docs.length;
            }

            setDetails(counts);
            setOrphanCount(total);
            setStatus(total > 0 ? "found" : "none");
        } catch (err) {
            console.error("Migration check failed:", err);
            setStatus("none"); // Likely permission denied or other error
        }
    }

    async function runMigration() {
        try {
            setStatus("migrating");
            const batch = writeBatch(db);
            const collections = ["transactions", "properties", "profiles", "documents"];

            for (const collName of collections) {
                const q = query(collection(db, collName), where("uid", "==", currentUser.uid));
                const snap = await getDocs(q);

                snap.docs.forEach((oldDoc) => {
                    const data = oldDoc.data();
                    // New path: users/{uid}/{collName}/{docId}
                    const newDocRef = doc(db, "users", currentUser.uid, collName, oldDoc.id);

                    // Remove uid from the data as it's now implicit in the path
                    const { uid, ...cleanData } = data;

                    batch.set(newDocRef, {
                        ...cleanData,
                        migratedAt: serverTimestamp()
                    });

                    // Optional: Delete old record
                    batch.delete(oldDoc.ref);
                });
            }

            await batch.commit();
            setStatus("completed");

            // Reload page or trigger UI update
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            console.error("Migration fatal error:", err);
            alert("Migration failed: " + err.message);
            setStatus("found");
        }
    }

    if (status === "none" || !currentUser) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-8"
            >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <HiOutlineDatabase className="text-9xl text-amber-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-500">
                                {status === "completed" ? (
                                    <HiOutlineCheckCircle className="text-3xl animate-bounce" />
                                ) : status === "migrating" ? (
                                    <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                                ) : (
                                    <HiOutlineExclamationCircle className="text-3xl" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {status === "completed" ? "Migration Successful!" :
                                        status === "migrating" ? "Relocating Data Infrastructure..." :
                                            "Legacy Data Detected"}
                                </h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">
                                    {status === "completed" ? "Your records have been moved to the new secure vault. Refreshing ledger..." :
                                        status === "migrating" ? "Please do not close the browser while we update your ledger paths." :
                                            `We found ${orphanCount} legacy records from the old system. They must be moved to continue.`}
                                </p>

                                {status === "found" && (
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        {Object.entries(details).map(([key, count]) => count > 0 && (
                                            <span key={key} className="px-3 py-1 bg-slate-950/50 border border-slate-800 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                {count} {key}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {status === "found" && (
                            <button
                                onClick={runMigration}
                                className="group flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                            >
                                Start Secure Migration
                                <HiOutlineChevronRight className="text-lg group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
