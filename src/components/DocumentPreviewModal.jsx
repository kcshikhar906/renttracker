import React from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { Fragment } from "react";
import {
    HiOutlineX,
    HiOutlineDownload,
    HiOutlineTrash,
    HiOutlineExternalLink
} from "react-icons/hi";

export default function DocumentPreviewModal({ isOpen, onClose, document, onDelete }) {
    if (!document) return null;

    const isImage = document.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = document.name?.match(/\.pdf$/i);

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[80]" onClose={onClose}>
                <DialogBackdrop transition className="fixed inset-0 bg-slate-950/95 backdrop-blur-md transition-opacity" />

                <div className="fixed inset-0 z-10 w-screen h-screen overflow-hidden">
                    <div className="flex h-full items-center justify-center p-0 sm:p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full h-full sm:h-[90vh] max-w-6xl transform overflow-hidden sm:rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl transition-all flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-brand/10 border border-brand/20 rounded-xl text-brand">
                                            <HiOutlineExternalLink className="text-xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tighter truncate max-w-[200px] sm:max-w-md">
                                                {document.name}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{document.type} • {document.propertyName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={document.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                                            title="Download"
                                        >
                                            <HiOutlineDownload className="text-xl" />
                                        </a>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Delete this document permanently?")) {
                                                    onDelete(document);
                                                    onClose();
                                                }
                                            }}
                                            className="p-3 bg-slate-850 hover:bg-danger/20 text-slate-400 hover:text-danger rounded-xl transition-all"
                                            title="Delete"
                                        >
                                            <HiOutlineTrash className="text-xl" />
                                        </button>
                                        <div className="w-px h-8 bg-slate-800 mx-2 hidden sm:block"></div>
                                        <button onClick={onClose} className="p-3 bg-brand text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand/20">
                                            <HiOutlineX className="text-xl" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content Body */}
                                <div className="flex-1 bg-slate-950/50 overflow-hidden relative flex items-center justify-center p-4">
                                    {isImage ? (
                                        <img
                                            src={document.url}
                                            alt={document.name}
                                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                        />
                                    ) : isPdf ? (
                                        <iframe
                                            src={`${document.url}#toolbar=0`}
                                            className="w-full h-full rounded-xl"
                                            title="PDF Preview"
                                        />
                                    ) : (
                                        <div className="text-center space-y-4">
                                            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-slate-800">
                                                <HiOutlineExternalLink className="text-4xl text-slate-700" />
                                            </div>
                                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Preview Not Available for this File Type</p>
                                            <a href={document.url} target="_blank" rel="noopener noreferrer" className="btn-primary px-8 py-3 inline-block">Download to View</a>
                                        </div>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
