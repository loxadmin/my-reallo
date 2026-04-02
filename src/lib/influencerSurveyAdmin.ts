import { supabase } from "@/integrations/supabase/client";

export interface InfluencerSurveyResponseRecord {
  id: string;
  user_id: string;
  reward_amount: number;
}

export const approveInfluencerSurveyResponse = async (
  response: InfluencerSurveyResponseRecord,
  adminUserId: string,
  reviewNotes?: string
) => {
  const { data: existingTxn, error: txnCheckError } = await supabase
    .from("influencer_wallet_transactions" as any)
    .select("id")
    .eq("source", "influencer_survey")
    .eq("source_id", response.id)
    .maybeSingle();

  if (txnCheckError) throw txnCheckError;

  const { error: updateError } = await supabase
    .from("influencer_survey_responses" as any)
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      review_notes: reviewNotes || null,
    })
    .eq("id", response.id);

  if (updateError) throw updateError;

  if (!existingTxn) {
    const { data: wallet, error: walletFetchError } = await supabase
      .from("influencer_wallets" as any)
      .select("id,balance,status")
      .eq("user_id", response.user_id)
      .eq("status", "active")
      .maybeSingle();

    if (walletFetchError) throw walletFetchError;

    if (!wallet) {
      throw new Error("No active influencer wallet found for this user.");
    }

    const { error: txnInsertError } = await supabase
      .from("influencer_wallet_transactions" as any)
      .insert({
        user_id: response.user_id,
        source: "influencer_survey",
        source_id: response.id,
        amount: response.reward_amount,
        status: "completed",
        note: "Influencer survey reward",
      });

    if (txnInsertError) throw txnInsertError;

    const walletData = wallet as any;
    const { error: walletUpdateError } = await supabase
      .from("influencer_wallets" as any)
      .update({
        balance:
          (Number(walletData.balance) || 0) + Number(response.reward_amount || 0),
      })
      .eq("id", walletData.id);

    if (walletUpdateError) throw walletUpdateError;
  }
};

export const rejectInfluencerSurveyResponse = async (
  responseId: string,
  adminUserId: string,
  reviewNotes?: string
) => {
  const { error } = await supabase
    .from("influencer_survey_responses" as any)
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      review_notes: reviewNotes || null,
    })
    .eq("id", responseId);

  if (error) throw error;
};
