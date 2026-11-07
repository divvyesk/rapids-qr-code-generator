// Clean-up for text that ends up inside a QR code.
// Text pasted from Contacts, WhatsApp or web pages often carries invisible characters
// (direction marks, zero-width spaces, non-breaking spaces). They don't show in the form,
// but iPhone's camera rejects a contact card containing them ("No usable data found").

const LINE_BREAKS = /[\t\n\r\v\f\u2028\u2029]/g;
const ODD_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
// Control characters, soft hyphen, zero-width & joiner characters, direction marks, BOM
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

/** Normalise pasted text: odd spaces become plain spaces, invisible characters are removed. */
export const cleanText = (value) =>
  (value || "")
    .normalize("NFC")
    .replace(LINE_BREAKS, " ")
    .replace(ODD_SPACES, " ")
    .replace(INVISIBLE, "")
    .replace(/ {2,}/g, " ")
    .trim();

/** Escape a vCard TEXT value (RFC 2426 §4): backslash, comma and semicolon are separators. */
export const escapeText = (value) =>
  cleanText(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

/** Clean a URL or email: no spaces allowed inside. */
export const cleanAddress = (value) => cleanText(value).replace(/ /g, "");

// vCard TEL type + the label iOS shows (via X-ABLabel) for each phone type
export const PHONE_VCARD = {
  mobile: { vcardType: "CELL", label: "Mobile" },
  phone: { vcardType: "VOICE", label: "Phone" },
  fax: { vcardType: "FAX", label: "Fax" },
};

// Phones only make a link tappable when it has a scheme ("rapids.app" -> "https://rapids.app")
const withScheme = (url) => (/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);

/**
 * Build a vCard 3.0 string from a contact. Text is cleaned and escaped here;
 * phone numbers must already be in final (international) form.
 */
export function buildVcard(contact) {
  const field = (key) => escapeText(contact[key]);
  const [first, last, org, title] = [field("firstName"), field("lastName"), field("organization"), field("jobTitle")];
  const email = cleanAddress(contact.email);
  const address = [field("street"), field("city"), field("region"), field("postcode"), field("country")];

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${`${first} ${last}`.trim() || org}`,
    org ? `ORG:${org}` : "",
    title ? `TITLE:${title}` : "",
    email ? `EMAIL;TYPE=INTERNET,PREF:${email}` : "",
    ...(contact.phones || []).flatMap((phone, i) => {
      const { vcardType, label } = PHONE_VCARD[phone.type] || PHONE_VCARD.phone;
      // Group the number with its label ("item1.TEL" + "item1.X-ABLabel") so iOS pairs them
      const group = `item${i + 1}`;
      return [`${group}.TEL;TYPE=${vcardType}${i === 0 ? ",PREF" : ""}:${phone.number}`, `${group}.X-ABLabel:${label}`];
    }),
    address.some(Boolean) ? `ADR;TYPE=WORK,POSTAL:;;${address.join(";")}` : "",
    ...(contact.urls || []).map(cleanAddress).filter(Boolean).map((url) => `URL:${withScheme(url)}`),
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}
