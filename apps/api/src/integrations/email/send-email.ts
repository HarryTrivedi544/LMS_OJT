import nodemailer from "nodemailer";

import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
});

export const sendEmail = async (input: {
  to: string;
  subject: string;
  text: string;
  icalAttachment?: {
    filename: string;
    content: string;
  };
}) => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log(`[email skipped] ${input.to}: ${input.subject}`);
    return false;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    text: input.text,
    icalEvent: input.icalAttachment
      ? {
          filename: input.icalAttachment.filename,
          method: "REQUEST",
          content: input.icalAttachment.content,
        }
      : undefined,
  });

  return true;
};
