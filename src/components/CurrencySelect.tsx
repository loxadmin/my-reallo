import { useCurrency, CURRENCY_LIST, type CurrencyCode } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

/** Minimal currency picker — persists the choice to the user's profile. */
export default function CurrencySelect({ className, compact }: { className?: string; compact?: boolean }) {
  const { currencyCode, setCurrency } = useCurrency();

  return (
    <select
      value={currencyCode}
      onChange={(e) => void setCurrency(e.target.value as CurrencyCode)}
      className={cn(
        "rounded-lg border border-border bg-background text-foreground",
        compact ? "text-[11px] px-2 py-1" : "text-[13px] px-3 py-2 w-full",
        className,
      )}
      style={{ fontSize: compact ? undefined : 16 }}
      aria-label="Currency"
    >
      {CURRENCY_LIST.map((c) => (
        <option key={c.code} value={c.code}>
          {compact ? `${c.symbol} ${c.code}` : `${c.symbol}  ${c.code} — ${c.label}`}
        </option>
      ))}
    </select>
  );
}
