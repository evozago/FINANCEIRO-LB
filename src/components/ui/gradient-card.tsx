import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: "primary" | "success" | "warning" | "info";
  glassmorphism?: boolean;
}

const gradientStyles = {
  primary: "bg-gradient-to-br from-primary to-purple",
  success: "bg-gradient-to-br from-success to-success/80",
  warning: "bg-gradient-to-br from-warning to-destructive",
  info: "bg-gradient-to-br from-info to-primary",
};

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient = "primary", glassmorphism = false, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "text-white border-0 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
          gradient && gradientStyles[gradient],
          glassmorphism && "backdrop-blur-sm bg-opacity-90",
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

GradientCard.displayName = "GradientCard";

export { GradientCard };
