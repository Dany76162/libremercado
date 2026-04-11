import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "primary";
}

export function Logo({ className, size = "md", variant = "light" }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const variantClasses = {
    light: "text-primary-foreground",
    dark: "text-foreground",
    primary: "text-primary",
  };

  return (
    <span
      className={cn(
        "font-bold tracking-tight inline-flex items-center gap-1",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      data-testid="logo-pachapay"
    >
      <span className="relative">
        <span 
          className="font-black"
          style={{ 
            fontFamily: "'Oxanium', sans-serif",
            letterSpacing: "0.02em"
          }}
        >
          PACHA
        </span>
        <span 
          className="font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
          style={{ 
            fontFamily: "'Oxanium', sans-serif",
            letterSpacing: "0.02em"
          }}
        >
          PAY
        </span>
      </span>
      <svg 
        viewBox="0 0 24 24" 
        className={cn(
          "inline-block",
          size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-7 h-7"
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="15.5" />
        <polyline points="22 8.5 12 15.5 2 8.5" />
        <polyline points="2 15.5 12 8.5 22 15.5" />
        <line x1="12" y1="2" x2="12" y2="8.5" />
      </svg>
    </span>
  );
}

export function LogoIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div 
      className={cn(
        "relative bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-4/5 h-4/5 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="15.5" />
        <polyline points="22 8.5 12 15.5 2 8.5" />
      </svg>
    </div>
  );
}
