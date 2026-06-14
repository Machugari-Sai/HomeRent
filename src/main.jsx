import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Dumbbell,
  Filter,
  Heart,
  Home,
  Hotel,
  KeyRound,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  ShieldCheck,
  Search,
  Star,
  Trash2,
  User,
  Wifi,
  X
} from 'lucide-react';
import './styles.css';

const api = async (path, options) => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error((await response.json()).message || 'Request failed');
  if (response.status === 204) return null;
  return response.json();
};

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value);

function App() {
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [pageTitle, setPageTitle] = useState('Featured Properties');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ location: '', type: '', maxBudget: '', bedrooms: '', bathrooms: '', amenity: '', furnished: '' });

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const addNotifications = (items) => {
    const list = Array.isArray(items) ? items : [items].filter(Boolean);
    if (!list.length) return;
    setNotifications((current) => [...list, ...current.filter((item) => !list.some((next) => next.id === item.id))]);
    showToast(list[0].title || list[0].message);
  };

  const loadAll = async () => {
    const [propertyData, favoriteData, testimonialData, blogData, inquiryData, bookingData, notificationData] = await Promise.all([
      api('/properties'),
      api('/favorites'),
      api('/testimonials'),
      api('/blogs'),
      api('/inquiries'),
      api('/bookings'),
      api('/notifications')
    ]);
    setProperties(propertyData);
    setFavorites(favoriteData.map((item) => item.id));
    setFavoriteItems(favoriteData);
    setTestimonials(testimonialData);
    setBlogs(blogData);
    setInquiries(inquiryData);
    setBookings(bookingData);
    setNotifications(notificationData);
    setLoading(false);
  };

  useEffect(() => {
    loadAll().catch((error) => showToast(error.message));
  }, []);

  const favoriteProperties = useMemo(
    () => favoriteItems,
    [favoriteItems]
  );

  const searchProperties = async (nextFilters = filters, options = {}) => {
    const { scroll = true, page = 'home', title = 'Featured Properties' } = options;
    const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
    const data = await api(`/properties?${params}`);
    setProperties(data);
    setPageTitle(title);
    setView(page);
    if (scroll) {
      window.setTimeout(() => document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }), 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFavorite = async (propertyId) => {
    if (favorites.includes(propertyId)) {
      await api(`/favorites/${propertyId}`, { method: 'DELETE' });
      setFavorites((items) => items.filter((id) => id !== propertyId));
      setFavoriteItems((items) => items.filter((item) => item.id !== propertyId));
      showToast('Property Removed from Favorites');
    } else {
      const result = await api(`/favorites/${propertyId}`, { method: 'POST' });
      setFavorites((items) => [...items, propertyId]);
      setFavoriteItems((items) => {
        const property = properties.find((item) => item.id === propertyId);
        return property ? [...items, property] : items;
      });
      addNotifications(result.notification);
    }
  };

  const refreshBookingsAndNotifications = async () => {
    const [bookingData, notificationData] = await Promise.all([api('/bookings'), api('/notifications')]);
    setBookings(bookingData);
    setNotifications(notificationData);
  };

  const openDetails = (property) => {
    setSelected(property);
    setView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Toast message={toast} />
      <TopBar />
      <Nav view={view} setView={setView} setFilters={setFilters} onSearch={searchProperties} setPageTitle={setPageTitle} unreadCount={notifications.filter((item) => !item.read).length} />
      <main>
        {view === 'home' && (
          <>
            <Hero setView={setView} setPageTitle={setPageTitle} />
            <SearchPanel filters={filters} setFilters={setFilters} onSearch={searchProperties} />
            <Stats />
            <Services setFilters={setFilters} onSearch={searchProperties} />
            <Showcase properties={properties} onDetails={openDetails} />
            <PropertyGrid
              title="Featured Properties"
              properties={properties}
              favorites={favorites}
              onFavorite={toggleFavorite}
              onDetails={openDetails}
              showToast={showToast}
              onNotify={addNotifications}
              loading={loading}
            />
            <Locations setFilters={setFilters} onSearch={searchProperties} />
            <Categories setFilters={setFilters} onSearch={searchProperties} />
            <MapSection properties={properties} />
            <Testimonials testimonials={testimonials} />
            <Blogs blogs={blogs} />
          </>
        )}
        {view === 'listings' && (
          <>
            <PageHeader title={pageTitle} />
            <SearchPanel filters={filters} setFilters={setFilters} onSearch={(next) => searchProperties(next, { page: 'listings', scroll: false, title: pageTitle })} />
            <PropertyGrid
              title={pageTitle}
              properties={properties}
              favorites={favorites}
              onFavorite={toggleFavorite}
              onDetails={openDetails}
              showToast={showToast}
              onNotify={addNotifications}
              loading={loading}
            />
          </>
        )}
        {view === 'details' && selected && (
          <Details property={selected} onBack={() => setView('home')} onNotify={addNotifications} onFavorite={toggleFavorite} isFavorite={favorites.includes(selected.id)} onBookingChange={refreshBookingsAndNotifications} />
        )}
        {view === 'favorites' && (
          <PropertyGrid
            title="Saved Favorites"
            properties={favoriteProperties}
            favorites={favorites}
            onFavorite={toggleFavorite}
            onDetails={openDetails}
            showToast={showToast}
            onNotify={addNotifications}
            loading={false}
          />
        )}
        {view === 'dashboard' && (
          <Dashboard properties={properties} inquiries={inquiries} reload={loadAll} showToast={showToast} onNotify={addNotifications} />
        )}
        {view === 'about' && <AboutPage />}
        {view === 'contact' && <ContactPage showToast={showToast} />}
        {view === 'bookings' && <BookingHistory bookings={bookings} onNotify={addNotifications} onRefresh={refreshBookingsAndNotifications} />}
        {view === 'notifications' && <NotificationCenter notifications={notifications} setNotifications={setNotifications} />}
      </main>
      <Footer />
    </>
  );
}

