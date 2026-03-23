## Data mapping v1 cible pour le contrat MASA
codeOuvrageDepollution, steu_sandre_cda, Code Sandre identifiant la station de traitement des eaux usees (STEU)
codeParametreAnalyse, par_rfa, Code Sandre du parametre physico-chimique mesure
concentrationMoyenneAnnuelle, resa_cma_val, Concentration moyenne annuelle calculee pour un parametre et une STEU
debitMaximalReference, max(stchan_pc95_val; cpy_ref_debit_mt), Debit maximal de reference calcule comme le max entre le percentile 95 et le debit de reference
chargeEntranteMaximaleAnneeN, stchan_r_eh_max_chg_val (annee N), Charge entrante maximale en equivalent-habitants pour l'annee courante
chargeEntranteMaximaleAnneeNMoins1, stchan_r_eh_max_chg_val (annee N-1), Charge entrante maximale en equivalent-habitants pour l'annee precedente
libelleTranchObligation, tltobl_lb, Libelle de la tranche de taille d'agglomeration (obligation reglementaire)
anneeReferenceBilan, stchan_an, Annee de reference des charges annuelles du bilan
identifiantInterneOuvrageDepollution, steu_cdn, Identifiant technique interne de la STEU dans Roseau
nomOuvrageDepollution, steu_nom_lb, Denomination de la station de traitement des eaux usees
codeSystemeCollecte, scl_sandre_cda, Code Sandre identifiant le systeme de collecte des eaux usees (SCL)
nomSystemeCollecte, scl_lb, Denomination du systeme de collecte
siretIntervenant, itv_rfa, Numero SIRET de l'organisme intervenant
identifiantInterneIntervenant, itv_cdn, Identifiant technique interne de l'intervenant dans Lanceleau
identifiantInternePrincipal, pr_cdn, Identifiant technique interne du principal (agent authentifie) dans Lanceleau
nomIntervenant, itv_nom_lb, Raison sociale ou nom de l'organisme intervenant
codeOuvrageDepollutionVue, steu_cda, Code de la STEU dans la vue de droits v_steu_scl_itv
codeSystemeCollecteVue, scl_cda, Code du systeme de collecte dans la vue de droits v_steu_scl_itv
siretMaitreOuvrage, mo_itv_rfa, Numero SIRET du maitre d'ouvrage de la STEU
siretPrestataireAutosurveillance, sat_itv_rfa, Numero SIRET du prestataire du service d'assistance technique a l'autosurveillance
siretAgenceEau, ae_itv_rfa, Numero SIRET de l'agence de l'eau competente
identifiantInternePointMesure, pmo_cdn, Identifiant technique interne du point de mesure dans Roseau
numeroPointMesure, pmo_no, Numero du point de mesure au sein de l'ouvrage
libellePointMesure, pmo_lb, Denomination du point de mesure
nomCourtParametre, par_court_nom_lb, Nom abrege du parametre physico-chimique
codeElementNomenclature, tlref_elt_cda, Code de l'element dans la table de reference (nomenclature Roseau)
libelleElementNomenclature, tlref_mnemo_lb, Libelle mnemonique de l'element dans la table de reference
codeLocalisationPointMesure, tlref_elt_cda (LREF_16), Code de localisation du point de mesure (ex: A2 a A8)
numeroPointAgenceEau, pmo_ae_cda, Numero du point de mesure attribue par l'agence de l'eau
datePrelevement, ple_prelev_dt, Date a laquelle le prelevement d'effluent a ete realise
valeurResultatAnalyse, alr_res_val, Valeur numerique du resultat de l'analyse physico-chimique
symboleUniteMesure, urf_symb_lb, Symbole de l'unite de mesure du resultat (ex: mg/L)
finaliteAnalyse, tlref_mnemo_lb (LREF_17), Finalite de l'analyse (autosurveillance, police, etc.)
statutResultatAnalyse, tlref_elt_cda || tlref_mnemo_lb (LREF_20), Statut de validation du resultat d'analyse
qualificationResultatAnalyse, tlref_mnemo_lb (LREF_18), Qualification de la donnee d'analyse (correcte, incertaine, etc.)
