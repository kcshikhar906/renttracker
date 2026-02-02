import React, { Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { HiOutlineExclamation, HiOutlineX } from "react-icons/hi";

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, transaction }) {
    if (!transaction) return null;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[80]" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
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
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl transition-all">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineExclamation className="text-3xl text-red-500" />
                                    </div>

                                    <DialogTitle as="h3" className="text-xl font-black text-white uppercase tracking-tighter">
                                        Delete Transaction?
                                    </DialogTitle>

                                    <p className="mt-2 text-sm text-slate-400 leading-relaxed px-4">
                                        Are you sure you want to remove this transaction? This action can be undone in Settings.
                                    </p>

                                    <div className="mt-8 flex flex-col gap-3 w-full">
                                        <button
                                            onClick={onConfirm}
                                            className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                        >
                                            Yes, Remove
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 bg-slate-800 text-slate-300 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
