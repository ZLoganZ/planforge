import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendInviteEmailOptions {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail =
      this.configService.get<string>('SMTP_FROM') ||
      'PlanForge <no-reply@planforge.dev>';

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`SMTP configured: ${host}:${port}`);
      } catch (err) {
        this.logger.warn(`Failed to initialize SMTP transporter: ${err}`);
      }
    } else {
      this.logger.log(
        'No SMTP credentials found in environment. Emails will be logged to console in dev mode.',
      );
    }
  }

  async sendInvitationEmail(options: SendInviteEmailOptions): Promise<boolean> {
    const { to, inviterName, workspaceName, role, inviteUrl } = options;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${workspaceName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #3b82f6); border-radius: 8px; display: inline-block; vertical-align: middle; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; display: inline-block; vertical-align: middle; margin-left: 10px; }
    .heading { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
    .lead { font-size: 15px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .cta-button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 20px 0; text-align: center; }
    .footnote { font-size: 12px; color: #6b7280; margin-top: 28px; border-top: 1px solid #1f2937; pt: 20px; padding-top: 20px; line-height: 1.5; }
    .link-fallback { color: #818cf8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <div class="logo"></div>
      <span class="title">PlanForge</span>
    </div>
    <h1 class="heading">You've been invited!</h1>
    <p class="lead">
      <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on PlanForge as <span class="badge">${role}</span>.
    </p>
    <p class="lead">
      PlanForge is the agile project management platform for tracking sprints, tasks, and team collaboration.
    </p>
    <div style="text-align: center;">
      <a href="${inviteUrl}" class="cta-button" target="_blank">Accept Invitation & Join Team</a>
    </div>
    <div class="footnote">
      <p>This invitation link expires in 7 days.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><a href="${inviteUrl}" class="link-fallback">${inviteUrl}</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to,
          subject: `You've been invited to join ${workspaceName} on PlanForge`,
          html,
        });
        this.logger.log(`Invitation email successfully dispatched to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send email to ${to}: ${err}`);
      }
    }

    // In dev / fallback mode: log prominently
    this.logger.log(
      `\n================ [EMAIL SIMULATION] ================\nTo: ${to}\nSubject: Invitation to join ${workspaceName}\nRole: ${role}\nInvite Link: ${inviteUrl}\n====================================================\n`,
    );
    return true;
  }
}
