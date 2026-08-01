-- Enums
CREATE TYPE public.store_role AS ENUM ('owner','manager','staff');
CREATE TYPE public.order_channel AS ENUM ('facebook','whatsapp','instagram','tiktok','manual');
CREATE TYPE public.order_status AS ENUM ('new','confirmed','packed','shipped','delivered','returned','cancelled');

-- Shared updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- stores
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- store_members
CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.store_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Helpers (security definer, avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = _store_id AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id uuid, _role public.store_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = _store_id AND m.user_id = auth.uid() AND m.role = _role);
$$;

-- stores policies
CREATE POLICY "members read store" ON public.stores FOR SELECT TO authenticated
  USING (public.is_store_member(id));
CREATE POLICY "owner updates store" ON public.stores FOR UPDATE TO authenticated
  USING (public.has_store_role(id, 'owner')) WITH CHECK (public.has_store_role(id, 'owner'));
CREATE POLICY "owner deletes store" ON public.stores FOR DELETE TO authenticated
  USING (public.has_store_role(id, 'owner'));
CREATE POLICY "user creates own store" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- store_members policies
CREATE POLICY "read members of my stores" ON public.store_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_store_member(store_id));
CREATE POLICY "owner manages members" ON public.store_members FOR INSERT TO authenticated
  WITH CHECK (public.has_store_role(store_id, 'owner') OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "owner updates members" ON public.store_members FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, 'owner')) WITH CHECK (public.has_store_role(store_id, 'owner'));
CREATE POLICY "owner removes members" ON public.store_members FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, 'owner'));

-- customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  district text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_store_idx ON public.customers(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members manage products" ON public.products FOR ALL TO authenticated
  USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel public.order_channel NOT NULL DEFAULT 'manual',
  status public.order_status NOT NULL DEFAULT 'new',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  delivery_charge numeric(12,2) NOT NULL DEFAULT 0,
  cod_amount numeric(12,2) NOT NULL DEFAULT 0,
  courier_name text,
  tracking_number text,
  delivery_district text,
  delivery_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, order_number)
);
CREATE INDEX orders_store_created_idx ON public.orders(store_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- order_items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members manage order items" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_store_member(o.store_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_store_member(o.store_id)));

-- Auto-provision a store on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_store()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_name text;
  base_slug text;
  final_slug text;
  new_store_id uuid;
  n integer := 0;
BEGIN
  base_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'store_name'), ''),
                        NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
                        split_part(NEW.email, '@', 1)) || '''s Store';
  base_slug := regexp_replace(lower(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'store_name'), ''), split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'store'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.stores (name, slug, owner_id)
  VALUES (base_name, final_slug, NEW.id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (new_store_id, NEW.id, 'owner');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_store
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_store();