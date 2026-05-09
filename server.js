const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN || "";

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
  { to:"MIA", city:"Miami",         region:"North America", flag:"🇺🇸" },
  { to:"GRU", city:"Sao Paulo",     region:"South America", flag:"🇧🇷" },
  { to:"EZE", city:"Buenos Aires",  region:"South America", flag:"🇦🇷" },
  { to:"BOG", city:"Bogota",        region:"South America", flag:"🇨🇴" },
  { to:"NRT", city:"Tokyo",         region:"Asia",          flag:"🇯🇵" },
  { to:"BKK", city:"Bangkok",       region:"Asia",          flag:"🇹🇭" },
  { to:"SIN", city:"Singapore",     region:"Asia",          flag:"🇸🇬" },
  { to:"DEL", city:"Delhi",         region:"Asia",          flag:"🇮🇳" },
  { to:"ICN", city:"Seoul",         region:"Asia",          flag:"🇰🇷" },
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

async function fetchPrice(iataCode) {
  const url = "https://api.travelpayouts.com/v1/prices/cheap?origin=FRA&destination=" + iataCode + "&currency=eur&token=" + TRAVELPAYOUTS_TOKEN;
  const res  = await fetch(url);
  const data = await res.json();
  if (!data.success || !data.data || !data.data[iataCode]) return null;
  const prices = Object.values(data.data[iataCode]);
  if (!prices.length) return null;
  const best = prices.sort((a, b) => a.price - b.price)[0];
  return {
    price:      best.price,
    airline:    best.airline || "Various",
    stops:      best.number_of_changes || 0,
    departDate: best.departure_at ? best.departure_at.split("T")[0] : "N/A",
    returnDate: best.return_at    ? best.return_at.split("T")[0]    : "N/A",
    bookingUrl: "https://www.aviasales.com/search/FRA" + iataCode + "1",
  };
}

app.get("/api/deals", async (req, res) => {
  if (!TRAVELPAYOUTS_TOKEN) return res.status(500).json({ ok: false, error: "TRAVELPAYOUTS_TOKEN not set" });
  try {
    const results = await Promise.all(
      ROUTES.map(async (route) => {
        const price = await fetchPrice(route.to).catch(() => null);
        if (!price) return null;
        return Object.assign({}, route, price);
      })
    );
    res.json({ ok: true, deals: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/search", async (req, res) => {
  if (!TRAVELPAYOUTS_TOKEN) return res.status(500).json({ ok: false, error: "TRAVELPAYOUTS_TOKEN not set" });
  const q    = (req.query.q || "").trim().toUpperCase();
  if (!q || q.length < 2) return res.status(400).json({ ok: false, error: "Query too short" });
  const known = ROUTES.find(r => r.to ===​​​​​​​​​​​​​​​​
