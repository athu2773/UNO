import { Card, CardContent } from "./card";
import { cn } from "../../lib/utils";
import { Icon } from "@radix-ui/react-select";

interface GradientStatsCardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  className?: string;
}

export const GradientStatsCard: React.FC<GradientStatsCardProps> = ({
  value,
  label,
  icon,
  gradient,
  className
}) => {
  return (
    <Card className={cn(
      "bg-gray-800/50 border-gray-700 backdrop-blur-sm overflow-hidden relative",
      className
    )}>
      {/* Gradient accent bar at top */}
      <div className={`absolute inset-x-0 top-0 h-1 ${gradient}`} />

      <CardContent className="p-4 pt-6 text-center relative">
        {/* Icon with gradient background */}
        <div className="flex justify-center mb-2">
          <div className={`p-2 rounded-full ${gradient} bg-opacity-20`}>
            {Icon}
          </div>
        </div>

        {/* Value with gradient text */}
        <div className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-1">
          <span className={gradient}>{value}</span>
        </div>

        {/* Label */}
        <div className="text-sm text-gray-400">{label}</div>
      </CardContent>
    </Card>
  );
};