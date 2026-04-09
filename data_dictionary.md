ouvrageDepollutionCode, steu_sandre_cda, Code Sandre identifiant la station de traitement des eaux usees (STEU)
ouvrageDepollutionId, steu_cdn, Identifiant technique interne de la STEU dans Roseau
ouvrageDepollutionNom, steu_nom_lb, Denomination de la station de traitement des eaux usees
systemeCollecteId, scl_cdn, Identifiant technique interne du systeme de collecte dans Roseau
systemeCollecteCode, scl_sandre_cda, Code Sandre identifiant le systeme de collecte des eaux usees (SCL)
systemeCollecteNom, scl_lb, Denomination du systeme de collecte
intervenantId, itv_cdn, Identifiant technique interne de l'intervenant dans Lanceleau
intervenantSiret, itv_rfa, Numero SIRET de l'organisme intervenant
intervenantNom, itv_nom_lb, Raison sociale ou nom de l'organisme intervenant
principalIdentifiant, pr_cdn, Identifiant technique interne du principal (agent authentifie) dans Lanceleau
roleOrionId, role_cdn, Identifiant technique du role Orion attribue au principal (t_orion_role_for_principal)
authentificationEmail, mail, Adresse email de l'utilisateur pour l'authentification (t_orion_credentials)
ouvrageDepollutionCode, steu_cda, Code de la STEU dans la vue de droits v_steu_scl_itv
systemeCollecteCode, scl_cda, Code du systeme de collecte dans la vue de droits v_steu_scl_itv
maitreOuvrageSiret, mo_itv_rfa, Numero SIRET du maitre d'ouvrage de la STEU (vue v_steu_scl_itv)
prestataireAutosurveillanceSiret, sat_itv_rfa, Numero SIRET du prestataire du service d'assistance technique a l'autosurveillance (vue v_steu_scl_itv)
agenceEauSiret, ae_itv_rfa, Numero SIRET de l'agence de l'eau competente (vue v_steu_scl_itv)
pointMesureId, pmo_cdn, Identifiant technique interne du point de mesure dans Roseau
pointMesureNumero, pmo_no, Numero du point de mesure au sein de l'ouvrage
pointMesureLibelle, pmo_lb, Denomination du point de mesure
pointAgenceEauNumero, pmo_ae_cda, Numero du point de mesure attribue par l'agence de l'eau
pointMesureValiditeDebutDate, pmo_val_deb_dt, Date de debut de validite du point de mesure
pointMesureValiditeFinDate, pmo_val_fin_dt, Date de fin de validite du point de mesure
parametreAnalyseCode, par_rfa, Code Sandre du parametre physico-chimique mesure
parametreNomCourt, par_court_nom_lb, Nom abrege du parametre physico-chimique
elementNomenclatureCode, tlref_elt_cda, Code de l'element dans la table de reference (nomenclature Roseau)
elementNomenclatureLibelle, tlref_mnemo_lb, Libelle mnemonique de l'element dans la table de reference
pointMesureLocalisationCode, tlref_elt_cda (LREF_16), Code de localisation du point de mesure (ex: A2 a A8)
pointMesureLocalisationLibelle, tlref_mnemo_lb (LREF_16), Libelle de la localisation du point de mesure
pointMesureCategorieSystemeCollecte, tlref_mnemo_lb (LREF_24), Categorie du point de mesure pour les systemes de collecte (via orm.tlref_24_cdn)
resultatAnnuelConcentrationMoyenne, resa_cma_val, Concentration moyenne annuelle calculee pour un parametre et une STEU
ouvrageDepollutionCapaciteNominaleEH, cpy_eh_trait_nom_cap_mt, Capacite nominale de traitement de la STEU en equivalent-habitants
ouvrageDepollutionDebitMaximalReference, max(stchan_pc95_val; cpy_ref_debit_mt), Debit maximal de reference calcule comme le max entre le percentile 95 et le debit de reference
chargeEntranteMaximaleEHN, stchan_r_eh_max_chg_val (annee N), Charge entrante maximale en equivalent-habitants pour l'annee courante
chargeEntranteMaximaleEHNMoins1, stchan_r_eh_max_chg_val (annee N-1), Charge entrante maximale en equivalent-habitants pour l'annee precedente
trancheObligationLibelle, tltobl_lb, Libelle de la tranche de taille d'agglomeration (obligation reglementaire)
capaciteNominaleEH, cpy_eh_trait_nom_cap_mt, Capacite nominale de traitement de la STEU en equivalent-habitants dans le tableau conformite
suiviDebutDate, steureg_suiv_deb_dt / sclreg_suiv_deb_dt, Date de debut de la periode de suivi du bilan conformite
suiviFinDate, steureg_suiv_fin_dt / sclreg_suiv_fin_dt, Date de fin de la periode de suivi du bilan conformite
conformiteNationaleProvisoire, cfprf_r_glob_perf_eru_conf_in, Conformite nationale provisoire en performance ERU de la STEU
conformiteLocaleProvisoire, cfprf_r_glob_perf_loc_conf_in, Conformite locale provisoire en performance de la STEU
impactConformite, computed (cfprf/steureg ou bilanscl/sclreg), Indique si les conformites provisoires different du suivi regulier
suiviRegulierEffectue, steureg_suivi_reg_on / sclreg_suivi_reg_on, Indique si un suivi regulier a ete effectue
suiviRegulierDate, steureg_suivi_reg_dt / sclreg_suivi_reg_dt, Date du dernier suivi regulier effectue
typeScl, tlref_mnemo_lb (LREF_05), Type du systeme de collecte
conformiteLocaleTempsPluieProvisoire, bilanscl_conf_tp_eru_in, Conformite locale provisoire du systeme de collecte en temps de pluie
conformiteNationaleTempsPluieProvisoire, bilanscl_conf_nat_tp_eru_in, Conformite nationale provisoire du systeme de collecte en temps de pluie
conformiteLocaleParametresConformesPeriodeNb, steureg_conf_loc_per_nb, Nombre de parametres conformes sur la periode (local)
conformiteLocaleParametresConformesAnneeNb, steureg_conf_loc_an_nb, Nombre de parametres conformes sur l'annee (local)
conformiteLocaleParametresNonConformesPeriodeNb, steureg_non_conf_loc_per_nb, Nombre de parametres non conformes sur la periode (local)
conformiteLocaleParametresNonConformesAnneeNb, steureg_non_conf_loc_an_nb, Nombre de parametres non conformes sur l'annee (local)
conformiteLocaleRedhibitoiresPeriodeNb, steureg_redh_loc_per_nb, Nombre de parametres redhibitoires sur la periode (local)
conformiteLocaleRedhibitoiresAnneeNb, steureg_redh_loc_an_nb, Nombre de parametres redhibitoires sur l'annee (local)
conformiteLocaleParametresConformesPeriodeLb, steureg_conf_loc_per_lb, Libelle des parametres conformes sur la periode (local)
conformiteLocaleParametresConformesAnneeLb, steureg_conf_loc_an_lb, Libelle des parametres conformes sur l'annee (local)
conformiteLocaleParametresNonConformesPeriodeLb, steureg_non_conf_loc_per_lb, Libelle des parametres non conformes sur la periode (local)
conformiteLocaleParametresNonConformesAnneeLb, steureg_non_conf_loc_an_lb, Libelle des parametres non conformes sur l'annee (local)
conformiteLocaleRedhibitoiresPeriodeLb, steureg_redh_loc_per_lb, Libelle des parametres redhibitoires sur la periode (local)
conformiteLocaleRedhibitoiresAnneeLb, steureg_redh_loc_an_lb, Libelle des parametres redhibitoires sur l'annee (local)
conformiteNationaleParametresConformesPeriodeNb, steureg_conf_nat_per_nb, Nombre de parametres conformes sur la periode (national)
conformiteNationaleParametresConformesAnneeNb, steureg_conf_nat_an_nb, Nombre de parametres conformes sur l'annee (national)
conformiteNationaleParametresNonConformesPeriodeNb, steureg_non_conf_nat_per_nb, Nombre de parametres non conformes sur la periode (national)
conformiteNationaleParametresNonConformesAnneeNb, steureg_non_conf_nat_an_nb, Nombre de parametres non conformes sur l'annee (national)
conformiteNationaleRedhibitoiresPeriodeNb, steureg_redh_nat_per_nb, Nombre de parametres redhibitoires sur la periode (national)
conformiteNationaleRedhibitoiresAnneeNb, steureg_redh_nat_an_nb, Nombre de parametres redhibitoires sur l'annee (national)
conformiteNationaleParametresConformesPeriodeLb, steureg_conf_nat_per_lb, Libelle des parametres conformes sur la periode (national)
conformiteNationaleParametresConformesAnneeLb, steureg_conf_nat_an_lb, Libelle des parametres conformes sur l'annee (national)
conformiteNationaleParametresNonConformesPeriodeLb, steureg_non_conf_nat_per_lb, Libelle des parametres non conformes sur la periode (national)
conformiteNationaleParametresNonConformesAnneeLb, steureg_non_conf_nat_an_lb, Libelle des parametres non conformes sur l'annee (national)
conformiteNationaleRedhibitoiresPeriodeLb, steureg_redh_nat_per_lb, Libelle des parametres redhibitoires sur la periode (national)
conformiteNationaleRedhibitoiresAnneeLb, steureg_redh_nat_an_lb, Libelle des parametres redhibitoires sur l'annee (national)
hcnfPeriodeNb, steureg_hcnf_per_nb, Nombre de HCNF sur la periode
hcnfAnneeNb, steureg_hcnf_an_nb, Nombre de HCNF sur l'annee
hctsPeriodeNb, steureg_hcts_per_nb, Nombre de HCTS sur la periode
hctsAnneeNb, steureg_hcts_an_nb, Nombre de HCTS sur l'annee
hcnfPeriodeLb, steureg_hcnf_per_lb, Libelle HCNF sur la periode
hcnfAnneeLb, steureg_hcnf_an_lb, Libelle HCNF sur l'annee
hctsPeriodeLb, steureg_hcts_per_lb, Libelle HCTS sur la periode
hctsAnneeLb, steureg_hcts_an_lb, Libelle HCTS sur l'annee
evenementsPeriodeNb, steureg_evt_per_nb, Nombre d'evenements sur la periode
evenementsAnneeNb, steureg_evt_an_nb, Nombre d'evenements sur l'annee
volumeDeversePeriodePc, sclreg_per_vol_dev_pc, Pourcentage du volume deverse sur la periode
volumeDeverseAnneePc, sclreg_an_vol_dev_pc, Pourcentage du volume deverse sur l'annee
conformiteVolumePeriode, sclreg_per_conf_vol_dev_in, Conformite du volume deverse sur la periode
conformiteVolumeAnnee, sclreg_an_conf_vol_dev_in, Conformite du volume deverse sur l'annee
fluxDeversePeriodePc, sclreg_per_flux_dev_pc, Pourcentage du flux deverse sur la periode
fluxDeverseAnneePc, sclreg_an_flux_dev_pc, Pourcentage du flux deverse sur l'annee
conformiteFluxPeriode, sclreg_per_conf_flux_dev_in, Conformite du flux deverse sur la periode
conformiteFluxAnnee, sclreg_an_conf_flux_dev_in, Conformite du flux deverse sur l'annee
joursDeversementPeriodeNb, sclreg_per_jour_dev_nb, Nombre de jours deversement sur la periode
joursDeversementAnneeNb, sclreg_an_jour_dev_nb, Nombre de jours deversement sur l'annee
conformiteJoursDeversementPeriode, sclreg_per_conf_jour_dev_in, Conformite du nombre de jours deversement sur la periode
conformiteJoursDeversementAnnee, sclreg_an_conf_jour_dev_in, Conformite du nombre de jours deversement sur l'annee
bilanReferenceAnnee, stchan_an, Annee de reference des charges annuelles du bilan
boueProductionAnnuelle, pab_an_reac_hors_prod_r_val, Production annuelle de boue hors reactifs (table pab)
boueProductionAnnee, pab_an, Annee de reference de la production de boue
prelevementDate, ple_prelev_dt, Date a laquelle le prelevement d'effluent a ete realise
resultatAnalyseValeur, alr_res_val, Valeur numerique du resultat de l'analyse physico-chimique
uniteMesureSymbole, urf_symb_lb, Symbole de l'unite de mesure du resultat (ex: mg/L)
analyseFinalite, tlref_mnemo_lb (LREF_17), Finalite de l'analyse (autosurveillance, police, etc.)
resultatAnalyseStatut, tlref_elt_cda || tlref_mnemo_lb (LREF_20), Statut de validation du resultat d'analyse
resultatAnalyseQualification, tlref_mnemo_lb (LREF_18), Qualification de la donnee d'analyse (correcte, incertaine, etc.)
exploitantNom, itv_mnemo_lb, Nom ou raison sociale de l'exploitant associe au retard de transmission AS
exploitantEmail, adr_mail_lb, Adresse email de l'exploitant associe au retard de transmission AS
exploitantDateEnvoiMail, steureg_mail_expl_dt / sclreg_mail_expl_dt, Date d'envoi du mail a l'exploitant pour le suivi regulier
