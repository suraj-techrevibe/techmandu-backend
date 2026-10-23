/**
 * Static demo data for the seeder. Everything here is fictional – safe to commit and to show.
 * Edit freely; the seeder logic does not depend on the exact wording.
 */

export const SERVER_URL_FALLBACK = "http://localhost:3000";
export const SEED_PASSWORD = "Test@1234";

// ---------------------------------------------------------------------------------------------
// Places & people
// ---------------------------------------------------------------------------------------------
export interface Place {
  city: string;
  province: string;
  postalCode: string;
  streets: string[];
  outOfValley: boolean;
}

export const PLACES: Place[] = [
  { city: "Kathmandu", province: "Bagmati Province", postalCode: "44600", outOfValley: false, streets: ["New Baneshwor", "Thamel", "Koteshwor", "Maharajgunj", "Chabahil", "Kalanki"] },
  { city: "Lalitpur", province: "Bagmati Province", postalCode: "44700", outOfValley: false, streets: ["Jawalakhel", "Pulchowk", "Kupondole", "Satdobato"] },
  { city: "Bhaktapur", province: "Bagmati Province", postalCode: "44800", outOfValley: false, streets: ["Suryabinayak", "Thimi", "Lokanthali"] },
  { city: "Pokhara", province: "Gandaki Province", postalCode: "33700", outOfValley: true, streets: ["Lakeside", "Mahendrapul", "Chipledhunga"] },
  { city: "Biratnagar", province: "Koshi Province", postalCode: "56613", outOfValley: true, streets: ["Main Road", "Traffic Chowk", "Rangeli Road"] },
  { city: "Butwal", province: "Lumbini Province", postalCode: "32907", outOfValley: true, streets: ["Traffic Chowk", "Golpark", "Devinagar"] },
  { city: "Bharatpur", province: "Bagmati Province", postalCode: "44200", outOfValley: true, streets: ["Narayangadh", "Pulchowk", "Bank Road"] },
];

export const FIRST_NAMES = [
  "Aarav", "Anisha", "Bibek", "Binita", "Dipesh", "Garima", "Hari", "Isha", "Kiran", "Manisha",
  "Nabin", "Pratik", "Rojina", "Sabin", "Sanjeev", "Sita", "Suman", "Sushmita", "Utsav", "Yogesh",
];
export const LAST_NAMES = [
  "Sharma", "Adhikari", "Shrestha", "Thapa", "Gurung", "Rai", "Karki", "Bhandari", "Poudel", "Tamang",
  "Maharjan", "Basnet", "Khadka", "Acharya", "Joshi",
];

export interface CustomerSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  place: number; // index into PLACES
  business?: { name: string; vatPan: string; verified: boolean };
  /** Extra Tech Coins from "past orders" – on top of the signup bonus the loyalty plugin grants automatically */
  coins: number;
}

export const CUSTOMERS: CustomerSeed[] = [
  { firstName: "Aarav", lastName: "Sharma", email: "aarav.sharma@example.com", phone: "9841000001", place: 0, coins: 300 },
  { firstName: "Anisha", lastName: "Shrestha", email: "anisha.shrestha@example.com", phone: "9841000002", place: 1, coins: 70 },
  { firstName: "Bibek", lastName: "Thapa", email: "bibek.thapa@example.com", phone: "9841000003", place: 0, coins: 0 },
  { firstName: "Garima", lastName: "Adhikari", email: "garima.adhikari@example.com", phone: "9841000004", place: 2, coins: 550 },
  { firstName: "Kiran", lastName: "Gurung", email: "kiran.gurung@example.com", phone: "9841000005", place: 3, coins: 25 },
  { firstName: "Manisha", lastName: "Rai", email: "manisha.rai@example.com", phone: "9841000006", place: 4, coins: 150 },
  { firstName: "Nabin", lastName: "Karki", email: "nabin.karki@example.com", phone: "9841000007", place: 5, coins: 0 },
  { firstName: "Sushmita", lastName: "Poudel", email: "sushmita.poudel@example.com", phone: "9841000008", place: 6, coins: 0 },
  { firstName: "Utsav", lastName: "Maharjan", email: "utsav.maharjan@example.com", phone: "9841000009", place: 1, coins: 450 },
  { firstName: "Yogesh", lastName: "Basnet", email: "yogesh.basnet@example.com", phone: "9841000010", place: 0, coins: 0 },
  // Business (B2B) accounts – one verified (gets the extra business discount), one pending
  { firstName: "Rajan", lastName: "Joshi", email: "rajan@himalayan-traders.example.com", phone: "9851000011", place: 0, coins: 0, business: { name: "Himalayan Traders Pvt. Ltd.", vatPan: "601234567", verified: true } },
  { firstName: "Sunita", lastName: "Khadka", email: "sunita@everest-it.example.com", phone: "9851000012", place: 3, coins: 0, business: { name: "Everest IT Solutions", vatPan: "609876543", verified: false } },
];

