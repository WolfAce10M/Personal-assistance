/**
 * Asistente de reservas (navegador). El servidor revalida TODO:
 * esto solo pinta disponibilidad y construye la petición.
 */
type Option = { minutes: number; low: number; high: number; fuelIncluded: boolean };
type Item = { type: 'fleet' | 'route'; id: string; name: string; capacity: number; options: Option[] };
type Boot = { locale: string; maxQty: number; items: Item[]; s: Record<string, string> };

const boot: Boot = JSON.parse(document.getElementById('booking-data')!.textContent!);
const S = boot.s;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

const state = {
  type: 'fleet' as 'fleet' | 'route',
  item: boot.items.find((i) => i.type === 'fleet')!,
  minutes: 0,
  qty: 1,
  day: '',
  startMin: -1,
  season: null as 'low' | 'high' | null,
  slotFree: 0,
};
state.minutes = state.item.options[0].minutes;

/* --------------- temporada (misma regla que el servidor) --------------- */
function seasonFor(day: string): 'low' | 'high' | null {
  const m = Number(day.slice(5, 7));
  if (m === 5 || m === 9 || m === 10) return 'low';
  if (m >= 6 && m <= 8) return 'high';
  return null;
}

/* ----------------------------- elementos ------------------------------ */
const dayInput = $<HTMLInputElement>('[data-day]');
const durSel = $<HTMLSelectElement>('[data-duration]');
const qtySel = $<HTMLSelectElement>('[data-qty]');
const slotsBox = $('[data-slots]');
const paidBtn = $<HTMLButtonElement>('[data-pay]');
const msgBox = $('[data-msg]');

// límites del calendario: hoy → +120 días
const today = new Date();
const max = new Date();
max.setDate(max.getDate() + 120);
const iso = (d: Date) => d.toISOString().slice(0, 10);
dayInput.min = iso(today);
dayInput.max = iso(max);

/* ------------------------------- render ------------------------------- */
function renderTypeButtons() {
  $$('[data-type-btn]').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.typeBtn === state.type)
  );
  $$('[data-item-btn]').forEach((b) => {
    b.classList.toggle('hidden', b.dataset.type !== state.type);
    b.classList.toggle('is-active', b.dataset.type === state.item.type && b.dataset.id === state.item.id);
  });
}

function renderDurations() {
  durSel.innerHTML = state.item.options
    .map((o) => `<option value="${o.minutes}">${o.minutes} ${S.min}</option>`)
    .join('');
  durSel.value = String(state.minutes);
}

