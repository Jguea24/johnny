import "server-only";
import { getConfiguredSiteUrl } from "@/lib/site-url";

export type AppointmentNotificationStatus = "sent" | "not-configured" | "failed";

type AppointmentConfirmation = {
  id: string;
  name: string;
  email: string;
  serviceTitle: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export async function sendAppointmentConfirmation(
  appointment: AppointmentConfirmation,
): Promise<AppointmentNotificationStatus> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return "not-configured";

  const dateFormatter = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: appointment.timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat("es-EC", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: appointment.timeZone,
  });
  const date = dateFormatter.format(new Date(appointment.startsAt));
  const startTime = timeFormatter.format(new Date(appointment.startsAt));
  const endTime = timeFormatter.format(new Date(appointment.endsAt));
  const name = escapeHtml(appointment.name);
  const serviceTitle = escapeHtml(appointment.serviceTitle);
  const timeZone = escapeHtml(appointment.timeZone);
  const siteUrl = getConfiguredSiteUrl()?.origin;
  const detailsUrl = siteUrl ? `${siteUrl}/citas/${appointment.id}` : "";
  const safeSubject = appointment.serviceTitle.replace(/[\r\n]/g, " ").slice(0, 100);
  const html = `
    <div style="margin:0;background:#f3f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#172642">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e1e8f2;border-radius:14px;overflow:hidden">
        <div style="padding:22px 28px;background:#08234b;color:#fff;font-size:18px;font-weight:700">Johnny Grefa <span style="color:#22c4e3">·</span> Asesoría Tecnológica</div>
        <div style="padding:28px">
          <p style="margin:0 0 8px;color:#0871d9;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Solicitud recibida</p>
          <h1 style="margin:0 0 16px;font-size:24px">Hola, ${name}</h1>
          <p style="margin:0 0 22px;line-height:1.6">Registramos tu solicitud de cita. El horario está pendiente de confirmación por administración.</p>
          <div style="border:1px solid #e1e8f2;border-radius:10px;padding:16px 18px">
            <p style="margin:0 0 12px;font-size:17px;font-weight:700">${serviceTitle}</p>
            <p style="margin:0 0 8px"><strong>Fecha:</strong> ${escapeHtml(date)}</p>
            <p style="margin:0 0 8px"><strong>Hora:</strong> ${escapeHtml(startTime)}–${escapeHtml(endTime)}</p>
            <p style="margin:0;color:#65748b;font-size:13px">Zona horaria: ${timeZone}</p>
          </div>
          ${detailsUrl ? `<p style="margin:22px 0 0"><a href="${escapeHtml(detailsUrl)}" style="color:#075bd3;font-weight:700">Ver detalle de la cita</a></p>` : ""}
          <p style="margin:24px 0 0;color:#65748b;font-size:13px;line-height:1.5">Te avisaremos cuando administración confirme o actualice la cita.</p>
        </div>
      </div>
    </div>`;
  const text = [
    "Johnny Grefa - Asesoría Tecnológica",
    `Hola, ${appointment.name}.`,
    "Registramos tu solicitud de cita. El horario está pendiente de confirmación por administración.",
    `Servicio: ${appointment.serviceTitle}`,
    `Fecha: ${date}`,
    `Hora: ${startTime}–${endTime} (${appointment.timeZone})`,
    detailsUrl ? `Ver detalle: ${detailsUrl}` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `appointment-request/${appointment.id}`,
      },
      body: JSON.stringify({
        from,
        to: [appointment.email],
        subject: `Solicitud de cita recibida: ${safeSubject}`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`Appointment notification email failed. Resend HTTP status: ${response.status}.`);
      return "failed";
    }
    return "sent";
  } catch {
    console.error("Appointment notification email failed due to a network or timeout error.");
    return "failed";
  }
}