// ---------------------------------------------------------------------------------------------
// Vendors (suppliers found in final.csv). Unknown vendors get a generated profile.
// ---------------------------------------------------------------------------------------------
export interface VendorProfile {
  ownerName: string;
  phone: string;
  place: number;
  pan: string;
}

export const VENDOR_PROFILES: Record<string, VendorProfile> = {
  "Apple Dealer": { ownerName: "Prakash Shrestha", phone: "9801000101", place: 0, pan: "301100101" },
  "Sangam Gadgets": { ownerName: "Sangam Maharjan", phone: "9801000102", place: 1, pan: "301100102" },
  "Digital Corner": { ownerName: "Deepa Karki", phone: "9801000103", place: 0, pan: "301100103" },
  "Ultima": { ownerName: "Rohan Adhikari", phone: "9801000104", place: 0, pan: "301100104" },
  "Resham Enterprises": { ownerName: "Resham Gurung", phone: "9801000105", place: 3, pan: "301100105" },
  "C Coon Gallery": { ownerName: "Chandra Thapa", phone: "9801000106", place: 2, pan: "301100106" },
  "RC Zone": { ownerName: "Ramesh Chaudhary", phone: "9801000107", place: 5, pan: "301100107" },
  "Paras": { ownerName: "Paras Bhandari", phone: "9801000108", place: 4, pan: "301100108" },
};

// ---------------------------------------------------------------------------------------------
// Product copy – used because final.csv has empty descriptions.
// Matched against the CSV "category:" facet values, most specific first.
// ---------------------------------------------------------------------------------------------
export interface CategoryCopy {
  match: RegExp;
  tagline: string;
  highlights: string[];
  weightKg: string;
  dims: [string, string, string]; // height, length, width in cm
  warranty: string;
  returnDays: number;
}

