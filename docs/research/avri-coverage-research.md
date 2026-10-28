# AVRI collection-calendar feasibility and Dutch coverage

Investigated 2026-10-28 for [Can AVRI reliably supply launch collection dates, and how can Dutch coverage expand?](https://github.com/Jazenn/OpOrde/issues/9). Research, not an integration implementation or approval to ship.

## Finding

A real address-to-calendar technical path exists in AVRI's current public Ximmio module and responded successfully during this investigation. Production reuse permission, support terms, rate limits, availability, and schema guarantees remain unknown. This evidence supports further integration planning; it does not establish production readiness.

AVRI-only launch and eventual nationwide coverage are already owner decisions in [the launch-scope resolution](https://github.com/Jazenn/OpOrde/issues/3#issuecomment-6477319595). Manual scheduling is not an accepted substitute.

## Primary-source observations

**Verified public product behavior:** AVRI describes its calendar, address-based reminders, and notifications for changed collection days/times. Its developer-authored App Store listing identifies eight municipalities: Buren, Culemborg, Maasdriel, Neder-Betuwe, Tiel, West Betuwe, West Maas en Waal, and Zaltbommel, with postcode plus house number required. AVRI announced its 2026 calendar on 24 December 2025 and warned collection weekdays may change. These establish advertised scope and the need to refresh; they do not prove completeness for every dwelling or guaranteed publication dates. Sources: [AVRI app](https://avri.nl/nl/app), [official app listing](https://apps.apple.com/nl/app/avri-app/id1520584091), [2026 announcement](https://avri.nl/nl/nieuws/actuele-informatie).

**Verified first-party web wiring:** Raw HTML fetched from [AVRI's household calendar](https://avri.nl/nl/afvalkalender) embeds `https://modules.ximmio.com/` with `moduleName=calendarGeneric` and a provider-specific company identifier. The public module configuration selects `https://wasteapi.ximmio.com/api`. The identifier is routing configuration, not proof of a grant to third parties. No keys or full configuration are reproduced here. Sources: AVRI HTML and [public module configuration](https://modules.ximmio.com/config.js).

**Observed current source contract, not published API documentation:**

- The [address chunk](https://modules.ximmio.com/static/js/4351.a8077cc3.chunk.js) calls POST `GetAddress` with `companyCode`, `postCode`, and `houseNumber`. It handles zero, one, or multiple returned addresses, including house letters/additions. Selecting the correct address is necessary; postcode alone is insufficient.
- The [calendar chunk](https://modules.ximmio.com/static/js/2001.334ce243.chunk.js) calls POST `GetCalendar` with `companyCode`, `uniqueAddressID`, `startDate`, and `endDate`; it treats `messageCode=107` as success and consumes grouped `pickupDates` and `_pickupTypeText`.
- The [main bundle](https://modules.ximmio.com/static/js/main.js) also names `FetchAdress` (that spelling); this is not the ordinary address-form operation observed above. Its shared client can attach module session/instance headers. Do not infer that every operation needs no authentication from the limited test below.

These hashed chunk URLs are investigation snapshots and may change with deployment. Follow the module's current HTML/main bundle to rediscover them.

## Small reproducible live check

Requests made with Python urllib, JSON POST bodies, Content-Type application/json, no user login, no API key, and no session/instance headers. Only an intentionally invalid address and AVRI's publicly listed office address were used; no private household address or address identifier is published.

| Probe | Observed result |
|---|---|
| GetAddress, deliberately invalid postcode/number | HTTP 200, messageCode 164, empty dataList |
| GetAddress, AVRI public office | HTTP 200, messageCode 107, one address |
| GetCalendar, that address identifier, 2026-01-01 through 2026-12-31 | HTTP 200, messageCode 107, two date groups |

The address object exposed fields including UniqueId, HouseNumber, HouseLetter, HouseNumberAddition, ZipCode, Community, and BuildingCategory. Calendar groups exposed pickupDates, pickupType, _pickupType, _pickupTypeText, and description. The office returned GREEN and PACKAGES groups, with 78 and 19 dates respectively. Date strings were local-looking timestamps without an explicit UTC offset. These observations establish one successful response, not residential accuracy, a Dutch waste-type mapping, timezone semantics, or an SLA. A public office can have a different service pattern from homes. No private identifiers or raw response dump is retained.

An HTTP 200 must not by itself be interpreted as an address/calendar success. Distinguish provider failure, address-not-found, ambiguous address, unsupported service, and a valid empty calendar using verified semantics rather than guessed message-code mappings.

## Existing local code

The current dirty working tree's `src/services/wasteCalendar.ts`, inspected read-only, is a deterministic generator: it waits 800 ms and derives a 30-day schedule from postcode digits. It never calls an external service. Its four-value WasteType union and UTC date formatting are prototype choices, not verified AVRI semantics. The report worktree starts from HEAD; this uncommitted prototype is not copied or modified. No scheduler or integration was built.

## Unknowns and launch evidence still needed

- Obtain AVRI/Ximmio confirmation of permitted third-party production access, intended endpoint/version, credentials if required, limits, caching/redistribution rights, support/escalation, and change policy. No public developer contract, rate limit or SLA was established in the inspected sources; that is not proof none exists. No provider contact has been sent.
- Validate residential fixtures with owner consent: all eight municipalities, multiple address additions, apartments/communal containers, newly created addresses, and households without a curbside stream. Do not treat municipal membership as address-level coverage.
- Confirm waste-type identifiers/descriptions rather than mapping GREEN/PACKAGES blindly. Confirm local date/time interpretation, date uniqueness, correction/deletion semantics, and how rescheduled collections are represented.
- Confirm the supported date horizon and year rollover. One successful annual query does not establish when next year's schedule becomes available or whether dates remain stable.
- Assess reliability with permitted request volumes, explicit timeout/error handling, and repeated comparison with the official calendar. No load test or historical uptime measurement was performed.

## Options for the owner, not settled behavior

A subsequent decision should distinguish unsupported addresses from temporary failure. Potential behavior: preserve access to other household tasks, clearly mark automatic waste coverage unavailable, offer retry and the official calendar link; never fabricate dates or demand manually scheduled replacements. For previously fetched dates, choose whether/how long to show a last-successful snapshot with its age, when to stop reminders, and how to flag corrected dates. Decide how changed provider dates interact with assigned/completed occurrences and scheduled notifications. Candidate refresh triggers are address changes, app use, upcoming reminders, and a bounded background refresh; choose their cadence after provider limits and freshness needs are known.

Recommended release evidence: supported production access; correct selected address; verified residential dates/types; changed/holiday dates and year rollover handled; failures and stale data visibly distinguished from no collection; no duplicate or obsolete reminders. These are proposed gates for owner approval, not fulfilled checks.

## Eventual Dutch coverage: low-resolution inventory

This is not a complete coverage census or a promise that the services expose reusable APIs.

| Candidate family | First-party evidence | What is established |
|---|---|---|
| Ximmio | AVRI embedded module/source above | AVRI uses a company-scoped shared platform; additional tenant coverage needs verification |
| AfvalWijzer | [Amstelveen](https://www.amstelveen.nl/afvalwijzer), [Aa en Hunze](https://www.aaenhunze.nl/Alle_onderwerpen/Afval/Alle_onderwerpen/Ophaaldagen_Afvalwijzer) | Municipalities direct residents to the same named service; address additions matter; no API rights inferred |
| HVC | [Official app description](https://www.hvcgroep.nl/afval/download-de-hvc-app) | Address-based calendar and changed-collection notifications; basic calendar use distinct from account-based tariff information |
| Dar | [Nijmegen open-data catalog record](https://data.europa.eu/data/datasets/odn-de-afvalkalender?locale=en) | Address calendar and export described; HTML distribution, not evidence of a national structured API |
| RMN | [Official portal explanation](https://www.rmn.nl/zelf-regelen/burgerportaal/) | Address-based calendar; current portal link is Mendix-hosted, so do not assume Ximmio compatibility |
| GAD | [Official calendar page](https://www.gad.nl/praktische-informatie/inzamelkalender/) | Calendar explicitly excludes underground containers and loose bags; postcode can differ when bins stand in another street |
| Omrin | [Official calendar](https://www.omrin.nl/zelf-regelen/afvalkalender?step=1) | Address lookup and provider-specific coverage; unsupported addresses directed to municipality |
| Afvalhulp | [Terneuzen](https://www.terneuzen.nl/direct-regelen/de-afvalapp-afvalhulp/) | Another municipality-supported app/web calendar, requiring separate investigation |

Recommended discovery method (inference): maintain a dated municipality-to-collector-to-calendar-platform inventory from municipal sites, then verify address/waste-stream coverage and access terms. Count actual supported households/streams, not just municipalities or provider logos. Distinguish people with scheduled curbside collection from people using on-demand/shared containers: nationwide usefulness may not mean every household has a bin-emptying date. Expand shared platform adapters only where tenant contracts and schemas are actually verified. PDF-only calendars, region-specific formats, provider changes, and missing scheduled streams are gaps to investigate, not evidence that nationwide coverage is impossible.

## Artifact and validation

Documentation-only research on throwaway branch `research/avri-coverage`; no PR or application changes. Validation consisted of public source inspection and the three read-only requests above. No household pilot, production access agreement, reliability trial, or application test was run. Publication outcome is recorded in the ticket resolution rather than assumed here.
