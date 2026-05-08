const SERPAPI_KEY = process.env.SERPAPI_KEY || "";

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fetch   = (...a) => import("node-fetch").then(({ default: f }) => f(...a));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const ROUTES = [
  { to:"JFK", city:"New York",      region:"North America", flag:"🇺🇸" },
  { to:"LAX", city:"Los Angeles",   region:"North America", flag:"🇺🇸" },
  { to:"ORD", city:"Chicago",       region:"North America", flag:"🇺🇸" },
  { to:"MIA", city:"Miami",         region:"North America", flag:"🇺🇸" },
  { to:"GRU", city:"São Paulo",     region:"South America", flag:"🇧🇷" },
  { to:"EZE", city:"Buenos Aires",  region:"South America", flag:"🇦🇷" },
  { to:"BOG", city:"Bogotá",        region:"South America", flag:"🇨🇴" },
  { to:"LIM", city:"Lima",          region:"South America", flag:"🇵🇪" },
  { to:"NRT", city:"Tokyo",         region:"Asia",          flag:"🇯🇵" },
  { to:"BKK", city:"Bangkok",       region:"Asia",          flag:"🇹🇭" },
  { to:"SIN", city:"Singapore",     region:"Asia",          flag:"🇸🇬" },
  { to:"DEL", city:"Delhi",         region:"Asia",          flag:"🇮🇳" },
  { to:"ICN", city:"Seoul",         region:"Asia",          flag:"🇰🇷" },
  { to:"HKG", city:"Hong Kong",     region:"Asia",          flag:"🇭🇰" },
  { to:"DXB", city:"Dubai",         region:"Middle East",   flag:"🇦🇪" },
  { to:"DOH", city:"Doha",          region:"Middle East",   flag:"🇶🇦" },
  { to:"JNB", city:"Johannesburg",  region:"Africa",        flag:"🇿🇦" },
  { to:"NBO", city:"Nairobi",       region:"Africa",        flag:"🇰🇪" },
  { to:"CAI", city:"Cairo",         region:"Africa",        flag:"🇪🇬" },
  { to:"SYD", city:"Sydney",        region:"Oceania",       flag:"🇦🇺" },
  { to:"MEL", city:"Melbourne",     region:"Oceania",       flag:"🇦🇺" },
];

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function fetchPrice(route) {
  const departDate = futureDate(30);
  const returnDate = futureDate(37);
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: "FRA",
    arrival_id: route.to,
    outbound_date: departDate,
    return_date: returnDate,
    currency: "EUR",
    hl: "en",
    api_key: SERPAPI_KEY,
  });
  const res  = await fetch(`https://serpapi.com/search?${params}`);
  const data = await res.json();
  const all  = [...(data.best_flights || []), ...(data.other_flights || [])];
  if (!all.length) return null;
  const best   = all.sort((a, b) => a.price - b.price)[0];
  const flight = best.flights?.[0] || {};
  return {
    ...route,
    price:      best.price,
    airline:    flight.airline || "Various",
    stops:      (best.flights?.length || 1) - 1,
    duration:   best.total_duration
      ? `${Math.floor(best.total_duration / 60)}h ${best.total_duration % 60}m`
      : "N/A",
    departDate,
    returnDate,
    bookingUrl: `https://www.google.com/travel/flights#flt=FRA.${route.to}.${departDate}*${route.to}.FRA.${returnDate}`,
  };
}

app.get("/api/deals", async (req, res) => {
  if (!SERPAPI_KEY) return res.status(500).json({ ok: false, error: "SERPAPI_KEY not set in Railway environment variables" });
  try {
    const results = [];
    for (let i = 0; i < ROUTES.length; i += 3) {
      const batch   = ROUTES.slice(i, i + 3);
      const fetched = await Promise.all(batch.map(r => fetchPrice(r).catch(() => null)));
      results.push(...fetched.filter(Boolean));
    }
    res.json({ ok: true, deals: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/deals/:code", async (req, res) => {
  if (!SERPAPI_KEY) return res.status(500).json({ ok: false, error: "SERPAPI_KEY not set" });
  const route = ROUTES.find(r => r.to === req.params.code.toUpperCase());
  if (!route) return res.status(404).json({ ok: false, error: "Unknown route" });
  try {
    const deal = await fetchPrice(route);
    res.json({ ok: true, deal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✈  FRA Deals running on port ${PORT}`));
