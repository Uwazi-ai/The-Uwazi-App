UPDATE public.compass_personas SET icon_key = slug;

INSERT INTO public.badges (slug, name, description, art_key, rarity, rule)
SELECT 'persona-' || slug, name, 'You got ' || name || ' on a Civic Compass quiz.', slug, 'common', jsonb_build_object('type','persona','persona',slug)
FROM public.compass_personas
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.award_persona_badge()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source = 'quiz' THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, b.id FROM public.badges b WHERE b.slug = 'persona-' || NEW.persona
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.award_persona_badge() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_award_persona_badge AFTER INSERT ON public.persona_history
FOR EACH ROW EXECUTE FUNCTION public.award_persona_badge();

INSERT INTO public.user_badges (user_id, badge_id)
SELECT p.user_id, b.id FROM public.user_civic_persona p
JOIN public.badges b ON b.slug = 'persona-' || (p.persona_labels->>'persona')
ON CONFLICT (user_id, badge_id) DO NOTHING;