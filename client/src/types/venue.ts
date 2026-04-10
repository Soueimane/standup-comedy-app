import type { IUserData } from './user';

export type CancellationPolicy = 'flexible' | 'moderate' | 'firm';

export const CANCELLATION_POLICIES = [
  { value: 'flexible' as CancellationPolicy, label: 'Flexible' },
  { value: 'moderate' as CancellationPolicy, label: 'Modérée' },
  { value: 'firm' as CancellationPolicy, label: 'Stricte' },
];

export const CANCELLATION_POLICY_LABELS: Record<CancellationPolicy, string> = {
  flexible: 'Flexible',
  moderate: 'Modérée',
  firm: 'Stricte',
};

export const CANCELLATION_POLICY_DESCRIPTIONS: Record<CancellationPolicy, string> = {
  flexible: 'Remboursement intégral si annulation ≥ 24h avant l\'événement. Aucun remboursement < 24h.',
  moderate: 'Remboursement intégral si annulation ≥ 5 jours avant l\'événement. Aucun remboursement < 5 jours.',
  firm: 'Remboursement intégral ≥ 30 jours avant. 50% entre 7 et 30 jours. Aucun remboursement < 7 jours.',
};

export const VENUE_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'salle_des_fetes', label: 'Salle des fêtes' },
  { value: 'autre', label: 'Autre' },
] as const;

export const VENUE_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar',
  theatre: 'Théâtre',
  salle_des_fetes: 'Salle des fêtes',
  autre: 'Autre',
};

export const EQUIPMENT_OPTIONS = [
  'Scène', 'Sono', 'Micro', 'Éclairage', 'Projecteur', 'Bar', 'Vestiaires', 'Parking', 'Accès PMR', 'Loges',
] as const;

export interface IVenue {
  _id: string;
  name: string;
  owner: IUserData;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  equipment: string[];
  capacity: number;
  pricePerEvent: number;
  venueType: 'bar' | 'theatre' | 'salle_des_fetes' | 'autre';
  cancellationPolicy: CancellationPolicy;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VenueBookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'CONFIRMED'
  | 'CANCELLED_BY_OWNER'
  | 'CANCELLED_BY_REQUESTER'
  | 'EXPIRED';

export interface IVenueBooking {
  _id: string;
  venue: IVenue;
  requester: IUserData;
  requestedDate: string;
  startTime: string;
  endTime: string;
  message?: string;
  status: VenueBookingStatus;
  ownerResponse?: string;
  paymentStatus: 'none' | 'pending' | 'paid' | 'refund_pending' | 'refunded';
  paidAmount?: number;
  paidAt?: string;
  paymentDeadlineAt?: string;
  refundedAmount?: number;
  stripeRefundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IVenueBlockedDate {
  _id: string;
  venue: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
