import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface IProperty extends Document {
  landlordId: mongoose.Types.ObjectId;
  name: string;
  address: IAddress;
  description?: string;
  photos: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  unitCount?: number; // virtual
}

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: [true, 'Street is required'], trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    country: { type: String, required: [true, 'Country is required'], trim: true },
    zip: { type: String, required: [true, 'Zip code is required'], trim: true },
  },
  { _id: false }
);

const PropertySchema = new Schema<IProperty>(
  {
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: [200, 'Property name cannot exceed 200 characters'],
    },
    address: {
      type: AddressSchema,
      required: [true, 'Address is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    photos: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: count units belonging to this property
PropertySchema.virtual('unitCount', {
  ref: 'Unit',
  localField: '_id',
  foreignField: 'propertyId',
  count: true,
});

const Property: Model<IProperty> =
  mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);

export default Property;