export const CATEGORY_COPY: CategoryCopy[] = [
  { match: /accessor|case|glass/i, tagline: "a protective, well-fitting accessory for your device", highlights: ["Precise cut-outs for ports and buttons", "Durable, scratch-resistant material", "Easy to fit and remove"], weightKg: "0.05", dims: ["16", "8", "1"], warranty: "3 months warranty", returnDays: 7 },
  { match: /iphone/i, tagline: "a flagship smartphone with a brilliant display, a pro-grade camera system and all-day battery life", highlights: ["Official Apple warranty and genuine accessories in the box", "Fast, smooth performance for gaming, video and multitasking", "Advanced cameras for crisp photos and 4K video"], weightKg: "0.23", dims: ["16", "8", "1"], warranty: "1 year warranty", returnDays: 7 },
  { match: /macbook/i, tagline: "a thin, powerful laptop built for work, study and creative projects", highlights: ["Long battery life that lasts a full working day", "Bright Retina display with accurate colour", "Silent, fanless-class efficiency for everyday tasks"], weightKg: "1.40", dims: ["2", "31", "22"], warranty: "1 year warranty", returnDays: 7 },
  { match: /ipad|tablet/i, tagline: "a versatile tablet for learning, drawing, streaming and getting things done on the go", highlights: ["Sharp, colour-accurate display", "Works with keyboard and pencil accessories", "Lightweight and portable"], weightKg: "0.48", dims: ["25", "18", "1"], warranty: "1 year warranty", returnDays: 7 },
  { match: /earbud|airpod|headphone/i, tagline: "true wireless earbuds with clear sound, a comfortable fit and a pocket-sized charging case", highlights: ["Bluetooth connection that pairs quickly and stays stable", "Comfortable for long listening sessions", "Charging case for multiple recharges on the go"], weightKg: "0.12", dims: ["6", "7", "3"], warranty: "6 months warranty", returnDays: 7 },
  { match: /smart ?watch|fitness/i, tagline: "a smartwatch that tracks your day – steps, heart rate, sleep and notifications – right from your wrist", highlights: ["Bright display with customisable watch faces", "Fitness and sleep tracking", "Bluetooth calling and notification support on selected models"], weightKg: "0.10", dims: ["5", "5", "1"], warranty: "6 months warranty", returnDays: 7 },
  { match: /power ?bank/i, tagline: "a high-capacity power bank to keep your phone, earbuds and tablet charged wherever you are", highlights: ["Fast charging with multiple output ports", "Compact, travel-friendly body", "Built-in protection against over-charge and short circuit"], weightKg: "0.35", dims: ["15", "7", "2"], warranty: "6 months warranty", returnDays: 7 },
  { match: /cable|power|charger|battery/i, tagline: "a durable, reliable accessory to charge and connect your devices safely", highlights: ["Tested for stable charging and data transfer", "Strong, tangle-resistant build", "Works with a wide range of phones and tablets"], weightKg: "0.08", dims: ["3", "12", "6"], warranty: "3 months warranty", returnDays: 7 },
  { match: /mouse|keyboard/i, tagline: "a comfortable, responsive input device for everyday work and play", highlights: ["Reliable wireless connection with a USB receiver", "Comfortable ergonomic design", "Long battery life"], weightKg: "0.25", dims: ["4", "12", "7"], warranty: "1 year warranty", returnDays: 7 },
  { match: /printer/i, tagline: "a dependable printer for home, school and small-office documents and photos", highlights: ["Sharp text and vivid photo output", "Wireless printing from phone and laptop", "Low running cost with high-yield ink"], weightKg: "5.60", dims: ["16", "44", "34"], warranty: "1 year warranty", returnDays: 7 },
  { match: /laptop|desktop|imac|notebook/i, tagline: "a reliable computer for work, study and entertainment", highlights: ["Fast SSD storage and smooth multitasking", "Crisp display for work and streaming", "Wi-Fi, Bluetooth and a full set of ports"], weightKg: "1.80", dims: ["2", "36", "25"], warranty: "1 year warranty", returnDays: 7 },
  { match: /monitor|projector/i, tagline: "a sharp, vibrant display for work, gaming and movies", highlights: ["Clear picture with wide viewing angles", "HDMI connectivity for laptops and consoles", "Slim bezels and an adjustable stand"], weightKg: "3.60", dims: ["42", "62", "20"], warranty: "1 year warranty", returnDays: 7 },
  { match: /router|wi-?fi|smart home|security/i, tagline: "a smart, easy-to-set-up device for a connected home", highlights: ["Quick setup with the companion mobile app", "Stable wireless connection", "Works with the most popular home setups"], weightKg: "0.25", dims: ["10", "12", "10"], warranty: "1 year warranty", returnDays: 7 },
  { match: /camera/i, tagline: "a camera that captures sharp, detailed photos and video", highlights: ["High-resolution sensor for crisp images", "Full HD video recording", "Wi-Fi / Bluetooth transfer to your phone"], weightKg: "0.70", dims: ["10", "13", "8"], warranty: "1 year warranty", returnDays: 7 },
  { match: /\btv\b|streaming/i, tagline: "a streaming-ready screen or stick for movies, shows and apps", highlights: ["4K picture with HDR support", "Built-in Google TV / Chromecast", "Voice remote with quick-launch buttons"], weightKg: "5.50", dims: ["60", "96", "9"], warranty: "1 year warranty", returnDays: 7 },
  { match: /console|gaming/i, tagline: "a gaming console for smooth, immersive play", highlights: ["Fast loading with built-in SSD storage", "Large library of games", "Wireless controller included"], weightKg: "3.20", dims: ["10", "39", "26"], warranty: "1 year warranty", returnDays: 7 },
  { match: /usb|hard drive|\bsd\b/i, tagline: "reliable storage to carry and back up your files", highlights: ["Fast transfer speeds", "Compact and durable", "Plug and play – no software needed"], weightKg: "0.15", dims: ["2", "11", "7"], warranty: "1 year warranty", returnDays: 7 },
  { match: /bag|backpack/i, tagline: "a padded carry solution that keeps your laptop safe on the move", highlights: ["Padded laptop compartment", "Water-resistant fabric", "Comfortable shoulder straps"], weightKg: "0.80", dims: ["45", "30", "14"], warranty: "6 months warranty", returnDays: 7 },
  { match: /\bphones?\b|galaxy|pixel/i, tagline: "a powerful smartphone with a great display, camera and battery life", highlights: ["Bright AMOLED display", "Capable multi-lens camera system", "5G connectivity and fast charging"], weightKg: "0.20", dims: ["16", "8", "1"], warranty: "1 year warranty", returnDays: 7 },
  { match: /audio|visual|speaker/i, tagline: "an audio accessory with rich sound for music, calls and videos", highlights: ["Clear, balanced sound", "Wireless Bluetooth connectivity", "Portable and easy to use"], weightKg: "0.40", dims: ["8", "18", "8"], warranty: "6 months warranty", returnDays: 7 },
];

export const DEFAULT_COPY: CategoryCopy = {
  match: /./,
  tagline: "a quality gadget chosen for everyday use",
  highlights: ["Genuine product from a verified seller", "Tested before dispatch", "Easy returns within the return window"],
  weightKg: "0.30",
  dims: ["6", "15", "8"],
  warranty: "6 months warranty",
  returnDays: 7,
};

