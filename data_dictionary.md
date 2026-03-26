codeOuvrageDepollution, steu_sandre_cda, Code Sandre identifiant la station de traitement des eaux usees (STEU)
identifiantOuvrageDepollution, steu_cdn, Identifiant technique interne de la STEU dans Roseau
nomOuvrageDepollution, steu_nom_lb, Denomination de la station de traitement des eaux usees
codeSystemeCollecte, scl_sandre_cda, Code Sandre identifiant le systeme de collecte des eaux usees (SCL)
nomSystemeCollecte, scl_lb, Denomination du systeme de collecte
identifiantIntervenant, itv_cdn, Identifiant technique interne de l'intervenant dans Lanceleau
siretIntervenant, itv_rfa, Numero SIRET de l'organisme intervenant
nomIntervenant, itv_nom_lb, Raison sociale ou nom de l'organisme intervenant
identifiantPrincipal, pr_cdn, Identifiant technique interne du principal (agent authentifie) dans Lanceleau
identifiantRoleOrion, role_cdn, Identifiant technique du role Orion attribue au principal (t_orion_role_for_principal)
emailAuthentification, mail, Adresse email de l'utilisateur pour l'authentification (t_orion_credentials)
codeOuvrageDepollutionVueDroits, steu_cda, Code de la STEU dans la vue de droits v_steu_scl_itv
codeSystemeCollecteVueDroits, scl_cda, Code du systeme de collecte dans la vue de droits v_steu_scl_itv
siretMaitreOuvrage, mo_itv_rfa, Numero SIRET du maitre d'ouvrage de la STEU (vue v_steu_scl_itv)
siretPrestataireAutosurveillance, sat_itv_rfa, Numero SIRET du prestataire du service d'assistance technique a l'autosurveillance (vue v_steu_scl_itv)
siretAgenceEau, ae_itv_rfa, Numero SIRET de l'agence de l'eau competente (vue v_steu_scl_itv)
identifiantPointMesure, pmo_cdn, Identifiant technique interne du point de mesure dans Roseau
numeroPointMesure, pmo_no, Numero du point de mesure au sein de l'ouvrage
libellePointMesure, pmo_lb, Denomination du point de mesure
numeroPointAgenceEau, pmo_ae_cda, Numero du point de mesure attribue par l'agence de l'eau
dateDebutValiditePointMesure, pmo_val_deb_dt, Date de debut de validite du point de mesure
dateFinValiditePointMesure, pmo_val_fin_dt, Date de fin de validite du point de mesure
codeParametreAnalyse, par_rfa, Code Sandre du parametre physico-chimique mesure
nomCourtParametre, par_court_nom_lb, Nom abrege du parametre physico-chimique
codeElementNomenclature, tlref_elt_cda, Code de l'element dans la table de reference (nomenclature Roseau)
libelleElementNomenclature, tlref_mnemo_lb, Libelle mnemonique de l'element dans la table de reference
codeLocalisationPointMesure, tlref_elt_cda (LREF_16), Code de localisation du point de mesure (ex: A2 a A8)
libelleLocalisationPointMesure, tlref_mnemo_lb (LREF_16), Libelle de la localisation du point de mesure
categoriePointMesureScl, tlref_mnemo_lb (LREF_24), Categorie du point de mesure pour les systemes de collecte (via orm.tlref_24_cdn)
concentrationMoyenneAnnuelle, resa_cma_val, Concentration moyenne annuelle calculee pour un parametre et une STEU
capaciteNominaleEquivalentHabitants, cpy_eh_trait_nom_cap_mt, Capacite nominale de traitement de la STEU en equivalent-habitants
debitMaximalReference, max(stchan_pc95_val; cpy_ref_debit_mt), Debit maximal de reference calcule comme le max entre le percentile 95 et le debit de reference
chargeEntranteMaximaleAnneeN, stchan_r_eh_max_chg_val (annee N), Charge entrante maximale en equivalent-habitants pour l'annee courante
chargeEntranteMaximaleAnneeNMoins1, stchan_r_eh_max_chg_val (annee N-1), Charge entrante maximale en equivalent-habitants pour l'annee precedente
libelleTrancheObligation, tltobl_lb, Libelle de la tranche de taille d'agglomeration (obligation reglementaire)
anneeReferenceBilan, stchan_an, Annee de reference des charges annuelles du bilan
productionBoueAnnuelle, pab_an_reac_hors_prod_r_val, Production annuelle de boue hors reactifs (table pab)
anneeProductionBoue, pab_an, Annee de reference de la production de boue
datePrelevement, ple_prelev_dt, Date a laquelle le prelevement d'effluent a ete realise
valeurResultatAnalyse, alr_res_val, Valeur numerique du resultat de l'analyse physico-chimique
symboleUniteMesure, urf_symb_lb, Symbole de l'unite de mesure du resultat (ex: mg/L)
finaliteAnalyse, tlref_mnemo_lb (LREF_17), Finalite de l'analyse (autosurveillance, police, etc.)
statutResultatAnalyse, tlref_elt_cda || tlref_mnemo_lb (LREF_20), Statut de validation du resultat d'analyse
qualificationResultatAnalyse, tlref_mnemo_lb (LREF_18), Qualification de la donnee d'analyse (correcte, incertaine, etc.)