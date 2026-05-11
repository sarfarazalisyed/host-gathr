/* Add Event — multi-step wizard wired into the Gathr admin dashboard */
const { useState, useEffect, useMemo, useRef } = React;
// Shared primitives provided by the main script. Resolved at render time via getters
// so this file works regardless of which babel script runs first.
const Icon  = (props) => React.createElement(window.GathrIcon,  props);
const Modal = (props) => React.createElement(window.GathrModal, props);
const Field = (props) => React.createElement(window.GathrField, props);

/* ---------------- Shared bits ---------------- */
const AE_STEPS = [
  { key: "details", label: "Event Details" },
  { key: "terms",   label: "Terms & FAQ's" },
  { key: "bookings", label: "Bookings" },
  { key: "tables",  label: "Tables" },
  { key: "messages", label: "Messages" },
];

const REG_MODES = [
  { key: "open",     title: "Open booking",     desc: "Anyone can pay and register instantly. Best for clubs and concerts.", icon: "zap" },
  { key: "form",     title: "Form then pay",    desc: "Attendees fill a form first, then pay. Best for tastings and curated events.", icon: "clipboard-list" },
  { key: "approval", title: "Approval required", desc: "Attendees apply via form. You approve before they can pay. Best for tight communities.", icon: "shield-check" },
];

const GENRES = ["Music", "Comedy", "Food & Drink", "Wellness", "Workshop", "Community", "Networking", "Art", "Sports"];
const VENUES_LIST = [
  { id: "v1", name: "Phoenix Arena", city: "Hyderabad" },
  { id: "v2", name: "Kitty Su", city: "Delhi" },
  { id: "v3", name: "The Habitat", city: "Mumbai" },
  { id: "v4", name: "Cubbon Park", city: "Bengaluru" },
  { id: "v5", name: "HSR Layout Park", city: "Bengaluru" },
  { id: "v6", name: "Private Loft, Koramangala", city: "Bengaluru" },
  { id: "v7", name: "Phoenix Marketcity", city: "Pune" },
];
const ARTISTS_LIST = [
  { id: "a1", name: "Karthik", role: "Playback Singer" },
  { id: "a2", name: "DJ Nucleya", role: "Electronic" },
  { id: "a3", name: "The Local Train", role: "Indie Rock Band" },
  { id: "a4", name: "Aakash Mehta", role: "Stand-up" },
  { id: "a5", name: "Chef Ananya R.", role: "Supper Club Host" },
];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/* ---------------- Rich text editor (lightweight) ---------------- */
function MiniRichText({ value, onChange, placeholder, minHeight = 160 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, []);
  const exec = (cmd, arg) => { document.execCommand(cmd, false, arg); ref.current?.focus(); onChange(ref.current?.innerHTML || ""); };
  const tools = [
    { cmd: "bold", icon: "bold" }, { cmd: "italic", icon: "italic" }, { cmd: "underline", icon: "underline" },
  ];
  const tools2 = [
    { cmd: "insertOrderedList", icon: "list-ordered" }, { cmd: "insertUnorderedList", icon: "list" },
    { cmd: "justifyLeft", icon: "align-left" }, { cmd: "outdent", icon: "indent-decrease" }, { cmd: "indent", icon: "indent-increase" },
    { cmd: "createLink", icon: "link", prompt: "Enter URL" }, { cmd: "removeFormat", icon: "eraser" },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--g-line-2)", background: "#fff" }}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ borderColor: "var(--g-line-2)", background: "var(--g-bg-lavender-soft)" }}>
        {tools.map(t => <button key={t.cmd} type="button" onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }} className="icon-btn w-8 h-8 rounded-md flex items-center justify-center"><Icon name={t.icon} size={15} /></button>)}
        <span className="w-px h-5 mx-1" style={{ background: "var(--g-line-2)" }} />
        <select onChange={(e) => exec("formatBlock", e.target.value)} defaultValue="p" className="px-2 h-8 rounded-md font-body text-xs bg-transparent" style={{ color: "var(--g-ink-700)" }}>
          <option value="p">Normal</option><option value="h2">Heading</option><option value="h3">Subheading</option>
        </select>
        <span className="w-px h-5 mx-1" style={{ background: "var(--g-line-2)" }} />
        {tools2.map(t => <button key={t.cmd} type="button" onMouseDown={(e) => { e.preventDefault(); const a = t.prompt ? prompt(t.prompt) : null; if (t.prompt && !a) return; exec(t.cmd, a); }} className="icon-btn w-8 h-8 rounded-md flex items-center justify-center"><Icon name={t.icon} size={15} /></button>)}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="w-full px-4 py-3 font-body text-[15px] focus:outline-none mini-rt"
        style={{ minHeight, color: "var(--g-ink-900)" }}
        data-placeholder={placeholder}
      />
      <style>{`.mini-rt:empty:before{content:attr(data-placeholder);color:var(--g-ink-400);} .mini-rt h2{font-weight:700;font-size:18px;margin:8px 0;} .mini-rt h3{font-weight:600;font-size:16px;margin:6px 0;} .mini-rt ul{list-style:disc;padding-left:24px;} .mini-rt ol{list-style:decimal;padding-left:24px;}`}</style>
    </div>
  );
}