// ---------------------------------------------------------------------------------------------
// Reviews & Q&A
// ---------------------------------------------------------------------------------------------
export const REVIEWS: Array<{ rating: number; summary: string; body: string }> = [
  { rating: 5, summary: "Excellent product, totally worth it", body: "Arrived in two days with the original box and seal intact. Works exactly as described. The seller was quick to respond and the packaging was great." },
  { rating: 5, summary: "Very happy with the quality", body: "Build quality is better than I expected for the price. Setup took a minute. Using it daily for a few weeks now with zero issues." },
  { rating: 4, summary: "Good value for money", body: "Does everything I need. Only small complaint is that the box was a bit dented during delivery, but the product itself is perfect." },
  { rating: 4, summary: "Solid, would recommend", body: "Performance is smooth and the battery lasts well. Delivery to my address took a little longer than promised but support kept me updated." },
  { rating: 5, summary: "Genuine and well packed", body: "Was worried about fakes but this is 100% genuine. Warranty card included and the invoice looked proper. Will buy again." },
  { rating: 3, summary: "Okay, but not perfect", body: "The product is decent. It works, but I expected slightly better finish. Customer service was helpful with my questions though." },
  { rating: 4, summary: "Nice upgrade", body: "Replaced my old one with this and the difference is clear. Fast, reliable and looks good. Price was fair compared to other shops." },
  { rating: 2, summary: "Delivery was delayed", body: "The item itself is fine but it came four days later than expected. Please improve dispatch times, otherwise a good product." },
];

export const QUESTIONS: Array<{ question: string; answer?: string }> = [
  { question: "Is this the official Nepal warranty version?", answer: "Yes, this unit is sold with the standard seller warranty and the warranty card is included in the box." },
  { question: "Do you deliver outside Kathmandu Valley?", answer: "Yes, we ship nationwide through NCM. Delivery outside the valley usually takes 3–5 working days." },
  { question: "Is Cash on Delivery available?", answer: "Cash on Delivery is available inside Kathmandu Valley. For other areas please pay online via Khalti or QR." },
  { question: "Can I return it if I don't like it?", answer: "Yes, you can return it within 7 days if it is unused and in its original packaging." },
  { question: "Is the invoice with PAN/VAT provided?", answer: "Yes, a VAT invoice is generated automatically for every order and you can download it from your order page." },
  { question: "Will you restock this soon?" },
];

// ---------------------------------------------------------------------------------------------
// Storefront content
// ---------------------------------------------------------------------------------------------
export const HERO_SLIDES = [
  { tagline: "New arrivals", heading: "The latest iPhones, now in Nepal", subtext: "Genuine devices with official warranty and fast nationwide delivery.", buttonLabel: "Shop phones", buttonUrl: "/collections/mobile-phones" },
  { tagline: "Mega gadget sale", heading: "Up to 20% off audio & accessories", subtext: "Earbuds, power banks and smart watches from trusted brands.", buttonLabel: "View deals", buttonUrl: "/collections/audio-and-visual" },
  { tagline: "Work smarter", heading: "Laptops & MacBooks for every budget", subtext: "Business accounts get extra discounts and VAT invoices.", buttonLabel: "Browse computers", buttonUrl: "/collections/computers" },
];

export const BANNERS = [
  { title: "Dashain Tech Festival", description: "Gift your family something smart this festive season.", ctaText: "Shop the sale", ctaLink: "/collections/technology", price: 0 },
  { title: "Power up on the go", description: "Power banks and fast chargers from NPR 399.", ctaText: "Explore chargers", ctaLink: "/collections/cables-and-power", price: 399 },
  { title: "Sound that moves you", description: "True wireless earbuds starting at NPR 1,499.", ctaText: "Find earbuds", ctaLink: "/collections/earbuds", price: 1499 },
];

export const SOCIAL_LINKS = {
  facebook: "https://facebook.com/techmandu",
  instagram: "https://instagram.com/techmandu",
  tiktok: "https://tiktok.com/@techmandu",
  youtube: "https://youtube.com/@techmandu",
  whatsapp: "https://wa.me/9779800000000",
};

export const PAGE_GROUPS = [
  { name: "Company", slug: "company" },
  { name: "Customer Care", slug: "customer-care" },
  { name: "Legal", slug: "legal" },
];

const p = (...paras: string[]) => paras.map((t) => `<p>${t}</p>`).join("\n");

