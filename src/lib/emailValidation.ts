// Allowed email domains - only recognized providers
const ALLOWED_DOMAINS = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "outlook.co.uk",
  "hotmail.co.uk",
  "live.co.uk",
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.com.ng",
  "ymail.com",
  "rocketmail.com",
  // iCloud / Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // ProtonMail
  "protonmail.com",
  "proton.me",
  "pm.me",
]);

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.has(domain);
}

export function getBlockedDomainMessage(): string {
  return "Please use a recognized email provider (Gmail, Outlook, Yahoo, iCloud, or ProtonMail).";
}
