-- ============================================================
-- Costa Brava Rent Jet Ski — esquema de reservas
-- Ejecutar UNA VEZ en Supabase → SQL Editor → Run
-- ============================================================

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('fleet','route')),
  item_id text not null,
  day date not null,
  start_min int not null,          -- minutos desde medianoche (salida)
  end_min int not null,            -- fin + margen de repostaje
  qty int not null default 1 check (qty >= 1),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  locale text not null default 'es',
  season text not null check (season in ('low','high')),
  unit_price_eur numeric not null,
  total_eur numeric not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','expired')),
  stripe_session_id text,
  notes text default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz            -- las 'pending' caducan y liberan el hueco
);

create index if not exists bookings_item_day on bookings (item_id, day);

-- Seguridad: la tabla solo es accesible con la service-role key (servidor).
alter table bookings enable row level security;

-- ============================================================
-- Creación atómica de reservas.
-- pg_advisory_xact_lock serializa las reservas del mismo artículo+día:
-- dos clientes pidiendo el mismo hueco a la vez JAMÁS se solapan.
-- ============================================================
create or replace function create_booking(
  p_type text, p_item_id text, p_day date,
  p_start_min int, p_end_min int, p_qty int, p_capacity int,
  p_name text, p_email text, p_phone text, p_locale text,
  p_season text, p_unit_price numeric, p_total numeric,
  p_notes text, p_hold_minutes int
) returns uuid
language plpgsql
security definer
as $$
declare
  v_used int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_item_id || p_day::text));

  select coalesce(sum(qty), 0) into v_used
  from bookings
  where item_id = p_item_id
    and day = p_day
    and (
      status = 'confirmed'
      or (status = 'pending' and expires_at > now())
    )
    and start_min < p_end_min
    and end_min > p_start_min;

  if v_used + p_qty > p_capacity then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into bookings (
    type, item_id, day, start_min, end_min, qty,
    customer_name, customer_email, customer_phone, locale,
    season, unit_price_eur, total_eur, status, notes, expires_at
  ) values (
    p_type, p_item_id, p_day, p_start_min, p_end_min, p_qty,
    p_name, p_email, p_phone, p_locale,
    p_season, p_unit_price, p_total, 'pending', p_notes,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_id;

  return v_id;
end;
$$;
