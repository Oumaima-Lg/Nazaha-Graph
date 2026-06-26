-- ============================================================
-- NAZAHA-GRAPH — Seed Data (Moroccan realistic scenario)
-- Run AFTER schema.sql
-- ============================================================
-- Four fraud patterns illustrated:
--
--  [A] CONFLIT D'INTÉRÊT DIRECT
--      Fatima Zahra El Hilali (présidente commission — MEE)
--      → épouse → Omar El Hilali (gérant BTP Maroc SARL)
--      BTP Maroc remporte 3 marchés MEE qu'elle préside.
--
--  [B] CONFLIT D'INTÉRÊT FAMILIAL (indirect)
--      Mohammed Benali (ordonnateur ONEE)
--      → frère → Youssef Benali (actionnaire Travaux Hydrauliques Fès)
--      THF remporte 3 marchés ONEE signés par son frère.
--
--  [C] COLLUSION (rotation de soumissionnaires)
--      BTP Maroc + Constructions Maghreb + Génie Civil Atlantique
--      apparaissent ensemble sur tous les AO MEE — offres factices.
--
--  [D] PANTOUFLAGE
--      Abdelhak Tazi (ex-directeur marchés — Commune Rabat, parti déc 2022)
--      → consultant → Infrastructure Sud SA (jan 2023)
--      ISA remporte un marché de 21,5 M MAD à la même commune (juin 2023).
--
--  [E] FRACTIONNEMENT
--      Petits Travaux Express SARL remporte 4 bons de commande consécutifs
--      à la Commune de Marrakech, chacun < 1 M MAD (seuil AO ouvert).
-- ============================================================

-- ── AGENCIES ────────────────────────────────────────────────

INSERT INTO agencies (id, name_fr, name_ar, code_sigb, type, region, city, budget_annuel_mad) VALUES

  ('a1000000-0000-0000-0000-000000000001',
   'Ministère de l''Équipement et de l''Eau',
   'وزارة التجهيز والماء',
   'MEE-001', 'ministere', 'Rabat-Salé-Kénitra', 'Rabat', 4500000000.00),

  ('a2000000-0000-0000-0000-000000000002',
   'Office National de l''Électricité et de l''Eau Potable',
   'المكتب الوطني للكهرباء والماء الصالح للشرب',
   'ONEE-001', 'EEP', 'Casablanca-Settat', 'Casablanca', 12000000000.00),

  ('a3000000-0000-0000-0000-000000000003',
   'Commune Urbaine de Marrakech',
   'جماعة مراكش الحضرية',
   'CUM-040', 'commune', 'Marrakech-Safi', 'Marrakech', 800000000.00),

  ('a4000000-0000-0000-0000-000000000004',
   'Commune Urbaine de Rabat',
   'جماعة الرباط الحضرية',
   'CUR-011', 'commune', 'Rabat-Salé-Kénitra', 'Rabat', 1200000000.00),

  ('a5000000-0000-0000-0000-000000000005',
   'Agence du Bassin Hydraulique du Tensift',
   'وكالة الحوض المائي لتانسيفت',
   'ABHT-001', 'EPA', 'Marrakech-Safi', 'Marrakech', 350000000.00);


-- ── PERSONS ─────────────────────────────────────────────────

