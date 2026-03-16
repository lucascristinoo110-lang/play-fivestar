import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

function json(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

type CallbackPayload = Record<string, unknown>;

function asObject(value: unknown): CallbackPayload | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CallbackPayload)
    : null;
}

function flattenFormData(formData: FormData): CallbackPayload {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === "string" ? value : value.name,
    ]),
  );
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function parseRequestPayload(req: Request): Promise<CallbackPayload> {
  const url = new URL(req.url);
  const queryPayload = Object.fromEntries(url.searchParams.entries());
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (req.method === "GET") {
    return queryPayload;
  }

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      return { ...queryPayload, ...flattenFormData(formData) };
    }

    const raw = await req.text();
    if (!raw.trim()) return queryPayload;

    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(raw);
      return { ...queryPayload, ...(asObject(parsed) ?? { raw }) };
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      return { ...queryPayload, ...Object.fromEntries(new URLSearchParams(raw).entries()) };
    }

    try {
      const parsed = JSON.parse(raw);
      return { ...queryPayload, ...(asObject(parsed) ?? { raw }) };
    } catch {
      const params = Object.fromEntries(new URLSearchParams(raw).entries());
      return Object.keys(params).length > 0 ? { ...queryPayload, ...params } : { ...queryPayload, raw };
    }
  } catch (error) {
    console.warn("Failed to parse Playfiver callback payload, falling back to query params:", error);
    return queryPayload;
  }
}

function normalizeCallback(body: CallbackPayload) {
  const slot = asObject(body.slot) ?? {};

  const bet = slot.bet ?? body["slot.bet"] ?? body["slot[bet]"] ?? body.bet ?? body.amount ?? body.value ?? body.wager;
  const win = slot.win ?? body["slot.win"] ?? body["slot[win]"] ?? body.win ?? body.payout;
  const gameCode = String(
    body.game_code ??
      slot.game_code ??
      body["slot.game_code"] ??
      body["slot[game_code]"] ??
      body.game ??
      body.provider_game_id ??
      "",
  ).trim();

  const detectedType = String(
    body.type ?? body.action ?? body.event ?? body.callback ?? body.action_type ?? "",
  ).trim().toUpperCase();

  const betAmt = parseAmount(bet);
  const winAmt = parseAmount(win);

  return {
    type: detectedType || ((betAmt > 0 || winAmt > 0) ? "TRANSACTION" : "BALANCE"),
    userCode: String(
      body.user_code ?? body.user_id ?? body.username ?? body.player_id ?? body.playerId ?? "",
    ).trim(),
    transactionId: String(
      body.transaction_id ?? body.round_id ?? body.reference_id ?? body.call_id ?? body.tx_id ?? "",
    ).trim() || null,
    gameCode,
    betAmt,
    winAmt,
  };
}

function balanceResponse(balance: number, userCode: string) {
  return {
    msg: "",
    status: true,
    balance,
    user_balance: balance,
    user_code: userCode,
  };
}

