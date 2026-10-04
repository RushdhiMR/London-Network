import nodemailer from 'nodemailer';

// SMTP Transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
  },
});

export async function sendSignInNotificationEmail(email: string, name: string) {
  const timeString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #000000; padding: 24px; text-align: center; border-top: 6px solid #165c61;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">London BigBen Network</h1>
      </div>
      
      <div style="padding: 32px; color: #27272a; line-height: 1.6;">
        <h2 style="color: #18181b; margin-top: 0; font-size: 20px;">Security Alert: Successful Sign-In</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We detected a new successful sign-in to your London BigBen Network account associated with <strong>${email}</strong>.</p>
        
        <div style="background-color: #f4f4f5; border-left: 4px solid #BF1E2D; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #52525b;"><strong>Sign-In Time:</strong> ${timeString}</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #52525b;"><strong>Account Email:</strong> ${email}</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #52525b;"><strong>Status:</strong> Authenticated</p>
        </div>

        <p style="font-size: 14px; color: #71717a;">If this was you, no further action is required. If you did not initiate this sign-in, please reset your password immediately.</p>
      </div>

      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} London BigBen Network. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"London BigBen Network Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Security Alert: Successful Sign-In to London BigBen Network`,
        html: htmlContent,
      });
      console.log(`[Email Service] Sent sign-in notification email to ${email}`);
    } else {
      console.log(`[Email Notification Triggered] Email for ${email} (${name}). Set SMTP_USER and SMTP_PASS in .env.local to send live inbox emails.`);
    }
    return true;
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${email}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #000000; padding: 24px; text-align: center; border-top: 6px solid #165c61;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">London BigBen Network</h1>
      </div>
      
      <div style="padding: 32px; color: #27272a; line-height: 1.6;">
        <h2 style="color: #18181b; margin-top: 0; font-size: 20px;">Welcome to London BigBen Network!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for creating an account with London BigBen Network. Your account <strong>${email}</strong> has been successfully registered.</p>
        
        <p style="font-size: 14px; color: #71717a;">You now have full access to our independent journalism, industry insights, and technology analysis.</p>
      </div>

      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} London BigBen Network. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"London BigBen Network Team" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Welcome to London BigBen Network, ${name}!`,
        html: htmlContent,
      });
    }
    return true;
  } catch (error) {
    console.error(`[Email Service Error] Failed to send welcome email to ${email}:`, error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #000000; padding: 24px; text-align: center; border-top: 6px solid #BF1E2D;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">London BigBen Network</h1>
      </div>
      
      <div style="padding: 32px; color: #27272a; line-height: 1.6;">
        <h2 style="color: #18181b; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for your London BigBen Network account associated with <strong>${email}</strong>.</p>
        
        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #BF1E2D; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
        </div>

        <p style="font-size: 13px; color: #71717a;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #BF1E2D;">${resetUrl}</a></p>
        
        <p style="font-size: 13px; color: #71717a; margin-top: 24px;">This reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      </div>

      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} London BigBen Network. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"London BigBen Network Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Reset Your London BigBen Network Password`,
        html: htmlContent,
      });
      console.log(`[Email Service] Sent password reset email to ${email}`);
    } else {
      console.log(`[Password Reset Triggered] Link for ${email}: ${resetUrl}`);
    }
    return true;
  } catch (error) {
    console.error(`[Email Service Error] Failed to send password reset email to ${email}:`, error);
    return false;
  }
}