INSERT INTO persons (id, full_name_fr, full_name_ar, cin, role,
                     is_public_official, date_debut_fonction, date_fin_mandat,
                     agency_id, notes) VALUES

  -- [A] Présidente de commission MEE — conflict with her husband (p6)
  ('b1000000-0000-0000-0000-000000000001',
   'Fatima Zahra El Hilali', 'فاطمة الزهراء الهلالي',
   'BK234567', 'president_commission',
   TRUE, '2019-03-01', NULL,
   'a1000000-0000-0000-0000-000000000001',
   'Présidente commission ouverture des plis — MEE. Épouse de Omar El Hilali (gérant BTP Maroc).'),

  -- MEE commission member (secondary conflict with Samir Cherkaoui — beau-frère)
  ('b2000000-0000-0000-0000-000000000002',
   'Rachid Amrani', 'رشيد العمراني',
   'AB112233', 'membre_commission',
   TRUE, '2020-06-15', NULL,
   'a1000000-0000-0000-0000-000000000001',
   'Membre commission MEE. Beau-frère de Samir Cherkaoui (DG Constructions Maghreb).'),

  -- [B] Ordonnateur ONEE — conflict with his brother (p7)
  ('b3000000-0000-0000-0000-000000000003',
   'Mohammed Benali', 'محمد بن علي',
   'CD556677', 'ordonnateur',
   TRUE, '2018-01-10', NULL,
   'a2000000-0000-0000-0000-000000000002',
   'Ordonnateur délégué ONEE — Département Eau. Frère de Youssef Benali (actionnaire THF).'),

  -- Ordonnateur Commune Marrakech — oversees fractionnement contracts
  ('b4000000-0000-0000-0000-000000000004',
   'Khalid Ouazzani', 'خالد الوزاني',
   'EF778899', 'ordonnateur',
   TRUE, '2021-09-01', NULL,
   'a3000000-0000-0000-0000-000000000003',
   NULL),

  -- [D] Ex-directeur marchés Commune Rabat → pantouflage to Infrastructure Sud
  ('b5000000-0000-0000-0000-000000000005',
   'Abdelhak Tazi', 'عبد الحق الطازي',
   'GH001122', 'directeur',
   TRUE, '2015-04-01', '2022-12-31',
   'a4000000-0000-0000-0000-000000000004',
   'Directeur des marchés Commune Rabat jusqu''en déc 2022. Devient consultant Infrastructure Sud SA en jan 2023 → pantouflage.'),

  -- Private persons (company side)
  ('b6000000-0000-0000-0000-000000000006',
   'Omar El Hilali', 'عمر الهلالي',
   'BK234568', 'gerant',
   FALSE, NULL, NULL, NULL,
   'Gérant & propriétaire BTP Maroc SARL. Époux de Fatima Zahra El Hilali (présidente commission MEE).'),

  ('b7000000-0000-0000-0000-000000000007',
   'Youssef Benali', 'يوسف بن علي',
   'CD556678', 'actionnaire',
   FALSE, NULL, NULL, NULL,
   'Actionnaire majoritaire (70%) Travaux Hydrauliques Fès SARL. Frère de Mohammed Benali (ordonnateur ONEE).'),

  ('b8000000-0000-0000-0000-000000000008',
   'Samir Cherkaoui', 'سمير الشرقاوي',
   'IJ334455', 'directeur_general',
   FALSE, NULL, NULL, NULL,
   'Directeur Général Constructions Maghreb SA. Beau-frère de Rachid Amrani (membre commission MEE).'),

  ('b9000000-0000-0000-0000-000000000009',
   'Houda Naciri', 'هدى النصيري',
   'KL556677', 'gerant',
   FALSE, NULL, NULL, NULL,
   'Gérante Génie Civil Atlantique SARL. Soumissionnaire décoy dans la collusion MEE.'),

  ('ba000000-0000-0000-0000-000000000010',
   'Nabil Benchekroun', 'نبيل بنشقرون',
   'MN778899', 'actionnaire',
   FALSE, NULL, NULL, NULL,
   'Actionnaire majoritaire Infrastructure Sud SA. Ami de longue date de Abdelhak Tazi.');


-- ── COMPANIES ───────────────────────────────────────────────