/**
 * Playfiver Wallet Callback
 * Public endpoint (no JWT) — called directly by Playfiver servers.
 * Uses atomic DB functions to prevent race conditions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await parseRequestPayload(req);
    console.log("Playfiver callback:", JSON.stringify({
      method: req.method,
      content_type: req.headers.get("content-type"),
      payload: body,
    }));

    const { type, userCode, transactionId, betAmt, winAmt, gameCode } = normalizeCallback(body);

    if (!userCode) {
      return json({ msg: "user_code required", status: false }, 400);
    }

    // ── BALANCE ──
    if (type === "BALANCE") {
      const balance = await getBalance(supabase, userCode);
      if (balance === null) return json({ msg: "User not found", status: false }, 404);
      return json(balanceResponse(balance, userCode));
    }

    // ── DUPLICATE CHECK (idempotency) ──
    if (transactionId) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("external_id", `pf_${transactionId}`)
        .maybeSingle();

      if (existing) {
        const balance = await getBalance(supabase, userCode);
        console.log(`Duplicate tx=${transactionId}, balance=${balance}`);
        return json(balanceResponse(balance ?? 0, userCode));
      }
    }

    // ── BET (debit) — prioritize amounts over type string ──
    // Playfiver sends type "WinBet" for ALL transactions; actual intent is in bet/win values
    if (betAmt > 0 && winAmt === 0) {
      const { data, error } = await supabase.rpc("debit_balance", {
        p_user_id: userCode,
        p_amount: betAmt,
      });

      if (error) {
        if (error.message.includes("Insufficient balance")) {
          const bal = await getBalance(supabase, userCode);
          return json({ msg: "Saldo insuficiente", status: false, balance: bal ?? 0, user_balance: bal ?? 0 }, 400);
        }
        if (error.message.includes("User not found")) {
          return json({ msg: "User not found", status: false }, 404);
        }
        throw error;
      }

      const newBalance = Number(data);
      await recordTx(supabase, userCode, "game_bet", -betAmt, transactionId, { type, game_code: gameCode, round_id: transactionId, raw_payload: body });
      console.log(`BET: ${userCode} -${betAmt}, balance=${newBalance}`);
      return json(balanceResponse(newBalance, userCode));
    }

    // ── WIN (credit) — only when there's actual winnings ──
    if (winAmt > 0) {
      const { data, error } = await supabase.rpc("adjust_balance", {
        p_user_id: userCode,
        p_amount: winAmt,
      });
      if (error) throw error;

      const newBalance = Number(data);
      await recordTx(supabase, userCode, "game_win", winAmt, transactionId, { type, game_code: gameCode, round_id: transactionId, raw_payload: body });
      console.log(`WIN: ${userCode} +${winAmt}, balance=${newBalance}`);
      return json(balanceResponse(newBalance, userCode));
    }

    // ── REFUND / CANCEL ──
    if (type === "REFUND" || type === "CANCEL" || type === "ROLLBACK") {
      const refundAmt = betAmt || winAmt || parseAmount(body.amount);
      const { data, error } = await supabase.rpc("adjust_balance", {
        p_user_id: userCode,
        p_amount: refundAmt,
      });
      if (error) throw error;

      const newBalance = Number(data);
      await recordTx(supabase, userCode, "game_refund", refundAmt, transactionId, { type, original_transaction: body.original_transaction_id, round_id: transactionId, raw_payload: body });
      console.log(`REFUND: ${userCode} +${refundAmt}, balance=${newBalance}`);
      return json(balanceResponse(newBalance, userCode));
    }

    // ── GENERIC (legacy) ──
    const netAmount = -betAmt + winAmt;
    if (betAmt > 0 && winAmt === 0) {
      const { data, error } = await supabase.rpc("debit_balance", { p_user_id: userCode, p_amount: betAmt });
      if (error) {
        if (error.message.includes("Insufficient")) {
          const bal = await getBalance(supabase, userCode);
          return json({ msg: "Saldo insuficiente", status: false, balance: bal ?? 0, user_balance: bal ?? 0 }, 400);
        }
        throw error;
      }
      if (winAmt > 0) {
        await supabase.rpc("adjust_balance", { p_user_id: userCode, p_amount: winAmt });
      }
      const balance = await getBalance(supabase, userCode);
      console.log(`GENERIC: ${userCode} net=${netAmount}, balance=${balance}`);
      return json(balanceResponse(balance ?? 0, userCode));
    }

    if (netAmount !== 0) {
      await supabase.rpc("adjust_balance", { p_user_id: userCode, p_amount: netAmount });
    }
    const balance = await getBalance(supabase, userCode);
    console.log(`GENERIC: ${userCode} net=${netAmount}, balance=${balance}`);
    return json(balanceResponse(balance ?? 0, userCode));
  } catch (error: any) {
    console.error("Playfiver callback error:", error);
    return json({ msg: error.message, status: false }, 500);
  }
});

async function getBalance(supabase: any, userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return Number(data.balance) || 0;
}

async function recordTx(supabase: any, userId: string, type: string, amount: number, txId: string | null, metadata: any) {
  if (!txId) return;
  await supabase.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    status: "completed",
    payment_method: "playfiver",
    external_id: `pf_${txId}`,
    metadata,
  });
}
