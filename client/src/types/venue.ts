import type { IUserData } from './user';

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
  | 'CANCELLED_BY_REQUESTER';

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
