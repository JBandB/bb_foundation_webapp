-- Handwerk: wat drizzle niet kan uitdrukken. Gegenereerde bestanden worden nooit met de hand
-- aangepast; dit bestand komt uit `db:generate --custom` en is van ons. Zie lib/db/migrations/README.md.

-- ---------------------------------------------------------------------------
-- 1. Precies één organisatie. Multi-tenant-ready, niet multi-tenant.
-- ---------------------------------------------------------------------------
--
-- Deze index gaat eruit op het moment dat er echt meerdere organisaties komen. Tot die tijd voorkomt
-- hij dat een seed of een import er stil een tweede bijzet, waardoor de scoping in de data-access
-- laag zinloos zou worden zonder dat iemand het merkt.
CREATE UNIQUE INDEX "one_organisation" ON "organisations" ((true));--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. De audit log is append-only. Zie CLAUDE.md regel 5.
-- ---------------------------------------------------------------------------
--
-- Een trigger en niet alleen REVOKE, en dat is een bewuste keuze. Op Neon verbindt de applicatie als
-- de eigenaar van de tabel. Een eigenaar mag zichzelf rechten teruggeven, dus REVOKE alleen is daar
-- een aantekening en geen slot. Een before-trigger die gooit werkt ongeacht de rol, ook voor de
-- eigenaar, en is te testen vanaf dezelfde verbinding als waarmee de applicatie draait (pnpm check:core).
--
-- Wat een trigger niet tegenhoudt is TRUNCATE en DROP TABLE. Daar is geen verdediging tegen binnen
-- de database als je eigenaar bent; dat is wat de backup en de point-in-time recovery van Neon dekken.
CREATE OR REPLACE FUNCTION "audit_log_is_append_only"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'De audit log is append-only. % op audit_log is niet toegestaan.', tg_op
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint

CREATE TRIGGER "audit_log_no_update"
  BEFORE UPDATE ON "audit_log"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "audit_log_is_append_only"();--> statement-breakpoint

CREATE TRIGGER "audit_log_no_delete"
  BEFORE DELETE ON "audit_log"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "audit_log_is_append_only"();--> statement-breakpoint

-- Het tweede slot. Doet niets voor de eigenaar, maar wel zodra er ooit een aparte applicatierol komt
-- met minder rechten, en dat is de richting waar dit heen hoort.
REVOKE UPDATE, DELETE ON "audit_log" FROM public;
