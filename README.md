# HomeRent

HomeRent is a premium MERN house rental and home booking platform for discovering, saving, booking, and managing rental homes. It includes a modern React marketplace UI, an Express API, MongoDB persistence, booking history, notification history, favorites, owner listing management, and advanced property search.

## Features

- Premium responsive React UI with glassmorphism, animations, rich cards, and mobile-first layouts
- Property discovery with filters for location, budget, type, bedrooms, bathrooms, amenities, and furnishing
- Property details with gallery, amenities, owner info, embedded map, and secure booking form
- Booking workflow with reference numbers, check-in date, rental period, payment status, booking status, cancellation, approval, and rejection flows
- Booking History page with filters for Active, Pending, Approved, Completed, Cancelled, and Rejected bookings
- Notification Center with toast popups, persistent notification history, category filtering, search, read/unread toggles, and deletion
- Favorites system with saved properties and persisted notifications
- Owner dashboard for posting and deleting listings
- Seed data for properties, testimonials, blogs, and starter notifications
- API hardening with Helmet, rate limiting, CORS configuration, request validation, and centralized error handling

## Tech Stack

- MongoDB
- Express.js
- React.js
- Node.js
- Mongoose
- Vite
- Framer Motion
- Lucide React

## Installation

```bash
npm install
```

MongoDB must be running locally, or you must provide a hosted MongoDB connection string.

## Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Environment variables:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/homerent
CLIENT_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
```

## Usage

Run frontend and backend together:

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173/
```

Backend:

```text
http://127.0.0.1:5000/
```

Build for production:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

Preview the production build:

```bash
npm run preview
```

## Folder Structure

```text
.
├── server/
│   ├── data.js        # Seed data
│   ├── server.js      # Express API routes and middleware
│   └── store.js       # MongoDB/Mongoose persistence layer
├── src/
│   ├── main.jsx       # React application and page components
│   └── styles.css     # Application styling
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── README.md
```

## API Documentation

Base URL:

```text
/api
```

Core endpoints:

- `GET /health` - API health check
- `GET /properties` - List properties with optional filters
- `GET /properties/:id` - Get one property
- `POST /properties` - Add property listing
- `PUT /properties/:id` - Update property listing
- `DELETE /properties/:id` - Delete property listing
- `GET /favorites` - List favorite properties
- `POST /favorites/:id` - Save favorite and create notification
- `DELETE /favorites/:id` - Remove favorite
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking and notifications
- `PUT /bookings/:id/status` - Update booking status
- `PUT /bookings/:id/payment` - Update payment status
- `DELETE /bookings/:id` - Cancel booking when allowed
- `GET /notifications` - List notifications with optional category/search filters
- `POST /notifications` - Create notification
- `PUT /notifications/:id` - Mark notification read/unread
- `DELETE /notifications/:id` - Delete notification
- `GET /testimonials` - List testimonials
- `GET /blogs` - List blogs

## Booking Workflow

Users open a property, enter booking details, choose a rental period and payment method, and submit the booking. The backend creates a booking reference number, stores the booking in MongoDB, and creates persistent notifications for booking success and payment status. Users can then track the booking in Booking History, update status, mark payment outcomes, or cancel when allowed.

## Notification System

Important actions create toast notifications and persistent MongoDB notification records. The Notification Center lets users search, filter by category, mark items as read or unread, and delete old notifications. Notification history remains available after toast popups disappear.

## Database Collections

- `properties`
- `bookings`
- `notifications`
- `favorites`
- `inquiries`
- `visits`
- `testimonials`
- `blogs`

Seed data is inserted automatically when collections are empty.

## Future Enhancements

- Authentication and role-based access for renters, owners, agents, and admins
- Real payment gateway integration
- In-app owner/renter chat
- Admin moderation dashboard
- Image upload storage
- Unit and integration test suite
- Pagination and database indexes for large datasets

## Author

HomeRent project by Trinath Reddy.

## License

This project is licensed under the MIT License.