INSERT INTO companies (id, name, name_ar, ice, rc, legal_form,
                       capital_mad, city, date_creation,
                       inpplc_risk_level, inpplc_notes) VALUES

  -- [A][C] Wins all MEE contracts where El Hilali presides
  ('c1000000-0000-0000-0000-000000000001',
   'BTP Maroc SARL', 'بي تي بي المغرب',
   '001823456700085', '45231 Casa', 'SARL',
   500000.00, 'Casablanca', '2014-05-20',
   'high',
   'Remporte systématiquement les AO MEE présidés par Mme El Hilali. Capital anormalement faible (500 K MAD) pour des marchés > 8 M MAD.'),

  -- [C] Decoy bidder — always loses to BTP Maroc, always 2nd
  ('c2000000-0000-0000-0000-000000000002',
   'Constructions Maghreb SA', 'بناء المغرب',
   '002934567800096', '78432 Casa', 'SA',
   2000000.00, 'Casablanca', '2010-11-15',
   'medium',
   'Soumissionnaire systématique avec BTP Maroc sur les AO MEE. Toujours classé 2e. DG = beau-frère d''un membre de commission.'),

  -- [C] Decoy bidder — always 3rd
  ('c3000000-0000-0000-0000-000000000003',
   'Génie Civil Atlantique SARL', 'الهندسة المدنية الأطلسية',
   '003045678900017', '23109 Rabat', 'SARL',
   300000.00, 'Rabat', '2016-03-08',
   'medium',
   'Toujours classé 3e sur les AO remportés par BTP Maroc. Offres systématiquement 15-20% au-dessus du lot 1.'),

  -- [B] Brother of ONEE ordonnateur wins ONEE contracts
  ('c4000000-0000-0000-0000-000000000004',
   'Travaux Hydrauliques Fès SARL', 'أشغال مائية فاس',
   '004156789000128', '56712 Fès', 'SARL',
   200000.00, 'Fès', '2017-08-22',
   'high',
   'Actionnaire majoritaire (70%) = frère de l''ordonnateur ONEE. Capital très faible pour des marchés d''infrastructure.'),

  -- [D] Benefits from pantouflage: ex-directeur joins as consultant
  ('c5000000-0000-0000-0000-000000000005',
   'Infrastructure Sud SA', 'بنية تحتية الجنوب',
   '005267890100239', '34521 Rabat', 'SA',
   5000000.00, 'Rabat', '2013-01-30',
   'high',
   'Pantouflage: Abdelhak Tazi (ex-directeur marchés Commune Rabat) devient consultant en jan 2023. ISA remporte un marché 21,5 M MAD à la même commune en juin 2023.'),

  -- Clean bidder (for contrast)
  ('c6000000-0000-0000-0000-000000000006',
   'Techno Bâtiment Marrakech SARL', 'تقنيات البناء مراكش',
   '006378901200340', '89023 Marrakech', 'SARL',
   100000.00, 'Marrakech', '2020-02-14',
   'low',
   NULL),

  -- Clean winner at ABHT (legitimate)
  ('c7000000-0000-0000-0000-000000000007',
   'Hydro Tensift SA', 'هيدرو تانسيفت',
   '007489012300451', '12034 Marrakech', 'SA',
   3000000.00, 'Marrakech', '2009-07-11',
   'low',
   NULL),

  -- [E] Fractionnement: wins 4 consecutive bons de commande under 1M MAD threshold
  ('c8000000-0000-0000-0000-000000000008',
   'Petits Travaux Express SARL', 'أشغال صغيرة سريعة',
   '008590123400562', '45098 Marrakech', 'SARL',
   50000.00, 'Marrakech', '2021-05-01',
   'medium',
   'Fractionnement présumé: 4 bons de commande consécutifs à la Commune de Marrakech, chacun entre 950 K et 990 K MAD (seuil AO ouvert = 1 M MAD).');


-- ── TENDERS ─────────────────────────────────────────────────

