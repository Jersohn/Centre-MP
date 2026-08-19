-- Responsabilités par périmètre : responsable, homme, femme, jeunesse,
-- jeune homme, jeune fille — centre, chapitre, district, groupe.

alter type public.member_responsibility add value if not exists 'responsable_homme_centre';
alter type public.member_responsibility add value if not exists 'responsable_femme_centre';
alter type public.member_responsibility add value if not exists 'responsable_jeunesse_centre';
alter type public.member_responsibility add value if not exists 'responsable_jeune_homme_centre';
alter type public.member_responsibility add value if not exists 'responsable_jeune_fille_centre';

alter type public.member_responsibility add value if not exists 'responsable_homme_chapitre';
alter type public.member_responsibility add value if not exists 'responsable_femme_chapitre';
alter type public.member_responsibility add value if not exists 'responsable_jeunesse_chapitre';
alter type public.member_responsibility add value if not exists 'responsable_jeune_homme_chapitre';
alter type public.member_responsibility add value if not exists 'responsable_jeune_fille_chapitre';

alter type public.member_responsibility add value if not exists 'responsable_homme_district';
alter type public.member_responsibility add value if not exists 'responsable_femme_district';
alter type public.member_responsibility add value if not exists 'responsable_jeunesse_district';
alter type public.member_responsibility add value if not exists 'responsable_jeune_homme_district';
alter type public.member_responsibility add value if not exists 'responsable_jeune_fille_district';

alter type public.member_responsibility add value if not exists 'responsable_homme_groupe';
alter type public.member_responsibility add value if not exists 'responsable_femme_groupe';
alter type public.member_responsibility add value if not exists 'responsable_jeunesse_groupe';
alter type public.member_responsibility add value if not exists 'responsable_jeune_homme_groupe';
alter type public.member_responsibility add value if not exists 'responsable_jeune_fille_groupe';
