import { isSignedIn } from "@/lib/session";

// Turns spreadsheet rows into structured contacts with Groq. The key stays on the server
// (GROQ_API_KEY env var). Models are tried in order; any failure (rate limit, outage, retired
// model, malformed JSON) falls through to the next one.
const DEFAULT_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
const MODELS = (process.env.GROQ_MODELS || "").split(",").map((m) => m.trim()).filter(Boolean);
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_ROWS_PER_REQUEST = 20;
const TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You turn spreadsheet rows into contact cards.

Input: a JSON array. Each item is one spreadsheet row: {"row": <row number>, "cells": {<column name>: <cell value>}}.
Column names can be in any wording or language (e.g. "Full Name", "Designation", "Firm", "Cell", "Mail", "Addr").

Reply with JSON only, exactly this shape, one contact per input row, same "row" numbers, same order:
{"contacts":[{"row":0,"firstName":"","lastName":"","jobTitle":"","organization":"","email":"","phones":[{"type":"mobile","number":""}],"urls":[],"street":"","city":"","region":"","postcode":"","country":""}]}

Rules:
- Split a full name into firstName and lastName (surname). Drop honorifics like Mr, Mrs, Ms, Dr, Shri.
- phones: one entry per phone number found anywhere in the row. type is "mobile" for mobile/cell/WhatsApp numbers, "fax" for fax, otherwise "phone" (landline, office, telephone). If a cell holds several numbers, list each. Copy digits and any leading + as written; do not add country codes.
- email: the person's email address. urls: website and social profile links.
- Address: street = building, street and locality/area (e.g. "12 Hill Road, Bandra"); city = the city or town (e.g. "Mumbai"); region = state or province (e.g. "Maharashtra"); postcode = PIN/ZIP code; country. If the address is only a city (e.g. "Dubai"), put it in city, not street.
- Ignore columns that aren't contact details (IDs, serial numbers, notes, dates, amounts).
- Use "" (or []) when something isn't in the row. Never invent or guess data.`;

const str = (value, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const PHONE_TYPES = new Set(["mobile", "phone", "fax"]);

// Keep only the expected fields, as plain strings, whatever the model returned
const normalizeContact = (c = {}) => ({
  row: Number(c.row) || 0,
  firstName: str(c.firstName),
  lastName: str(c.lastName),
  jobTitle: str(c.jobTitle),
  organization: str(c.organization),
  email: str(c.email),
  phones: (Array.isArray(c.phones) ? c.phones : [])
    .map((p) => ({ type: PHONE_TYPES.has(p?.type) ? p.type : "phone", number: str(p?.number, 40) }))
    .filter((p) => /\d/.test(p.number))
    .slice(0, 8),
  urls: (Array.isArray(c.urls) ? c.urls : []).map((u) => str(u, 300)).filter(Boolean).slice(0, 5),
  street: str(c.street),
  city: str(c.city),
  region: str(c.region),
  postcode: str(c.postcode, 20),
  country: str(c.country),
});

async function askModel(model, rows) {
  const body = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(rows) },
    ],
  };
  // Both families reason before answering; keep that short and out of the reply
  if (model.startsWith("openai/")) body.reasoning_effort = "low";
  if (model.startsWith("qwen/")) body.reasoning_format = "hidden";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const content = (await res.json())?.choices?.[0]?.message?.content;
  const contacts = JSON.parse(content)?.contacts;
  if (!Array.isArray(contacts)) throw new Error("reply had no contacts array");
  return contacts.map(normalizeContact);
}

// POST { rows: [{ row, cells: { column: value } }] } -> { contacts, model }
export async function POST(request) {
  if (!(await isSignedIn(request))) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "The AI isn't set up on the server (missing GROQ_API_KEY)." }, { status: 500 });
  }

  const { rows } = await request.json().catch(() => ({}));
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_ROWS_PER_REQUEST) {
    return Response.json({ error: `Send between 1 and ${MAX_ROWS_PER_REQUEST} rows.` }, { status: 400 });
  }

  const failures = [];
  for (const model of MODELS.length ? MODELS : DEFAULT_MODELS) {
    try {
      const contacts = await askModel(model, rows);
      return Response.json({ contacts, model });
    } catch (err) {
      failures.push(`${model}: ${err.message}`);
      console.warn(`[extract] ${model} failed, trying next model:`, err.message);
    }
  }
  return Response.json({ error: "All AI models failed.", failures }, { status: 502 });
}
