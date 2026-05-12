import React from "react";

type CardProps = {
  children: React.ReactNode;
  title?: string;
  className?: string;
};

export default function Card({ children, title, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {title && <h3 className="font-bold text-gray-800 mb-4">{title}</h3>}
      {children}
    </div>
  );
}