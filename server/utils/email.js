const { Resend } = require('resend');

const sendEmail = async ({ to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY || 're_Jj63zeWT_BRbkrzYWK4dJxnRHNRNeDPYc';
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!apiKey) {
        console.log("\n=========================================");
        console.log(`📧 SIMULATED EMAIL TO: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content:\n${html.replace(/<[^>]*>/g, '').trim()}`);
        console.log("=========================================");
        return { simulated: true };
    }

    try {
        const resend = new Resend(apiKey);
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to,
            subject,
            html,
        });

        if (error) {
            console.error("❌ Resend Email Error:", error);
            throw new Error(error.message);
        }

        console.log(`✉️ Email sent successfully: ${data.id}`);
        return { success: true, messageId: data.id };
    } catch (err) {
        console.error("❌ Failed to send email via Resend:", err.message);
        // Fallback to simulated log in console so the developer/tester can always proceed
        console.log("\n=========================================");
        console.log(`📧 [FALLBACK SIMULATION] EMAIL TO: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content:\n${html.replace(/<[^>]*>/g, '').trim()}`);
        console.log("=========================================");
        return { simulated: true };
    }
};

module.exports = { sendEmail };
