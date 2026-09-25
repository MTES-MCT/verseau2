# language: fr
@smoke
Fonctionnalité: Accès à l'application
  Scénario: Une page protégée demande une session
    Quand je visite le tableau de bord sans session
    Alors je suis redirigé vers l'accueil

  Scénario: Un déposant autorisé ouvre son tableau de bord
    Étant donné que je suis connecté comme déposant autorisé
    Quand je visite le tableau de bord
    Alors je vois le tableau de bord

  Scénario: La connexion de développement établit une session navigateur
    Quand je simule la connexion OIDC de développement
    Alors je vois le tableau de bord
