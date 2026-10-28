-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 10 : DONNÉES DE RÉFÉRENCE (appliquées aussi en production)
-- Idempotente : n'écrase jamais ce qu'un administrateur a modifié. Uniquement des
-- faits issus des documents officiels ; ce qui est à confirmer est signalé.
-- ==============================================================================

INSERT INTO public.editions (slug, name, starts_on, ends_on, venue_name, venue_address, is_current)
VALUES ('sam-2027', 'SAM Guinée 2027 — 1re édition', '2027-03-19', '2027-03-28',
        'Palais du Peuple de Conakry',
        'Esplanade du « Stade Général Lansana Conté », Conakry, Guinée', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.site_settings (key, value, is_public) VALUES
    ('slogan', '"La Guinée roule vers l’avenir."'::jsonb, true),
    ('event_dates_display', '"Du vendredi 19 au dimanche 28 mars 2027"'::jsonb, true),
    ('venue_display', '"Palais du Peuple de Conakry — esplanade du « Stade Général Lansana Conté »"'::jsonb, true),
    ('contact_phones', '["(00224) 610 86 14 09", "(00224) 655 79 78 77"]'::jsonb, true),
    ('contact_email', '"samdeguinee@gmail.com"'::jsonb, true),
    ('headquarters_address', '"Lambagny / Commune de Lambagny, Conakry, Guinée"'::jsonb, true),
    ('opening_hours', '{"weekdays":"09:00 - 20:00","weekend":"10:00 - 21:00","exhibitors":"08:00 - 22:00","total_evacuation":"23:00"}'::jsonb, true),
    ('exhibitor_registration_fee_gnf', '2000000'::jsonb, true),
    ('exhibitor_deposit_gnf', '3000000'::jsonb, true),
    ('vat_rate', '0.18'::jsonb, true),
    -- À CONFIRMER avant publication (is_public = false tant que ce n'est pas validé)
    ('official_website', '"sam.com"'::jsonb, false),
    ('social_networks', '{"facebook":"@SAM","instagram":"@SAM","linkedin":"@SAM"}'::jsonb, false),
    -- Jamais publics : lus via public.get_payment_details() par un exposant ayant déposé un dossier
    ('bank_payment_details', '{"bank":"ECOBANK","account_title":"SAM","account_number":"010 001 730 805 6976 - 17","cheque_order":"SAM"}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.ticket_types (edition_id, code, label, price_gnf, min_age, max_age, requires_proof, is_active)
SELECT e.id, v.code::public.ticket_type_code, v.label, v.price, v.min_age, v.max_age, v.proof, true
FROM public.editions e,
     (VALUES ('adult','Billet adulte (18 ans et plus)',25000,18,NULL::int,false),
             ('teen','Billet 12 à 17 ans',10000,12,17,true),
             ('child','Moins de 12 ans (gratuit)',0,0,11,true),
             ('press','Presse (gratuit, carte professionnelle)',0,NULL::int,NULL::int,true)) AS v(code,label,price,min_age,max_age,proof)
WHERE e.slug = 'sam-2027'
ON CONFLICT (edition_id, code) DO NOTHING;
-- Pass VIP : tarif non communiqué -> à créer depuis l'administration quand il sera confirmé.

INSERT INTO public.stand_classes (code, label, price_per_m2_gnf, min_surface_m2, amenities, is_active) VALUES
    ('simple', 'Stand Simple', 4000000, 3.00,
     '["Tapis aiguilleté + film de protection (4 coloris au choix)","Cloisons en bois recouvertes de coton gratté, hauteur 2,50 m (4 coloris au choix)","Réserve de 1 m² à l’angle du stand","Éclairage : 1 rail de 3 spots pour 9 m²","1 enseigne PVC 40 × 40 cm"]'::jsonb, true),
    ('double', 'Stand Double', 8000000, 3.00, '[]'::jsonb, true),         -- aménagements à confirmer
    ('accessory', 'Stand Accessoire', 2500000, 3.00, '[]'::jsonb, true),  -- aménagements à confirmer
    ('bank_insurance', 'Stand Banques et assurances', 5000000, 3.00,
     '["Tapis aiguilleté + film de protection (4 coloris au choix)","Cloisons en bois recouvertes de coton gratté, hauteur 2,50 m (4 coloris au choix)","Réserve de 1 m² à l’angle du stand","Éclairage : 1 rail de 3 spots pour 9 m²","2 enseignes PVC 40 × 40 cm","Nettoyage quotidien et mise en état la veille de l’ouverture","Coffret électrique 3 kW + 1 prise sur le stand"]'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sponsor_packs (code, label, role_label, price_gnf, benefits, sort_order, is_active) VALUES
 ('diamond','Diamond','Partenaire Majeur',300000000,
  '{"stand":"1 stand clé en main de 3 m² avec emplacement privilégié","mention":"SPONSOR OFFICIEL","logo":"Tous les supports de communication","pub_catalogue":"Double page","database_visitors":true,"gala_dinner":"1 table personnalisée (4 personnes)","vip_access":4,"press_release":true,"badges":10,"common_perks":["Droits d’inscription inclus","Lien vers le site internet du partenaire","Brochure du partenaire insérée dans le sac remis aux participants"]}'::jsonb,1,true),
 ('platinum','Platinum','Partenaire Officiel',200000000,
  '{"stand":"1 stand clé en main de 3 m² avec emplacement privilégié","mention":"SPONSOR OFFICIEL","logo":"Tous les supports de communication","pub_catalogue":"1 page","database_visitors":true,"gala_dinner":"3 places","vip_access":3,"press_release":true,"badges":6,"common_perks":["Droits d’inscription inclus","Lien vers le site internet du partenaire","Brochure du partenaire insérée dans le sac remis aux participants"]}'::jsonb,2,true),
 ('gold','Gold','Partenaire Premium',100000000,
  '{"stand":"1 stand clé en main de 3 m² avec emplacement privilégié","mention":"SPONSOR","logo":"Catalogue et site internet du salon","pub_catalogue":"½ page","database_visitors":false,"gala_dinner":"2 places","vip_access":2,"press_release":false,"badges":4,"common_perks":["Droits d’inscription inclus","Lien vers le site internet du partenaire","Brochure du partenaire insérée dans le sac remis aux participants"]}'::jsonb,3,true)
ON CONFLICT (code) DO NOTHING;