/* ---------------- Step indicator (clickable) ---------------- */
function StepIndicator({ current, completed, onJump }) {
  return (
    <div className="flex items-center w-full">
      {AE_STEPS.map((s, i) => {
        const done = completed.includes(s.key);
        const active = current === s.key;
        const reached = done || active;
        return (
          <React.Fragment key={s.key}>
            <button onClick={() => (done ? onJump(s.key) : null)}
              className="flex items-center gap-3 group"
              style={{ cursor: done ? "pointer" : "default" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: reached ? "var(--g-purple-500)" : "#fff",
                  border: reached ? "none" : "1.5px solid var(--g-line-4)",
                }}>
                {done ? (
                  <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
                ) : (
                  <span className="font-display font-bold text-xs" style={{ color: active ? "#fff" : "var(--g-ink-400)" }}>{i + 1}</span>
                )}
              </span>
              <span className="font-display font-semibold text-[15px] whitespace-nowrap" style={{ color: reached ? "var(--g-purple-700)" : "var(--g-ink-400)" }}>{s.label}</span>
            </button>
            {i < AE_STEPS.length - 1 && (
              <div className="flex-1 mx-4 h-px" style={{ background: done ? "var(--g-purple-300)" : "var(--g-line-2)" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------------- Step 1: Event Details ---------------- */
function StepDetails({ form, set }) {
  const slug = slugify(form.name || "your-event");
  const fileInput = useRef(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-8">
      {/* Left column — image, public/private, artists */}
      <div className="space-y-5 w-full max-w-[340px] mx-auto lg:max-w-none lg:mx-0">
        <div>
          <div className="rounded-2xl overflow-hidden bg-white flex items-center justify-center relative" style={{ aspectRatio: "1/1", border: "1.5px dashed var(--g-line-4)" }}>
            {form.image ? (
              <img src={form.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon name="image" size={48} color="var(--g-ink-200)" strokeWidth={1.5} />
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = () => set("image", r.result); r.readAsDataURL(f);
          }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="g-btn g-btn--accent w-full mt-3" style={{ borderRadius: 14 }}>
            <Icon name="upload" size={16} color="#fff" /> Upload [1:1 Ratio]
          </button>
        </div>

        {/* Public / Private */}
        <div className="rounded-2xl bg-white p-4" style={{ border: "1px solid var(--g-line-2)" }}>
          <div className="g-label mb-2" style={{ fontSize: 13, fontWeight: 600 }}>Visibility</div>
          <div className="flex p-1 rounded-xl" style={{ background: "var(--g-bg-lavender-soft)" }}>
            {[{k:"public",l:"Public",i:"globe"},{k:"private",l:"Private",i:"lock"}].map(opt => (
              <button key={opt.k} onClick={() => set("visibility", opt.k)}
                className="flex-1 h-10 rounded-lg font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: form.visibility === opt.k ? "#fff" : "transparent",
                  color: form.visibility === opt.k ? "var(--g-ink-900)" : "var(--g-ink-500)",
                  boxShadow: form.visibility === opt.k ? "0 1px 2px rgba(16,24,40,.06)" : "none",
                }}>
                <Icon name={opt.i} size={15} /> {opt.l}
              </button>
            ))}
          </div>
          <div className="font-body text-xs mt-2" style={{ color: "var(--g-ink-500)" }}>
            {form.visibility === "public" ? "Listed on your sub-site and discoverable." : "Only people with the direct link can see this event."}
          </div>
        </div>

        {/* Artists / hosts */}
        <div>
          <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Artists / Event Hosts</label>
          <ArtistPicker selected={form.artists} onChange={(arr) => set("artists", arr)} />
        </div>
      </div>

      {/* Right column — title, description, venue, date, genre, tags, mode */}
      <div className="space-y-5">
        <div>
          <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Event Title</label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Karthik Live in Hyderabad"
            className="w-full h-12 px-4 rounded-xl font-body text-[15px] bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
          {form.name && (
            <div className="mt-2 font-body text-xs flex items-center gap-1.5" style={{ color: "var(--g-ink-500)" }}>
              <Icon name="link" size={12} />
              <span>your-host.gathr.club/<strong style={{ color: "var(--g-purple-700)" }}>{slug}</strong></span>
            </div>
          )}
        </div>

        <div>
          <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Description</label>
          <MiniRichText value={form.description} onChange={(v) => set("description", v)} placeholder="Insert text here..." />
        </div>

        <div>
          <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Choose Venue</label>
          <VenuePicker value={form.venueId} onChange={(v) => set("venueId", v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Start Date & Time</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <Icon name="calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="w-full h-12 pl-10 pr-3 rounded-xl font-display font-semibold text-sm bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
              </div>
              <div className="relative">
                <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className="w-32 h-12 pl-10 pr-3 rounded-xl font-display font-semibold text-sm bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
              </div>
            </div>
          </div>
          <div>
            <label className="g-label block mb-2 flex items-center justify-between" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>
              <span>End Date & Time</span>
              <span className="font-body text-[11px] font-normal" style={{ color: "var(--g-ink-400)" }}>optional</span>
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <Icon name="calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="w-full h-12 pl-10 pr-3 rounded-xl font-display font-semibold text-sm bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
              </div>
              <div className="relative">
                <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className="w-32 h-12 pl-10 pr-3 rounded-xl font-display font-semibold text-sm bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Genre</label>
            <div className="relative">
              <select value={form.genre} onChange={(e) => set("genre", e.target.value)}
                className="w-full h-12 pl-4 pr-10 rounded-xl font-body text-[15px] bg-white appearance-none cursor-pointer" style={{ border: "1px solid var(--g-line-2)" }}>
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <Icon name="chevron-down" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Tags</label>
            <TagInput value={form.tags} onChange={(v) => set("tags", v)} />
          </div>
        </div>

        {/* Registration mode — promoted from buried radios to clear cards */}
        <div>
          <label className="g-label block mb-3" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>How can people register?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REG_MODES.map(m => (
              <button key={m.key} type="button" onClick={() => set("regMode", m.key)}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  background: form.regMode === m.key ? "var(--g-purple-50)" : "#fff",
                  border: form.regMode === m.key ? "1.5px solid var(--g-purple-500)" : "1px solid var(--g-line-2)",
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: form.regMode === m.key ? "var(--g-purple-500)" : "var(--g-bg-lavender-soft)" }}>
                  <Icon name={m.icon} size={16} color={form.regMode === m.key ? "#fff" : "var(--g-purple-700)"} />
                </div>
                <div className="font-display font-semibold text-sm">{m.title}</div>
                <div className="font-body text-xs mt-1" style={{ color: "var(--g-ink-500)", lineHeight: 1.45 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const remove = (id) => onChange(selected.filter(a => a.id !== id));
  const add = (a) => { if (!selected.find(x => x.id === a.id)) onChange([...selected, a]); setOpen(false); };
  return (
    <div className="relative">
      <div className="rounded-xl bg-white p-2 flex flex-wrap gap-1.5 min-h-12" style={{ border: "1px solid var(--g-line-2)" }}>
        {selected.map(a => (
          <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full font-display font-medium text-xs" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white" style={{ background: "var(--g-purple-500)" }}>{a.name.charAt(0)}</span>
            {a.name}
            <button onClick={() => remove(a.id)} className="ml-0.5"><Icon name="x" size={12} /></button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen(o => !o)} className="px-3 h-8 rounded-full font-display font-medium text-xs flex items-center gap-1" style={{ color: "var(--g-purple-700)", border: "1px dashed var(--g-purple-300)" }}>
          <Icon name="plus" size={12} /> Add
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-white shadow-lg overflow-hidden" style={{ border: "1px solid var(--g-line-2)" }}>
          {ARTISTS_LIST.filter(a => !selected.find(x => x.id === a.id)).map(a => (
            <button key={a.id} onClick={() => add(a)} className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-left">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-white text-xs" style={{ background: "var(--g-purple-500)" }}>{a.name.charAt(0)}</div>
              <div>
                <div className="font-display font-semibold text-sm">{a.name}</div>
                <div className="font-body text-xs" style={{ color: "var(--g-ink-500)" }}>{a.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VenuePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const v = VENUES_LIST.find(x => x.id === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full h-12 px-4 rounded-xl font-body text-[15px] bg-white text-left flex items-center justify-between" style={{ border: "1px solid var(--g-line-2)" }}>
        <span style={{ color: v ? "var(--g-ink-900)" : "var(--g-ink-400)" }}>
          {v ? <span><strong className="font-display font-semibold">{v.name}</strong> · {v.city}</span> : "To Be Disclosed"}
        </span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-white shadow-lg overflow-hidden" style={{ border: "1px solid var(--g-line-2)" }}>
          <button onClick={() => { onChange(""); setOpen(false); }} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left font-body text-sm" style={{ color: "var(--g-ink-500)" }}>To Be Disclosed</button>
          {VENUES_LIST.map(x => (
            <button key={x.id} onClick={() => { onChange(x.id); setOpen(false); }} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 text-left">
              <Icon name="map-pin" size={14} color="var(--g-purple-500)" />
              <div>
                <div className="font-display font-semibold text-sm">{x.name}</div>
                <div className="font-body text-xs" style={{ color: "var(--g-ink-500)" }}>{x.city}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => { const t = draft.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); };
  return (
    <div className="rounded-xl bg-white px-2 py-2 flex flex-wrap gap-1.5 items-center min-h-12" style={{ border: "1px solid var(--g-line-2)" }}>
      {value.map(t => (
        <span key={t} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full font-display font-medium text-xs" style={{ background: "var(--g-bg-lavender-soft)", color: "var(--g-purple-800)" }}>
          {t}
          <button onClick={() => onChange(value.filter(x => x !== t))}><Icon name="x" size={11} /></button>
        </span>
      ))}
      <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add}
        placeholder={value.length ? "" : "Type & press enter"}
        className="flex-1 min-w-[100px] font-body text-sm py-1 focus:outline-none" style={{ background: "transparent" }} />
    </div>
  );
}

/* ---------------- Step 2: Terms & FAQ ---------------- */
const DEFAULT_TERMS = `• Age limit: 21+
• Additional cover charges applicable at the event venue.
• Club rules apply.
• This is a wristband entry event. Tampered wristbands will not be allowed.
• No bag packs, handbags and other baggage allowed inside the venue. There is NO storage facility available at the event.
• No refunds on purchased tickets will be processed for any cancellations.`;

const DEFAULT_FAQ = `• What is the age limit? — 21 and above with valid ID.
• Are there cover charges at the venue? — Yes, additional cover charges may apply.
• Can I get a refund? — No refunds on purchased tickets.
• What ID is accepted? — Aadhaar, PAN, Passport, or Driver's License.`;

function StepTerms({ form, set }) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-2xl p-5" style={{ background: "var(--g-bg-lavender-soft)", border: "1px dashed var(--g-purple-200)" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--g-purple-100)" }}>
            <Icon name="info" size={16} color="var(--g-purple-700)" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm">We pre-filled these from your last event.</div>
            <div className="font-body text-sm mt-1" style={{ color: "var(--g-ink-600)" }}>Edit anything you need — Gathr will save these as your defaults going forward.</div>
          </div>
        </div>
      </div>

      <div>
        <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>Terms & Conditions</label>
        <MiniRichText value={form.terms} onChange={(v) => set("terms", v)} minHeight={200} />
      </div>

      <div>
        <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink-700)" }}>FAQs</label>
        <MiniRichText value={form.faqs} onChange={(v) => set("faqs", v)} minHeight={200} />
      </div>
    </div>
  );
}

/* ---------------- Step 3: Bookings ---------------- */
const VISIBILITY_OPTS = [
  { key: "none",    label: "None",            icon: null, color: null },
  { key: "fast",    label: "Fast Filling",    icon: "flame", color: "#FF9239" },
  { key: "sold",    label: "Sold Out",        icon: "ban",   color: "#D4183D" },
  { key: "hide",    label: "Hide Ticket",     icon: "eye-off", color: "#666" },
];

function StepBookings({ form, set }) {
  const [editingTicket, setEditingTicket] = useState(null); // {groupIdx, ticket?}
  const [bookingTypeModal, setBookingTypeModal] = useState(false);
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  const addTicketToGroup = (gIdx) => setEditingTicket({ groupIdx: gIdx, ticket: null });

  const renameGroup = (gIdx) => {
    const next = prompt("Rename booking type", form.bookingGroups[gIdx].name);
    if (next && next.trim()) {
      const groups = [...form.bookingGroups];
      groups[gIdx] = { ...groups[gIdx], name: next.trim() };
      set("bookingGroups", groups);
    }
  };

  const saveTicket = (ticket) => {
    const { groupIdx } = editingTicket;
    const groups = [...form.bookingGroups];
    const tickets = [...(groups[groupIdx].tickets || [])];
    const existingIdx = tickets.findIndex(t => t.id === ticket.id);
    if (existingIdx >= 0) tickets[existingIdx] = ticket;
    else tickets.push({ ...ticket, id: ticket.id || "t_" + Date.now() });
    groups[groupIdx] = { ...groups[groupIdx], tickets };
    set("bookingGroups", groups);
    setEditingTicket(null);
  };

  const deleteTicket = (gIdx, tId) => {
    const groups = [...form.bookingGroups];
    groups[gIdx] = { ...groups[gIdx], tickets: groups[gIdx].tickets.filter(t => t.id !== tId) };
    set("bookingGroups", groups);
  };

  const addBookingType = (name) => {
    set("bookingGroups", [...form.bookingGroups, { id: "g_" + Date.now(), name, tickets: [] }]);
    setBookingTypeModal(false);
  };

  if (form.bookingGroups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: "1px solid var(--g-line-2)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--g-bg-lavender-soft)" }}>
            <Icon name="folder-plus" size={28} color="var(--g-purple-500)" />
          </div>
          <h3 className="font-display font-bold text-xl tracking-tight">Start by adding a booking type</h3>
          <p className="font-body text-sm mt-2 max-w-md mx-auto" style={{ color: "var(--g-ink-500)" }}>Booking types group your tickets — like "Reservations", "Tables", or "GA Standing". Add one to get started; you can add tickets and more types inside.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setBookingTypeModal(true)} className="g-btn g-btn--accent"><Icon name="plus" size={16} color="#fff" /> Add Booking Type</button>
          </div>
        </div>
        {bookingTypeModal && <BookingTypeModal onClose={() => setBookingTypeModal(false)} onSave={addBookingType} />}
      </div>
    );
  }

  const active = form.bookingGroups[activeGroupIdx] || form.bookingGroups[0];
  const activeIdx = form.bookingGroups.indexOf(active);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--g-line-2)" }}>
        {/* Bookings header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl tracking-tight">Bookings</h3>
          <button onClick={() => setBookingTypeModal(true)} className="font-display font-medium text-sm flex items-center gap-1" style={{ color: "var(--g-purple-700)" }}>
            <Icon name="plus" size={14} color="var(--g-purple-700)" /> Add Booking Type
          </button>
        </div>

        {/* Booking-type segmented tabs */}
        <div className="rounded-xl flex p-1 mb-5" style={{ background: "var(--g-bg-lime)", border: "1px solid #E6ECC8" }}>
          {form.bookingGroups.map((g, gIdx) => {
            const isActive = gIdx === activeIdx;
            return (
              <div key={g.id} onClick={() => setActiveGroupIdx(gIdx)}
                className="flex-1 h-9 px-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                style={{ background: isActive ? "#fff" : "transparent", boxShadow: isActive ? "0 1px 2px rgba(16,24,40,.06)" : "none" }}>
                <span className="font-display font-medium text-sm" style={{ color: isActive ? "var(--g-ink-900)" : "var(--g-ink-600)" }}>{g.name}</span>
                {isActive && (
                  <button onClick={(e) => { e.stopPropagation(); renameGroup(gIdx); }} className="opacity-60 hover:opacity-100"><Icon name="pencil" size={12} /></button>
                )}
              </div>
            );
          })}
        </div>

        {active && (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-bold text-lg tracking-tight">{active.name}</h4>
              <button onClick={() => addTicketToGroup(activeIdx)} className="font-display font-medium text-sm flex items-center gap-1" style={{ color: "var(--g-purple-700)" }}>
                <Icon name="plus" size={14} color="var(--g-purple-700)" /> Add Ticket
              </button>
            </div>

            {active.tickets.length === 0 ? (
              <div className="py-10 text-center rounded-xl" style={{ border: "1px dashed var(--g-line-3)" }}>
                <div className="font-body text-sm" style={{ color: "var(--g-ink-500)" }}>No tickets yet. Click <span style={{ color: "var(--g-purple-700)" }}>+ Add Ticket</span> to create one.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {active.tickets.map(t => (
                  <TicketCard key={t.id} ticket={t}
                    onEdit={() => setEditingTicket({ groupIdx: activeIdx, ticket: t })}
                    onDelete={() => deleteTicket(activeIdx, t.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {bookingTypeModal && <BookingTypeModal onClose={() => setBookingTypeModal(false)} onSave={addBookingType} />}
      {editingTicket && <TicketModal initial={editingTicket.ticket} onClose={() => setEditingTicket(null)} onSave={saveTicket} />}
    </div>
  );
}

function TicketCard({ ticket, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const vis = VISIBILITY_OPTS.find(v => v.key === ticket.visibility) || VISIBILITY_OPTS[0];
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--g-line-2)" }}>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base">{ticket.type || "Untitled ticket"}</span>
              {vis.key !== "none" && (
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full font-display font-medium text-[10px]" style={{ background: vis.color + "1a", color: vis.color }}>{vis.label}</span>
              )}
            </div>
            <div className="font-display font-bold text-base mt-1.5 flex items-center gap-0.5">
              <span className="text-[15px] mr-0.5">₹</span>{ticket.price || 0}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onEdit} className="icon-btn w-8 h-8 rounded-lg flex items-center justify-center"><Icon name="pencil" size={14} /></button>
            <button onClick={onDelete} className="icon-btn w-8 h-8 rounded-lg flex items-center justify-center"><Icon name="trash-2" size={14} color="#D4183D" /></button>
          </div>
        </div>
      </div>
      {open && (
        <div className="px-5 pb-4 space-y-3">
          {ticket.info && <div className="font-body text-sm" style={{ color: "var(--g-ink-600)" }}>{ticket.info}</div>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs" style={{ color: "var(--g-ink-500)" }}>
            <span>Inventory: <b className="font-display" style={{ color: "var(--g-ink-900)" }}>{ticket.inventory || "—"}</b></span>
            <span>Max per booking: <b className="font-display" style={{ color: "var(--g-ink-900)" }}>{ticket.maxPerBooking || "—"}</b></span>
            {ticket.contactCTA && <span style={{ color: "var(--g-purple-700)" }}>Contact CTA on</span>}
            {ticket.externalLink && <span className="truncate max-w-[200px]">→ {ticket.externalLink}</span>}
          </div>
          {ticket.tiers?.length > 0 && (
            <div className="space-y-1.5">
              <div className="g-eyebrow">Time-based pricing</div>
              {ticket.tiers.map((tr, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: ["#00BB59","#FF9239","#FD634F","#9167F2"][i % 4] }} />
                  <span className="font-display font-semibold w-20">{tr.label || `Tier ${i+1}`}</span>
                  <span className="font-body" style={{ color: "var(--g-ink-500)" }}>{tr.startDate} {tr.startTime} → {tr.endDate} {tr.endTime}</span>
                  <span className="ml-auto font-display font-bold" style={{ color: "var(--g-purple-700)" }}>₹{tr.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="w-full h-10 font-display font-semibold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: "var(--g-purple-500)" }}>
        Ticket Info <Icon name={open ? "chevron-up" : "chevron-down"} size={14} color="#fff" />
      </button>
    </div>
  );
}

/* ---------------- Modals ---------------- */
function BookingTypeModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  return (
    <Modal open={true} onClose={onClose} width={460}>
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <h2 className="font-display font-bold text-xl tracking-tight">Add Booking Type</h2>
        <button onClick={onClose} className="icon-btn w-10 h-10 rounded-xl flex items-center justify-center" style={{ border: "1px solid var(--g-line-2)" }}><Icon name="x" size={18} /></button>
      </div>
      <div className="px-6 py-4">
        <label className="g-label block mb-2" style={{ fontSize: 13, fontWeight: 600 }}>Booking Type</label>
        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reservations, Tables, GA Standing" className="w-full h-12 px-4 rounded-xl font-body text-[15px]" style={{ border: "1px solid var(--g-line-2)" }} />
        <div className="font-body text-xs mt-2" style={{ color: "var(--g-ink-500)" }}>Groups related tickets together. Attendees see this as a section header on the event page.</div>
      </div>
      <div className="px-6 pb-6">
        <button onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()} className="g-btn g-btn--accent w-full disabled:opacity-50 disabled:cursor-not-allowed">Add & Save</button>
      </div>
    </Modal>
  );
}

function TicketModal({ initial, onClose, onSave }) {
  const blank = { id: null, type: "", info: "", visibility: "none", externalLink: "", price: 0, maxPerBooking: 0, inventory: 0, contactCTA: false, formId: "", tiers: [] };
  const [t, setT] = useState(initial ? { ...blank, ...initial } : blank);
  const [tiersOpen, setTiersOpen] = useState((initial?.tiers || []).length > 0);
  const set = (k, v) => setT(f => ({ ...f, [k]: v }));

  const addTier = () => {
    const last = t.tiers[t.tiers.length - 1];
    const today = new Date().toISOString().slice(0,10);
    setTiersOpen(true);
    setT(f => ({ ...f, tiers: [...f.tiers, { label: ["Early Bird","General","Door","Last Call"][f.tiers.length % 4], startDate: last?.endDate || today, startTime: last?.endTime || "12:00", endDate: today, endTime: "23:59", price: f.price || 1000 }] }));
  };
  const setTier = (i, k, v) => setT(f => ({ ...f, tiers: f.tiers.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }));
  const removeTier = (i) => setT(f => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

  // visibility chip previews (badge styles)
  const VIS_CHIPS = {
    hide: { label: "NO",   bg: "#FFE3E1", fg: "#D4183D" },
    fast: { label: "🔥",   bg: "#FFE9D6", fg: "#FF9239" },
    sold: { label: "SO",   bg: "#FFE3E1", fg: "#D4183D" },
    none: null,
  };
  const VIS_ROW = [
    { key: "hide", label: "Hide Ticket" },
    { key: "fast", label: "Fast Filling" },
    { key: "sold", label: "Sold Out" },
    { key: "none", label: "None" },
  ];

  return (
    <Modal open={true} onClose={onClose} width={480}>
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-display font-bold text-xl tracking-tight">Tickets & Reservations</h2>
        <button onClick={onClose} className="icon-btn w-9 h-9 rounded-lg flex items-center justify-center"><Icon name="x" size={18} /></button>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div>
          <label className="font-display font-semibold text-sm block mb-1.5">Name</label>
          <input autoFocus type="text" value={t.type} onChange={(e) => set("type", e.target.value)} placeholder="Enter Name" className="w-full h-11 px-3.5 rounded-lg font-body text-[15px] placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
        </div>

        <div>
          <label className="font-display font-semibold text-sm block mb-1.5">Ticket Info</label>
          <textarea value={t.info} onChange={(e) => set("info", e.target.value)} placeholder="Enter Ticket info" className="w-full px-3.5 py-2.5 rounded-lg font-body text-[15px] resize-none placeholder:text-[var(--g-ink-400)]" rows={3} style={{ border: "1px solid var(--g-line-2)" }} />
        </div>

        {/* 2x2 radio grid with chip previews */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {VIS_ROW.map(v => {
            const checked = t.visibility === v.key;
            const chip = VIS_CHIPS[v.key];
            return (
              <button key={v.key} type="button" onClick={() => set("visibility", v.key)} className="flex items-center gap-2 text-left">
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${checked ? "var(--g-purple-500)" : "var(--g-line-4)"}` }}>
                  {checked && <span className="w-2 h-2 rounded-full" style={{ background: "var(--g-purple-500)" }} />}
                </span>
                {chip && (
                  <span className="inline-flex items-center justify-center px-1.5 h-5 rounded font-display font-bold text-[10px]" style={{ background: chip.bg, color: chip.fg, minWidth: 22 }}>{chip.label}</span>
                )}
                <span className="font-display font-medium text-sm">{v.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="font-display font-semibold text-sm block mb-1.5">External Link</label>
          <input type="text" value={t.externalLink} onChange={(e) => set("externalLink", e.target.value)} placeholder="Enter or paste booking link" className="w-full h-11 px-3.5 rounded-lg font-body text-[15px] placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-semibold text-sm">Contact CTA</span>
            <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--g-line-1)" }} title="Show 'Contact host' instead of pay">
              <Icon name="info" size={11} color="var(--g-ink-500)" />
            </span>
          </div>
          <button type="button" onClick={() => set("contactCTA", !t.contactCTA)} className="w-10 h-5.5 rounded-full relative transition-all" style={{ background: t.contactCTA ? "var(--g-purple-500)" : "var(--g-line-4)", height: 22, width: 40 }}>
            <span className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all" style={{ left: t.contactCTA ? "calc(100% - 20px)" : "2px" }} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-display font-semibold text-xs block mb-1.5">Ticket Price</label>
            <input type="number" value={t.price} onChange={(e) => set("price", Number(e.target.value))} className="w-full h-11 px-3 rounded-lg font-body text-[15px]" style={{ border: "1px solid var(--g-line-2)" }} />
          </div>
          <div>
            <label className="font-display font-semibold text-xs block mb-1.5">Max Tickets Per Booking</label>
            <input type="number" value={t.maxPerBooking} onChange={(e) => set("maxPerBooking", Number(e.target.value))} className="w-full h-11 px-3 rounded-lg font-body text-[15px]" style={{ border: "1px solid var(--g-line-2)" }} />
          </div>
          <div>
            <label className="font-display font-semibold text-xs block mb-1.5">Ticket Inventory</label>
            <input type="number" value={t.inventory} onChange={(e) => set("inventory", Number(e.target.value))} className="w-full h-11 px-3 rounded-lg font-body text-[15px]" style={{ border: "1px solid var(--g-line-2)" }} />
          </div>
        </div>

        {/* Time base configuration */}
        <div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setTiersOpen(o => !o)} className="font-display font-semibold text-sm flex items-center gap-1.5">
              <Icon name={tiersOpen ? "chevron-down" : "chevron-right"} size={14} /> Time base configuration
            </button>
            <button type="button" onClick={addTier} className="font-display font-medium text-sm flex items-center gap-1" style={{ color: "var(--g-purple-700)" }}><Icon name="plus" size={14} color="var(--g-purple-700)" /> Add</button>
          </div>
          {tiersOpen && t.tiers.length > 0 && (
            <div className="mt-3 space-y-2">
              {t.tiers.map((tr, i) => (
                <div key={i} className="rounded-lg p-2.5 grid grid-cols-[90px_1fr_1fr_80px_auto] gap-1.5 items-center" style={{ border: "1px solid var(--g-line-2)", background: "var(--g-bg-lavender-soft)" }}>
                  <input type="text" value={tr.label} onChange={(e) => setTier(i, "label", e.target.value)} className="h-9 px-2 rounded-md font-display font-semibold text-xs bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                  <div className="flex items-center gap-1">
                    <input type="date" value={tr.startDate} onChange={(e) => setTier(i, "startDate", e.target.value)} className="flex-1 h-9 px-1.5 rounded-md font-body text-[11px] bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                    <input type="time" value={tr.startTime} onChange={(e) => setTier(i, "startTime", e.target.value)} className="w-16 h-9 px-1.5 rounded-md font-body text-[11px] bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="date" value={tr.endDate} onChange={(e) => setTier(i, "endDate", e.target.value)} className="flex-1 h-9 px-1.5 rounded-md font-body text-[11px] bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                    <input type="time" value={tr.endTime} onChange={(e) => setTier(i, "endTime", e.target.value)} className="w-16 h-9 px-1.5 rounded-md font-body text-[11px] bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display font-semibold text-xs" style={{ color: "var(--g-ink-500)" }}>₹</span>
                    <input type="number" value={tr.price} onChange={(e) => setTier(i, "price", Number(e.target.value))} className="w-full h-9 pl-5 pr-1 rounded-md font-display font-bold text-xs bg-white" style={{ border: "1px solid var(--g-line-2)" }} />
                  </div>
                  <button onClick={() => removeTier(i)} className="icon-btn w-8 h-8 rounded-md flex items-center justify-center"><Icon name="trash-2" size={13} color="#D4183D" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => t.type.trim() && onSave(t)} disabled={!t.type.trim()} className="w-full h-12 rounded-xl font-display font-bold text-base text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "var(--g-purple-500)" }}>
          {initial ? "Save Changes" : "Add & Save"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Step 4: Tables ---------------- */
const SEAT_COLORS = { N: "#FE8A8A", NP: "#7CB7FF", NI: "#1A1A1A", S: "#F4EFD9", L: "#3FBE6A", E: "#7A4A2A", C: "#FF99D6", H: "#FFFFFF", T: "#F4EFD9" };
function StepTables({ form, set }) {
  const tt = form.tableTypes.length ? form.tableTypes : [
    { id: "tt1", name: "Neon", color: "#FE8A8A", min: 5, max: 10, price: 5000, notes: "" },
    { id: "tt2", name: "Elite Circuit", color: "#D580FF", min: 5, max: 10, price: 250000, notes: "" },
    { id: "tt3", name: "Solar", color: "#FFB347", min: 5, max: 10, price: 125000, notes: "" },
  ];
  const arrangement = form.seatingArrangement || "regular";
  const floor = form.seatingFloor || "ground";
  const isPublic = form.seatingPublic !== false;

  const addTableType = () => set("tableTypes", [...tt, { id: "tt_" + Date.now(), name: "New Table", color: "#9167F2", min: 4, max: 8, price: 5000, notes: "" }]);
  const updateTableType = (id, k, v) => set("tableTypes", tt.map(t => t.id === id ? { ...t, [k]: v } : t));
  const removeTableType = (id) => set("tableTypes", tt.filter(t => t.id !== id));

  // ground floor seat grid (matches screenshot vibe)
  const SECTIONS = [
    { rowLabel: "S1", seats: ["N1","N8","N16","NP1","NP8","NP16"] },
    { rowLabel: "S2", seats: ["N2","N9","N17","NP2","NP9","NP17"] },
    { rowLabel: "S3", seats: ["N3","N10","N18","NP3","NP10","NP18"] },
    { rowLabel: "S4", seats: ["N4","N11","N19","NP4","NP11","NP19"] },
    { rowLabel: "S5", seats: ["N5","N12","N20","NP5","NP12","NP20"] },
    { rowLabel: "",   seats: ["N6","N14","N21","NP6","NP14","NP21"] },
    { rowLabel: "",   seats: ["N7","N15","N22","NP7","NP15","NP22"] },
  ];
  const seatBg = (code) => {
    const m = code.match(/^([A-Z]+)/);
    return SEAT_COLORS[m?.[1]] || "#9CA3AF";
  };
  const seatFg = (code) => code.startsWith("NI") ? "#fff" : (code.startsWith("S") || code.startsWith("H") ? "#1A1A1A" : "#fff");

  return (
    <div className="max-w-5xl mx-auto">
      <h3 className="font-display font-bold text-2xl tracking-tight mb-5">Tables</h3>

      {/* Top controls */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-4">
        <div className="flex-1">
          <label className="font-display font-semibold text-sm block mb-1.5">Choose Seating Arrangement <span style={{ color: "#D4183D" }}>*</span> :</label>
          <div className="relative">
            <select value={arrangement} onChange={(e) => set("seatingArrangement", e.target.value)} className="w-full h-12 px-4 pr-10 rounded-xl font-body text-[15px] bg-white appearance-none" style={{ border: "1px solid var(--g-line-2)" }}>
              <option value="regular">Regular Seating</option>
              <option value="ga">General Admission (no seats)</option>
              <option value="mixed">Mixed — Tables + GA</option>
              <option value="custom">Custom Layout</option>
            </select>
            <Icon name="chevron-down" size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 h-12 px-4 rounded-xl flex-shrink-0" style={{ border: "1px solid var(--g-line-2)", background: "#fff" }}>
          <span className="font-display font-medium text-sm" style={{ color: isPublic ? "var(--g-ink-900)" : "var(--g-ink-500)" }}>Public Layout</span>
          <button onClick={() => set("seatingPublic", !isPublic)} className="w-10 rounded-full relative transition-all" style={{ height: 22, background: isPublic ? "var(--g-line-4)" : "var(--g-purple-500)" }}>
            <span className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all" style={{ left: isPublic ? "2px" : "calc(100% - 20px)" }} />
          </button>
          <span className="font-display font-medium text-sm" style={{ color: !isPublic ? "var(--g-ink-900)" : "var(--g-ink-500)" }}>Private</span>
        </div>
      </div>

      {/* Floor tabs */}
      <div className="rounded-xl flex p-1 mb-4" style={{ background: "var(--g-bg-lime)", border: "1px solid #E6ECC8" }}>
        {["ground", "mezzanine"].map(f => (
          <button key={f} onClick={() => set("seatingFloor", f)} className="flex-1 h-10 rounded-lg font-display font-medium text-sm transition-all" style={{ background: floor === f ? "#fff" : "transparent", color: "var(--g-ink-900)", boxShadow: floor === f ? "0 1px 2px rgba(16,24,40,.06)" : "none" }}>
            {f === "ground" ? "Ground" : "Mezzanine"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Seating diagram */}
        <div>
          <div className="rounded-2xl p-2 sm:p-4 overflow-x-auto" style={{ background: "#2D3220" }}>
            <div className="min-w-[340px]">
            {/* stage */}
            <div className="text-center font-display font-bold text-xs tracking-widest text-white py-2 rounded-md mb-3" style={{ background: "#3D4430" }}>STAGE</div>
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 mb-2">
              <div className="rounded-md flex items-center justify-center font-display font-bold text-[10px] text-white" style={{ background: "#3D4430", padding: "10px 6px" }}>BAR 2</div>
              <div />
              <div className="flex flex-col gap-1">
                <span className="h-5 rounded font-display font-bold text-[10px] text-white flex items-center justify-center" style={{ background: "#FF99D6", color: "#1A1A1A" }}>C1</span>
                <span className="h-5 rounded font-display font-bold text-[10px] text-white flex items-center justify-center" style={{ background: "#FF99D6", color: "#1A1A1A" }}>C2</span>
                <span className="h-5 rounded font-display font-bold text-[10px] text-white flex items-center justify-center" style={{ background: "#FF99D6", color: "#1A1A1A" }}>C3</span>
              </div>
            </div>
            {/* main grid */}
            <div className="grid grid-cols-[28px_1fr_28px_28px] gap-2">
              <div className="space-y-1.5 mt-1">
                {SECTIONS.map((s, i) => (
                  <div key={i} className="h-7 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white" style={{ background: s.rowLabel ? "#A8A38C" : "transparent" }}>{s.rowLabel}</div>
                ))}
              </div>
              <div className="space-y-1.5">
                {SECTIONS.map((s, i) => (
                  <div key={i} className="grid grid-cols-6 gap-1.5">
                    {s.seats.map(code => (
                      <div key={code} className="h-7 rounded-md flex items-center justify-center font-display font-bold text-[9px]" style={{ background: seatBg(code), color: seatFg(code) }}>{code}</div>
                    ))}
                  </div>
                ))}
              </div>
              {/* BAR 1 vertical */}
              <div className="rounded-md flex items-center justify-center" style={{ background: "#3D4430" }}>
                <span className="font-display font-bold text-[10px] text-white" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>BAR 1</span>
              </div>
              {/* ASHROOM */}
              <div className="rounded-md flex items-center justify-center" style={{ background: "#3D4430" }}>
                <span className="font-display font-bold text-[10px] text-white" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>ASHROOM</span>
              </div>
            </div>
            {/* L, E circles bottom */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {["E1","E2","E3","E4"].map(e => <div key={e} className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white" style={{ background: "#7A4A2A" }}>{e}</div>)}
              <div className="w-3" />
              {["L1","L2"].map(l => <div key={l} className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white" style={{ background: "#3FBE6A" }}>{l}</div>)}
            </div>
            </div>
          </div>
          {/* legend */}
          <div className="flex items-center gap-5 mt-3 pl-1">
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded" style={{ background: "#fff", border: "1px solid var(--g-line-3)" }} /><span className="font-display font-medium text-sm">Hold</span></div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded" style={{ background: "#F4EFD9" }} /><span className="font-display font-medium text-sm">Token Amount Paid</span></div>
          </div>
        </div>

        {/* Table Types panel */}
        <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid var(--g-line-2)" }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-base">Table Types</h4>
            <button onClick={addTableType} className="font-display font-medium text-sm flex items-center gap-1" style={{ color: "var(--g-purple-700)" }}><Icon name="plus" size={14} color="var(--g-purple-700)" /></button>
          </div>
          <div className="space-y-4">
            {tt.map(t => (
              <div key={t.id} className="rounded-xl p-3" style={{ border: "1px solid var(--g-line-2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <input value={t.name} onChange={(e) => updateTableType(t.id, "name", e.target.value)} className="font-display font-bold text-base bg-transparent flex-1 min-w-0" />
                  <span className="w-12 h-5 rounded-md flex-shrink-0" style={{ background: t.color }} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: "var(--g-ink-500)" }}>Party size</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={t.min} onChange={(e) => updateTableType(t.id, "min", Number(e.target.value))} className="w-full h-9 px-2 rounded-md font-body text-sm text-center min-w-0" style={{ background: "var(--g-bg-lavender-soft)" }} />
                      <span className="font-display font-bold text-xs" style={{ color: "var(--g-ink-500)" }}>—</span>
                      <input type="number" value={t.max} onChange={(e) => updateTableType(t.id, "max", Number(e.target.value))} className="w-full h-9 px-2 rounded-md font-body text-sm text-center min-w-0" style={{ background: "var(--g-bg-lavender-soft)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: "var(--g-ink-500)" }}>Price</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display font-bold text-xs pointer-events-none" style={{ color: "var(--g-ink-500)" }}>₹</span>
                      <input type="number" value={t.price} onChange={(e) => updateTableType(t.id, "price", Number(e.target.value))} className="w-full h-9 pl-5 pr-2 rounded-md font-body text-sm min-w-0" style={{ background: "var(--g-bg-lavender-soft)" }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button className="font-body text-xs" style={{ color: "var(--g-ink-500)" }}>Notes</button>
                  <button onClick={() => removeTableType(t.id)} className="font-body text-xs" style={{ color: "#D4183D" }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 5: Messages ---------------- */
const DEFAULT_MESSAGES = {
  confirmation: { enabled: true, location: "", dateTime: "", contactCode: "+91", contactNumber: "", importantInfo: "" },
  groupLink: { enabled: false, link: "" },
};

function StepMessages({ form, set }) {
  const m = form.messages || DEFAULT_MESSAGES;
  const c = m.confirmation || DEFAULT_MESSAGES.confirmation;
  const g = m.groupLink || DEFAULT_MESSAGES.groupLink;
  const setC = (k, v) => set("messages", { ...m, confirmation: { ...c, [k]: v } });
  const setG = (k, v) => set("messages", { ...m, groupLink: { ...g, [k]: v } });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Confirmation card */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1.5px solid ${c.enabled ? "var(--g-purple-500)" : "var(--g-line-2)"}` }}>
        <button type="button" onClick={() => setC("enabled", !c.enabled)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left" style={{ background: c.enabled ? "var(--g-purple-500)" : "var(--g-bg-lavender-soft)" }}>
          <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: c.enabled ? "#fff" : "transparent", border: c.enabled ? "none" : "1.5px solid var(--g-line-4)" }}>
            {c.enabled && <Icon name="check" size={14} color="var(--g-purple-500)" strokeWidth={3} />}
          </span>
          <span className="font-display font-semibold text-sm" style={{ color: c.enabled ? "#fff" : "var(--g-ink-900)" }}>Send Whatsapp Message With Event Details After Payment Confirmations (Only After You Approve)</span>
        </button>
        {c.enabled && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-display font-semibold text-sm block mb-1.5">Event Location</label>
                <div className="relative">
                  <Icon name="map-pin" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--g-ink-400)" />
                  <input value={c.location} onChange={(e) => setC("location", e.target.value)} placeholder="Select location" className="w-full h-11 pl-10 pr-3 rounded-lg font-body text-[15px] placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
                </div>
              </div>
              <div>
                <label className="font-display font-semibold text-sm block mb-1.5">Event Date & Time</label>
                <div className="relative">
                  <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--g-ink-400)" />
                  <input type="datetime-local" value={c.dateTime} onChange={(e) => setC("dateTime", e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-lg font-body text-[15px]" style={{ border: "1px solid var(--g-line-2)" }} />
                </div>
              </div>
            </div>
            <div>
              <label className="font-display font-semibold text-sm block mb-1.5">Contact Number Of Event POC</label>
              <div className="flex gap-2">
                <div className="w-20"><input value={c.contactCode} onChange={(e) => setC("contactCode", e.target.value)} className="w-full h-11 px-3 rounded-lg font-body text-[15px] text-center" style={{ border: "1px solid var(--g-line-2)" }} /></div>
                <div className="flex-1 relative">
                  <Icon name="phone" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--g-ink-400)" />
                  <input value={c.contactNumber} onChange={(e) => setC("contactNumber", e.target.value)} placeholder="99999 99999" className="w-full h-11 pl-10 pr-3 rounded-lg font-body text-[15px] placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-display font-semibold text-sm">Important Info</label>
              </div>
              <p className="font-body text-xs mb-2" style={{ color: "var(--g-ink-500)" }}>WhatsApp messages do not support emojis or line breaks. Please use plain text only.</p>
              <div className="relative">
                <Icon name="info" size={14} className="absolute left-3 top-3.5" color="var(--g-ink-400)" />
                <textarea value={c.importantInfo} onChange={(e) => setC("importantInfo", e.target.value)} placeholder="e.g. Please don't bring anyone without ticket booking" rows={3} className="w-full pl-10 pr-3 py-3 rounded-lg font-body text-[15px] resize-none placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group link card */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1.5px solid ${g.enabled ? "var(--g-purple-500)" : "var(--g-line-2)"}` }}>
        <button type="button" onClick={() => setG("enabled", !g.enabled)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left" style={{ background: g.enabled ? "var(--g-purple-500)" : "#fff" }}>
          <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: g.enabled ? "#fff" : "transparent", border: g.enabled ? "none" : "1.5px solid var(--g-line-4)" }}>
            {g.enabled && <Icon name="check" size={14} color="var(--g-purple-500)" strokeWidth={3} />}
          </span>
          <span className="font-display font-semibold text-sm" style={{ color: g.enabled ? "#fff" : "var(--g-ink-900)" }}>Send a Whatsapp Message With a Group Link After Payment Confirmations (Only After You Approve)</span>
        </button>
        {g.enabled && (
          <div className="p-5">
            <label className="font-display font-semibold text-sm block mb-1.5">WhatsApp Group Link</label>
            <input value={g.link} onChange={(e) => setG("link", e.target.value)} placeholder="https://chat.whatsapp.com/..." className="w-full h-11 px-3.5 rounded-lg font-body text-[15px] placeholder:text-[var(--g-ink-400)]" style={{ border: "1px solid var(--g-line-2)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable */
function _UnusedMessages({ form, set }) {
  const templates = [
    { key: "confirmation", title: "Booking Confirmation", icon: "check-circle", color: "#00BB59", time: "Immediately after booking" },
    { key: "reminder",     title: "Event Reminder",      icon: "bell",          color: "#9167F2", time: "24 hours before event" },
    { key: "postEvent",    title: "Post-event Thank You", icon: "heart",        color: "#FD634F", time: "2 hours after event ends" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "var(--g-bg-lavender-soft)", border: "1px dashed var(--g-purple-200)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--g-purple-100)" }}><Icon name="message-circle" size={16} color="var(--g-purple-700)" /></div>
        <div>
          <div className="font-display font-semibold text-sm">WhatsApp messages — sent automatically</div>
          <div className="font-body text-sm mt-1" style={{ color: "var(--g-ink-600)" }}>Use variables like <code className="px-1 rounded" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>{`{{name}}`}</code>, <code className="px-1 rounded" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>{`{{event}}`}</code>, <code className="px-1 rounded" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>{`{{date}}`}</code>, <code className="px-1 rounded" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>{`{{venue}}`}</code>, <code className="px-1 rounded" style={{ background: "var(--g-purple-100)", color: "var(--g-purple-800)" }}>{`{{time}}`}</code> — we'll fill them per attendee.</div>
        </div>
      </div>

      {templates.map(tpl => {
        const enabled = form.messages?.[tpl.key]?.enabled !== false;
        const text = form.messages?.[tpl.key]?.text ?? DEFAULT_MESSAGES[tpl.key];
        return (
          <div key={tpl.key} className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid var(--g-line-2)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--g-line-2)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tpl.color + "1a" }}>
                  <Icon name={tpl.icon} size={18} color={tpl.color} />
                </div>
                <div>
                  <div className="font-display font-bold text-base">{tpl.title}</div>
                  <div className="font-body text-xs mt-0.5" style={{ color: "var(--g-ink-500)" }}>{tpl.time}</div>
                </div>
              </div>
              <button onClick={() => set("messages", { ...form.messages, [tpl.key]: { ...(form.messages?.[tpl.key] || {}), enabled: !enabled, text } })}
                className="w-11 h-6 rounded-full relative transition-all" style={{ background: enabled ? tpl.color : "var(--g-line-4)" }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: enabled ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
            {enabled && (
              <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-5">
                <textarea value={text} onChange={(e) => set("messages", { ...form.messages, [tpl.key]: { ...(form.messages?.[tpl.key] || {}), enabled, text: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl font-body text-sm resize-none" rows={5} style={{ border: "1px solid var(--g-line-2)" }} />
                <div className="rounded-xl p-3" style={{ background: "#DCF8C6", border: "1px solid #C5E1A5" }}>
                  <div className="text-[10px] font-display font-semibold mb-1.5" style={{ color: "#075E54" }}>WhatsApp preview</div>
                  <div className="font-body text-[13px]" style={{ color: "#1A1A1A", whiteSpace: "pre-wrap" }}>{text.replace(/\{\{name\}\}/g, "Riya").replace(/\{\{event\}\}/g, "Karthik Live").replace(/\{\{date\}\}/g, "Sat, 13 Jun").replace(/\{\{venue\}\}/g, "Phoenix Arena").replace(/\{\{time\}\}/g, "7:00 PM")}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Wrapper ---------------- */
function AddEventWizard({ initialEvent, onCancel, onSave, onSaveDraft, onOpenMobileNav }) {
  const today = new Date().toISOString().slice(0,10);
  const blank = {
    name: "", description: "", image: null, visibility: "public",
    artists: [], venueId: "", startDate: today, startTime: "19:00", endDate: today, endTime: "23:00",
    genre: "", tags: [], regMode: "open",
    terms: DEFAULT_TERMS, faqs: DEFAULT_FAQ,
    bookingGroups: [],
    tableTypes: [],
    messages: { confirmation: { enabled: true, text: DEFAULT_MESSAGES.confirmation }, reminder: { enabled: true, text: DEFAULT_MESSAGES.reminder }, postEvent: { enabled: false, text: DEFAULT_MESSAGES.postEvent } },
  };
  const [form, setForm] = useState(initialEvent ? { ...blank, ...initialEvent } : blank);
  const [stepKey, setStepKey] = useState("details");
  const [completed, setCompleted] = useState(initialEvent ? AE_STEPS.slice(0, -1).map(s => s.key) : []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const currentIdx = AE_STEPS.findIndex(s => s.key === stepKey);

  const valid = useMemo(() => {
    if (stepKey === "details") return !!form.name.trim();
    return true;
  }, [stepKey, form]);

  const next = () => {
    if (!valid) return;
    if (!completed.includes(stepKey)) setCompleted([...completed, stepKey]);
    if (currentIdx < AE_STEPS.length - 1) setStepKey(AE_STEPS[currentIdx + 1].key);
  };
  const prev = () => { if (currentIdx > 0) setStepKey(AE_STEPS[currentIdx - 1].key); };

  const handlePublish = () => onSave({ ...form, published: true });
  const handleSaveDraft = () => onSaveDraft({ ...form, published: false });

  return (
    <div className="-m-3 sm:-m-4 lg:-m-6" style={{ background: "#F7F7F9" }}>
      {/* Top header */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 mx-3 sm:mx-4 lg:mx-6 mt-3 sm:mt-4 lg:mt-6 flex items-center justify-between gap-3" style={{ minHeight: 72, border: "1px solid var(--g-line-2)" }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {onOpenMobileNav && (
            <button onClick={onOpenMobileNav} className="lg:hidden icon-btn w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: "1px solid var(--g-line-2)" }} aria-label="Open menu">
              <Icon name="menu" size={18} />
            </button>
          )}
          <button onClick={onCancel} className="icon-btn w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ border: "1px solid var(--g-line-2)" }}><Icon name="arrow-left" size={18} /></button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg sm:text-2xl tracking-tight truncate">{initialEvent ? "Edit Event" : "Add Event"}</h1>
            {form.name && <span className="font-body text-xs sm:text-sm block truncate" style={{ color: "var(--g-ink-500)" }}>{form.name}</span>}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 font-body text-xs flex-shrink-0" style={{ color: "var(--g-ink-500)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--g-green-500)" }} />
          Auto-saved as draft
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl mx-3 sm:mx-4 lg:mx-6 mt-3 lg:mt-4 px-4 sm:px-8 py-4 sm:py-5 overflow-x-auto tabs-scroll" style={{ border: "1px solid var(--g-line-2)" }}>
        <div className="min-w-[640px] sm:min-w-0">
          <StepIndicator current={stepKey} completed={completed} onJump={setStepKey} />
        </div>
      </div>

      {/* Body */}
      <div className="mx-3 sm:mx-4 lg:mx-6 mt-3 lg:mt-4 mb-32 bg-white rounded-2xl p-4 sm:p-6 lg:p-8" style={{ border: "1px solid var(--g-line-2)", minHeight: 400 }}>
        {stepKey === "details" && <StepDetails form={form} set={set} />}
        {stepKey === "terms" && <StepTerms form={form} set={set} />}
        {stepKey === "bookings" && <StepBookings form={form} set={set} />}
        {stepKey === "tables" && <StepTables form={form} set={set} />}
        {stepKey === "messages" && <StepMessages form={form} set={set} />}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 right-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 left-0 lg:left-[var(--sidebar-w,260px)]" style={{ background: "rgba(247,247,249,.92)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--g-line-2)" }}>
        <button onClick={prev} disabled={currentIdx === 0} className="g-btn g-btn--ghost disabled:opacity-40 flex-shrink-0"><Icon name="arrow-left" size={14} /> <span className="hidden sm:inline">Prev</span></button>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handleSaveDraft} className="g-btn g-btn--ghost"><span className="hidden sm:inline">Save as</span> Draft</button>
          {currentIdx < AE_STEPS.length - 1 ? (
            <button onClick={next} disabled={!valid} className="g-btn g-btn--accent disabled:opacity-50"><span className="hidden sm:inline">Save &</span> Continue <Icon name="arrow-right" size={14} color="#fff" /></button>
          ) : (
            <button onClick={handlePublish} disabled={!valid} className="g-btn g-btn--accent disabled:opacity-50">Publish <Icon name="rocket" size={14} color="#fff" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddEventWizard });
