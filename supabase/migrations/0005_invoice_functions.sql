-- Invoices and payments are written through functions so that each one is a
-- single all-or-nothing step: an invoice never exists without its lines, and a
-- payment can never exceed what is owed. SECURITY INVOKER, so Row Level
-- Security still decides who may do this; the explicit owner check gives a
-- clear message instead of a bare "row-level security" error.

create function public.create_invoice(
  p_customer uuid,
  p_issued_on date,
  p_due_on date,
  p_notes text,
  p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_farm uuid := public.current_farm_id();
  v_id uuid;
  v_item jsonb;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can create invoices.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An invoice needs at least one line.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'An invoice can have at most 50 lines.' using errcode = '22023';
  end if;

  insert into public.invoices (farm_id, customer_id, issued_on, due_on, notes)
  values (v_farm, p_customer, p_issued_on, p_due_on, nullif(trim(p_notes), ''))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.invoice_items
      (farm_id, invoice_id, category, description, grade, quantity, unit, unit_price_ngn)
    values (
      v_farm, v_id,
      (v_item ->> 'category')::public.sale_category,
      v_item ->> 'description',
      nullif(v_item ->> 'grade', '')::public.egg_grade,
      (v_item ->> 'quantity')::numeric,
      v_item ->> 'unit',
      (v_item ->> 'unit_price_ngn')::numeric
    );
  end loop;
  return v_id;
end
$$;

create function public.record_payment(
  p_invoice uuid,
  p_paid_on date,
  p_amount numeric,
  p_method public.payment_method,
  p_reference text
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_farm uuid := public.current_farm_id();
  v_inv record;
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can record payments.' using errcode = '42501';
  end if;
  -- Lock the invoice so two payments cannot both pass the balance check.
  perform 1 from public.invoices where id = p_invoice and farm_id = v_farm for update;
  select status, balance_ngn into v_inv from public.invoice_balances where id = p_invoice;
  if not found then
    raise exception 'That invoice was not found.' using errcode = '22023';
  end if;
  if v_inv.status = 'void' then
    raise exception 'This invoice is void and cannot take payments.' using errcode = '22023';
  end if;
  if p_amount > v_inv.balance_ngn then
    raise exception 'That is more than the balance owed (%).', v_inv.balance_ngn using errcode = '22023';
  end if;
  insert into public.payments (farm_id, invoice_id, paid_on, amount_ngn, method, reference)
  values (v_farm, p_invoice, p_paid_on, p_amount, p_method, nullif(trim(p_reference), ''))
  returning id into v_id;
  return v_id;
end
$$;

create function public.void_invoice(p_invoice uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_paid numeric;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can void invoices.' using errcode = '42501';
  end if;
  select paid_ngn into v_paid from public.invoice_balances where id = p_invoice;
  if not found then
    raise exception 'That invoice was not found.' using errcode = '22023';
  end if;
  if v_paid > 0 then
    raise exception 'This invoice has payments recorded. Void is only for unpaid invoices.' using errcode = '22023';
  end if;
  update public.invoices set status = 'void' where id = p_invoice and status = 'issued';
end
$$;

revoke execute on function public.create_invoice(uuid, date, date, text, jsonb) from public, anon;
revoke execute on function public.record_payment(uuid, date, numeric, public.payment_method, text) from public, anon;
revoke execute on function public.void_invoice(uuid) from public, anon;
grant execute on function public.create_invoice(uuid, date, date, text, jsonb) to authenticated;
grant execute on function public.record_payment(uuid, date, numeric, public.payment_method, text) to authenticated;
grant execute on function public.void_invoice(uuid) to authenticated;
