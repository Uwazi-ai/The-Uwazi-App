CREATE OR REPLACE FUNCTION public.ride_waitlist_list()
 RETURNS TABLE(id uuid, state_code text, created_at timestamp with time zone, texted_at timestamp with time zone, texted_count integer, has_phone boolean, has_account boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT w.id, w.state_code, w.created_at, w.texted_at, w.texted_count,
    coalesce(nullif(w.phone,''), nullif(p.phone_number,'')) IS NOT NULL, w.user_id IS NOT NULL
  FROM public.poll_ride_waitlist w
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  WHERE public.is_ride_coordinator(auth.uid())
  ORDER BY w.created_at;
$function$;
CREATE OR REPLACE FUNCTION public.ride_waitlist_phone(_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(nullif(w.phone,''), nullif(p.phone_number,''))
  FROM public.poll_ride_waitlist w LEFT JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.id = _id AND public.is_ride_coordinator(auth.uid());
$function$;