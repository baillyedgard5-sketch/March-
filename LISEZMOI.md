# Marché : mise en route

1. Crée un compte gratuit sur supabase.com et un nouveau projet.
2. Authentication > Sign In / Providers > Email : **désactive "Allow new users to sign up"**.
3. Authentication > Users > Add user : crée ton compte vendeur (email + mot de passe solide), coche "Auto Confirm User".
4. Dans `setup.sql`, remplace `TON_EMAIL@exemple.com` par cet email (partout), puis colle le tout dans SQL Editor > Run.
5. Project Settings > API : copie "Project URL" et la clé "anon public" dans `config.js`.
6. Héberge le dossier en HTTPS (Netlify, GitHub Pages ou Vercel). **HTTPS est obligatoire** pour le partage de position et l'installation comme application.
7. Sur le site : onglet **Vendeur** > connexion > Réglages (ton WhatsApp) > Produits (ajoute avec photo). Les commandes arrivent dans l'onglet **Commandes**, avec le bouton pour ouvrir la position du client.

Sécurité : la clé "anon" est publique par conception. Ce sont les règles de `setup.sql` qui protègent tes commandes et empêchent toute modification par un autre compte.
À chaque mise à jour des fichiers, change le numéro dans `CACHE_NAME` (sw.js).
