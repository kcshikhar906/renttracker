import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, PieChart } from "lucide-react";

export default function Navbar() {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Failed to log out", err);
        }
    }

    return (
        <nav className="sticky top-0 z-50 px-4 py-3">
            <div className="max-w-6xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                        <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                        RentTracker
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400 hidden md:block">
                        {currentUser?.email}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 px-4 py-2 rounded-xl transition-all border border-slate-700/50 group"
                    >
                        <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
