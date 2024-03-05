import mongoose, { Schema, Document } from 'mongoose';

interface ICountry extends Document {
    created_at: Date;
    updated_at: Date;
    name: string;
    cca: string;
    currency_code: string;
    currency: string;
    capital: string;
    region: string;
    area: number;
    population: number;
    subregion?: string;
    map_url?: string;
    flag_url?: string;
}

const countrySchema: Schema<ICountry> = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    name: { type: String, required: true },
    cca: { type: String, required: true },
    currency_code: { type: String, required: true },
    currency: { type: String, required: true },
    capital: { type: String, required: true },
    region: { type: String, required: true },
    area: { type: Number, required: true },
    population: { type: Number, required: true },
    subregion: { type: String, required: false },
    map_url: { type: String, required: false },
    flag_url: { type: String, required: false }
});

countrySchema.pre<ICountry>('save', function (next) {
    this.updated_at = new Date();
    next();
});

const Country = mongoose.model<ICountry>('Country', countrySchema);

export default Country;
