# language: fr
@smoke
Fonctionnalité: Dépôt d'un fichier d'autosurveillance
  Scénario: Consulter les résultats après le traitement d'un dépôt
    Étant donné que je suis connecté comme déposant autorisé
    Quand je dépose un fichier d'autosurveillance valide
    Alors le dépôt apparaît dans mon tableau de bord
    Et son traitement par le worker est terminé
    Et ses résultats de contrôle sont consultables

  Scénario: MASA confirme l'intégration d'un dépôt
    Étant donné que je suis connecté comme déposant autorisé
    Quand je dépose un fichier d'autosurveillance valide
    Et son traitement par le worker est terminé
    Et MASA confirme l'intégration du dépôt
    Alors le retour MASA est traité par le worker
    Et le dépôt est affiché comme intégré dans mon tableau de bord
    Et le résultat d'intégration MASA est consultable

  Scénario: MASA rejette un dépôt
    Étant donné que je suis connecté comme déposant autorisé
    Quand je dépose un fichier d'autosurveillance valide
    Et son traitement par le worker est terminé
    Et MASA rejette le dépôt
    Alors le retour MASA est traité par le worker
    Et le dépôt est affiché comme rejeté dans mon tableau de bord
    Et le motif de rejet MASA est consultable

  Scénario: Consulter une erreur de contrôle d'un fichier déposé
    Étant donné que je suis connecté comme déposant autorisé
    Quand je dépose un fichier d'autosurveillance avec un type d'ouvrage inconnu
    Alors son traitement par le worker est terminé
    Et je consulte l'erreur du fichier sur la page des contrôles

  Scénario: Un déposant sans droits sur un ouvrage du fichier ne peut pas déposer le XML
    Étant donné que je suis connecté comme déposant autorisé
    Quand je sélectionne un fichier d'autosurveillance pour un ouvrage non autorisé
    Alors mes droits de dépôt sur ce fichier sont refusés
    Et je ne peux pas finaliser le dépôt
