import { type ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 focus-visible:ring-zinc-900',
  secondary: 'bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 focus-visible:ring-zinc-500',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
};

type Variant = keyof typeof variants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${variants[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
