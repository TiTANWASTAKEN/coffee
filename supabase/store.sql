-- Run once in the Supabase dashboard: SQL Editor → New query → Run.
-- Orders, products and tracking. The service-role key is the only client.
-- Also run supabase/waitlist.sql if you still want the email list.

create table if not exists public.products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  sku text not null default '',
  name text not null,
  description text not null default '',
  price integer not null,
  stock integer not null default 0,
  images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  public_id text not null unique,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status text not null default 'pending',
  fulfillment text not null default 'unfulfilled',
  payment_method text not null default 'razorpay',
  subtotal integer not null,
  shipping_paise integer not null default 0,
  amount integer not null,
  currency text not null default 'INR',
  notes text not null default '',
  upi_reference text not null default '',
  stock_held boolean not null default false,
  idempotency_key text unique,
  confirmation_sent boolean not null default false,
  confirmation_letter text not null default '',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address_line1 text not null,
  address_line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  name text not null,
  unit_price integer not null,
  quantity integer not null
);

create table if not exists public.shipments (
  order_id bigint primary key references public.orders (id) on delete cascade,
  courier text not null default '',
  tracking_ref text not null default '',
  tracking_url text not null default '',
  location text not null default '',
  dispatched_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_updates (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  label text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

insert into public.products (slug, sku, name, description, price, stock)
values
  ('honest-truth', 'honest-truth', 'Honest Truth', '100% Arabica from Coorg. Medium plus roast — chocolate, caramel, mild nut.', 49900, 0),
  ('dark-truth', 'dark-truth', 'Dark Truth', '100% Robusta. Bold, intense, powerful.', 44900, 25),
  ('bitter-truth', 'bitter-truth', 'Bitter Truth', '70% Arabica / 30% Robusta. Balanced, bold, complex.', 47900, 0)
on conflict (slug) do nothing;

-- Honest Truth and Bitter Truth start at 0 (coming soon). Dark Truth is the one in stock.

create or replace function public.place_order(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id bigint;
  new_id bigint;
  item jsonb;
  prod public.products%rowtype;
  qty integer;
  pid bigint;
  subtotal integer := 0;
  shipping integer;
  customer jsonb;
begin
  if coalesce(payload->>'idempotencyKey', '') <> '' then
    select id into existing_id from public.orders where idempotency_key = payload->>'idempotencyKey';
    if found then
      return existing_id;
    end if;
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Your cart is empty.';
  end if;

  shipping := coalesce((payload->>'shippingPaise')::integer, 0);
  customer := payload->'customer';

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    pid := (item->>'productId')::bigint;
    qty := (item->>'quantity')::integer;
    if qty is null or qty < 1 or qty > 99 then
      raise exception 'Invalid quantity.';
    end if;
    select * into prod from public.products where id = pid and active for update;
    if not found then
      raise exception 'An item in your cart is no longer available.';
    end if;
    if prod.stock < qty then
      if prod.stock = 0 then
        raise exception '% is coming soon.', prod.name;
      else
        raise exception 'Only % of % left in stock.', prod.stock, prod.name;
      end if;
    end if;
    subtotal := subtotal + prod.price * qty;
  end loop;

  insert into public.orders (
    public_id, status, fulfillment, payment_method, subtotal, shipping_paise, amount, currency,
    notes, idempotency_key, stock_held,
    customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, postal_code
  ) values (
    payload->>'publicId',
    'pending',
    'unfulfilled',
    coalesce(payload->>'paymentMethod', 'razorpay'),
    subtotal,
    shipping,
    subtotal + shipping,
    'INR',
    left(coalesce(payload->>'notes', ''), 500),
    nullif(payload->>'idempotencyKey', ''),
    true,
    customer->>'name',
    customer->>'email',
    customer->>'phone',
    customer->>'line1',
    coalesce(customer->>'line2', ''),
    customer->>'city',
    customer->>'state',
    customer->>'postalCode'
  ) returning id into new_id;

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    pid := (item->>'productId')::bigint;
    qty := (item->>'quantity')::integer;
    select * into prod from public.products where id = pid;
    insert into public.order_items (order_id, product_id, name, unit_price, quantity)
    values (new_id, pid, prod.name, prod.price, qty);
    update public.products set stock = stock - qty, updated_at = now() where id = pid;
  end loop;

  return new_id;
exception
  when unique_violation then
    select id into existing_id from public.orders where idempotency_key = payload->>'idempotencyKey';
    if existing_id is not null then
      return existing_id;
    end if;
    raise;
end;
$$;

create or replace function public.release_order_stock(target_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.orders where id = target_id and stock_held for update;
  if not found then
    return;
  end if;
  update public.products p
  set stock = p.stock + i.quantity, updated_at = now()
  from public.order_items i
  where i.order_id = target_id and i.product_id = p.id;
  update public.orders set stock_held = false where id = target_id;
end;
$$;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.order_updates enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.shipments from anon, authenticated;
revoke all on table public.order_updates from anon, authenticated;

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.release_order_stock(bigint) from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.release_order_stock(bigint) to service_role;
