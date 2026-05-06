import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "ZAR" | "GHS" | "KES";

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  rateToNaira: number; // How many naira = 1 unit of this currency
}

const CURRENCY_MAP: Record<CurrencyCode, Omit<CurrencyInfo, "rateToNaira">> = {
  NGN: { code: "NGN", symbol: "₦" },
  USD: { code: "USD", symbol: "$" },
  EUR: { code: "EUR", symbol: "€" },
  GBP: { code: "GBP", symbol: "£" },
  CAD: { code: "CAD", symbol: "C$" },
  AUD: { code: "AUD", symbol: "A$" },
  ZAR: { code: "ZAR", symbol: "R" },
  GHS: { code: "GHS", symbol: "₵" },
  KES: { code: "KES", symbol: "KSh" },
};

// Country code -> currency
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  NG: "NGN",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  ZA: "ZAR",
  GH: "GHS",
  KE: "KES",
  GB: "GBP",
  // European countries
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR",
  DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR",
  LU: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR",
  ES: "EUR", HR: "EUR",
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  currencyCode: CurrencyCode;
  rates: Record<CurrencyCode, number>; // naira per 1 unit
  /** Convert naira amount to user's local currency */
  fromNaira: (naira: number) => number;
  /** Format a naira amount in user's local currency */
  formatCurrency: (naira: number) => string;
  /** Format compact (K/M) in user's local currency */
  formatCurrencyCompact: (naira: number) => string;
  /** Points to local currency display */
  formatPoints: (points: number) => string;
  /** Is currency loaded */
  loaded: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_RATES: Record<CurrencyCode, number> = {
  NGN: 1,
  USD: 1600,  // 1 USD = 1600 NGN default
  EUR: 1700,
  GBP: 2000,
  CAD: 1170,
  AUD: 1050,
  ZAR: 86,
  GHS: 145,
  KES: 12,
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("NGN");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES);
  const [loaded, setLoaded] = useState(false);

  // Fetch exchange rates from admin_settings
  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["currency_rate_usd", "currency_rate_eur", "currency_rate_gbp"]);

      if (data) {
        const newRates = { ...DEFAULT_RATES };
        for (const row of data) {
          const val = Number(row.value);
          if (val > 0) {
            if (row.key === "currency_rate_usd") newRates.USD = val;
            if (row.key === "currency_rate_eur") newRates.EUR = val;
            if (row.key === "currency_rate_gbp") newRates.GBP = val;
          }
        }
        setRates(newRates);
      }
    };
    fetchRates();
  }, []);

  // Detect geolocation
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const countryCode = data?.country_code?.toUpperCase();
        if (countryCode) {
          const mapped = COUNTRY_CURRENCY[countryCode] || "USD";
          setCurrencyCode(mapped);
        } else {
          setCurrencyCode("USD");
        }
      } catch {
        // Default to USD for non-NG users, but since we can't detect, default NGN
        setCurrencyCode("NGN");
      }
      setLoaded(true);
    };
    detectCurrency();
  }, []);

  const currency: CurrencyInfo = {
    ...CURRENCY_MAP[currencyCode],
    rateToNaira: rates[currencyCode],
  };

  const fromNaira = useCallback(
    (naira: number): number => {
      if (currencyCode === "NGN") return naira;
      return naira / rates[currencyCode];
    },
    [currencyCode, rates]
  );

  const formatCurrency = useCallback(
    (naira: number): string => {
      if (currencyCode === "NGN") {
        return "₦" + naira.toLocaleString("en-NG");
      }
      const converted = naira / rates[currencyCode];
      return CURRENCY_MAP[currencyCode].symbol + converted.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    [currencyCode, rates]
  );

  const formatCurrencyCompact = useCallback(
    (naira: number): string => {
      const val = currencyCode === "NGN" ? naira : naira / rates[currencyCode];
      const sym = CURRENCY_MAP[currencyCode].symbol;
      if (Math.abs(val) >= 1_000_000) return sym + (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1) + "M";
      if (Math.abs(val) >= 1_000) return sym + (val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1) + "K";
      return sym + (currencyCode === "NGN" ? String(Math.round(val)) : val.toFixed(2));
    },
    [currencyCode, rates]
  );

  const formatPoints = useCallback(
    (points: number): string => {
      const nairaValue = Math.floor(points * 0.5);
      return formatCurrency(nairaValue);
    },
    [formatCurrency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, currencyCode, rates, fromNaira, formatCurrency, formatCurrencyCompact, formatPoints, loaded }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
};
