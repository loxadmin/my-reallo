const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendSmtpEmail({
  host, port, username, password, from, to, subject, html,
}: {
  host: string; port: number; username: string; password: string;
  from: string; to: string; subject: string; html: string;
}) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let conn: Deno.TlsConn | Deno.Conn;

  if (port === 465) {
    // Implicit TLS
    conn = await Deno.connectTls({ hostname: host, port });
  } else {
    // Plain connect first, then STARTTLS (port 587 or 25)
    conn = await Deno.connect({ hostname: host, port });
  }

  const read = async (): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

  const send = async (cmd: string): Promise<string> => {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await read();
  };

  // Read greeting
  await read();
  await send("EHLO localhost");

  // If not implicit TLS, upgrade via STARTTLS
  if (port !== 465) {
    const starttlsRes = await send("STARTTLS");
    if (!starttlsRes.startsWith("220")) {
      conn.close();
      throw new Error("STARTTLS not supported: " + starttlsRes.trim());
    }
    // Upgrade connection to TLS
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
    // Re-send EHLO after TLS upgrade
    await send("EHLO localhost");
  }

  // AUTH LOGIN
  await send("AUTH LOGIN");
  await send(btoa(username));
  const authRes = await send(btoa(password));
  if (!authRes.startsWith("235")) {
    conn.close();
    throw new Error("SMTP auth failed: " + authRes.trim());
  }

  await send(`MAIL FROM:<${from}>`);
  await send(`RCPT TO:<${to}>`);
  await send("DATA");

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
    ``,
    `.`,
  ].join("\r\n");

  const dataRes = await send(message);
  await send("QUIT");
  conn.close();

  if (!dataRes.startsWith("250")) {
    throw new Error("SMTP send failed: " + dataRes.trim());
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM") || `noreply@reallo.app`;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0066FF; font-size: 24px; margin: 0;">Reallo</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 0;">${subject}</h2>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">${body}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>This is an automated notification from Reallo. Do not reply to this email.</p>
        </div>
      </div>
    `;

    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from: smtpFrom,
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
