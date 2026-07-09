const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.EMAIL_PORT || process.env.SMTP_PORT || 587;
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!user || !pass) {
        console.log("\n=========================================");
        console.log(`📧 SIMULATED EMAIL TO: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content:\n${html.replace(/<[^>]*>/g, '').trim()}`);
        console.log("=========================================");
        return { simulated: true };
    }

    const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
            user,
            pass,
        },
    });

    const mailOptions = {
        from: `"Thiagarajar Mills Auth" <${user}>`,
        to,
        subject,
        html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
};

module.exports = { sendEmail };
