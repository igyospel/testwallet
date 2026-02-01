import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: "royal-gradient text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 border-0 hover:brightness-110 font-heading ornate-title",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/20 hover:brightness-110",
            outline: "border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary backdrop-blur-sm",
            ghost: "hover:bg-primary/5 hover:text-primary transition-all",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
        };

        const sizes = {
            sm: "h-9 px-3 text-[10px] rounded-lg tracking-widest uppercase",
            md: "h-12 px-6 py-2 rounded-xl text-xs font-bold tracking-widest uppercase",
            lg: "h-14 px-8 rounded-2xl text-sm font-black tracking-[0.2em] uppercase",
            icon: "h-10 w-10 p-2 rounded-xl",
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "relative inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";
