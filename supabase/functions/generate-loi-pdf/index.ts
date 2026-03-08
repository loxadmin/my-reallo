import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function removeSignatureBg(imageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Remove the background from this signature image. Keep only the signature ink on a transparent/white background. Output a clean signature." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch (e) {
    console.error("BG removal error:", e);
    return null;
  }
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "Missing submission_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch submission
    const { data: submission, error: subErr } = await supabase
      .from("advertiser_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch founder settings
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("*")
      .in("key", ["founder_full_name", "founder_signature_url"]);

    const founderName = settings?.find((s: any) => s.key === "founder_full_name")?.value || "Founder";
    const founderSigUrl = settings?.find((s: any) => s.key === "founder_signature_url")?.value || "";

    // Process advertiser signature (remove background)
    let processedSigUrl = submission.processed_signature_url;
    if (!processedSigUrl && submission.signature_url) {
      processedSigUrl = await removeSignatureBg(submission.signature_url);
      if (processedSigUrl) {
        // Upload processed signature to storage
        const base64Data = processedSigUrl.replace(/^data:image\/\w+;base64,/, "");
        const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const sigPath = `signatures/processed_${submission_id}.png`;
        await supabase.storage.from("advertiser-uploads").upload(sigPath, sigBytes, {
          contentType: "image/png",
          upsert: true,
        });
        const { data: urlData } = supabase.storage.from("advertiser-uploads").getPublicUrl(sigPath);
        processedSigUrl = urlData.publicUrl;
        await supabase.from("advertiser_submissions").update({ processed_signature_url: processedSigUrl }).eq("id", submission_id);
      }
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    const brandGreen = rgb(0.05, 0.3, 0.23);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);

    let y = height - 60;

    // Header
    page.drawText("REALLO", { x: 50, y, size: 28, font: helveticaBold, color: brandGreen });
    y -= 20;
    page.drawText("Letter of Intent", { x: 50, y, size: 12, font: helvetica, color: gray });
    y -= 8;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: brandGreen });
    y -= 30;

    // Date
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    page.drawText(`Date: ${date}`, { x: 50, y, size: 10, font: helvetica, color: gray });
    y -= 30;

    // Title
    page.drawText("LETTER OF INTENT FOR ADVERTISING PARTNERSHIP", {
      x: 50, y, size: 14, font: helveticaBold, color: black,
    });
    y -= 30;

    // Body text
    const bodyLines = [
      `This Letter of Intent ("LOI") is entered into between REALLO ("Platform") and ${submission.brand_name} ("Advertiser"), represented by ${submission.ceo_name}.`,
      "",
      `The Advertiser hereby expresses its intent to enter into an advertising partnership with REALLO upon the Platform reaching a verified user base of 100,000 (one hundred thousand) active users.`,
      "",
      `The Advertiser commits to a minimum advertising spend of $50,000 (fifty thousand US dollars) upon activation of this partnership.`,
      "",
      "Terms and Conditions:",
      "",
      "1. This LOI is non-binding and serves as a declaration of mutual interest in a future advertising partnership.",
      "",
      "2. The partnership shall become active once REALLO formally notifies the Advertiser that the 100,000 user milestone has been achieved and verified.",
      "",
      "3. Upon activation, both parties agree to negotiate and execute a formal Advertising Agreement within 30 days.",
      "",
      `4. The Advertiser's official point of contact shall be via: ${submission.email}`,
      "",
      `5. Advertiser's website: ${submission.website_url}`,
      "",
      "6. Both parties acknowledge that this LOI does not create any legally binding obligations, but represents a good-faith commitment to the proposed partnership.",
    ];

    for (const line of bodyLines) {
      if (line === "") {
        y -= 8;
        continue;
      }
      const wrapped = wrapText(line, width - 100, helvetica, 10);
      for (const wl of wrapped) {
        if (y < 120) {
          // Add new page if needed
          break;
        }
        page.drawText(wl, { x: 50, y, size: 10, font: helvetica, color: black });
        y -= 16;
      }
    }

    y -= 20;

    // Signature section
    const sigY = Math.min(y, 200);

    // Advertiser signature (left)
    page.drawText("Advertiser:", { x: 50, y: sigY, size: 10, font: helveticaBold, color: black });

    // Try to embed advertiser signature image
    if (processedSigUrl) {
      try {
        const sigBytes = await fetchImageBytes(processedSigUrl);
        if (sigBytes) {
          let sigImage;
          try {
            sigImage = await pdfDoc.embedPng(sigBytes);
          } catch {
            sigImage = await pdfDoc.embedJpg(sigBytes);
          }
          const sigDims = sigImage.scaleToFit(120, 40);
          page.drawImage(sigImage, { x: 50, y: sigY - 50, width: sigDims.width, height: sigDims.height });
        }
      } catch (e) {
        console.error("Failed to embed advertiser signature:", e);
      }
    }
    page.drawLine({ start: { x: 50, y: sigY - 55 }, end: { x: 200, y: sigY - 55 }, thickness: 0.5, color: black });
    page.drawText(submission.ceo_name, { x: 50, y: sigY - 68, size: 10, font: helvetica, color: black });
    page.drawText(submission.brand_name, { x: 50, y: sigY - 80, size: 9, font: helvetica, color: gray });

    // Founder signature (right)
    page.drawText("REALLO:", { x: 350, y: sigY, size: 10, font: helveticaBold, color: black });

    if (founderSigUrl) {
      try {
        // Remove background from founder signature too
        let processedFounderSigUrl = founderSigUrl;
        const cleanedFounderSig = await removeSignatureBg(founderSigUrl);
        if (cleanedFounderSig) {
          // Upload processed founder signature
          const base64Data = cleanedFounderSig.replace(/^data:image\/\w+;base64,/, "");
          const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const fSigPath = `signatures/processed_founder.png`;
          await supabase.storage.from("advertiser-uploads").upload(fSigPath, sigBytes, {
            contentType: "image/png",
            upsert: true,
          });
          const { data: fSigUrlData } = supabase.storage.from("advertiser-uploads").getPublicUrl(fSigPath);
          processedFounderSigUrl = fSigUrlData.publicUrl;
        }

        const fSigBytes = await fetchImageBytes(processedFounderSigUrl);
        if (fSigBytes) {
          let fSigImage;
          try {
            fSigImage = await pdfDoc.embedPng(fSigBytes);
          } catch {
            fSigImage = await pdfDoc.embedJpg(fSigBytes);
          }
          const fDims = fSigImage.scaleToFit(120, 40);
          page.drawImage(fSigImage, { x: 350, y: sigY - 50, width: fDims.width, height: fDims.height });
        }
      } catch (e) {
        console.error("Failed to embed founder signature:", e);
      }
    }
    page.drawLine({ start: { x: 350, y: sigY - 55 }, end: { x: 500, y: sigY - 55 }, thickness: 0.5, color: black });
    page.drawText(founderName, { x: 350, y: sigY - 68, size: 10, font: helvetica, color: black });
    page.drawText("Founder, REALLO", { x: 350, y: sigY - 80, size: 9, font: helvetica, color: gray });

    const pdfBytes = await pdfDoc.save();

    // Upload PDF to storage
    const pdfPath = `loi/LOI_${submission.brand_name.replace(/\s+/g, "_")}_${submission_id.slice(0, 8)}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("advertiser-uploads")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("PDF upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pdfUrlData } = supabase.storage.from("advertiser-uploads").getPublicUrl(pdfPath);
    const pdfUrl = pdfUrlData.publicUrl;

    // Update submission with PDF URL
    await supabase.from("advertiser_submissions").update({
      loi_pdf_url: pdfUrl,
      status: "approved",
      reviewed_at: new Date().toISOString(),
    }).eq("id", submission_id);

    // Send PDF to advertiser email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      // Convert PDF to base64 for attachment
      // Convert in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const pdfBase64 = btoa(binary);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "REALLO <noreply@loxservices.pro>",
          to: submission.email,
          subject: "REALLO — Your Letter of Intent Has Been Approved",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px;">
                <h2 style="color: #0d4d3a; font-size: 20px; margin-top: 0;">REALLO — Letter of Intent Approved</h2>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  Dear ${submission.ceo_name},<br><br>
                  We are pleased to inform you that your Letter of Intent for an advertising partnership between <strong>${submission.brand_name}</strong> and <strong>REALLO</strong> has been approved.
                </p>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  Please find your signed LOI document attached to this email. You can also download it from your advertiser dashboard.
                </p>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  We will notify you once REALLO reaches the 100,000 user milestone to activate the partnership.
                </p>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">— The REALLO Team</p>
              </div>
            </div>
          `,
          attachments: [{
            filename: `LOI_${submission.brand_name.replace(/\s+/g, "_")}.pdf`,
            content: pdfBase64,
          }],
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, pdf_url: pdfUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("LOI generation error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