INSERT INTO tenders (id, ocid, reference_dossier, title, object_marche,
                     type, agency_id,
                     estimated_value_mad, awarded_value_mad, winning_company_id,
                     status, date_publication, date_ouverture_plis, date_attribution,
                     single_bidder, fractionnement_flag, fraud_score) VALUES

  -- [A][C] MEE — 3 contracts, BTP Maroc wins all, same 3 bidders every time
  ('d1000000-0000-0000-0000-000000000001',
   'ocds-MA-MEE-2023-001', 'MEE/DP/AO/2023/001',
   'Réhabilitation réseau routier RN1 — Lot 1',
   'Travaux de réhabilitation de la RN1, section Rabat-Kénitra, 45 km',
   'appel_offres_ouvert', 'a1000000-0000-0000-0000-000000000001',
   8500000.00, 8200000.00, 'c1000000-0000-0000-0000-000000000001',
   'attribue', '2023-03-10', '2023-04-05', '2023-04-20',
   FALSE, FALSE, 88),

  ('d2000000-0000-0000-0000-000000000002',
   'ocds-MA-MEE-2023-002', 'MEE/DP/AO/2023/002',
   'Construction pont sur Oued Bou Regreg',
   'Construction d''un pont à 2 voies sur l''Oued Bou Regreg, commune de Salé',
   'appel_offres_ouvert', 'a1000000-0000-0000-0000-000000000001',
   15000000.00, 14750000.00, 'c1000000-0000-0000-0000-000000000001',
   'attribue', '2023-07-01', '2023-08-10', '2023-08-28',
   FALSE, FALSE, 92),

  ('d3000000-0000-0000-0000-000000000003',
   'ocds-MA-MEE-2024-001', 'MEE/DP/AO/2024/001',
   'Aménagement voirie zone industrielle Aïn Sebaâ',
   'Travaux d''aménagement de voirie, zone industrielle Aïn Sebaâ, Casablanca',
   'appel_offres_ouvert', 'a1000000-0000-0000-0000-000000000001',
   6200000.00, 5900000.00, 'c1000000-0000-0000-0000-000000000001',
   'attribue', '2024-01-15', '2024-02-20', '2024-03-05',
   FALSE, FALSE, 85),

  -- [B] ONEE — Travaux Hydrauliques Fès (brother of ordonnateur) wins all 3
  ('d4000000-0000-0000-0000-000000000004',
   'ocds-MA-ONEE-2023-001', 'ONEE/DEA/AO/2023/001',
   'Extension réseau AEP — Douar Oulad Aïssa',
   'Extension AEP, Douar Oulad Aïssa, Province Béni Mellal, 8 km de canalisation DN200',
   'appel_offres_ouvert', 'a2000000-0000-0000-0000-000000000002',
   3200000.00, 3150000.00, 'c4000000-0000-0000-0000-000000000004',
   'attribue', '2023-05-20', '2023-06-25', '2023-07-10',
   FALSE, FALSE, 91),

  ('d5000000-0000-0000-0000-000000000005',
   'ocds-MA-ONEE-2023-002', 'ONEE/DEA/AO/2023/002',
   'Réhabilitation station de pompage SP3 — Fès',
   'Mise à niveau de la station de pompage SP3, Fès-Saïs — génie civil + équipements',
   'appel_offres_ouvert', 'a2000000-0000-0000-0000-000000000002',
   1800000.00, 1780000.00, 'c4000000-0000-0000-0000-000000000004',
   'attribue', '2023-09-10', '2023-10-15', '2023-11-01',
   TRUE,  -- single_bidder → maximum red flag
   FALSE, 94),

  ('d6000000-0000-0000-0000-000000000006',
   'ocds-MA-ONEE-2024-001', 'ONEE/DEA/MN/2024/001',
   'Fourniture et pose de compteurs télérelevés — Meknès',
   'Fourniture et installation de 5 000 compteurs eau télérelevés, région Meknès',
   'marche_negocie',        -- no open competition
   'a2000000-0000-0000-0000-000000000002',
   2500000.00, 2480000.00, 'c4000000-0000-0000-0000-000000000004',
   'attribue', '2024-02-01', '2024-02-28', '2024-03-15',
   FALSE, FALSE, 78),

  -- [E] Commune Marrakech — 4 bons de commande, each just under 1 M MAD threshold
  ('d7000000-0000-0000-0000-000000000007',
   'ocds-MA-CUM-2024-001', 'CUM/TP/BC/2024/001',
   'Entretien voirie Médina — Tranche 1',
   'Travaux d''entretien et réfection voirie Médina Marrakech, secteur nord',
   'bon_de_commande', 'a3000000-0000-0000-0000-000000000003',
   980000.00, 975000.00, 'c8000000-0000-0000-0000-000000000008',
   'attribue', '2024-01-08', '2024-01-20', '2024-01-25',
   TRUE, TRUE, 76),

  ('d8000000-0000-0000-0000-000000000008',
   'ocds-MA-CUM-2024-002', 'CUM/TP/BC/2024/002',
   'Entretien voirie Médina — Tranche 2',
   'Travaux d''entretien et réfection voirie Médina Marrakech, secteur sud',
   'bon_de_commande', 'a3000000-0000-0000-0000-000000000003',
   990000.00, 988000.00, 'c8000000-0000-0000-0000-000000000008',
   'attribue', '2024-02-05', '2024-02-15', '2024-02-20',
   TRUE, TRUE, 79),

  ('d9000000-0000-0000-0000-000000000009',
   'ocds-MA-CUM-2024-003', 'CUM/TP/BC/2024/003',
   'Entretien voirie Guéliz — Tranche 1',
   'Travaux d''entretien voirie Guéliz et Hivernage, Marrakech',
   'bon_de_commande', 'a3000000-0000-0000-0000-000000000003',
   950000.00, 947000.00, 'c8000000-0000-0000-0000-000000000008',
   'attribue', '2024-03-01', '2024-03-12', '2024-03-18',
   TRUE, TRUE, 74),

  ('da000000-0000-0000-0000-000000000010',
   'ocds-MA-CUM-2024-004', 'CUM/TP/BC/2024/004',
   'Entretien voirie Guéliz — Tranche 2',
   'Travaux d''entretien voirie Guéliz, phase 2, Marrakech',
   'bon_de_commande', 'a3000000-0000-0000-0000-000000000003',
   970000.00, 965000.00, 'c8000000-0000-0000-0000-000000000008',
   'attribue', '2024-04-10', '2024-04-22', '2024-04-28',
   TRUE, TRUE, 77),

  -- [D] Commune Rabat — Infrastructure Sud wins 2 months after Tazi joins
  ('db000000-0000-0000-0000-000000000011',
   'ocds-MA-CUR-2023-001', 'CUR/DEXP/AO/2023/001',
   'Réaménagement place Mohammed V — Rabat',
   'Travaux de réaménagement et embellissement de la place Mohammed V et ses abords, Rabat',
   'appel_offres_ouvert', 'a4000000-0000-0000-0000-000000000004',
   22000000.00, 21500000.00, 'c5000000-0000-0000-0000-000000000005',
   'attribue', '2023-04-15', '2023-05-30', '2023-06-20',
   FALSE, FALSE, 82),

  -- Clean ABHT tender (fraud_score = 12 — for visual contrast in the graph)
  ('dc000000-0000-0000-0000-000000000012',
   'ocds-MA-ABHT-2024-001', 'ABHT/AO/2024/001',
   'Étude hydrologique du bassin versant Tensift',
   'Mission d''étude et de modélisation hydrologique du bassin versant de l''Oued Tensift',
   'appel_offres_ouvert', 'a5000000-0000-0000-0000-000000000005',
   4500000.00, 4200000.00, 'c7000000-0000-0000-0000-000000000007',
   'attribue', '2024-01-20', '2024-03-01', '2024-03-20',
   FALSE, FALSE, 12);


