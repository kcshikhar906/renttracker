import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
    HiOutlineHome,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlinePlus,
    HiOutlineUserCircle,
    HiOutlineShieldExclamation
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import AddTransactionModal from "./AddTransactionModal";

const ALLOWED_EMAILS = ["shikharkc63@gmail.com"];

export default function Layout({ children }) {
    const { logout, currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isAllowed = currentUser && ALLOWED_EMAILS.includes(currentUser.email);

    const navItems = [
        { name: "Overview", path: "/", icon: HiOutlineHome },
        { name: "Transactions", path: "/transactions", icon: HiOutlineClipboardList },
        { name: "Settings", path: "/settings", icon: HiOutlineCog },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full">
                    <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <HiOutlineShieldExclamation className="text-4xl text-danger" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 mb-4 tracking-tight">Access Denied</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Your account ({currentUser?.email}) is not authorized to access this private financial ledger. Please contact the administrator for permission.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="btn-primary w-full py-4 gap-2"
                    >
                        <HiOutlineLogout className="text-xl" />
                        Switch Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-200">
            {/* Sidebar - Desktop Only */}
            <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-slate-900 border-r border-slate-800">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
                            <span className="text-xl font-bold text-white">R</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">RentTracker</span>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`sidebar-link ${isActive ? "sidebar-link-active" : "sidebar-link-inactive"}`}
                                >
                                    <item.icon className="text-xl" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-800">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary w-full gap-2 text-sm py-3.5"
                    >
                        <HiOutlinePlus className="text-lg" />
                        Add Transaction
                    </button>

                    <div className="flex items-center gap-3 mt-8 p-2 rounded-xl border border-transparent hover:bg-white/5 transition-all">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-9 h-9 rounded-full ring-2 ring-slate-800" />
                        ) : (
                            <HiOutlineUserCircle className="text-3xl text-slate-500" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.displayName || 'User'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-500 hover:text-danger p-1">
                            <HiOutlineLogout />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 pb-24 md:pb-6">
                {/* Header - Desktop Only */}
                <header className="hidden md:flex h-16 items-center justify-between px-8 sticky top-0 bg-slate-950/50 backdrop-blur-md z-30 border-b border-slate-900">
                    <h1 className="text-lg font-semibold text-slate-100 uppercase tracking-widest">
                        {navItems.find(i => i.path === location.pathname)?.name || "Dashboard"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-[10px] font-black bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-500 uppercase tracking-tighter">
                            <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                            Administrative Access
                        </span>
                    </div>
                </header>

                {/* Dynamic Content */}
                <div className="p-4 md:p-8 w-full max-w-full overflow-x-hidden">
                    {children}
                </div>
            </main>

            {/* FAB - Mobile Only */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="md:hidden fixed right-6 bottom-24 w-14 h-14 bg-brand rounded-full flex items-center justify-center text-white shadow-2xl z-40 active:scale-95 transition-transform"
            >
                <HiOutlinePlus className="text-2xl" />
            </button>

            {/* Bottom Nav - Mobile Only */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around px-6 z-40">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 ${isActive ? "text-brand" : "text-slate-500"}`}
                        >
                            <item.icon className="text-2xl" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 text-slate-500"
                >
                    <HiOutlineLogout className="text-2xl" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logout</span>
                </button>
            </nav>

            {/* Transaction Modal */}
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