export const PAGES: Array<{ group: string; title: string; slug: string; content: string; metaDescription: string }> = [
  {
    group: "company",
    title: "About Us",
    slug: "about-us",
    metaDescription: "Techmandu is Nepal's marketplace for genuine gadgets from trusted local sellers.",
    content: p(
      "Techmandu is a marketplace for genuine gadgets in Nepal. We bring trusted local sellers together in one place so you can compare, buy and get your device delivered without worrying about fakes.",
      "Every seller on Techmandu is verified, every order gets a proper VAT invoice, and every product is covered by the seller's warranty.",
      "Earn Tech Coins on every order and redeem them for discounts on your next purchase.",
    ),
  },
  {
    group: "company",
    title: "Contact Us",
    slug: "contact-us",
    metaDescription: "Reach the Techmandu support team by phone, email or WhatsApp.",
    content: p(
      "Questions about an order or a product? Our team is available Sunday to Friday, 10:00 AM – 6:00 PM.",
      "Phone / WhatsApp: +977 980-0000000<br/>Email: support@techmandu.example.com<br/>Office: New Baneshwor, Kathmandu",
    ),
  },
  {
    group: "customer-care",
    title: "Shipping Policy",
    slug: "shipping-policy",
    metaDescription: "How Techmandu delivers inside and outside Kathmandu Valley.",
    content: p(
      "<strong>Inside Kathmandu Valley:</strong> delivery in 1–2 working days. Cash on Delivery is available.",
      "<strong>Outside the valley:</strong> delivery in 3–5 working days through our courier partner NCM. Please pay online via Khalti or QR for these orders.",
      "You can follow your parcel any time from the order tracking page using your order code and email address.",
    ),
  },
  {
    group: "customer-care",
    title: "Return & Refund Policy",
    slug: "return-policy",
    metaDescription: "7-day return policy on eligible products.",
    content: p(
      "You can return most products within 7 days of delivery if they are unused, in their original packaging and with all accessories.",
      "Warranty claims are handled by the respective seller – keep your invoice and warranty card safe.",
      "Approved refunds are returned to your original payment method or bank account within 5–7 working days.",
    ),
  },
  {
    group: "legal",
    title: "Privacy Policy",
    slug: "privacy-policy",
    metaDescription: "How Techmandu collects and protects your personal data.",
    content: p(
      "We collect only the information needed to process your orders – your name, contact details and delivery address.",
      "We never sell your data. Payment details are handled by our payment partners and are not stored on our servers.",
      "You can request deletion of your account at any time from your profile page.",
    ),
  },
  {
    group: "legal",
    title: "Terms & Conditions",
    slug: "terms-and-conditions",
    metaDescription: "Terms of using the Techmandu marketplace.",
    content: p(
      "By placing an order you agree to these terms. Prices are shown in Nepalese Rupees (NPR) and include or exclude VAT as shown at checkout.",
      "Sellers are responsible for product authenticity and warranty. Techmandu mediates orders, payments and delivery.",
    ),
  },
];

export const BLOGS: Array<{ name: string; slug: string; metaDescription: string; content: string }> = [
  {
    name: "How to choose the right smartphone in 2026",
    slug: "how-to-choose-the-right-smartphone",
    metaDescription: "A simple checklist for picking a phone that fits your budget and needs.",
    content: p(
      "Choosing a phone can feel overwhelming. Start with your budget, then decide what matters most: camera, battery life, performance or long-term software updates.",
      "<strong>Camera:</strong> look at real photo samples, not just megapixels.<br/><strong>Battery:</strong> 4,500 mAh and above lasts a full day for most people.<br/><strong>Storage:</strong> 256 GB is the comfortable minimum if you shoot a lot of video.",
      "Always buy from a seller who provides a warranty card and a VAT invoice.",
    ),
  },
  {
    name: "TWS earbuds buying guide: what actually matters",
    slug: "tws-earbuds-buying-guide",
    metaDescription: "Battery life, Bluetooth versions and fit – a practical guide to buying wireless earbuds.",
    content: p(
      "Look for Bluetooth 5.1 or newer for a stable connection, at least 5 hours of playback per charge, and a case that gives you 3–4 extra charges.",
      "Fit is everything: if the earbuds are uncomfortable you will stop using them. Try different ear-tip sizes in the box.",
    ),
  },
  {
    name: "Power bank basics: capacity, speed and safety",
    slug: "power-bank-basics",
    metaDescription: "How to pick the right power bank for your phone and travel needs.",
    content: p(
      "A 10,000 mAh power bank charges a typical phone about two times. For laptops you need a higher-wattage USB-C power bank.",
      "Check for over-charge, over-current and short-circuit protection, and never use damaged cables.",
    ),
  },
  {
    name: "Dashain & Tihar tech gift guide",
    slug: "dashain-tihar-tech-gift-guide",
    metaDescription: "Gadget gift ideas for every budget this festive season.",
    content: p(
      "Under NPR 2,000: cables, chargers and phone stands.<br/>NPR 2,000–10,000: earbuds, smart watches and power banks.<br/>NPR 10,000+: tablets, laptops and phones.",
      "Order early – festive deliveries get busy and outside-valley parcels take a little longer.",
    ),
  },
  {
    name: "Keep your laptop battery healthy",
    slug: "keep-your-laptop-battery-healthy",
    metaDescription: "Simple habits that make your laptop battery last years longer.",
    content: p(
      "Avoid keeping your laptop at 100% or 0% for long periods. Aim to stay between 20% and 80% when possible.",
      "Keep it cool: use it on a hard surface, not on a bed or blanket, and update the system regularly.",
    ),
  },
];