-- ── EDGE: PUBLIC_LINKS (Person → Agency) ────────────────────

INSERT INTO public_links (person_id, agency_id, relation, since, until, is_active) VALUES

  ('b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'president_commission', '2019-03-01', NULL, TRUE),

  ('b2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001',
   'membre_commission', '2020-06-15', NULL, TRUE),

  ('b3000000-0000-0000-0000-000000000003',
   'a2000000-0000-0000-0000-000000000002',
   'ordonnateur', '2018-01-10', NULL, TRUE),

  ('b4000000-0000-0000-0000-000000000004',
   'a3000000-0000-0000-0000-000000000003',
   'ordonnateur', '2021-09-01', NULL, TRUE),

  -- Pantouflage: Tazi left Dec 2022 → is_active = FALSE
  ('b5000000-0000-0000-0000-000000000005',
   'a4000000-0000-0000-0000-000000000004',
   'directeur', '2015-04-01', '2022-12-31', FALSE);


-- ── EDGE: PROFESSIONAL_LINKS (Person → Company) ─────────────

INSERT INTO professional_links (person_id, company_id, relation, share_percentage, since, is_active) VALUES

  -- Omar El Hilali → BTP Maroc (100% owner, gérant)
  ('b6000000-0000-0000-0000-000000000006',
   'c1000000-0000-0000-0000-000000000001',
   'gerant', 100.00, '2014-05-20', TRUE),

  -- Youssef Benali → Travaux Hydrauliques Fès (70% shareholder)
  ('b7000000-0000-0000-0000-000000000007',
   'c4000000-0000-0000-0000-000000000004',
   'actionnaire_majoritaire', 70.00, '2017-08-22', TRUE),

  -- Samir Cherkaoui → Constructions Maghreb
  ('b8000000-0000-0000-0000-000000000008',
   'c2000000-0000-0000-0000-000000000002',
   'directeur_general', NULL, '2010-11-15', TRUE),

  -- Houda Naciri → Génie Civil Atlantique
  ('b9000000-0000-0000-0000-000000000009',
   'c3000000-0000-0000-0000-000000000003',
   'gerant', 100.00, '2016-03-08', TRUE),

  -- Nabil Benchekroun → Infrastructure Sud (majority shareholder)
  ('ba000000-0000-0000-0000-000000000010',
   'c5000000-0000-0000-0000-000000000005',
   'actionnaire_majoritaire', 85.00, '2013-01-30', TRUE),

  -- [D] Pantouflage: Tazi joins Infrastructure Sud as consultant 2 months after leaving Commune Rabat
  ('b5000000-0000-0000-0000-000000000005',
   'c5000000-0000-0000-0000-000000000005',
   'consultant', NULL, '2023-02-01', TRUE);


-- ── EDGE: FAMILY_LINKS (Person ↔ Person)  ★ CRITICAL ────────

INSERT INTO family_links (person_a_id, person_b_id, relation, verified, source) VALUES

  -- [A] Fatima Zahra El Hilali ↔ Omar El Hilali — married couple
  --     closes cycle: [commission présidente] → conjoint → [gérant BTP Maroc]
  ('b1000000-0000-0000-0000-000000000001',
   'b6000000-0000-0000-0000-000000000006',
   'conjoint', TRUE,
   'Acte de mariage — registre civil Casablanca, 2009'),

  -- [B] Mohammed Benali ↔ Youssef Benali — brothers
  --     closes cycle: [ordonnateur ONEE] → frère → [actionnaire THF]
  ('b3000000-0000-0000-0000-000000000003',
   'b7000000-0000-0000-0000-000000000007',
   'frere_soeur', TRUE,
   'Déclaration lanceur d''alerte — rapport anonyme RPT-2024-007'),

  -- [C] Rachid Amrani ↔ Samir Cherkaoui — brothers-in-law (unverified tip)
  --     secondary collusion signal: commission member ↔ decoy bidder's DG
  ('b2000000-0000-0000-0000-000000000002',
   'b8000000-0000-0000-0000-000000000008',
   'beau_frere_belle_soeur', FALSE,
   'Tip anonyme non vérifié — à confirmer par enquête INPPLC');


-- ── EDGE: ALLOCATIONS (Agency → Tender → Winning Company) ───

INSERT INTO allocations (agency_id, tender_id, winning_company_id, award_amount_mad, award_date) VALUES

  ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 8200000.00,  '2023-04-20'),
  ('a1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 14750000.00, '2023-08-28'),
  ('a1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 5900000.00,  '2024-03-05'),

  ('a2000000-0000-0000-0000-000000000002', 'd4000000-0000-0000-0000-000000000004', 'c4000000-0000-0000-0000-000000000004', 3150000.00,  '2023-07-10'),
  ('a2000000-0000-0000-0000-000000000002', 'd5000000-0000-0000-0000-000000000005', 'c4000000-0000-0000-0000-000000000004', 1780000.00,  '2023-11-01'),
  ('a2000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000006', 'c4000000-0000-0000-0000-000000000004', 2480000.00,  '2024-03-15'),

  ('a3000000-0000-0000-0000-000000000003', 'd7000000-0000-0000-0000-000000000007', 'c8000000-0000-0000-0000-000000000008', 975000.00,   '2024-01-25'),
  ('a3000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000008', 'c8000000-0000-0000-0000-000000000008', 988000.00,   '2024-02-20'),
  ('a3000000-0000-0000-0000-000000000003', 'd9000000-0000-0000-0000-000000000009', 'c8000000-0000-0000-0000-000000000008', 947000.00,   '2024-03-18'),
  ('a3000000-0000-0000-0000-000000000003', 'da000000-0000-0000-0000-000000000010', 'c8000000-0000-0000-0000-000000000008', 965000.00,   '2024-04-28'),

  ('a4000000-0000-0000-0000-000000000004', 'db000000-0000-0000-0000-000000000011', 'c5000000-0000-0000-0000-000000000005', 21500000.00, '2023-06-20'),

  ('a5000000-0000-0000-0000-000000000005', 'dc000000-0000-0000-0000-000000000012', 'c7000000-0000-0000-0000-000000000007', 4200000.00,  '2024-03-20');


-- ── EDGE: BID_PARTICIPATIONS (all bidders, including losers) ─

INSERT INTO bid_participations (company_id, tender_id, bid_amount_mad, rank, is_winner) VALUES

  -- [A][C] MEE t1: same trio — BTP Maroc wins, Maghreb 2nd, GCA 3rd
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',  8200000.00, 1, TRUE),
  ('c2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001',  9100000.00, 2, FALSE),
  ('c3000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001',  9450000.00, 3, FALSE),

  -- MEE t2: same trio, pattern repeats
  ('c1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 14750000.00, 1, TRUE),
  ('c2000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 15800000.00, 2, FALSE),
  ('c3000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000002', 16200000.00, 3, FALSE),

  -- MEE t3: same trio, 3rd time
  ('c1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000003',  5900000.00, 1, TRUE),
  ('c2000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000003',  6400000.00, 2, FALSE),
  ('c3000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000003',  6750000.00, 3, FALSE),

  -- [B] ONEE t4: THF wins, one legitimate competitor
  ('c4000000-0000-0000-0000-000000000004', 'd4000000-0000-0000-0000-000000000004',  3150000.00, 1, TRUE),
  ('c6000000-0000-0000-0000-000000000006', 'd4000000-0000-0000-0000-000000000004',  3420000.00, 2, FALSE),

  -- ONEE t5: SINGLE BIDDER — red flag (single_bidder = TRUE on tender)
  ('c4000000-0000-0000-0000-000000000004', 'd5000000-0000-0000-0000-000000000005',  1780000.00, 1, TRUE),

  -- ONEE t6: marché négocié — no competition by design
  ('c4000000-0000-0000-0000-000000000004', 'd6000000-0000-0000-0000-000000000006',  2480000.00, 1, TRUE),

  -- [E] Commune Marrakech t7-t10: always single bidder (fractionnement)
  ('c8000000-0000-0000-0000-000000000008', 'd7000000-0000-0000-0000-000000000007',   975000.00, 1, TRUE),
  ('c8000000-0000-0000-0000-000000000008', 'd8000000-0000-0000-0000-000000000008',   988000.00, 1, TRUE),
  ('c8000000-0000-0000-0000-000000000008', 'd9000000-0000-0000-0000-000000000009',   947000.00, 1, TRUE),
  ('c8000000-0000-0000-0000-000000000008', 'da000000-0000-0000-0000-000000000010',   965000.00, 1, TRUE),

  -- [D] Commune Rabat tb: Infrastructure Sud wins; two legitimate competitors
  ('c5000000-0000-0000-0000-000000000005', 'db000000-0000-0000-0000-000000000011', 21500000.00, 1, TRUE),
  ('c2000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000011', 23000000.00, 2, FALSE),
  ('c7000000-0000-0000-0000-000000000007', 'db000000-0000-0000-0000-000000000011', 24500000.00, 3, FALSE),

  -- Clean ABHT tc: Hydro Tensift wins fair competition
  ('c7000000-0000-0000-0000-000000000007', 'dc000000-0000-0000-0000-000000000012',  4200000.00, 1, TRUE),
  ('c6000000-0000-0000-0000-000000000006', 'dc000000-0000-0000-0000-000000000012',  4600000.00, 2, FALSE),
  ('c3000000-0000-0000-0000-000000000003', 'dc000000-0000-0000-0000-000000000012',  4900000.00, 3, FALSE);