function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div className="toast" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
          <CheckCircle2 size={18} /> {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TopBar() {
  return (
    <div className="topbar">
      <div><span>Trusted Rental Platform</span><span>24/7 Customer Support</span></div>
      <marquee>Find Your Dream Home Today</marquee>
      <div><span><Phone size={14} /> +91 98765 43210</span><span><Mail size={14} /> support@homerent.com</span><span><MapPin size={14} /> India</span></div>
    </div>
  );
}

function Nav({ view, setView, setFilters, onSearch, setPageTitle, unreadCount }) {
  const [open, setOpen] = useState(false);
  const links = ['Home', 'Properties', 'Apartments', 'Villas', 'PG & Hostels', 'Commercial', 'Bookings', 'Notifications', 'About', 'Contact'];
  const clickLink = (link) => {
    setOpen(false);
    setView('home');
    const baseFilters = { location: '', type: '', maxBudget: '', bedrooms: '', bathrooms: '', amenity: '', furnished: '' };
    const typeMap = {
      Apartments: 'Apartments',
      Villas: 'Villas',
      'PG & Hostels': 'PG & Hostels',
      Commercial: 'Commercial Spaces'
    };

    if (link === 'Home') {
      setPageTitle('Featured Properties');
      setFilters(baseFilters);
      onSearch(baseFilters, { page: 'home', scroll: false, title: 'Featured Properties' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link === 'Properties') {
      setFilters(baseFilters);
      onSearch(baseFilters, { page: 'listings', scroll: false, title: 'All Properties' });
      return;
    }

    if (typeMap[link]) {
      const next = { ...baseFilters, type: typeMap[link] };
      setFilters(next);
      onSearch(next, { page: 'listings', scroll: false, title: link === 'Commercial' ? 'Commercial Spaces' : link });
      return;
    }

    if (link === 'About') {
      setPageTitle('About HomeRent');
      setView('about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (link === 'Contact') {
      setPageTitle('Contact HomeRent');
      setView('contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (link === 'Bookings') {
      setPageTitle('Booking History');
      setView('bookings');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (link === 'Notifications') {
      setPageTitle('Notifications');
      setView('notifications');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  return (
    <nav className="navbar">
      <button className="brand" onClick={() => setView('home')}><span>H</span>omeRent</button>
      <div className={`navlinks ${open ? 'open' : ''}`}>
        {links.map((link) => <button key={link} onClick={() => clickLink(link)}>{link}</button>)}
      </div>
      <div className="nav-actions">
        <button className="icon-btn" title="Search"><Search size={19} /></button>
        <button className="icon-btn notify-button" title="Notifications" onClick={() => setView('notifications')}><Bell size={19} />{unreadCount > 0 && <span>{unreadCount}</span>}</button>
        <button className="icon-btn" title="Favorites" onClick={() => setView('favorites')}><Heart size={19} fill={view === 'favorites' ? 'currentColor' : 'none'} /></button>
        <button className="primary small" onClick={() => setView('dashboard')}><Plus size={17} /> Post Property</button>
        <button className="hamburger" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
    </nav>
  );
}

function Hero({ setView, setPageTitle }) {
  return (
    <section className="hero">
      <div className="hero-overlay" />
      <motion.div className="hero-content" initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="eyebrow">Verified luxury rentals in minutes</p>
        <h1>Find a home that feels designed for your next life.</h1>
        <p>Search curated apartments, villas, premium PGs, co-living residences, and commercial spaces with verified owners, transparent pricing, and instant visit booking.</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => { setPageTitle('All Properties'); setView('listings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Browse Properties</button>
          <button className="secondary" onClick={() => setView('dashboard')}>Post Property</button>
          <button className="secondary" onClick={() => { setPageTitle('Contact HomeRent'); setView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Contact Agent</button>
        </div>
        <div className="trust-row">
          <span><ShieldCheck size={18} /> Verified listings</span>
          <span><KeyRound size={18} /> Same-day visits</span>
          <span><Star size={18} fill="currentColor" /> 4.9 renter rating</span>
        </div>
      </motion.div>
    </section>
  );
}

function PageHeader({ title }) {
  return (
    <section className="page-header">
      <p className="eyebrow">HomeRent marketplace</p>
      <h1>{title}</h1>
      <p>Explore verified rental properties with premium photography, transparent rent details, and fast visit booking.</p>
    </section>
  );
}

function SearchPanel({ filters, setFilters, onSearch }) {
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  return (
    <section className="search-wrap">
      <div className="search-card">
        <label>Location<input value={filters.location} onChange={(event) => update('location', event.target.value)} placeholder="City or locality" /></label>
        <label>Property Type<select value={filters.type} onChange={(event) => update('type', event.target.value)}><option value="">Any Type</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Budget Range<select value={filters.maxBudget} onChange={(event) => update('maxBudget', event.target.value)}><option value="">Any Budget</option><option value="25000">Under 25K</option><option value="60000">Under 60K</option><option value="130000">Under 1.3L</option><option value="250000">Under 2.5L</option></select></label>
        <label>Bedrooms<select value={filters.bedrooms} onChange={(event) => update('bedrooms', event.target.value)}><option value="">Any</option><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4 BHK</option></select></label>
        <label>Bathrooms<select value={filters.bathrooms} onChange={(event) => update('bathrooms', event.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
        <label>Amenities<select value={filters.amenity} onChange={(event) => update('amenity', event.target.value)}><option value="">Any</option><option>Parking</option><option>Lift</option><option>Security</option><option>Power Backup</option><option>Gym</option><option>Swimming Pool</option><option>WiFi</option></select></label>
        <label>Furnished<select value={filters.furnished} onChange={(event) => update('furnished', event.target.value)}><option value="">Any</option><option>Fully Furnished</option><option>Semi Furnished</option><option>Unfurnished</option></select></label>
        <button className="primary search-button" onClick={() => onSearch()}><Search size={18} /> Search</button>
      </div>
    </section>
  );
}

const propertyTypes = ['Apartments', 'Independent Houses', 'Villas', 'PG & Hostels', 'Commercial Spaces', 'Office Spaces', 'Shops', 'Co-Living Spaces'];

function Stats() {
  const stats = [
    ['12K+', 'verified homes'],
    ['42', 'premium cities'],
    ['4.9/5', 'average rating'],
    ['18 min', 'avg. response time']
  ];
  return (
    <section className="stats-band" id="about">
      {stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </section>
  );
}

function AboutPage() {
  return (
    <>
      <PageHeader title="About HomeRent" />
      <section className="section about-page">
        <div className="section-head">
          <p className="eyebrow">Premium rental confidence</p>
          <h2>Built for renters, owners, and agents who expect clarity.</h2>
          <p>HomeRent brings verified listings, transparent rental details, premium discovery, and smooth visit booking into one modern rental platform.</p>
        </div>
        <Stats />
      </section>
    </>
  );
}

function ContactPage({ showToast }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  return (
    <>
      <PageHeader title="Contact HomeRent" />
      <section className="section contact-page">
        <div className="contact-grid">
          <div>
            <p className="eyebrow">Talk to our rental team</p>
            <h2>Need help finding or posting a property?</h2>
            <p>Share your requirement and a HomeRent advisor will help with shortlisting, owner contact, and visit planning.</p>
            <div className="map-metrics">
              <span><Phone size={17} /> +91 98765 43210</span>
              <span><Mail size={17} /> support@homerent.com</span>
              <span><MapPin size={17} /> India</span>
            </div>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault();
            setForm({ name: '', email: '', phone: '', message: '' });
            showToast('Message Sent Successfully');
          }}>
            <input required placeholder="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input required type="email" placeholder="Email Address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <input required placeholder="Phone Number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <textarea required placeholder="Tell us what you need" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
            <button className="primary full">Send Message</button>
          </form>
        </div>
      </section>
    </>
  );
}

function Services({ setFilters, onSearch }) {
  const services = [
    ['Rent House', Home], ['Buy Property', Building2], ['PG & Hostel', Hotel], ['Apartments', Building2],
    ['Villas', Home], ['Commercial Space', Building2], ['Property Visit', CalendarCheck], ['Contact Agent', User]
  ];
  return (
    <section className="section">
      <div className="service-grid">
        {services.map(([label, Icon]) => (
          <motion.button whileHover={{ y: -6 }} className="service-card" key={label} onClick={() => {
            const type = label === 'Commercial Space' ? 'Commercial Spaces' : label === 'Rent House' ? 'Independent Houses' : label;
            if (propertyTypes.includes(type)) {
              const next = { location: '', type, maxBudget: '', bedrooms: '', bathrooms: '', amenity: '', furnished: '' };
              setFilters(next);
              onSearch(next);
            }
          }}>
            <Icon size={26} />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function Showcase({ properties, onDetails }) {
  const spotlight = properties.slice(0, 3);
  if (!spotlight.length) return null;
  return (
    <section className="section showcase">
      <div className="section-head">
        <p className="eyebrow">Editor selected</p>
        <h2>Signature homes with hotel-grade comfort</h2>
      </div>
      <div className="showcase-grid">
        {spotlight.map((property, index) => (
          <motion.button className={`showcase-card item-${index + 1}`} key={property.id} onClick={() => onDetails(property)} whileHover={{ y: -8 }}>
            <img src={property.image} alt={property.title} />
            <div>
              <span>{property.type}</span>
              <strong>{property.title}</strong>
              <small>{property.location} - {money(property.price)}/mo</small>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function PropertyGrid({ title, properties, favorites, onFavorite, onDetails, showToast, onNotify, loading }) {
  const contactOwner = async (property) => {
    const notification = await api('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        category: 'owner',
        title: 'Messages from property owners',
        message: `${property.owner} will contact you about ${property.title}.`,
        propertyId: property.id
      })
    });
    onNotify?.(notification);
    if (!onNotify) showToast('Owner contact request sent');
  };
  return (
    <section className="section" id="properties">
      <div className="section-head">
        <p className="eyebrow">Verified listings</p>
        <h2>{title}</h2>
        <p>Large-format photography, transparent rental terms, verified owner details, and fast actions for every serious renter.</p>
      </div>
      <div className="property-grid">
        {loading && Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
        {properties.map((property) => (
          <motion.article className="property-card" key={property.id} whileHover={{ y: -7 }}>
            <div className="image-wrap">
              <img src={property.image} alt={property.title} />
              <button className="heart" onClick={() => onFavorite(property.id)}><Heart size={19} fill={favorites.includes(property.id) ? 'currentColor' : 'none'} /></button>
              <span>{property.status}</span>
            </div>
            <div className="property-body">
              <div className="rating-row"><span><Star size={16} fill="currentColor" /> {property.rating || '4.8'}</span><span>{property.amenities?.slice(0, 2).join(' + ')}</span></div>
              <div className="price-row"><h3>{property.title}</h3><strong>{money(property.price)}/mo</strong></div>
              <p><MapPin size={16} /> {property.location}</p>
              <div className="facts"><span>{property.bedrooms || 'Studio'} BHK</span><span>{property.bathrooms} Baths</span><span>{property.area} sq.ft.</span></div>
              <div className="meta"><span>{property.type}</span><span>{property.furnished}</span></div>
              <p className="owner">Owner: {property.owner}</p>
              <div className="card-actions">
                <button onClick={() => onDetails(property)}>View Details</button>
                <button onClick={() => contactOwner(property)}>Contact Owner</button>
                <button onClick={() => onDetails(property)}>Book Home</button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      {!properties.length && <p className="empty">No properties match this view yet.</p>}
    </section>
  );
}

function SkeletonCard() {
  return (
    <article className="property-card skeleton-card">
      <div className="skeleton image" />
      <div className="property-body">
        <div className="skeleton line wide" />
        <div className="skeleton line" />
        <div className="skeleton chips" />
        <div className="skeleton line short" />
      </div>
    </article>
  );
}

function Locations({ setFilters, onSearch }) {
  const locations = [
    ['Bengaluru', 'Koramangala, Whitefield, Indiranagar', 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=900&q=80'],
    ['Mumbai', 'Andheri, Bandra, Powai', 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&w=900&q=80'],
    ['Hyderabad', 'Hitech City, Gachibowli', 'https://images.unsplash.com/photo-1591486086572-2e8c24ed366c?auto=format&fit=crop&w=900&q=80'],
    ['Gurugram', 'Golf Course Road, Sector 44', 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80']
  ];
  return (
    <section className="section locations">
      <div className="section-head"><p className="eyebrow">Featured locations</p><h2>Move into the best neighborhoods in every city</h2></div>
      <div className="location-grid">
        {locations.map(([city, detail, image]) => (
          <motion.button key={city} whileHover={{ y: -8 }} onClick={() => {
            const next = { location: city, type: '', maxBudget: '', bedrooms: '', bathrooms: '', amenity: '', furnished: '' };
            setFilters(next);
            onSearch(next);
          }}>
            <img src={image} alt={city} />
            <div><strong>{city}</strong><span>{detail}</span></div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function Categories({ setFilters, onSearch }) {
  return (
    <section className="section soft">
      <div className="section-head"><p className="eyebrow">Browse by need</p><h2>Property Categories</h2></div>
      <div className="category-grid">
        {propertyTypes.map((type) => (
          <button key={type} onClick={() => {
            const next = { location: '', type, maxBudget: '', bedrooms: '', bathrooms: '', amenity: '', furnished: '' };
            setFilters(next);
            onSearch(next);
          }}>
            <Building2 size={24} />
            <span>{type}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MapSection({ properties }) {
  return (
    <section className="section map-section">
      <div className="map-copy">
        <p className="eyebrow">Live area intelligence</p>
        <h2>Explore homes around commute, lifestyle, and neighborhood value.</h2>
        <p>Use location context to compare premium rentals near business districts, metro access, schools, parks, cafes, and daily essentials.</p>
        <div className="map-metrics">
          <span><MapPin size={17} /> {properties.length} curated listings</span>
          <span><Dumbbell size={17} /> Amenity-rich homes</span>
          <span><ShieldCheck size={17} /> Verified owners</span>
        </div>
      </div>
      <div className="map-card">
        <iframe title="HomeRent city map" src="https://maps.google.com/maps?q=Bengaluru%20India&z=11&output=embed" />
      </div>
    </section>
  );
}

function Details({ property, onBack, onNotify, onFavorite, isFavorite, onBookingChange }) {
  const [form, setForm] = useState({ guestName: '', phone: '', email: '', checkInDate: '', rentalPeriod: '3 Months', paymentMethod: 'UPI' });
  const submit = async (event) => {
    event.preventDefault();
    const result = await api('/bookings', { method: 'POST', body: JSON.stringify({ propertyId: property.id, ...form }) });
    setForm({ guestName: '', phone: '', email: '', checkInDate: '', rentalPeriod: '3 Months', paymentMethod: 'UPI' });
    onNotify(result.notifications);
    await onBookingChange();
  };
  return (
    <section className="details-page">
      <button className="back" onClick={onBack}><ChevronLeft size={18} /> Back to listings</button>
      <div className="gallery">
        {property.gallery.map((image) => <img key={image} src={image} alt={property.title} />)}
      </div>
      <div className="details-layout">
        <article className="details-main">
          <div className="section-head left"><p className="eyebrow">{property.type}</p><h2>{property.title}</h2></div>
          <p className="location-line"><MapPin size={17} /> {property.location}</p>
          <p>{property.description}</p>
          <div className="facts big"><span>{property.bedrooms || 'Studio'} BHK</span><span>{property.bathrooms} Bathrooms</span><span>{property.area} sq.ft.</span><span>{property.furnished}</span></div>
          <h3>Amenities</h3>
          <div className="amenities">{property.amenities.map((item) => <span key={item}><Wifi size={16} /> {item}</span>)}</div>
          <h3>Location Map</h3>
          <iframe title="Property map" src={`https://maps.google.com/maps?q=${encodeURIComponent(property.coordinates)}&z=13&output=embed`} />
        </article>
        <aside className="booking-panel">
          <h3>{money(property.price)}/month</h3>
          <p>Deposit: {money(property.deposit)}</p>
          <p>Maintenance: {money(property.maintenance)}</p>
          <p>Owner: {property.owner}</p>
          <p><Phone size={15} /> {property.phone}</p>
          <p><Mail size={15} /> {property.email}</p>
          <button className="secondary full" onClick={() => onFavorite(property.id)}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Saved' : 'Save Favorite'}</button>
          <div className="booking-assurance">
            <span><ShieldCheck size={16} /> Secure booking workflow</span>
            <span><Clock3 size={16} /> Real-time status updates</span>
          </div>
          <form onSubmit={submit}>
            <input required placeholder="Full Name" value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} />
            <input required placeholder="Phone Number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <label>Check-in Date<input required type="date" value={form.checkInDate} onChange={(event) => setForm({ ...form, checkInDate: event.target.value })} /></label>
            <select value={form.rentalPeriod} onChange={(event) => setForm({ ...form, rentalPeriod: event.target.value })}><option>1 Month</option><option>3 Months</option><option>6 Months</option><option>11 Months</option><option>12 Months</option></select>
            <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option>UPI</option><option>Credit Card</option><option>Net Banking</option><option>Pay Later</option></select>
            <button className="primary full"><CreditCard size={17} /> Book Home</button>
          </form>
        </aside>
      </div>
    </section>
  );
}

function Dashboard({ properties, inquiries, reload, showToast, onNotify }) {
  const blank = { title: '', type: 'Apartments', location: '', price: '', bedrooms: '', bathrooms: '', area: '', furnished: 'Semi Furnished', owner: '', phone: '', email: '', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', description: '', amenities: ['Parking', 'Security'], deposit: '', maintenance: '', status: 'Available Now', coordinates: '12.9352, 77.6245' };
  const [form, setForm] = useState(blank);
  const submit = async (event) => {
    event.preventDefault();
    const result = await api('/properties', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), area: Number(form.area), deposit: Number(form.deposit), maintenance: Number(form.maintenance), gallery: [form.image] }) });
    setForm(blank);
    await reload();
    onNotify?.(result.notification);
    if (!onNotify) showToast('Property Added Successfully');
  };
  const remove = async (id) => {
    await api(`/properties/${id}`, { method: 'DELETE' });
    await reload();
    showToast('Property Deleted Successfully');
  };
  return (
    <section className="dashboard section">
      <div className="section-head"><p className="eyebrow">Owner workspace</p><h2>Property Owner Dashboard</h2></div>
      <div className="dashboard-layout">
        <form className="owner-form" onSubmit={submit}>
          {['title', 'location', 'price', 'deposit', 'maintenance', 'bedrooms', 'bathrooms', 'area', 'owner', 'phone', 'email', 'image'].map((field) => (
            <input key={field} required placeholder={field.replace(/^\w/, (c) => c.toUpperCase())} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
          ))}
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <select value={form.furnished} onChange={(event) => setForm({ ...form, furnished: event.target.value })}><option>Fully Furnished</option><option>Semi Furnished</option><option>Unfurnished</option></select>
          <textarea required placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <button className="primary full"><Plus size={17} /> Add Listing</button>
        </form>
        <div className="dashboard-list">
          <h3>Active Listings</h3>
          {properties.map((property) => (
            <div className="dash-row" key={property.id}>
              <img src={property.image} alt={property.title} />
              <div><strong>{property.title}</strong><span>{property.location} - {money(property.price)}</span></div>
              <button className="icon-btn danger" onClick={() => remove(property.id)} title="Delete"><Trash2 size={18} /></button>
            </div>
          ))}
          <h3>Tenant Inquiries</h3>
          {inquiries.map((item) => <div className="inquiry" key={item.id}><strong>{item.name}</strong><span>{item.message}</span><small>{item.phone} - {item.status}</small></div>)}
        </div>
      </div>
    </section>
  );
}

function BookingHistory({ bookings, onNotify, onRefresh }) {
  const [filter, setFilter] = useState('All');
  const filtered = bookings.filter((booking) => {
    if (filter === 'All') return true;
    if (filter === 'Active') return ['Pending', 'Approved'].includes(booking.status);
    return booking.status === filter;
  });
  const updateStatus = async (booking, status) => {
    const result = await api(`/bookings/${booking.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    onNotify(result.notification);
    await onRefresh();
  };
  const updatePayment = async (booking, paymentStatus) => {
    const result = await api(`/bookings/${booking.id}/payment`, { method: 'PUT', body: JSON.stringify({ paymentStatus }) });
    onNotify(result.notification);
    await onRefresh();
  };
  const cancelBooking = async (booking) => {
    const result = await api(`/bookings/${booking.id}`, { method: 'DELETE' });
    onNotify(result.notification);
    await onRefresh();
  };

  return (
    <>
      <PageHeader title="Booking History" />
      <section className="section booking-history">
        <div className="booking-toolbar">
          {['All', 'Active', 'Pending', 'Approved', 'Completed', 'Cancelled', 'Rejected'].map((item) => (
            <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}><Filter size={15} /> {item}</button>
          ))}
        </div>
        <div className="booking-grid">
          {filtered.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <img src={booking.propertyImage || booking.property?.image} alt={booking.propertyTitle} />
              <div>
                <div className="booking-title">
                  <span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span>
                  <span className={`status-pill ${booking.paymentStatus.toLowerCase()}`}>{booking.paymentStatus}</span>
                </div>
                <h3>{booking.propertyTitle}</h3>
                <p><MapPin size={16} /> {booking.property?.location || 'Premium location'}</p>
                <div className="booking-facts">
                  <span>Ref: {booking.reference}</span>
                  <span>Booked: {new Date(booking.createdAt).toLocaleDateString()}</span>
                  <span>Check-in: {booking.checkInDate}</span>
                  <span>Period: {booking.rentalPeriod}</span>
                  <span>Rent: {money(booking.rent)}/mo</span>
                  <span>Owner: {booking.owner}</span>
                </div>
                <div className="booking-actions">
                  {booking.status === 'Pending' && <button onClick={() => updateStatus(booking, 'Approved')}>Approve</button>}
                  {booking.status === 'Pending' && <button onClick={() => updateStatus(booking, 'Rejected')}>Reject</button>}
                  {booking.paymentStatus !== 'Paid' && <button onClick={() => updatePayment(booking, 'Paid')}>Mark Paid</button>}
                  {booking.paymentStatus !== 'Failed' && <button onClick={() => updatePayment(booking, 'Failed')}>Payment Failed</button>}
                  {booking.canCancel && !['Cancelled', 'Completed', 'Rejected'].includes(booking.status) && <button onClick={() => cancelBooking(booking)}>Cancel</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && <p className="empty">No bookings found for this filter.</p>}
      </section>
    </>
  );
}

function NotificationCenter({ notifications, setNotifications }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const categories = ['All', 'booking', 'payment', 'favorites', 'owner', 'offers'];
  const filtered = notifications.filter((item) => {
    const categoryMatch = category === 'All' || item.category === category;
    const queryMatch = !query || `${item.title} ${item.message}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  });
  const toggleRead = async (notification) => {
    const updated = await api(`/notifications/${notification.id}`, { method: 'PUT', body: JSON.stringify({ read: !notification.read }) });
    setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
  };
  const remove = async (notification) => {
    await api(`/notifications/${notification.id}`, { method: 'DELETE' });
    setNotifications((items) => items.filter((item) => item.id !== notification.id));
  };

  return (
    <>
      <PageHeader title="Notification Center" />
      <section className="section notification-page">
        <div className="notification-controls">
          <input placeholder="Search notifications" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="notification-list">
          {filtered.map((notification) => (
            <article className={`notification-item ${notification.read ? 'read' : 'unread'}`} key={notification.id}>
              <div className="notification-icon">{notification.category === 'payment' ? <CreditCard /> : notification.category === 'booking' ? <CalendarCheck /> : notification.category === 'favorites' ? <Heart /> : <Bell />}</div>
              <div>
                <span>{notification.category}</span>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </div>
              <div className="notification-actions">
                <button onClick={() => toggleRead(notification)}>{notification.read ? 'Mark Unread' : 'Mark Read'}</button>
                <button onClick={() => remove(notification)}><Trash2 size={16} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && <p className="empty">No notifications match your filters.</p>}
      </section>
    </>
  );
}

function Testimonials({ testimonials }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!testimonials.length) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % testimonials.length), 3500);
    return () => window.clearInterval(timer);
  }, [testimonials.length]);
  const item = testimonials[index];
  if (!item) return null;
  return (
    <section className="section testimonials">
      <button className="icon-btn" onClick={() => setIndex((index - 1 + testimonials.length) % testimonials.length)}><ChevronLeft /></button>
      <article>
        <img src={item.image} alt={item.name} />
        <div>{Array.from({ length: item.rating }).map((_, idx) => <Star key={idx} size={17} fill="currentColor" />)}</div>
        <p>{item.text}</p>
        <strong>{item.name}</strong>
        <span>{item.property}</span>
      </article>
      <button className="icon-btn" onClick={() => setIndex((index + 1) % testimonials.length)}><ChevronRight /></button>
    </section>
  );
}

function Blogs({ blogs }) {
  return (
    <section className="section soft">
      <div className="section-head"><p className="eyebrow">Guides and insights</p><h2>Rental Blog</h2></div>
      <div className="blog-grid">
        {blogs.map((blog) => (
          <article className="blog-card" key={blog.id}>
            <img src={blog.image} alt={blog.title} />
            <div><span>{blog.category}</span><time>{blog.date}</time><h3>{blog.title}</h3><a>Read More</a></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="footer">
      <div><h2><span>H</span>omeRent</h2><p>Premium rental discovery for homes, PGs, villas, and commercial spaces.</p></div>
      <div><h3>Quick Links</h3><p>About Us</p><p>Properties</p><p>Apartments</p><p>Villas</p><p>PG & Hostels</p><p>Blogs</p><p>Contact</p></div>
      <form onSubmit={(event) => event.preventDefault()}><h3>Newsletter</h3><input placeholder="Email address" /><button className="primary">Subscribe</button></form>
      <small>Copyright 2026 HomeRent. All rights reserved.</small>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
