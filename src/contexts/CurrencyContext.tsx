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
  AE: "USD",
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

const COUNTRY_NAME_CURRENCY: Record<string, CurrencyCode> = {
  NIGERIA: "NGN",
  USA: "USD",
  "UNITED STATES": "USD",
  "UNITED KINGDOM": "GBP",
  UK: "GBP",
  CANADA: "CAD",
  AUSTRALIA: "AUD",
  GHANA: "GHS",
  KENYA: "KES",
  "SOUTH AFRICA": "ZAR",
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  currencyCode: CurrencyCode;
  rates: Record<CurrencyCode, number>; // naira per 1 unit
  /** Persist and apply a user-chosen currency */
  setCurrency: (code: CurrencyCode) => Promise<void>;
  /** Convert naira amount to user's local currency */
  fromNaira: (naira: number) => number;
  /** Convert a local-currency amount back to naira */
  toNaira: (local: number) => number;
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

export const CURRENCY_LIST: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
];

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

const RATE_KEYS: Record<Exclude<CurrencyCode, "NGN">, string> = {
  USD: "currency_rate_usd",
  EUR: "currency_rate_eur",
  GBP: "currency_rate_gbp",
  CAD: "currency_rate_cad",
  AUD: "currency_rate_aud",
  ZAR: "currency_rate_zar",
  GHS: "currency_rate_ghs",
  KES: "currency_rate_kes",
};

const fetchWithTimeout = async (url: string, timeoutMs = 4500) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Geo lookup failed: ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES);
  const [loaded, setLoaded] = useState(false);

  // Fetch exchange rates from admin_settings
  useEffect(() => {
    const fetchRates = async () => {
      const rateKeys = Object.values(RATE_KEYS);
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", rateKeys);

      if (data) {
        const newRates = { ...DEFAULT_RATES };
        for (const row of data) {
          const val = Number(row.value);
          if (val > 0) {
            const currencyEntry = Object.entries(RATE_KEYS).find(([, key]) => key === row.key);
            if (currencyEntry) newRates[currencyEntry[0] as Exclude<CurrencyCode, "NGN">] = val;
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
      // 1. Prefer user-selected currency from onboarding
      try {
        const { data: sess } = await supabase.auth.getUser();
        const uid = sess?.user?.id;
        if (uid) {
          const { data: p } = await supabase.from("profiles").select("preferred_currency").eq("id", uid).maybeSingle();
          const pref = (p?.preferred_currency ?? "").toString().toUpperCase();
          if (pref && (pref in CURRENCY_MAP)) {
            setCurrencyCode(pref as CurrencyCode);
            setLoaded(true);
            return;
          }
        }
      } catch { /* fall through to geo */ }
      try {
        const lookups = [
          () => fetchWithTimeout("https://ipapi.co/json/"),
          () => fetchWithTimeout("https://ipwho.is/"),
        ];
        let countryCode = "";
        let countryName = "";
        for (const lookup of lookups) {
          try {
            const data = await lookup();
            countryCode = String(data?.country_code || "").toUpperCase();
            countryName = String(data?.country || "").toUpperCase();
            if (countryCode || countryName) break;
          } catch {
            continue;
          }
        }

        if (countryCode && COUNTRY_CURRENCY[countryCode]) {
          setCurrencyCode(COUNTRY_CURRENCY[countryCode]);
        } else if (countryName && COUNTRY_NAME_CURRENCY[countryName]) {
          setCurrencyCode(COUNTRY_NAME_CURRENCY[countryName]);
        } else {
          setCurrencyCode("USD");
        }
      } catch {
        setCurrencyCode("USD");
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

  const toNaira = useCallback(
    (local: number): number => {
      if (currencyCode === "NGN") return local;
      return local * rates[currencyCode];
    },
    [currencyCode, rates]
  );

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyCode(code);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess?.user?.id;
      if (uid) await supabase.from("profiles").update({ preferred_currency: code }).eq("id", uid);
    } catch { /* keep the local selection even if persistence fails */ }
  }, []);

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
    <CurrencyContext.Provider value={{ currency, currencyCode, rates, setCurrency, fromNaira, toNaira, formatCurrency, formatCurrencyCompact, formatPoints, loaded }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
};
