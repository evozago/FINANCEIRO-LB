import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  trend?: {
    value: number;
    label: string;
  };
  description?: string;
}

const variantStyles = {
  default: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
  success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20",
  warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20",
  danger: "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20",
  info: "bg-gradient-to-br from-info/10 to-info/5 border-info/20",
  purple: "bg-gradient-to-br from-purple/10 to-purple/5 border-purple/20",
};

const iconStyles = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  purple: "text-purple",
};

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, title, value, icon: Icon, variant = "default", trend, description, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                {trend && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"} {Math.abs(trend.value)}%
                  </span>
                )}
              </div>
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
              {trend?.label && <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>}
            </div>
            {Icon && (
              <div className={cn("p-3 rounded-lg bg-background/50", iconStyles[variant])}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StatsCard.displayName = "StatsCard";

export { StatsCard };
