# Contraintes UI Coach Beurt

## Priorité

Coach Beurt est utilisé en entraînement réel. La priorité est :

1. lisibilité;
2. rapidité d’action;
3. stabilité iPhone/PWA;
4. absence de débordement horizontal.

## Mobile

- WOD+ et Séance restent mobile-first.
- Les vues doivent rester lisibles autour de 402 px CSS de largeur.
- Les actions critiques doivent être faciles à toucher avec le pouce.
- Ne pas dépendre d’une hauteur fixe.
- Respecter les safe areas iOS.
- Garder le zoom natif accessible; ne pas bloquer l’accessibilité pour masquer un problème UI.

## Séance guidée

- Timer visible.
- Start/Pause/Reset faciles à toucher.
- Poids/Reps/RPE utilisables fatigué.
- Éviter les petits contrôles précis.
- Les contrôles Reps/RPE compacts `− valeur +` doivent rester sur une ligne autant que possible.

## Résultats

- Résultats reste séparé de PC.
- Retour WOD visible.
- Sauvegarde claire.

## PC

PC sert à inspecter, comprendre et exporter. Il ne doit pas devenir un Builder et ne doit pas modifier directement les programmes.
