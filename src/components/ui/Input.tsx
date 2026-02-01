import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{label}</label>}
                <div className="relative group">
                    <input
                        type={type}
                        className={cn(
                            "flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground ring-0 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-black/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                            icon && "pl-10",
                            error && "border-destructive focus:border-destructive",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            {icon}
                        </div>
                    )}
                </div>
                {error && <p className="text-xs text-destructive ml-1 animate-in slide-in-from-top-1">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';
