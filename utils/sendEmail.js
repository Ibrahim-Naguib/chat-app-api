import nodemailer from 'nodemailer';
import config from '../config/envConfig.js';

const sendEmail = async (options) => {
  // 1) Create transporter ( service that will send email like "gmail","Mailgun", "mialtrap", sendGrid)
  const transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort, // if secure false port = 587, if true port= 465
    secure: true,
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
  });

  // 2) Define email options (like from, to, subject, email content)
  const mailOpts = {
    from: `ChatApp <${config.emailUser}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) Send email
  await transporter.sendMail(mailOpts);
};

export default sendEmail;
