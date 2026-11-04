const base = process.env.BASE_URL || "http://127.0.0.1:43123";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function request(path, { method = "GET", cookie, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  const setCookie = response.headers.get("set-cookie") || "";
  return { status: response.status, payload, setCookie, type };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const date = today();
const bad = await request("/api/auth/login", {
  method: "POST",
  body: { email: "sv@northhall.example", password: "nope" },
});
assert(bad.status === 401, `bad password should be 401, got ${bad.status}`);

const login = await request("/api/auth/login", {
  method: "POST",
  body: { email: "sv@northhall.example", password: "harbor-demo" },
});
assert(login.status === 200, `login failed: ${login.status} ${JSON.stringify(login.payload)}`);
const cookie = login.setCookie.split(";")[0];
assert(cookie.startsWith("nh_session="), "missing session cookie");

const created = await request("/api/bookings", {
  method: "POST",
  cookie,
  body: {
    eventName: "Verify hold",
    requesterName: "Desk check",
    organization: "North Hall",
    date,
    startMin: 15 * 60,
    endMin: 16 * 60,
    setupMin: 15,
    teardownMin: 15,
    roomId: "room_exec",
    headcount: 6,
    setupStyle: "boardroom",
    status: "confirmed",
    avItems: [],
    cateringItems: [],
    notes: "",
  },
});
assert(created.status === 200, `create failed: ${created.status} ${JSON.stringify(created.payload)}`);
const createdId = created.payload.booking.id;

const clash = await request("/api/bookings", {
  method: "POST",
  cookie,
  body: {
    eventName: "Verify clash",
    requesterName: "Desk check",
    date,
    startMin: 15 * 60 + 30,
    endMin: 16 * 60 + 30,
    setupMin: 0,
    teardownMin: 0,
    roomId: "room_exec",
    headcount: 4,
    setupStyle: "boardroom",
    status: "confirmed",
    avItems: [],
    cateringItems: [],
    notes: "",
  },
});
assert(clash.status === 409, `conflict should be 409, got ${clash.status}`);
assert(Array.isArray(clash.payload.conflicts) && clash.payload.conflicts.length > 0, "conflict payload missing hits");

const bufferClash = await request("/api/bookings", {
  method: "POST",
  cookie,
  body: {
    eventName: "Verify buffer",
    requesterName: "Desk check",
    date,
    startMin: 16 * 60 + 5,
    endMin: 16 * 60 + 30,
    setupMin: 0,
    teardownMin: 0,
    roomId: "room_exec",
    headcount: 4,
    setupStyle: "boardroom",
    status: "confirmed",
  },
});
assert(bufferClash.status === 409, `buffer conflict should be 409, got ${bufferClash.status}`);
assert(bufferClash.payload.conflicts.some((hit) => hit.kind === "buffer"), "expected a buffer overlap");

const over = await request("/api/bookings", {
  method: "POST",
  cookie,
  body: {
    eventName: "Verify overage",
    requesterName: "Desk check",
    date,
    startMin: 10 * 60,
    endMin: 11 * 60,
    setupMin: 0,
    teardownMin: 0,
    roomId: "room_studio2",
    headcount: 80,
    setupStyle: "classroom",
    status: "tentative",
  },
});
assert(over.status === 422, `over capacity should be 422, got ${over.status} ${JSON.stringify(over.payload)}`);
assert(over.payload.warnings?.capacity, "missing capacity warning");

const draft = await request("/api/bookings/bk_institute/draft", { method: "POST", cookie });
assert(draft.status === 200, `draft failed: ${draft.status} ${JSON.stringify(draft.payload)}`);
assert(draft.payload.draftSource === "template", `expected template draft, got ${draft.payload.draftSource}`);
const labels = draft.payload.resume.timeline.map((row) => row.label).join(" | ");
assert(/keynote|closing|welcome/i.test(labels), `notes were not folded into the timeline: ${labels}`);

const pdf = await request("/api/bookings/bk_institute/pdf", { cookie });
assert(pdf.status === 200, `pdf status ${pdf.status}`);
assert(pdf.type.includes("application/pdf"), `pdf content type ${pdf.type}`);
assert(Buffer.isBuffer(pdf.payload) && pdf.payload.subarray(0, 4).toString() === "%PDF", "pdf missing header");
assert(pdf.payload.length > 1500, `pdf too small: ${pdf.payload.length}`);

const removed = await request(`/api/bookings/${createdId}`, { method: "DELETE", cookie });
assert(removed.status === 200, `delete failed ${removed.status}`);

console.log(`Verified login, create, conflict, buffer clash, capacity warning, draft, and PDF (${pdf.payload.length} bytes) on ${date}.`);
