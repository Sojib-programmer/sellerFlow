REVOKE ALL ON FUNCTION public.handle_new_user_store() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_store_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_store_role(uuid, public.store_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_role(uuid, public.store_role) TO authenticated;