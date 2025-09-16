import mongoose, { Document, Model, Schema } from 'mongoose';
import { IUser } from './User';
import { StadiumSearchFilters } from '../services/stadium-search.service';

export interface ISavedSearch extends Document {
  user: IUser['_id'];
  name: string;
  filters: StadiumSearchFilters;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const savedSearchSchema: Schema<ISavedSearch> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
savedSearchSchema.index({ user: 1 });
savedSearchSchema.index({ user: 1, isDefault: 1 });

const SavedSearch: Model<ISavedSearch> = mongoose.model<ISavedSearch>('SavedSearch', savedSearchSchema);

export default SavedSearch;