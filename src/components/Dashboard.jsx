import React from "react";
import Navbar from "./Navbar";
import AddTransactionForm from "./AddTransactionForm";
import TransactionList from "./TransactionList";
import { motion } from "framer-motion";

export default function Dashboard() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Add Transaction */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5"
                    >
                        <div className="sticky top-28">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-1 h-8 bg-indigo-500 rounded-full"></span>
                                Add Transaction
                            </h2>
                            <AddTransactionForm />
                        </div>
                    </motion.div>

                    {/* Right Column - History */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-7"
                    >
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-1 h-8 bg-purple-500 rounded-full"></span>
                            Transaction History
                        </h2>
                        <TransactionList />
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