function renderQty() {
  const maxQ = Math.min(boot.maxQty, state.item.capacity);
  qtySel.innerHTML = Array.from({ length: maxQ }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  if (state.qty > maxQ) state.qty = maxQ;
  qtySel.value = String(state.qty);
}

function renderSeason() {
  state.season = state.day ? seasonFor(state.day) : null;
  $$('[data-season-card]').forEach((c) => {
    const active = state.day !== '' && c.dataset.seasonCard === state.season;
    c.classList.toggle('is-active', active);
    c.querySelector('[data-season-applies]')?.classList.toggle('hidden', !active);
  });
}

function slotsMessage(text: string) {
  slotsBox.innerHTML = `<p class="col-span-full text-sm text-white/45 self-center">${text}</p>`;
}

async function refreshSlots() {
  state.startMin = -1;
  if (!state.day) return slotsMessage(S.pick), renderSummary();
  if (!state.season) return slotsMessage(S.closed), renderSummary();
  slotsMessage(S.loading);
  try {
    const q = new URLSearchParams({
      type: state.item.type,
      item: state.item.id,
      day: state.day,
      minutes: String(state.minutes),
    });
    const res = await fetch(`/api/availability?${q}`);
    const data = await res.json();
    if (!res.ok || data.error === 'SEASON_CLOSED') {
      return slotsMessage(data.error === 'SEASON_CLOSED' ? S.closed : S.errGeneric), renderSummary();
    }
    const usable = (data.slots as { start: number; time: string; free: number }[]).filter(
      (sl) => sl.free >= state.qty
    );
    if (!usable.length) return slotsMessage(S.none), renderSummary();
    slotsBox.innerHTML = usable
      .map(
        (sl) => `
        <button type="button" data-slot="${sl.start}" data-free="${sl.free}"
          class="rounded-xl border border-white/12 bg-ink-850/60 px-2 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/35">
          ${sl.time}
          <span class="block text-[10px] font-normal text-white/40">${sl.free} ${S.free}</span>
        </button>`
      )
      .join('');
    $$('[data-slot]').forEach((b) =>
      b.addEventListener('click', () => {
        state.startMin = Number(b.dataset.slot);
        state.slotFree = Number(b.dataset.free);
        $$('[data-slot]').forEach((x) =>
          x.classList.remove('border-brand-orange', 'bg-brand-orange/15')
        );
        b.classList.add('border-brand-orange', 'bg-brand-orange/15');
        renderSummary();
      })
    );
  } catch {
    slotsMessage(S.errGeneric);
  }
  renderSummary();
}

function currentOption(): Option {
  return state.item.options.find((o) => o.minutes === state.minutes)!;
}

function fmtTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function renderSummary() {
  const dl = $('[data-summary]');
  const opt = currentOption();
  const seasonLabel = state.season === 'low' ? S.low : state.season === 'high' ? S.high : '—';
  const unit = state.season ? (state.season === 'low' ? opt.low : opt.high) : null;
  const rows: [string, string][] = [
    ['', `<strong>${state.item.name}</strong>`],
    [S.date, state.day || '—'],
    [S.time, state.startMin >= 0 ? `${fmtTime(state.startMin)} · ${state.minutes} min` : '—'],
    ['', opt.fuelIncluded ? S.fuelYes : S.fuelNo],
    ['', seasonLabel + (unit ? ` · ${unit} ${S.perunit}` : '')],
    [S.qty, `${state.qty}`],
  ];
  dl.innerHTML = rows
    .map(
      ([k, v]) =>
        `<div class="flex justify-between gap-3"><dt class="text-white/45">${k}</dt><dd class="text-right font-medium">${v}</dd></div>`
    )
    .join('');
  $('[data-total]').textContent = unit && state.startMin >= 0 ? `${unit * state.qty}€` : '—';
  paidBtn.disabled = !(state.day && state.season && state.startMin >= 0);
}

function showMsg(text: string, ok = false) {
  msgBox.textContent = text;
  msgBox.className = `mt-3 text-sm font-medium rounded-xl px-3 py-2 ${
    ok ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
  }`;
}

/* ------------------------------- eventos ------------------------------- */
$$('[data-type-btn]').forEach((b) =>
  b.addEventListener('click', () => {
    state.type = b.dataset.typeBtn as 'fleet' | 'route';
    state.item = boot.items.find((i) => i.type === state.type)!;
    state.minutes = state.item.options[0].minutes;
    renderTypeButtons();
    renderDurations();
    renderQty();
    refreshSlots();
  })
);

$$('[data-item-btn]').forEach((b) =>
  b.addEventListener('click', () => {
    state.item = boot.items.find((i) => i.type === b.dataset.type && i.id === b.dataset.id)!;
    state.minutes = state.item.options[0].minutes;
    renderTypeButtons();
    renderDurations();
    renderQty();
    refreshSlots();
  })
);

dayInput.addEventListener('change', () => {
  state.day = dayInput.value;
  renderSeason();
  refreshSlots();
});
durSel.addEventListener('change', () => {
  state.minutes = Number(durSel.value);
  refreshSlots();
});
qtySel.addEventListener('change', () => {
  state.qty = Number(qtySel.value);
  refreshSlots();
});

paidBtn.addEventListener('click', async () => {
  const name = $<HTMLInputElement>('[data-name]').value.trim();
  const email = $<HTMLInputElement>('[data-email]').value.trim();
  const phone = $<HTMLInputElement>('[data-phone]').value.trim();
  const notes = $<HTMLInputElement>('[data-notes]').value.trim();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6) {
    return showMsg(S.errGeneric);
  }
  paidBtn.disabled = true;
  msgBox.classList.add('hidden');
  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: state.item.type,
        itemId: state.item.id,
        day: state.day,
        startMin: state.startMin,
        minutes: state.minutes,
        qty: state.qty,
        name,
        email,
        phone,
        notes,
        locale: boot.locale,
      }),
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    if (data.error === 'SLOT_TAKEN') {
      showMsg(S.errSlot);
      refreshSlots();
    } else {
      showMsg(S.errGeneric);
    }
  } catch {
    showMsg(S.errGeneric);
  }
  paidBtn.disabled = false;
  msgBox.classList.remove('hidden');
});

/* ------------------------------- arranque ------------------------------ */
renderTypeButtons();
renderDurations();
renderQty();
renderSeason();
renderSummary();
