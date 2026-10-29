# SAM Guinée — Site Officiel (Édition 2027)

Site web officiel du **Salon Auto et Mobilité de Guinée (SAM Guinée)**, prévu du **19 au 28 mars 2027** à Conakry (Palais du Peuple & esplanade du Stade Général Lansana Conté).  
*« La Guinée roule vers l'avenir. »*

---

## 🛠 Stack Technique
- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend / BDD** : Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Architecture** : Aliases de chemins `@/*`, séparation stricte code client / logique métier serveur (fonctions & triggers PostgreSQL).

---

## 🚀 Démarrage Rapide

### 1. Prérequis
- Node.js (v20+) et npm
- Supabase CLI (`npx supabase`)
- Docker Desktop (si exécution de Supabase en local)

### 2. Installation
```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
```

### 3. Démarrage de Supabase en local
```bash
# Démarrer l'instance locale Supabase (requiert Docker)
npx supabase start

# Appliquer les migrations locales
npx supabase migration up

# Charger les données initiales (seed)
npx supabase db reset
```

### 4. Lancer le frontend en développement
```bash
npm run dev
```

### 5. Vérifications et build
```bash
npm run build
npm run lint
```

---

## 🔐 Administration & Rôles
Les rôles applicatifs (`admin`, `staff`, `exhibitor`, `sponsor`, `user`) sont gérés dans la table `user_roles` avec la fonction `has_role(uid, role)` en `SECURITY DEFINER`.

### 1. Création manuelle du premier administrateur (SQL)
L'auto-promotion est strictement impossible par RLS. Pour attribuer le rôle `admin` au premier compte après son inscription dans Supabase Auth :

1. Inscrivez-vous sur le site via la page `/inscription` avec votre adresse e-mail.
2. Ouvrez le **SQL Editor** de votre projet Supabase (en local ou distant).
3. Exécutez la requête suivante en remplaçant par votre adresse e-mail :

```sql
-- Remplacer par l'email de l'administrateur inscrit
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@sam-guinee.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

> **Note :** Les rôles `admin` et `staff` nécessitent obligatoirement l'activation de l'authentification à deux facteurs (TOTP) sur la page `/securite` pour atteindre le niveau d'assurance `aal2` avant d'accéder aux routes protégées (`/admin` et `/staff/scan`).

---

## ⚙️ Configuration Supabase Auth & Emails

### 1. URLs de redirection (URL Configuration)
Dans le tableau de bord Supabase (**Authentication > URL Configuration**) :
- **Site URL** : `http://localhost:5173` (en local) ou l'URL de production (`https://...`).
- **Redirect URLs (Allow list)** :
  - `http://localhost:5173/connexion` (redirection après confirmation de l'e-mail d'inscription)
  - `http://localhost:5173/reinitialiser-mot-de-passe` (redirection avec token de récupération de mot de passe)
  - `http://localhost:5173/**` (wildcard pour les environnements de développement)
  - *(Ajouter les équivalents en URL de production avec votre nom de domaine)*

### 2. Configuration SMTP (Serveur d'e-mails)
Par défaut, Supabase applique une limite stricte d'envoi d'e-mails (3 à 4 e-mails par heure). Pour la production et les tests complets, configurez un fournisseur SMTP personnalisé dans **Project Settings > Authentication > Email Settings** :
- **Enable Custom SMTP** : activé
- **Sender email** : `samdeguinee@gmail.com` (ou adresse du domaine officiel)
- **Sender name** : `SAM Guinée 2027`
- **Host** : serveur SMTP (ex. `smtp.resend.com`, `smtp.sendgrid.net`, `smtp.mailgun.org`)
- **Port** : `587` (TLS) ou `465` (SSL)
- **Username / Password** : clés API ou identifiants de votre fournisseur SMTP
- **Templates d'emails** :
  - *Confirm signup* : pointer le lien vers `{{ .SiteURL }}/connexion`
  - *Reset password* : pointer le lien vers `{{ .SiteURL }}/reinitialiser-mot-de-passe`

---

## 📁 Structure du Projet
```text
├── docs/                     # Documents de référence (CONTEXTE_SAM.md)
├── src/
│   ├── components/           # Composants réutilisables
│   ├── hooks/                # Hooks personnalisés
│   ├── lib/                  # Client Supabase et utilitaires
│   ├── pages/                # Vues de l'application
│   ├── types/                # Définitions TypeScript (database.ts)
│   ├── App.tsx
│   ├── index.css             # Tokens de styles & Tailwind
│   └── main.tsx
├── supabase/
│   ├── migrations/           # Migrations SQL versionnées et datées
│   ├── tests/                # Tests SQL reproductibles
│   └── seed.sql              # Données de démarrage
└── .env.example              # Variables d'environnement requises
```
