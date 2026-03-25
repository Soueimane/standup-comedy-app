import mongoose, { Schema, Document, Types } from 'mongoose';

export type VenueBookingStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'CANCELLED_BY_OWNER' | 'CANCELLED_BY_REQUESTER';

export interface VenueBookingDocument extends Document {
  venue: Types.ObjectId;
  requester: Types.ObjectId;
  requestedDate: Date;
  startTime: string;
  endTime: string;
  message?: string;
  status: VenueBookingStatus;
  ownerResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const venueBookingSchema = new Schema<VenueBookingDocument>(
  {
    venue: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    message: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REFUSED', 'CANCELLED_BY_OWNER', 'CANCELLED_BY_REQUESTER'],
      default: 'PENDING',
      index: true,
    },
    ownerResponse: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

venueBookingSchema.index({ venue: 1, requestedDate: 1, status: 1 });

export const VenueBookingModel = mongoose.model<VenueBookingDocument>('VenueBooking', venueBookingSchema);
