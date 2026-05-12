import React from "react";

type ButtonProps = {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  variant = "primary",
  children,
  className,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-md cursor-pointer text-sm transition focus:outline-none";

  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "border border-gray-300 hover:bg-gray-50",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${className || ""} ${base} ${variants[variant]} ${
        loading ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}