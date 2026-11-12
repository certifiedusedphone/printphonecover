export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://printphonecover.com").replace(/\/$/, "");
export const SITE_NAME = "PrintPhoneCover";
export const SOCIALS = [
  { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@printphonecover" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/printphonecover" },
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/printphonecover" },
  { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@printphonecover" },
] as const;
export type SocialKey = (typeof SOCIALS)[number]["key"];
export const BUSINESS = [
  { key: "business_name", label: "Legal business name (your LLC)", placeholder: "Example Phone Cases LLC" },
  { key: "contact_email", label: "Customer contact email", placeholder: "support@printphonecover.com" },
  { key: "contact_phone", label: "Customer phone", placeholder: "+1 832-566-8506" },
  { key: "business_address", label: "Business address", placeholder: "6855 Harwin Dr. Suite M1, Houston, TX 77036" },
] as const;
export type BusinessKey = (typeof BUSINESS)[number]["key"];
export type Settings = Partial<Record<SocialKey | BusinessKey, string>>;

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
