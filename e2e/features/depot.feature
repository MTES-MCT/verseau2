# language: fr
@smoke
Fonctionnalité: Dépôt d'un fichier d'autosurveillance
  Scénario: Consulter les résultats après le traitement d'un dépôt
    Étant donné que je suis connecté comme déposant autorisé
    Quand je dépose un fichier d'autosurveillance valide
    Alors le dépôt apparaît dans mon tableau de bord
    Et son traitement par le worker est terminé
    Et ses résultats de contrôle sont consultables
