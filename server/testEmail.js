// server/testEmail.js
import 'dotenv/config'; // .env load වෙන්න
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: 'janadev26@gmail.com', // මෙතනට ඔයාගේ email එක දාන්න
        subject: 'NexiaCore Test',
        html: '<p>Email works!</p>'
    });
    if (error) console.error('Error:', error);
    else console.log('Success:', data);
}

testEmail();