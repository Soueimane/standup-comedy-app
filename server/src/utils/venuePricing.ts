export type PricingType =
  | 'heure'
  | 'demi_journee'
  | 'journee'
  | 'soiree'
  | 'forfait'
  | 'pourcentage_billetterie'
  | 'gratuit';

export interface BookingAmountResult {
  amount: number;
  requiresPayment: boolean;
  needsSlot: boolean;
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function computeBookingAmount(
  venue: { pricePerEvent: number; pricingType?: PricingType },
  booking: { startTime?: string; endTime?: string }
): BookingAmountResult {
  const { pricePerEvent, pricingType } = venue;

  switch (pricingType) {
    case 'heure': {
      const start = booking.startTime ?? '00:00';
      const end = booking.endTime ?? '01:00';
      const hours = Math.ceil(Math.max(1, (toMin(end) - toMin(start)) / 60));
      return { amount: hours * pricePerEvent, requiresPayment: true, needsSlot: true };
    }
    case 'demi_journee':
      return { amount: pricePerEvent, requiresPayment: true, needsSlot: true };
    case 'journee':
      return { amount: pricePerEvent, requiresPayment: true, needsSlot: false };
    case 'soiree':
      return { amount: pricePerEvent, requiresPayment: true, needsSlot: false };
    case 'forfait':
      return { amount: pricePerEvent, requiresPayment: true, needsSlot: false };
    case 'gratuit':
      return { amount: 0, requiresPayment: false, needsSlot: false };
    case 'pourcentage_billetterie':
      return { amount: 0, requiresPayment: false, needsSlot: false };
    default:
      // Fallback : pricingType absent
      return {
        amount: pricePerEvent,
        requiresPayment: pricePerEvent > 0,
        needsSlot: true,
      };
  }
}
