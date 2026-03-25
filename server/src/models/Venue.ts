import mongoose, { Schema, Document, Types } from 'mongoose';

export interface VenueDocument extends Document {
  name: string;
  owner: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema = new Schema<VenueDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, maxlength: 2000 },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    photos: [{ type: String }],
    equipment: [{ type: String }],
    capacity: { type: Number, required: true, min: 1 },
    pricePerEvent: { type: Number, required: true, min: 0 },
    venueType: {
      type: String,
      enum: ['bar', 'theatre', 'salle_des_fetes', 'autre'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

venueSchema.index({ city: 1 });
venueSchema.index({ owner: 1, isActive: 1 });

export const VenueModel = mongoose.model<VenueDocument>('Venue', venueSchema);
