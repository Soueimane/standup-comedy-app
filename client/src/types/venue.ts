import type { IUserData } from './user';

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
