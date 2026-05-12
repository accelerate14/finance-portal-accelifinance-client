import React from "react";
// Add the 'type' keyword here
import type { ReactNode } from "react"; 

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose} // This closes the modal when clicking the backdrop
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()} // This prevents closing when clicking the white box
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            &times;
          </button>
        </div>
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end border-t">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}