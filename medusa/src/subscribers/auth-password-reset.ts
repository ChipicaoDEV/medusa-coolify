import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Resend } from "resend"

export default async function sendPasswordResetEmail({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const logger = container.resolve("logger")
  logger.info(
    `[auth-password-reset] Password reset requested for: ${data.entity_id}`
  )

  try {
    const { token, entity_id: email } = data

    if (!token || !email) {
      logger.error(`[auth-password-reset] Missing token or entity_id`)
      return
    }

    const adminUrl =
      process.env.BACKEND_URL ?? "https://admin.orizont-srl.ro"
    const resetLink = `${adminUrl}/app/reset-password?token=${encodeURIComponent(token)}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from =
      process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resetare parolă - Orizont Admin</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="500" style="max-width:500px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://orizont-srl.ro/logo-2.png" alt="Orizont" width="48" height="48" style="display:block;border-radius:8px;" />
              <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#1A1A1A;">Orizont Admin</p>
            </td>
          </tr>

          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #EEEEEE;box-shadow:0 1px 4px rgba(0,0,0,0.06);padding:32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1A1A1A;">Resetare parolă</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#555555;">
                Ai solicitat resetarea parolei pentru contul asociat adresei <strong>${email}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#555555;">
                Apasă butonul de mai jos pentru a seta o parolă nouă. Link-ul este valabil <strong>15 minute</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:12px 28px;background:#F27A1A;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                      Resetează parola
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#AAAAAA;">
                Dacă nu ai solicitat tu resetarea parolei, poți ignora acest email. Parola ta rămâne neschimbată.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#AAAAAA;">Orizont · panou de administrare</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Resetare parolă - Orizont Admin",
      html,
    })

    if (error) {
      logger.error(
        `[auth-password-reset] Resend error: ${JSON.stringify(error)}`
      )
      return
    }

    logger.info(`[auth-password-reset] Reset email sent to ${email}`)
  } catch (err: any) {
    logger.error(`[auth-password-reset] Failed: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
