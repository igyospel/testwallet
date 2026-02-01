import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "glass-card rounded-3xl p-6 text-card-foreground",
                className
            )}
            {...props}
        />
    )
);
Card.displayName = "Card";