// ---------------------------------------------------------------------------------------------
// Store configuration
// ---------------------------------------------------------------------------------------------
export const ADMINS = [
  { firstName: "Order", lastName: "Manager", email: "orders@techmandu.example.com", role: "order-manager" },
  { firstName: "Inventory", lastName: "Manager", email: "inventory@techmandu.example.com", role: "inventory-manager" },
  { firstName: "Store", lastName: "Admin", email: "admin@techmandu.example.com", role: "administrator" },
];

export const LOYALTY_TIERS = [
  { name: "Starter", minOrderValue: 0, maxOrderValue: 9999, coins: 1, rewardInterval: 100, description: "1 coin for every NPR 100 spent" },
  { name: "Silver", minOrderValue: 10000, maxOrderValue: 49999, coins: 2, rewardInterval: 100, description: "2 coins for every NPR 100 spent" },
  { name: "Gold", minOrderValue: 50000, maxOrderValue: 100000000, coins: 3, rewardInterval: 100, description: "3 coins for every NPR 100 spent" },
];

/** Approximate demo exchange rates (NPR per 1 unit of foreign currency). */
export const RATES = { usd: 140, aud: 92 };

// ---------------------------------------------------------------------------------------------
// Extra demo products. final.csv only covers 18 categories, but initial.ts defines ~55 collections, so
// ~38 of them would be empty. These products (prices in NPR, fictional / approximate) fill the gaps.
// Category names must match the facetValueNames used by the collections in initial.ts.
// ---------------------------------------------------------------------------------------------
export interface ExtraProduct {
  name: string;
  brand: string;
  vendor: string;
  price: number;
  cats: string[];
  specs: Array<[string, string]>;
}

