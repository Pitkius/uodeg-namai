import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom) return null;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

export async function sendPasswordResetCodeEmail(toEmail, code) {
  const resetLink = `${env.clientOrigin}/login?reset=1&email=${encodeURIComponent(toEmail)}&code=${encodeURIComponent(code)}`;
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(`[reset-code] ${toEmail}: ${code}; link: ${resetLink}`);
    return;
  }

  await tx.sendMail({
    from: env.smtpFrom,
    to: toEmail,
    subject: "Slaptazodzio keitimo kodas",
    text: `Jusu slaptazodzio keitimo kodas: ${code}. Kodas galioja ${env.resetCodeTtlMinutes} min.\n\nNuoroda keitimui: ${resetLink}`,
    html: `<p>Jusu slaptazodzio keitimo kodas: <b>${code}</b></p><p>Kodas galioja ${env.resetCodeTtlMinutes} min.</p><p>Arba atidarykite nuoroda: <a href="${resetLink}">${resetLink}</a></p>`
  });
}

export async function sendWelcomeEmail(toEmail, name) {
  const tx = getTransporter();
  const safeName = name || "vartotojau";
  if (!tx) {
    // eslint-disable-next-line no-console
    console.warn(
      "[mail] Welcome email NOT sent: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM on the server."
    );
    // eslint-disable-next-line no-console
    console.log(`[welcome-email] ${toEmail}: account created for ${safeName} (console only)`);
    return;
  }

  await tx.sendMail({
    from: env.smtpFrom,
    to: toEmail,
    subject: "Paskyra sukurta sekmingai",
    text: `Sveiki, ${safeName}. Jusu paskyra sekmingai sukurta.`,
    html: `<p>Sveiki, <b>${safeName}</b>.</p><p>Jusu paskyra sekmingai sukurta.</p>`
  });
}

export async function sendPasswordChangedEmail(toEmail, name) {
  const tx = getTransporter();
  const safeName = name || "vartotojau";
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(`[password-changed-email] ${toEmail}: password changed for ${safeName}`);
    return;
  }

  await tx.sendMail({
    from: env.smtpFrom,
    to: toEmail,
    subject: "Slaptazodis sekmingai pakeistas",
    text: `Sveiki, ${safeName}. Jusu paskyros slaptazodis buvo sekmingai pakeistas.`,
    html: `<p>Sveiki, <b>${safeName}</b>.</p><p>Jusu paskyros slaptazodis buvo sekmingai pakeistas.</p>`
  });
}

export async function sendContactMessageEmail({ name, email, phone, message }) {
  const tx = getTransporter();
  const toEmail = env.contactInboxEmail || env.smtpFrom;
  const subject = `Nauja zinute is kontaktu formos (${name})`;
  const plain = [
    "Gauta nauja zinute is svetaineje esancios kontaktu formos.",
    "",
    `Vardas: ${name}`,
    `El. pastas: ${email}`,
    `Telefonas: ${phone || "-"}`,
    "",
    "Zinute:",
    message
  ].join("\n");

  if (!toEmail) {
    // eslint-disable-next-line no-console
    console.warn("[mail] Contact form email NOT sent: CONTACT_INBOX_EMAIL/SMTP_FROM is missing.");
    // eslint-disable-next-line no-console
    console.log(`[contact-message] from=${email}, name=${name}, phone=${phone || "-"}\n${message}`);
    return;
  }

  if (!tx) {
    // eslint-disable-next-line no-console
    console.warn("[mail] Contact form email NOT sent: SMTP not configured.");
    // eslint-disable-next-line no-console
    console.log(`[contact-message->${toEmail}] ${plain}`);
    return;
  }

  await tx.sendMail({
    from: env.smtpFrom || toEmail,
    to: toEmail,
    replyTo: email,
    subject,
    text: plain,
    html: `
      <p><b>Gauta nauja zinute is kontaktu formos.</b></p>
      <p><b>Vardas:</b> ${name}</p>
      <p><b>El. pastas:</b> ${email}</p>
      <p><b>Telefonas:</b> ${phone || "-"}</p>
      <p><b>Zinute:</b></p>
      <p>${String(message).replace(/\n/g, "<br/>")}</p>
    `
  });
}
