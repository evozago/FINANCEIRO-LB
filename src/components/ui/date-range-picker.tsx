import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecione o período",
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const getLabel = React.useCallback(() => {
    if (value?.from && value?.to) {
      return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`;
    }

    if (value?.from) {
      return format(value.from, "dd/MM/yyyy", { locale: ptBR });
    }

    return placeholder;
  }, [value, placeholder]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal min-w-[260px]",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          {getLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