export const EXTRA_PRODUCTS: ExtraProduct[] = [
  { name: "Dell Inspiron 15 3520 Laptop (Core i5, 16GB RAM, 512GB SSD)", brand: "Dell", vendor: "Digital Corner", price: 89999, cats: ["Computers", "Laptops"], specs: [["Processor", "Intel Core i5 12th Gen"], ["Memory", "16 GB DDR4"], ["Storage", "512 GB NVMe SSD"], ["Display", "15.6-inch FHD 120Hz"]] },
  { name: "Lenovo IdeaPad Slim 3 (Ryzen 5, 16GB RAM, 512GB SSD)", brand: "Lenovo", vendor: "Digital Corner", price: 74999, cats: ["Computers", "Laptops"], specs: [["Processor", "AMD Ryzen 5 7520U"], ["Memory", "16 GB LPDDR5"], ["Storage", "512 GB SSD"], ["Weight", "1.62 kg"]] },
  { name: "HP Pavilion 15 (Core i7, 16GB RAM, 1TB SSD)", brand: "HP", vendor: "Sangam Gadgets", price: 119999, cats: ["Computers", "Laptops"], specs: [["Processor", "Intel Core i7 13th Gen"], ["Memory", "16 GB DDR4"], ["Storage", "1 TB SSD"], ["Graphics", "Intel Iris Xe"]] },
  { name: "Dell S2425H 24-inch Full HD 100Hz Monitor", brand: "Dell", vendor: "Digital Corner", price: 21500, cats: ["Computers", "Monitors"], specs: [["Size", "24 inch"], ["Resolution", "1920 x 1080"], ["Refresh rate", "100 Hz"], ["Ports", "HDMI, VGA"]] },
  { name: "LG UltraGear 27-inch 144Hz Gaming Monitor", brand: "LG", vendor: "RC Zone", price: 38900, cats: ["Computers", "Monitors", "Gaming"], specs: [["Size", "27 inch"], ["Panel", "IPS"], ["Refresh rate", "144 Hz"], ["Response time", "1 ms"]] },
  { name: "iMac 24-inch M3 (8GB, 256GB)", brand: "Apple", vendor: "Apple Dealer", price: 259000, cats: ["Computers", "Desktop", "iMacs"], specs: [["Chip", "Apple M3"], ["Memory", "8 GB"], ["Storage", "256 GB SSD"], ["Display", "24-inch 4.5K Retina"]] },
  { name: "SanDisk Ultra 128GB USB 3.0 Flash Drive", brand: "SanDisk", vendor: "Sangam Gadgets", price: 1699, cats: ["Computers", "USB", "SD"], specs: [["Capacity", "128 GB"], ["Interface", "USB 3.0"], ["Read speed", "up to 130 MB/s"]] },
  { name: "Seagate Portable 1TB External Hard Drive", brand: "Seagate", vendor: "Sangam Gadgets", price: 8999, cats: ["Computers", "Hard Drives"], specs: [["Capacity", "1 TB"], ["Interface", "USB 3.0"], ["Compatibility", "Windows and macOS"]] },
  { name: "Targus 15.6-inch Laptop Backpack", brand: "Targus", vendor: "Resham Enterprises", price: 5999, cats: ["Computers", "Laptop Bags"], specs: [["Fits", "up to 15.6-inch laptops"], ["Material", "Water-resistant polyester"], ["Capacity", "24 L"]] },
  { name: "Samsung Galaxy S24 FE 5G (8GB, 256GB)", brand: "Samsung", vendor: "Digital Corner", price: 79999, cats: ["Mobile Phones", "Phones", "Galaxy"], specs: [["Display", "6.7-inch Dynamic AMOLED 120Hz"], ["Memory", "8 GB RAM, 256 GB storage"], ["Battery", "4,700 mAh, 25W charging"], ["Camera", "50 MP triple camera"]] },
  { name: "Samsung Galaxy A55 5G (8GB, 128GB)", brand: "Samsung", vendor: "Sangam Gadgets", price: 59999, cats: ["Mobile Phones", "Phones", "Galaxy"], specs: [["Display", "6.6-inch Super AMOLED 120Hz"], ["Memory", "8 GB RAM, 128 GB storage"], ["Battery", "5,000 mAh"], ["Camera", "50 MP OIS main camera"]] },
  { name: "Google Pixel 8a (8GB, 128GB)", brand: "Google Pixel", vendor: "Digital Corner", price: 69999, cats: ["Mobile Phones", "Phones"], specs: [["Chip", "Google Tensor G3"], ["Display", "6.1-inch OLED 120Hz"], ["Memory", "8 GB RAM, 128 GB storage"], ["Updates", "7 years of OS updates"]] },
  { name: "Spigen Ultra Hybrid Case for iPhone 16", brand: "Spigen", vendor: "Sangam Gadgets", price: 1999, cats: ["Mobile Phones", "Mobile Accessories"], specs: [["Compatibility", "iPhone 16"], ["Material", "TPU + clear PC back"]] },
  { name: "Tempered Glass Screen Protector (Pack of 2)", brand: "Baseus", vendor: "Sangam Gadgets", price: 599, cats: ["Mobile Phones", "Mobile Accessories"], specs: [["Hardness", "9H"], ["Pack", "2 pieces + installation frame"]] },
  { name: "Smart Folio Case for iPad Air 11-inch", brand: "Apple", vendor: "Apple Dealer", price: 8999, cats: ["iPads & Tablets", "Tablet Cases"], specs: [["Compatibility", "iPad Air 11-inch"], ["Features", "Magnetic attach, stand modes"]] },
  { name: "Xiaomi TV A Pro 43-inch 4K Google TV", brand: "Xiaomi", vendor: "Ultima", price: 42999, cats: ["Audio & Visual", "TV", "Streaming"], specs: [["Size", "43 inch"], ["Resolution", "4K UHD"], ["Platform", "Google TV"], ["Audio", "Dolby Audio, 24W"]] },
  { name: "Xiaomi TV Stick 4K", brand: "Xiaomi", vendor: "Ultima", price: 7500, cats: ["Audio & Visual", "Streaming"], specs: [["Resolution", "4K HDR"], ["Platform", "Google TV"], ["Remote", "Voice remote"]] },
  { name: "JBL Flip 6 Portable Bluetooth Speaker", brand: "JBL", vendor: "Ultima", price: 15999, cats: ["Audio & Visual", "Speaker"], specs: [["Battery", "up to 12 hours"], ["Water resistance", "IP67"], ["Connectivity", "Bluetooth 5.1"]] },
  { name: "Boya BY-M1 Lavalier Microphone", brand: "Boya", vendor: "Ultima", price: 2499, cats: ["Audio & Visual", "Microphone"], specs: [["Type", "Omnidirectional lavalier"], ["Cable", "6 m"], ["Compatibility", "Phones, cameras, laptops"]] },
  { name: "Canon EOS 200D II DSLR Camera with 18-55mm Lens", brand: "Canon", vendor: "C Coon Gallery", price: 82000, cats: ["Audio & Visual", "Camera"], specs: [["Sensor", "24.1 MP APS-C"], ["Video", "Full HD 60p"], ["Screen", "3-inch vari-angle touchscreen"]] },
  { name: "Epson EB-E01 XGA Projector", brand: "Epson", vendor: "Resham Enterprises", price: 55000, cats: ["Audio & Visual", "Projector"], specs: [["Brightness", "3,300 lumens"], ["Resolution", "XGA 1024 x 768"], ["Ports", "HDMI, VGA"]] },
  { name: "Sony PlayStation 5 Slim Console", brand: "Sony", vendor: "RC Zone", price: 85000, cats: ["Audio & Visual", "Console", "Gaming"], specs: [["Storage", "1 TB SSD"], ["Output", "up to 4K 120Hz"], ["Controller", "DualSense wireless"]] },
  { name: "Xbox Series S 512GB Console", brand: "Microsoft", vendor: "RC Zone", price: 55000, cats: ["Audio & Visual", "Console", "Gaming"], specs: [["Storage", "512 GB SSD"], ["Output", "up to 1440p 120Hz"], ["Controller", "Xbox wireless"]] },
  { name: "TP-Link Archer C6 AC1200 Wi-Fi Router", brand: "TP-Link", vendor: "Resham Enterprises", price: 4499, cats: ["Smart Tech", "Router"], specs: [["Speed", "AC1200 dual band"], ["Antennas", "4 external"], ["Ports", "4 x gigabit LAN"]] },
  { name: "TP-Link Tapo C200 Pan/Tilt Wi-Fi Security Camera", brand: "TP-Link", vendor: "Resham Enterprises", price: 4299, cats: ["Smart Tech", "Security Cameras"], specs: [["Resolution", "1080p"], ["Night vision", "up to 9 m"], ["Storage", "microSD up to 256 GB"]] },
  { name: "Xiaomi Smart Plug (Wi-Fi)", brand: "Xiaomi", vendor: "Resham Enterprises", price: 1499, cats: ["Smart Tech", "Smart Home"], specs: [["Control", "App and voice"], ["Rated load", "10 A"], ["Connectivity", "2.4 GHz Wi-Fi"]] },
  { name: "Xiaomi Smart Band 9", brand: "Xiaomi", vendor: "Digital Corner", price: 6999, cats: ["Fitness & Health", "Fitness Trackers"], specs: [["Display", "1.62-inch AMOLED"], ["Battery", "up to 21 days"], ["Water resistance", "5 ATM"]] },
  { name: "Omron HEM-7121 Digital Blood Pressure Monitor", brand: "Omron", vendor: "Paras", price: 4999, cats: ["Fitness & Health", "Health Tech"], specs: [["Type", "Upper arm"], ["Memory", "60 readings"], ["Features", "Irregular heartbeat detector"]] },
  { name: "HP 680 Black Original Ink Cartridge", brand: "HP", vendor: "Resham Enterprises", price: 1799, cats: ["Home & Office Equipment", "Ink"], specs: [["Colour", "Black"], ["Yield", "~480 pages"]] },
  { name: "HP 12A Black Original LaserJet Toner Cartridge", brand: "HP", vendor: "Resham Enterprises", price: 6499, cats: ["Home & Office Equipment", "Toner"], specs: [["Colour", "Black"], ["Yield", "~2,000 pages"]] },
  { name: "Canon CanoScan LiDE 300 Flatbed Scanner", brand: "Canon", vendor: "Resham Enterprises", price: 14999, cats: ["Home & Office Equipment", "Scanner"], specs: [["Resolution", "2400 x 2400 dpi"], ["Interface", "USB-C"], ["Power", "USB bus powered"]] },
  { name: "Philips Air Fryer HD9200", brand: "Philips", vendor: "Resham Enterprises", price: 9999, cats: ["Home & Office Equipment", "Appliance"], specs: [["Capacity", "4.1 L"], ["Power", "1400 W"], ["Technology", "Rapid Air"]] },
  { name: "Baseus USB-C to Lightning Cable (1 m)", brand: "Baseus", vendor: "Sangam Gadgets", price: 1199, cats: ["Cables & Power", "Cable"], specs: [["Length", "1 m"], ["Power", "up to 20W fast charging"], ["Build", "Braided nylon"]] },
  { name: "Anker 20W USB-C Fast Charger", brand: "Anker", vendor: "Sangam Gadgets", price: 1999, cats: ["Cables & Power", "Charger"], specs: [["Output", "20W USB-C PD"], ["Safety", "Over-heat and short-circuit protection"]] },
  { name: "Baseus 65W GaN Fast Charger (2 USB-C + 1 USB-A)", brand: "Baseus", vendor: "Sangam Gadgets", price: 3999, cats: ["Cables & Power", "Charger"], specs: [["Output", "65W max"], ["Ports", "2 x USB-C, 1 x USB-A"], ["Technology", "GaN"]] },
  { name: "Duracell AA Alkaline Batteries (Pack of 4)", brand: "Duracell", vendor: "Paras", price: 450, cats: ["Cables & Power", "Battery"], specs: [["Type", "AA alkaline"], ["Pack", "4 batteries"]] },
  { name: "Corsair CX550 80 Plus Bronze Power Supply", brand: "Corsair", vendor: "RC Zone", price: 7499, cats: ["Cables & Power", "Power Supplies"], specs: [["Power", "550 W"], ["Efficiency", "80 Plus Bronze"], ["Cooling", "120 mm fan"]] },
  { name: "Ncell Prepaid SIM Card", brand: "Ncell", vendor: "Paras", price: 200, cats: ["Tech Services", "Sim", "Ncell"], specs: [["Type", "Prepaid"], ["Network", "4G / LTE"]] },
  { name: "NTC Prepaid SIM Card", brand: "NTC", vendor: "Paras", price: 200, cats: ["Tech Services", "Sim", "NTC"], specs: [["Type", "Prepaid"], ["Network", "4G / LTE"]] },
];
