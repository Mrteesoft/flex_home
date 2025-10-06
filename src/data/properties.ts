export interface PropertySummary {
  id: number;
  slug: string;
  name: string;
  headline: string;
  description: string;
  location: string;
  sleeps: number;
  bedrooms: number;
  bathrooms: number;
  size: number; // square metres
  heroImage: string;
  gallery: string[];
  highlights: string[];
  amenities: string[];
  neighbourhood: string;
}

const properties: PropertySummary[] = [
  {
    id: 201,
    slug: "shoreditch-heights-a",
    name: "Shoreditch Heights A",
    headline: "Skyline loft with floor-to-ceiling views and a private terrace",
    description:
      "Perched above Shoreditch High Street, this Flex Living residence layers biophilic interiors with curated art, a fully-equipped chef’s kitchen, and a seamless smart-lock arrival. Perfect for small teams working hybrid weeks or families who want the buzz of East London with the comfort of a boutique hotel.",
    location: "Shoreditch, London E1",
    sleeps: 4,
    bedrooms: 2,
    bathrooms: 2,
    size: 92,
    heroImage:
      "https://images.unsplash.com/photo-1616594039964-54ecec6f5035?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    ],
    highlights: [
      "Dual-aspect skyline views",
      "Private terrace with heated seating",
      "Sonos multi-room audio",
      "Dedicated workspace with 1Gb Wi-Fi",
    ],
    amenities: [
      "Super-fast Wi-Fi",
      "Digital concierge",
      "Weekly housekeeping",
      "In-suite laundry",
      "Smart climate control",
      "Nespresso Vertuo bar",
      "Underfloor heating",
      "Secure cycle storage",
      "Lift access",
      "On-demand wellness",
    ],
    neighbourhood:
      "Steps from Boxpark and Old Street’s tech hub, Shoreditch Heights puts you in the heart of London’s creative district. Independent roasteries, design-led coworking, and Michelin plates are all within a five-minute walk.",
  },
  {
    id: 202,
    slug: "camden-lock-suites",
    name: "Camden Lock Suites",
    headline: "Warehouse-inspired duplex moments from Regent’s Canal",
    description:
      "Channel the energy of Camden Market while enjoying tucked-away serenity. Exposed brick, bespoke joinery, and acoustic glazing balance heritage with calm. Ideal for couples or executives seeking culture-rich stays.",
    location: "Camden Town, London NW1",
    sleeps: 3,
    bedrooms: 1,
    bathrooms: 1,
    size: 68,
    heroImage:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80",
    ],
    highlights: [
      "Rooftop access with canal panoramics",
      "Acoustic glazing for total calm",
      "Chef’s kitchen with induction hob",
      "Curated art from local makers",
    ],
    amenities: [
      "Gigabit Wi-Fi",
      "Pet-friendly stays",
      "In-suite laundry",
      "Weekly housekeeping",
      "Digital guidebook",
      "Smart TV with streaming",
      "Green cleaning programme",
      "Contactless check-in",
      "Complimentary Peloton access",
      "Premium toiletries",
    ],
    neighbourhood:
      "Camden Lock Suites places you beside iconic music venues, global street food, and waterside strolls. Morning coffee at Pamban, meetings in King’s Cross, and rooftop sunsets are your daily rituals.",
  },
  {
    id: 203,
    slug: "southbank-riverside-loft",
    name: "Southbank Riverside Loft",
    headline: "Penthouse duplex with Thames panoramas and cinema lounge",
    description:
      "Wake up to postcard views of St Paul’s and the Tate Modern. This duplex loft layers designer furnishings, blackout bedrooms, and a dedicated media den—tailor-made for families or exec teams needing space to create and decompress.",
    location: "Southbank, London SE1",
    sleeps: 5,
    bedrooms: 2,
    bathrooms: 2,
    size: 110,
    heroImage:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=1200&q=80",
    ],
    highlights: [
      "Floor-to-ceiling Thames frontage",
      "Private cinema den",
      "Blackout bedrooms & noise masking",
      "Dedicated concierge & welcome hamper",
    ],
    amenities: [
      "Ultra-fast Wi-Fi",
      "Private workspace",
      "Smart climate zones",
      "Wash-dry laundry",
      "Nescafé Dolce Gusto",
      "Hypoallergenic bedding",
      "In-suite wellness kit",
      "Weekly housekeeping",
      "24/7 guest app",
      "Secure entry system",
    ],
    neighbourhood:
      "Moments from the National Theatre, Borough Market, and Waterloo connections, the Southbank Riverside Loft keeps culture, dining, and riverfront jogging loops effortlessly close.",
  },
  {
    id: 204,
    slug: "kings-cross-studio-xl",
    name: "King's Cross Studio XL",
    headline: "Design-led studio tailored for agile teams and solo founders",
    description:
      "A generous studio framed by Crittall windows, polished concrete floors, and bespoke joinery. King’s Cross Studio XL delivers hotel-grade services with startup-ready work zones.",
    location: "King’s Cross, London N1",
    sleeps: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 54,
    heroImage:
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1467987506553-8f3916508521?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
    ],
    highlights: [
      "Hotel-grade housekeeping",
      "Ergonomic workstation with dual monitors",
      "Ambient lighting scenes",
      "Rain shower with spa amenities",
    ],
    amenities: [
      "1Gb Wi-Fi",
      "Secure smart access",
      "Kitchenette with induction hob",
      "Weekly housekeeping",
      "Laundry facilities",
      "Marshall Bluetooth speaker",
      "In-room dining partnerships",
      "24/7 guest support",
      "Pet-friendly",
      "Wellness partnerships",
    ],
    neighbourhood:
      "Plug directly into the King’s Cross knowledge quarter. Coal Drops Yard retail, St Pancras connections, and leafy Regent’s Canal paths are outside your door.",
  },
  {
    id: 205,
    slug: "notting-hill-garden-flat",
    name: "Notting Hill Garden Flat",
    headline: "Victorian charm with a private walled garden sanctuary",
    description:
      "Think pastel townhouse vibes with contemporary comforts. The Notting Hill Garden Flat merges period fireplaces, sash windows, and a plant-filled courtyard—perfect for slow mornings or creative retreats.",
    location: "Notting Hill, London W11",
    sleeps: 4,
    bedrooms: 2,
    bathrooms: 2,
    size: 88,
    heroImage:
      "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512914890250-353c97c9e7cf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1460472178825-e5240623afd5?auto=format&fit=crop&w=1200&q=80",
    ],
    highlights: [
      "Private walled garden",
      "Clawfoot soaking tub",
      "Heated bathroom floors",
      "Dedicated workspace overlooking the garden",
    ],
    amenities: [
      "High-speed Wi-Fi",
      "Smartlock entry",
      "Weekly housekeeping",
      "In-suite laundry",
      "Premium bedding",
      "Fully equipped kitchen",
      "Sonos speaker",
      "Flexible stay lengths",
      "Family-friendly kit",
      "Green cleaning products",
    ],
    neighbourhood:
      "Minutes from Portobello Road antiques, artisanal bakeries, and leafy garden squares. Westbourne Grove boutiques and the Central line are moments away.",
  },
];

export const getPropertyBySlug = (slug: string) =>
  properties.find((property) => property.slug === slug);

export const allProperties = () => properties;
