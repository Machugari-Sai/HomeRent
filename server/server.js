import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readStore, writeStore } from './store.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  }
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use(express.json({ limit: '2mb' }));

const matchesText = (value, query) => String(value).toLowerCase().includes(String(query).toLowerCase());
const bookingRef = () => `HR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
const cleanString = (value) => String(value || '').trim();
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function requireFields(body, fields) {
  return fields.filter((field) => !cleanString(body[field]));
}

function createNotification(db, { category, title, message, bookingId, propertyId }) {
  const notification = {
    id: crypto.randomUUID(),
    category,
    title,
    message,
    bookingId,
    propertyId,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification);
  return notification;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'HomeRent API' });
});

app.get('/api/properties', asyncHandler(async (req, res) => {
  const db = await readStore();
  const { location, type, maxBudget, bedrooms, bathrooms, furnished, amenity } = req.query;
  let properties = db.properties;

  if (location) properties = properties.filter((item) => matchesText(item.location, location));
  if (type) properties = properties.filter((item) => item.type === type);
  if (maxBudget) properties = properties.filter((item) => item.price <= Number(maxBudget));
  if (bedrooms) properties = properties.filter((item) => item.bedrooms === Number(bedrooms));
  if (bathrooms) properties = properties.filter((item) => item.bathrooms >= Number(bathrooms));
  if (furnished) properties = properties.filter((item) => item.furnished === furnished);
  if (amenity) properties = properties.filter((item) => item.amenities?.includes(amenity));

  res.json(properties);
}));

app.get('/api/properties/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const property = db.properties.find((item) => item.id === req.params.id);
  if (!property) return res.status(404).json({ message: 'Property not found' });
  res.json(property);
}));

app.post('/api/properties', asyncHandler(async (req, res) => {
  const missing = requireFields(req.body, ['title', 'type', 'location', 'price', 'bedrooms', 'bathrooms', 'area', 'owner', 'phone', 'email', 'image', 'description']);
  if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  if (!isEmail(req.body.email)) return res.status(400).json({ message: 'Invalid owner email' });
  const db = await readStore();
  const property = {
    id: crypto.randomUUID(),
    status: 'Available Now',
    gallery: req.body.gallery?.length ? req.body.gallery : [req.body.image],
    amenities: req.body.amenities || [],
    ...req.body,
    price: toNumber(req.body.price),
    bedrooms: toNumber(req.body.bedrooms),
    bathrooms: toNumber(req.body.bathrooms),
    area: toNumber(req.body.area),
    deposit: toNumber(req.body.deposit),
    maintenance: toNumber(req.body.maintenance)
  };
  db.properties.unshift(property);
  const notification = createNotification(db, {
    category: 'owner',
    title: 'Property Added Successfully',
    message: `${property.title} is now live on HomeRent.`,
    propertyId: property.id
  });
  await writeStore(db);
  res.status(201).json({ property, notification });
}));

app.put('/api/properties/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const index = db.properties.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Property not found' });
  db.properties[index] = { ...db.properties[index], ...req.body };
  await writeStore(db);
  res.json(db.properties[index]);
}));

app.delete('/api/properties/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  db.properties = db.properties.filter((item) => item.id !== req.params.id);
  db.favorites = db.favorites.filter((id) => id !== req.params.id);
  db.inquiries = db.inquiries.filter((item) => item.propertyId !== req.params.id);
  await writeStore(db);
  res.status(204).end();
}));

app.get('/api/favorites', asyncHandler(async (req, res) => {
  const db = await readStore();
  res.json(db.properties.filter((item) => db.favorites.includes(item.id)));
}));

app.post('/api/favorites/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const property = db.properties.find((item) => item.id === req.params.id);
  if (!property) return res.status(404).json({ message: 'Property not found' });
  if (!db.favorites.includes(req.params.id)) db.favorites.push(req.params.id);
  const notification = createNotification(db, {
    category: 'favorites',
    title: 'New property added to favorites',
    message: `${property?.title || 'Property'} was saved to your favorites.`,
    propertyId: req.params.id
  });
  await writeStore(db);
  res.json({ favorites: db.favorites, notification });
}));

app.delete('/api/favorites/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  db.favorites = db.favorites.filter((id) => id !== req.params.id);
  await writeStore(db);
  res.json({ favorites: db.favorites });
}));

app.post('/api/visits', asyncHandler(async (req, res) => {
  const required = ['propertyId', 'name', 'phone', 'email', 'date', 'time'];
  const missing = requireFields(req.body, required);
  if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  if (!isEmail(req.body.email)) return res.status(400).json({ message: 'Invalid email' });
  const db = await readStore();
  const visit = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...req.body };
  db.visits.unshift(visit);
  createNotification(db, {
    category: 'booking',
    title: 'Visit request received',
    message: 'Your property visit request was saved successfully.',
    propertyId: req.body.propertyId
  });
  await writeStore(db);
  res.status(201).json(visit);
}));

app.get('/api/bookings', asyncHandler(async (req, res) => {
  const db = await readStore();
  let bookings = db.bookings.map((booking) => ({
    ...booking,
    property: db.properties.find((property) => property.id === booking.propertyId)
  }));
  if (req.query.status) {
    bookings = bookings.filter((booking) => booking.status.toLowerCase() === String(req.query.status).toLowerCase());
  }
  res.json(bookings);
}));

app.post('/api/bookings', asyncHandler(async (req, res) => {
  const required = ['propertyId', 'guestName', 'phone', 'email', 'checkInDate', 'rentalPeriod', 'paymentMethod'];
  const missing = requireFields(req.body, required);
  if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  if (!isEmail(req.body.email)) return res.status(400).json({ message: 'Invalid booking email' });
  if (Number.isNaN(Date.parse(req.body.checkInDate))) return res.status(400).json({ message: 'Invalid check-in date' });

  const db = await readStore();
  const property = db.properties.find((item) => item.id === req.body.propertyId);
  if (!property) return res.status(404).json({ message: 'Property not found' });

  const booking = {
    id: crypto.randomUUID(),
    reference: bookingRef(),
    propertyId: property.id,
    propertyTitle: property.title,
    propertyImage: property.image,
    owner: property.owner,
    ownerPhone: property.phone,
    ownerEmail: property.email,
    rent: property.price,
    status: 'Pending',
    paymentStatus: req.body.paymentMethod === 'Pay Later' ? 'Pending' : 'Paid',
    createdAt: new Date().toISOString(),
    canCancel: true,
    ...req.body
  };
  db.bookings.unshift(booking);

  const notifications = [
    createNotification(db, {
      category: 'booking',
      title: 'Home booking successful',
      message: `${property.title} was booked successfully. Reference ${booking.reference}.`,
      bookingId: booking.id,
      propertyId: property.id
    })
  ];

  if (booking.paymentStatus === 'Paid') {
    notifications.push(createNotification(db, {
      category: 'payment',
      title: 'Payment successful',
      message: `Payment for ${booking.reference} was completed successfully.`,
      bookingId: booking.id,
      propertyId: property.id
    }));
  } else {
    notifications.push(createNotification(db, {
      category: 'payment',
      title: 'Payment pending',
      message: `Payment for ${booking.reference} is pending.`,
      bookingId: booking.id,
      propertyId: property.id
    }));
  }

  await writeStore(db);
  res.status(201).json({ booking, notifications });
}));

app.put('/api/bookings/:id/status', asyncHandler(async (req, res) => {
  const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
  if (req.body.status && !allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid booking status' });
  const db = await readStore();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  booking.status = req.body.status || booking.status;
  booking.updatedAt = new Date().toISOString();
  if (['Approved', 'Rejected', 'Completed', 'Cancelled'].includes(booking.status)) {
    booking.canCancel = booking.status === 'Approved' || booking.status === 'Pending';
  }
  const notification = createNotification(db, {
    category: 'booking',
    title: `Booking ${booking.status.toLowerCase()}`,
    message: `${booking.reference} is now ${booking.status}.`,
    bookingId: booking.id,
    propertyId: booking.propertyId
  });
  await writeStore(db);
  res.json({ booking, notification });
}));

app.put('/api/bookings/:id/payment', asyncHandler(async (req, res) => {
  const allowedPaymentStatuses = ['Pending', 'Paid', 'Failed'];
  if (req.body.paymentStatus && !allowedPaymentStatuses.includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Invalid payment status' });
  const db = await readStore();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  booking.paymentStatus = req.body.paymentStatus || booking.paymentStatus;
  booking.updatedAt = new Date().toISOString();
  const success = booking.paymentStatus === 'Paid';
  const notification = createNotification(db, {
    category: 'payment',
    title: success ? 'Payment successful' : 'Payment failed',
    message: success ? `Payment for ${booking.reference} was completed.` : `Payment for ${booking.reference} could not be completed.`,
    bookingId: booking.id,
    propertyId: booking.propertyId
  });
  await writeStore(db);
  res.json({ booking, notification });
}));

app.delete('/api/bookings/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!booking.canCancel || ['Completed', 'Rejected'].includes(booking.status)) {
    return res.status(400).json({ message: 'This booking cannot be cancelled' });
  }
  booking.status = 'Cancelled';
  booking.canCancel = false;
  booking.updatedAt = new Date().toISOString();
  const notification = createNotification(db, {
    category: 'booking',
    title: 'Booking cancellation',
    message: `${booking.reference} has been cancelled.`,
    bookingId: booking.id,
    propertyId: booking.propertyId
  });
  await writeStore(db);
  res.json({ booking, notification });
}));

app.get('/api/notifications', asyncHandler(async (req, res) => {
  const db = await readStore();
  let notifications = db.notifications;
  if (req.query.category) notifications = notifications.filter((item) => item.category === req.query.category);
  if (req.query.q) notifications = notifications.filter((item) => matchesText(`${item.title} ${item.message}`, req.query.q));
  res.json(notifications);
}));

app.post('/api/notifications', asyncHandler(async (req, res) => {
  const missing = requireFields(req.body, ['category', 'title', 'message']);
  if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  const db = await readStore();
  const notification = createNotification(db, req.body);
  await writeStore(db);
  res.status(201).json(notification);
}));

app.put('/api/notifications/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const notification = db.notifications.find((item) => item.id === req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  notification.read = Boolean(req.body.read);
  await writeStore(db);
  res.json(notification);
}));

app.delete('/api/notifications/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  db.notifications = db.notifications.filter((item) => item.id !== req.params.id);
  await writeStore(db);
  res.status(204).end();
}));

app.get('/api/inquiries', asyncHandler(async (req, res) => {
  const db = await readStore();
  res.json(db.inquiries);
}));

app.post('/api/inquiries', asyncHandler(async (req, res) => {
  const missing = requireFields(req.body, ['name', 'email', 'phone', 'message']);
  if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  if (!isEmail(req.body.email)) return res.status(400).json({ message: 'Invalid inquiry email' });
  const db = await readStore();
  const inquiry = { id: crypto.randomUUID(), status: 'New', ...req.body };
  db.inquiries.unshift(inquiry);
  await writeStore(db);
  res.status(201).json(inquiry);
}));

app.put('/api/inquiries/:id', asyncHandler(async (req, res) => {
  const db = await readStore();
  const index = db.inquiries.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Inquiry not found' });
  db.inquiries[index] = { ...db.inquiries[index], ...req.body };
  await writeStore(db);
  res.json(db.inquiries[index]);
}));

app.get('/api/testimonials', asyncHandler(async (req, res) => {
  const db = await readStore();
  res.json(db.testimonials);
}));

app.get('/api/blogs', asyncHandler(async (req, res) => {
  const db = await readStore();
  res.json(db.blogs);
}));

app.use((err, req, res, next) => {
  void next;
  console.error(err);
  res.status(err.message === 'CORS origin not allowed' ? 403 : 500).json({
    message: err.message === 'CORS origin not allowed' ? err.message : 'Server error'
  });
});

app.listen(PORT, () => {
  console.log(`HomeRent API running on http://127.0.0.1:${PORT}`);
});
