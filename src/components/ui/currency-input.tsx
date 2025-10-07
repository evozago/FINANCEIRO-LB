import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: number | string;
  onValueChange: (valueInCents: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    // Format number to Brazilian currency format
    const formatToBRL = (valueInCents: number): string => {
      const valueInReais = valueInCents / 100;
      return valueInReais.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Initialize display value
    React.useEffect(() => {
      const numericValue = typeof value === "string" ? parseInt(value) || 0 : value;
      setDisplayValue(formatToBRL(numericValue));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value;

      // Remove all non-numeric characters
      const numericOnly = input.replace(/\D/g, "");

      if (numericOnly === "") {
        setDisplayValue("");
        onValueChange(0);
        return;
      }

      // Parse as integer (represents cents)
      const valueInCents = parseInt(numericOnly, 10);

      // Format for display
      setDisplayValue(formatToBRL(valueInCents));

      // Callback with value in cents
      onValueChange(valueInCents);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy editing
      e.target.select();
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        ref={ref}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
