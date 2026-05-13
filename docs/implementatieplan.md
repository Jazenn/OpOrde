# Implementatieplan: Adult Task Manager App
**Versie 1.0 — volledig, release-ready**

---

## Inhoudsopgave
1. [Productvisie & freemium model](#1-productvisie--freemium-model)
2. [Tech stack & motivatie](#2-tech-stack--motivatie)
3. [Projectstructuur & architectuurprincipes](#3-projectstructuur--architectuurprincipes)
4. [Fase 1 – Foundation (week 1–2)](#4-fase-1--foundation-week-12)
5. [Fase 2 – Core app (week 3–5)](#5-fase-2--core-app-week-35)
6. [Fase 3 – Notificatiesysteem (week 6–7)](#6-fase-3--notificatiesysteem-week-67)
7. [Fase 4 – Multi-user & huishoudens (week 8–10)](#7-fase-4--multi-user--huishoudens-week-810)
8. [Fase 5 – Monetisatie (week 11–12)](#8-fase-5--monetisatie-week-1112)
9. [Fase 6 – Release prep (week 13–16)](#9-fase-6--release-prep-week-1316)
10. [Veiligheidschecklist](#10-veiligheidschecklist)
11. [Volledige mappenstructuur](#11-volledige-mappenstructuur)
12. [Database schema met RLS](#12-database-schema-met-rls)

---

## 1. Productvisie & freemium model

### Kernidee
Een huishoud-taakmanager speciaal ontworpen voor de **Nederlandse markt**. De app
begrijpt de Nederlandse context: afvalinzameling per gemeente, Nederlands weer,
Nederlandse seizoenen en typisch Nederlandse huishoudtaken. In plaats van een
generieke internationale app biedt dit iets wat Tody, Chap of Home Tasker niet
kunnen: een app die weet wanneer jouw kliko in Culemborg geleegd wordt, en die
de weersvoorspelling meeneemt bij het plannen van het ramen zemen.

### Nederlandse differentiatie — de drie pijlers

**1. Afvalkalender-integratie**
Via `api.mijnafvalwijzer.nl` haal je per postcode + huisnummer de ophaaldata op
voor restafval, GFT, papier en PMD. Gebruiker voert eenmalig postcode +
huisnummer in → app weet automatisch wanneer welke kliko naar buiten moet.
Notificaties: "Morgen wordt je groene bak geleegd. Zet hem voor 07:30 buiten."

Dekking: mijnafvalwijzer.nl dekt het overgrote deel van Nederlandse gemeenten.
Voor gemeenten die via Ximmio/AVRI werken (Culemborg, Tiel, Buren, etc.) is
er een aparte Ximmio-endpoint als fallback. Bij onboarding detecteert de app
automatisch welke provider jouw gemeente gebruikt.

**2. Weer-intelligente planning (Open-Meteo API)**
De app gebruikt Open-Meteo (gratis, geen API key, hoge nauwkeurigheid voor NL)
om weersomstandigheden mee te nemen in taakplanning. Voorbeelden:
- "Komende week zijn dinsdag en donderdag droog en zonnig — goed moment om
  ramen te zemen. Woensdag wordt het 8mm regen, dat sla je beter over."
- "Dit weekend is het mooi weer — misschien een goed moment om de tuin bij te
  houden?"
- Automatisch verschuiven van buiten-taken als er regen verwacht wordt op de
  geplande dag.

Relevante weersparameters: neerslag (mm), temperatuur, windsnelheid (boven
7 Bft: buiten taken uitstellen), zonneschijn. Geen complexe AI nodig — simpele
drempelwaarden in de Edge Function zijn genoeg.

**3. Nederlandse taakcontext**
Preset-taken die in internationale apps niet bestaan:
- Grofvuil aanmelden bij gemeente (via gemeentewebsite-link)
- Verwarmingsketel ontluchten (typisch NL cv-ketel)
- Dakgoot reinigen (najaar)
- Fiets onderhouden / banden oppompen
- Energienota controleren (maandelijks)
- Huurcontract/VvE-bijdrage checken (jaarlijks)

### Freemium splits

**Gratis (Free tier)**

| Taak | Standaard frequentie |
|------|----------------------|
| Stofzuigen | Wekelijks |
| Badkamer schoonmaken | Wekelijks |
| WC schoonmaken | Wekelijks |
| Keuken aanrecht | Dagelijks |
| Vloer dweilen | Tweewekelijks |
| Stof afnemen | Tweewekelijks |
| Vaatwasser uitruimen | Dagelijks |
| Was doen | Wekelijks |

Gratis gebruikers krijgen ook:
- Maximaal 3 eigen custom taken
- Taakgeschiedenis laatste 30 dagen
- Solo gebruik (geen huishouden)
- Basis push-notificaties

**Premium (€3,49/maand of €27,99/jaar)**

| Taak / Feature | Toelichting |
|----------------|-------------|
| 🗑️ Kliko buiten zetten | Automatisch via afvalkalender API |
| 🌧️ Weer-intelligente planning | Open-Meteo koppeling voor buiten-taken |
| 🪟 Ramen zemen | Droog-weer reminder op basis van weersvoorspelling |
| 🌱 Planten water geven | Aanpasbaar interval |
| 🔧 Verwarmingsketel ontluchten | Elk half jaar, herfst-reminder |
| 🚗 Auto APK | Jaarlijks, 4 weken van tevoren |
| 🍂 Dakgoot reinigen | Najaarsherinnering |
| 🚲 Fiets onderhouden | Maandelijks |
| ⚡ Energienota controleren | Maandelijks |
| 🏠 Multi-user huishoudens | Tot 5 bewoners, gedeelde taken |
| 📊 Statistieken & streaks | Onbeperkte geschiedenis |
| 🔁 Snooze & herhaal-opties | Per notificatie aanpasbaar |

### Prijsstrategie
De gratis tier bedient solo binnenshuis-gebruik volledig. Premium voegt de
"slimme" Nederlandse context toe — dingen die je pas mist als je ze vergeet.
De afvalkalender-integratie is bewust premium: het is het sterkste
onderscheidende feature en heeft een duidelijke directe waarde ("nooit meer
een vergeten kliko").

Vergelijking met de markt: Tody kost €0.99–€6.99 eenmalig, zonder abonnement.
Onze €3,49/maand is alleen gerechtvaardigd door de live data-integraties
(afvalkalender + weer) die continu waarde leveren. Zorg dat die integraties
vlekkeloos werken vóór je monetiseert.

---

## 2. Tech stack & motivatie

### Frontend
| Technologie | Versie | Reden |
|-------------|--------|-------|
| Expo SDK | 52+ | Managed workflow, EAS Build, OTA updates |
| React Native | 0.76+ | Cross-platform iOS + Android |
| expo-router | 4.x | File-based routing, deep links, type-safe navigatie |
| NativeWind | 4.x | Tailwind in React Native, consistent design system |
| React Query (TanStack) | 5.x | Server state, caching, optimistic updates |
| Zustand | 5.x | Lichte UI-state (filters, modals) |
| Zod | 3.x | Runtime validatie van formulieren en API-responses |
| expo-secure-store | latest | Veilige opslag van tokens |
| expo-notifications | latest | Push token beheer, lokale notificaties |
| Clerk | latest | Authentication & User Management (Managed service) |

### Backend & Database
| Technologie | Reden |
|-------------|-------|
| **Neon** | Serverless PostgreSQL (Edge-ready, branching, autoscaling) |
| **Drizzle ORM** | Lichtgewicht, type-safe ORM die perfect samenwerkt met Neon |
| **Hono (on Vercel/Cloudflare)** | Edge functions voor cron jobs en API integraties |
| **Inngest** | Voor betrouwbare cron jobs en background jobs (notificaties, sync) |

### Externe data-integraties (NL-specifiek)

| Service | Gebruik | Kosten |
|---------|---------|--------|
| **api.mijnafvalwijzer.nl** | Afvalophaaldata per postcode + huisnummer. Dekt het merendeel van NL gemeenten. Geen officiele API key nodig (zelfde key als de consumentenapp). | Gratis |
| **Ximmio Waste Platform** | Fallback voor AVRI-regio (Culemborg, Tiel, Buren, etc.) via `wasteportal.ximmio.com`. Zelfde postcode/huisnummer interface. | Gratis |
| **Open-Meteo** | Weersvoorspelling voor weer-intelligente taakplanning. Volledig gratis, geen API key, hoge nauwkeurigheid voor NL. Endpoint: `api.open-meteo.com/v1/forecast`. | Gratis |

---

## 3. Projectstructuur & architectuurprincipes

### Kernprincipes

**Separation of concerns.** Schermen weten niet hoe data opgehaald wordt. Hooks weten niet hoe schermen eruitzien. Services weten niet wie ze aanroept.

**Type-safety van database tot component.** Drizzle genereert TypeScript types uit je schema. Zod valideert formulierinput. Nooit `any` in je codebase.

**Managed Auth.** Clerk regelt de complexe auth flows (MFA, social login, session management) zodat wij kunnen focussen op de business logica.

**Environment variables nooit hardcoden.** Elke key, URL of secret staat in `.env.local` (lokaal) of EAS Secrets (build). `.env.local` staat altijd in `.gitignore`.

**Optimistic updates voor kernacties.** "Taak afvinken" voelt instant aan — de UI update direct, de server-call loopt op de achtergrond. Bij fout wordt de state teruggedraaid.

---

## 4. Fase 1 – Foundation (week 1–2)

### 4.1 Expo project aanmaken

```bash
npx create-expo-app@latest taskapp --template tabs
cd taskapp

# Expo router instellen
npx expo install expo-router expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens

# Styling
npm install nativewind tailwindcss
npx tailwindcss init

# State & data
npm install @tanstack/react-query zustand zod

# Database & ORM
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Authentication
npx expo install @clerk/clerk-expo

# Notificaties
npx expo install expo-notifications expo-device expo-task-manager

# Monetisatie
npm install react-native-purchases
```

### 4.2 TypeScript-strikte configuratie

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 4.3 Environment variabelen

`.env.local` (nooit committen):
```
DATABASE_URL=postgres://user:pass@ep-cool-ice-123.eu-central-1.aws.neon.tech/neondb
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

### 4.4 Neon & Drizzle opzetten

1. Ga naar neon.tech → nieuw project
2. Regio: West Europe (Frankfurt)
3. Noteer de `DATABASE_URL`
4. Configureer `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
```

---

## 5. Fase 2 – Core app (week 3–5)

### 5.1 Navigatiestructuur (expo-router + Clerk)

```
app/
├── _layout.tsx                  # Root layout: ClerkProvider, QueryClient, providers
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── onboarding.tsx           # Eerste keer: preset taken kiezen
├── (app)/
│   ├── _layout.tsx              # Tab navigator
│   ├── index.tsx                # Tab 1: Vandaag
│   ├── tasks/
│   │   ├── index.tsx            # Tab 2: Alle taken
│   │   ├── [id].tsx             # Taak detail + bewerken
│   │   └── add.tsx              # Nieuwe taak toevoegen
│   └── settings/
│       ├── index.tsx            # Tab 3: Instellingen
│       ├── household.tsx        # Huishouden beheren [Premium]
│       ├── subscription.tsx     # Abonnement & upgrade
│       └── account.tsx          # Account, data-export, verwijderen
└── +not-found.tsx
```

Root layout `app/_layout.tsx`:
```typescript
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

### 5.2 Database Client (Neon + Drizzle)

`src/db/client.ts`:
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 5.3 Hooks patroon (met Neon)

`src/hooks/useTasks.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/db/client';
import { tasks } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { useAuth } from '@clerk/clerk-expo';

export function useTodayTasks() {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: ['tasks', 'today', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await db.query.userTasks.findMany({
        where: (t, { eq, and, lte }) => and(
          eq(t.userId, userId!),
          eq(t.isActive, true),
          lte(t.nextDueDate, today)
        ),
        with: {
          template: true,
          completions: {
            orderBy: (c, { desc }) => [desc(c.completedAt)],
            limit: 1
          }
        }
      });
    },
    enabled: !!userId,
  });
}
```

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('task_completions')
        .insert({ task_id: taskId });
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      // Optimistic update: verwijder taak direct uit "vandaag" lijst
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] });
      const previous = queryClient.getQueryData(['tasks', 'today']);
      queryClient.setQueryData(['tasks', 'today'], (old: any[]) =>
        old.filter(t => t.id !== taskId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Terugdraaien bij fout
      queryClient.setQueryData(['tasks', 'today'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### 5.4 Preset-taken seed script

`supabase/seed.sql` (uitgevoerd bij database initialisatie):
```sql
INSERT INTO task_templates (name, category, default_frequency_type, default_interval_days, is_premium, icon) VALUES
-- Gratis taken
('Stofzuigen', 'reinigen', 'weekly', 7, false, 'vacuum'),
('Badkamer schoonmaken', 'reinigen', 'weekly', 7, false, 'shower'),
('WC schoonmaken', 'reinigen', 'weekly', 7, false, 'toilet'),
('Aanrecht schoonmaken', 'reinigen', 'daily', 1, false, 'chef-hat'),
('Vloer dweilen', 'reinigen', 'biweekly', 14, false, 'droplets'),
('Stof afnemen', 'reinigen', 'biweekly', 14, false, 'feather'),
('Was doen', 'huishouden', 'weekly', 7, false, 'shirt'),
('Vaatwasser uitruimen', 'huishouden', 'daily', 1, false, 'utensils'),

-- Premium taken
('Kliko buiten zetten', 'buiten', 'weekly', 7, true, 'trash-2'),
('Planten water geven', 'tuin', 'interval', 4, true, 'flower-2'),
('Ramen zemen', 'reinigen', 'seasonal', 90, true, 'layout'),
('Verwarmingsfilter', 'onderhoud', 'biannual', 180, true, 'thermometer'),
('Auto APK', 'administratie', 'annual', 365, true, 'car'),
('Koelkast schoonmaken', 'reinigen', 'monthly', 30, true, 'package'),
('Planten verpotten', 'tuin', 'annual', 365, true, 'shovel'),
('Grofvuil aanmelden', 'administratie', 'monthly', 30, true, 'calendar');
```

### 5.5 Onboarding flow

Bij eerste login: scherm met preset-taken in twee kolommen. Gratis taken zijn aanklikbaar voor iedereen. Premium taken zijn zichtbaar maar gegreyd out met een 🔒 icoon en "Premium" badge. Gebruiker selecteert zijn startset. Na selectie worden `user_tasks` records aangemaakt met de standaard frequentie en een `next_due_date` berekend op basis van vandaag.

### 5.6 Vandaag-scherm logica

"Vandaag" toont taken waarvan `next_due_date <= today`. Sortering: meest urgente (langst achterstallig) bovenaan. Taken die "morgen" vervallen komen in een "Binnenkort" sectie eronder. Elke taakkaart toont: naam, categorie-icoon, hoe lang geleden het voor het laast gedaan is ("8 dagen geleden"), en een vinkje-knop. Bij afvinken: optimistic update + confetti-animatie voor engagement.

---

## 6. Fase 3 – Notificatiesysteem (week 6–7)

### 6.1 Push token registratie

`src/services/notifications.ts`:
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/db/client';
import { pushTokens } from '@/db/schema';
import { Platform } from 'react-native';

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  })).data;

  // Upsert via Drizzle
  await db.insert(pushTokens).values({
    userId,
    token,
    platform: Platform.OS as 'ios' | 'android',
  }).onConflictDoUpdate({
    target: [pushTokens.userId, pushTokens.platform],
    set: { token, updatedAt: new Date() }
  });
}
```

### 6.2 Hono (Vercel/Edge) voor dagelijkse notificaties

Omdat Neon alleen de database is, gebruiken we een lichtgewicht Hono service op Vercel of Cloudflare voor de cron jobs.

`api/cron/send-notifications.ts`:
```typescript
import { Hono } from 'hono';
import { db } from '@/db/client';
import { userTasks, pushTokens } from '@/db/schema';

const app = new Hono();

app.get('/cron/notifications', async (c) => {
  const cronSecret = c.req.header('Authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return c.text('Unauthorized', 401);

  const today = new Date().toISOString().split('T')[0];

  // Haal taken op die vandaag vervallen
  const tasksDue = await db.query.userTasks.findMany({
    where: (t, { eq, and, lte }) => and(
      eq(t.isActive, true),
      lte(t.nextDueDate, today)
    ),
    with: {
      template: true,
      user: {
        with: { pushTokens: true }
      }
    }
  });

  // Stuur via Expo Push API
  // ... (zelfde logica als voorheen)

  return c.json({ sent: tasksDue.length });
});
```

### 6.3 Cron Jobs via Inngest of Vercel Cron

Gebruik `vercel.json` of de Inngest dashboard om de endpoint elke ochtend om 07:00 aan te roepen.

---

## 7. Fase 4 – Multi-user & huishoudens (week 8–10)

### 7.1 Huishouden aanmaken (Drizzle)

```typescript
// src/services/household.ts
export async function createHousehold(name: string, userId: string) {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  return await db.transaction(async (tx) => {
    const [household] = await tx.insert(households).values({
      name,
      inviteCode,
      inviteExpiresAt: expiresAt,
    }).returning();

    await tx.insert(householdMembers).values({
      householdId: household.id,
      userId,
      role: 'owner',
    });

    return household;
  });
}
```

---

## 12. Database schema (Drizzle ORM)

`src/db/schema.ts`:
```typescript
import { pgTable, uuid, text, integer, timestamp, boolean, date, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Clerk User ID
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  userId: text('user_id').references(() => profiles.id).primaryKey(),
  isPremium: boolean('is_premium').default(false).notNull(),
  productId: text('product_id'),
  expiresAt: timestamp('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  defaultFrequencyType: text('default_frequency_type').notNull(),
  defaultIntervalDays: integer('default_interval_days').default(7),
  isPremium: boolean('is_premium').default(false).notNull(),
  icon: text('icon'),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').unique(),
  inviteExpiresAt: timestamp('invite_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdMembers = pgTable('household_members', {
  householdId: uuid('household_id').references(() => households.id),
  userId: text('user_id').references(() => profiles.id),
  role: text('role').default('member').notNull(), // 'owner' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.householdId, t.userId] }),
}));

export const userTasks = pgTable('user_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => profiles.id),
  householdId: uuid('household_id').references(() => households.id),
  templateId: uuid('template_id').references(() => taskTemplates.id),
  isCustom: boolean('is_custom').default(false).notNull(),
  customName: text('custom_name'),
  frequencyType: text('frequency_type').notNull(),
  intervalDays: integer('interval_days').default(7),
  nextDueDate: date('next_due_date').notNull(),
  streakCount: integer('streak_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskCompletions = pgTable('task_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => userTasks.id),
  completedBy: text('completed_by').references(() => profiles.id),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export const pushTokens = pgTable('push_tokens', {
  userId: text('user_id').references(() => profiles.id),
  platform: text('platform').notNull(), // 'ios' | 'android'
  token: text('token').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.platform] }),
}));
```
```

---

*Laatste update: 2026 — Gegenereerd als onderdeel van portfolio-project.*
