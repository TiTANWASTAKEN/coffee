-- Run this in the Supabase SQL editor on the live project.
-- It adds coupon codes and teaches checkout to reserve one use.
-- Safe to run more than once.
create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique,
  kind text not null,
  value integer not null,
  max_uses integer not null,
  used integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists coupon_code text not null default '';
alter table public.orders add column if not exists discount_paise integer not null default 0;

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
  entered text;
  discount integer := 0;
  total integer;
  coup public.coupons%rowtype;
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

  entered := upper(regexp_replace(coalesce(payload->>'couponCode', ''), '\s', '', 'g'));
  if entered <> '' then
    if entered !~ '^[A-Z0-9-]{3,20}$' then
      raise exception 'Use 3-20 letters, numbers, or hyphens.';
    end if;
    select * into coup from public.coupons where coupons.code = entered for update;
    if not found then
      raise exception 'That code isn''t valid.';
    end if;
    if not coup.active then
      raise exception 'That code is no longer active.';
    end if;
    if coup.used >= coup.max_uses then
      raise exception 'This code has been used up.';
    end if;
    if coup.kind = 'percent' then
      discount := least(subtotal, (subtotal * coup.value) / 100);
    else
      discount := least(subtotal, coup.value);
    end if;
    if subtotal + shipping >= 100 and subtotal - discount + shipping < 100 then
      discount := subtotal + shipping - 100;
    end if;
    if discount < 1 then
      raise exception 'This code does not change the total.';
    end if;
    update public.coupons set used = used + 1 where id = coup.id;
  end if;

  total := subtotal - discount + shipping;
  if total < 100 then
    raise exception 'The order total must stay at least 1 rupee.';
  end if;

  insert into public.orders (
    public_id, status, fulfillment, payment_method, subtotal, shipping_paise, discount_paise, coupon_code, amount, currency,
    notes, idempotency_key, stock_held,
    customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, postal_code
  ) values (
    payload->>'publicId',
    'pending',
    'unfulfilled',
    coalesce(payload->>'paymentMethod', 'razorpay'),
    subtotal,
    shipping,
    discount,
    coalesce(entered, ''),
    total,
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
declare
  held boolean;
  entered text;
begin
  select stock_held, coupon_code into held, entered from public.orders where id = target_id for update;
  if not found or held is not true then
    return;
  end if;
  update public.products p
  set stock = p.stock + i.quantity, updated_at = now()
  from public.order_items i
  where i.order_id = target_id and i.product_id = p.id;
  if coalesce(entered, '') <> '' then
    update public.coupons set used = greatest(used - 1, 0) where coupons.code = entered;
  end if;
  update public.orders set stock_held = false where id = target_id;
end;
$$;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.order_updates enable row level security;
alter table public.coupons enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.shipments from anon, authenticated;
revoke all on table public.order_updates from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.release_order_stock(bigint) from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.release_order_stock(bigint) to service_role;

