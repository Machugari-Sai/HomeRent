import mongoose from 'mongoose';
import { seedData } from './data.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homerent';

const flexibleSchema = new mongoose.Schema({ id: String }, { strict: false, versionKey: false, id: false });

const Property = mongoose.models.Property || mongoose.model('Property', flexibleSchema, 'properties');
const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', flexibleSchema, 'inquiries');
const Visit = mongoose.models.Visit || mongoose.model('Visit', flexibleSchema, 'visits');
const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', flexibleSchema, 'favorites');
const Booking = mongoose.models.Booking || mongoose.model('Booking', flexibleSchema, 'bookings');
const Notification = mongoose.models.Notification || mongoose.model('Notification', flexibleSchema, 'notifications');
const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', flexibleSchema, 'testimonials');
const Blog = mongoose.models.Blog || mongoose.model('Blog', flexibleSchema, 'blogs');

const models = {
  properties: Property,
  inquiries: Inquiry,
  visits: Visit,
  favorites: Favorite,
  bookings: Booking,
  notifications: Notification,
  testimonials: Testimonial,
  blogs: Blog
};

let connectionPromise;

async function connectDatabase() {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }
  await connectionPromise;
}

const cleanDocument = (document) => {
  const item = document.toObject ? document.toObject() : document;
  delete item._id;
  return item;
};

async function seedCollection(name, seedItems) {
  const Model = models[name];
  if (!seedItems.length) return;

  await Model.deleteMany({ id: { $exists: false } });
  const existing = await Model.find({ id: { $in: seedItems.map((item) => item.id).filter(Boolean) } }).lean();
  const existingIds = new Set(existing.map((item) => item.id));
  const missing = seedItems.filter((item) => !existingIds.has(item.id));

  if (missing.length) {
    await Model.insertMany(missing);
  }
}

async function ensureSeedData() {
  await seedCollection('properties', seedData.properties);
  await seedCollection('inquiries', seedData.inquiries);
  await seedCollection('visits', seedData.visits);
  await seedCollection('favorites', seedData.favorites.map((id) => ({ id })));
  await seedCollection('bookings', seedData.bookings || []);
  await seedCollection('notifications', seedData.notifications || []);
  await seedCollection('testimonials', seedData.testimonials);
  await seedCollection('blogs', seedData.blogs);
}

export async function readStore() {
  await connectDatabase();
  await ensureSeedData();

  const [properties, inquiries, visits, favorites, bookings, notifications, testimonials, blogs] = await Promise.all([
    Property.find().lean(),
    Inquiry.find().lean(),
    Visit.find().lean(),
    Favorite.find().lean(),
    Booking.find().lean(),
    Notification.find().lean(),
    Testimonial.find().lean(),
    Blog.find().lean()
  ]);

  return {
    properties: properties.map(cleanDocument),
    inquiries: inquiries.map(cleanDocument),
    visits: visits.map(cleanDocument),
    favorites: favorites.map((item) => item.id),
    bookings: bookings.map(cleanDocument),
    notifications: notifications.map(cleanDocument),
    testimonials: testimonials.map(cleanDocument),
    blogs: blogs.map(cleanDocument)
  };
}

async function replaceCollection(Model, items) {
  await Model.deleteMany({});
  if (items.length) {
    await Model.insertMany(items);
  }
}

export async function writeStore(data) {
  await connectDatabase();
  await Promise.all([
    replaceCollection(Property, data.properties || []),
    replaceCollection(Inquiry, data.inquiries || []),
    replaceCollection(Visit, data.visits || []),
    replaceCollection(Favorite, (data.favorites || []).map((id) => ({ id }))),
    replaceCollection(Booking, data.bookings || []),
    replaceCollection(Notification, data.notifications || []),
    replaceCollection(Testimonial, data.testimonials || []),
    replaceCollection(Blog, data.blogs || [])
  ]);
}
