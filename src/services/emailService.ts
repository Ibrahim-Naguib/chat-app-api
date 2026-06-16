import logger from '../config/logger';
import { Resend } from 'resend';
import config from '../config/envConfig';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
}

let resendInstance: Resend | null = null;

const getResend = (): Resend | null => {
  if (!config.resendApiKey) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(config.resendApiKey);
  }
  return resendInstance;
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const resend = getResend();

  if (!resend) {
    logger.warn({ email: options.email }, 'RESEND_API_KEY not configured, skipping email');
    return;
  }

  logger.info({ email: options.email, subject: options.subject }, 'Sending email via Resend');

  const { error } = await resend.emails.send({
    from: `ChatApp <onboarding@resend.dev>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
