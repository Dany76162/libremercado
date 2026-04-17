import nodemailer from "nodemailer";

const isDev = process.env.NODE_ENV !== "production";

function createTransport() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

const FROM = process.env.SMTP_FROM ?? "PachaPay <no-reply@pachapay.ar>";

async function sendEmail(to: string, subject: string, html: string) {
  if (isDev && !process.env.SMTP_HOST) {
    console.log(`[email] TO: ${to} | SUBJECT: ${subject}`);
    console.log(`[email] BODY (preview):\n${html.replace(/<[^>]+>/g, " ").trim().slice(0, 300)}`);
    return;
  }
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  total: string,
  storeName: string,
) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#FF4500">¡Pedido confirmado!</h2>
      <p>Hola <strong>${customerName}</strong>, tu pedido en <strong>${storeName}</strong> fue recibido exitosamente.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Número de pedido</td><td style="padding:8px;border:1px solid #eee">#${orderId.slice(-8).toUpperCase()}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Total</td><td style="padding:8px;border:1px solid #eee"><strong>${total}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Tienda</td><td style="padding:8px;border:1px solid #eee">${storeName}</td></tr>
      </table>
      <p>Podés seguir el estado de tu pedido en <a href="https://pachapay.ar" style="color:#FF4500">PachaPay</a>.</p>
      <p style="color:#888;font-size:12px">Gracias por comprar en PachaPay — el marketplace de tu comunidad.</p>
    </div>
  `;
  await sendEmail(customerEmail, `Pedido confirmado #${orderId.slice(-8).toUpperCase()} — PachaPay`, html);
}

export async function sendMerchantNewOrderEmail(
  merchantEmail: string,
  merchantName: string,
  orderId: string,
  total: string,
  itemCount: number,
) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#FF4500">Nuevo pedido recibido</h2>
      <p>Hola <strong>${merchantName}</strong>, tienes un nuevo pedido en tu tienda.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Pedido</td><td style="padding:8px;border:1px solid #eee">#${orderId.slice(-8).toUpperCase()}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Productos</td><td style="padding:8px;border:1px solid #eee">${itemCount} ítem${itemCount > 1 ? "s" : ""}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;color:#888">Total</td><td style="padding:8px;border:1px solid #eee"><strong>${total}</strong></td></tr>
      </table>
      <p>Ingresá a tu <a href="https://pachapay.ar/admin" style="color:#FF4500">panel de control</a> para confirmar y preparar el pedido.</p>
      <p style="color:#888;font-size:12px">PachaPay — Gestión de tu tienda</p>
    </div>
  `;
  await sendEmail(merchantEmail, `Nuevo pedido #${orderId.slice(-8).toUpperCase()} en tu tienda — PachaPay`, html);
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string,
) {
  const resetUrl = `${process.env.APP_URL ?? "http://localhost:5000"}/reset-password?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#FF4500">Recuperar contraseña</h2>
      <p>Hola <strong>${username}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Hacé clic en el botón de abajo para crear una nueva contraseña:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#FF4500;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">Restablecer contraseña</a>
      <p>Este enlace expira en <strong>1 hora</strong>.</p>
      <p>Si no pediste restablecer tu contraseña, ignorá este correo.</p>
      <p style="color:#888;font-size:12px">PachaPay — el marketplace de tu comunidad</p>
    </div>
  `;
  await sendEmail(email, "Restablecer contraseña — PachaPay", html);
}

export async function sendDisputeStatusEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  status: string,
  resolution?: string,
) {
  const statusLabel: Record<string, string> = {
    reviewing: "En revisión",
    resolved: "Resuelta",
    rejected: "Rechazada",
  };
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#FF4500">Actualización de tu disputa</h2>
      <p>Hola <strong>${customerName}</strong>, hay una actualización sobre la disputa de tu pedido <strong>#${orderId.slice(-8).toUpperCase()}</strong>.</p>
      <p>Estado: <strong>${statusLabel[status] ?? status}</strong></p>
      ${resolution ? `<p>Resolución: ${resolution}</p>` : ""}
      <p>Podés ver más detalles en <a href="https://pachapay.ar/account/orders" style="color:#FF4500">Mis Pedidos</a>.</p>
      <p style="color:#888;font-size:12px">PachaPay — el marketplace de tu comunidad</p>
    </div>
  `;
  await sendEmail(customerEmail, `Actualización de disputa — PachaPay`, html);
}
