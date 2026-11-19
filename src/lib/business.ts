import { prisma } from "./prisma";
import { envBusiness, HEX_COLOR, splitList } from "./env";

export type BusinessConfig = ReturnType<typeof envBusiness>;

/** Env defaults, overridden by the optional single-row Settings table. */
export async function getBusiness(): Promise<BusinessConfig> {
  const base = envBusiness();
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!s) return base;
    return {
      ...base,
      keywords: s.keywords ? splitList(s.keywords) : base.keywords,
      staff: s.staffNames ? splitList(s.staffNames) : base.staff,
      services: s.services ? splitList(s.services) : base.services,
      brandColor: s.brandColor && HEX_COLOR.test(s.brandColor) ? s.brandColor : base.brandColor,
    };
  } catch (err) {
    console.error("getBusiness: DB unavailable, using env defaults", err);
    return base;
  }
}

/** Subset that is safe to send to the browser. */
export function publicBusiness(b: BusinessConfig) {
  return {
    name: b.name,
    category: b.category,
    city: b.city,
    googleReviewUrl: b.googleReviewUrl,
    staff: b.staff,
    services: b.services,
    brandColor: b.brandColor,
    contact: b.contact,
    logoUrl: b.logoUrl,
  };
}
export type PublicBusiness = ReturnType<typeof publicBusiness>;