export async function sendArticleDistributionEmail(
  recipientEmail: string,
  article: {
    title: string;
    summary: string;
    category: string;
    authorName: string;
    slug: string;
    imageUrl?: string;
    readTime?: string;
  },
  baseUrl?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) {
    const errorMsg = 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in frontend/.env.local';
    console.error(`[Email Service Error] Cannot send to ${recipientEmail}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const rawBase = (
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).trim();
  const appUrl = rawBase.replace(/\/+$/, '');
  const categorySlug = (article.category || 'news').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const articleSlug = (article.slug || '').trim().replace(/[^a-z0-9-]+/g, '-');
  const articleUrl = `${appUrl}/${categorySlug}/${articleSlug}`;
  const year = new Date().getFullYear();

  const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  const categoryLabel = (article.category || 'News').toUpperCase();
  const excerpt = (article.summary || '').slice(0, 220) + ((article.summary || '').length > 220 ? '...' : '');
  const authorDisplay = article.authorName ? `By ${article.authorName}` : 'By Staff Journalist';
  const appDomain = appUrl.replace(/^https?:\/\//, '');
  const logoUrl = (
    process.env.EMAIL_LOGO_URL ||
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://') && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost') ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/header_logo.png` : null) ||
    'https://f005.backblazeb2.com/file/LondonNetwork/media/header_logo.png'
  );

  const htmlContent = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background-color: #f5f4f0;">

      <div style="background-color: #ffffff; border: 1px solid #ddd;">

        <!-- Top domain bar -->
        <div style="text-align: center; padding: 14px 32px 0 32px;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; letter-spacing: 1px; font-family: Arial, sans-serif;">${appDomain}</p>
        </div>

        <!-- Brand logo masthead -->
        <div style="text-align: center; padding: 10px 32px 0 32px;">
          <img src="${logoUrl}" alt="London BigBen Network" width="200" style="display: inline-block; max-width: 200px; height: auto;" />
          <div style="margin: 6px auto 14px auto; text-align: center;">
            <div style="display: inline-block; width: 30px; height: 2px; background-color: #BF1E2D; vertical-align: middle;"></div>
            <div style="display: inline-block; width: 80px; height: 1px; background-color: #BF1E2D; vertical-align: middle; margin: 0 3px;"></div>
            <div style="display: inline-block; width: 30px; height: 2px; background-color: #BF1E2D; vertical-align: middle;"></div>
          </div>
        </div>

        <!-- Category + Date -->
        <div style="text-align: center; padding: 4px 32px 16px 32px; border-bottom: 1px solid #ddd;">
          <p style="margin: 0 0 5px 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #111827; font-family: Arial, sans-serif;">${categoryLabel}</p>
          <p style="margin: 0; font-size: 10px; color: #9ca3af; letter-spacing: 2px; font-family: Arial, sans-serif; text-transform: uppercase;">${formattedDate}</p>
        </div>

        <!-- Article row: image left, text right -->
        <div style="padding: 22px 28px; border-bottom: 1px solid #ddd;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
            <tr>
              ${(article.imageUrl && (article.imageUrl.startsWith('https://') || article.imageUrl.startsWith('http://'))) ? `<td width="180" valign="top" style="padding-right: 20px;"><img src="${article.imageUrl}" alt="${article.title}" width="180" style="display: block; width: 180px; max-width: 180px; height: auto;" /></td>` : ''}
              <td valign="top">
                <p style="margin: 0 0 10px 0; font-size: 17px; font-weight: 800; line-height: 1.4; color: #111827; font-family: Georgia, serif;">${article.title}</p>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: #4b5563; line-height: 1.65; font-family: Arial, sans-serif;">${excerpt}</p>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; font-family: Arial, sans-serif;">${authorDisplay}</p>
                <a href="${articleUrl}" style="font-size: 13px; font-weight: 700; color: #BF1E2D; text-decoration: underline; font-family: Arial, sans-serif; letter-spacing: 0.5px; text-transform: uppercase;">READ FULL ARTICLE &raquo;</a>
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="padding: 14px 32px; text-align: center; font-size: 11px; color: #9ca3af; font-family: Arial, sans-serif; background-color: #f9f9f7;">
          <p style="margin: 0;">You are receiving this because you were added as a targeted recipient for this article.</p>
          <p style="margin: 6px 0 0 0;">&copy; ${year} London BigBen Network. All rights reserved.</p>
        </div>

      </div>

    </div>
  `;

  try {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

    const clientTransporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const info = await clientTransporter.sendMail({
      from: `"London BigBen Network" <${smtpUser}>`,
      to: recipientEmail,
      subject: `[London BigBen] ${article.title}`,
      html: htmlContent,
    });

    console.log(`[Email Service] Sent article distribution email to ${recipientEmail} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    const errorMsg = error?.message || 'SMTP delivery failed';
    console.error(`[Email Service Error] Failed to send article distribution email to ${recipientEmail}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
