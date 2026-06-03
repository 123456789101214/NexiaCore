import cron from 'node-cron';
import mongoose from 'mongoose';
import Shop from '../models/Shop.js';
import User from '../models/User.js';
import { Resend } from 'resend';

// REQUIRED DB INDEX: db.users.createIndex({ shopId: 1, role: 1 })

const esc = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const startSubscriptionReminders = () => {
    if (!process.env.EMAIL_FROM) {
        throw new Error('[Cron] EMAIL_FROM environment variable is not configured.');
    }

    // 🚀 PRODUCTION FIX: Scheduled for 09:00 AM daily
    cron.schedule('0 9 * * *', async () => {
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ [Cron] MongoDB not connected. Skipping this run.');
            return;
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.error('❌ [Cron] RESEND_API_KEY missing. Skipping this run.');
            return;
        }
        
        const resend = new Resend(resendKey);
        console.info('🕒 [Cron] Running subscription & trial reminder job...');

        try {
            const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
            const nowUTC = Date.now();
            const nowSL = nowUTC + SL_OFFSET_MS;
            const midnightSL = nowSL - (nowSL % (24 * 60 * 60 * 1000));
            const startOfToday = new Date(midnightSL - SL_OFFSET_MS); 
            const in7DaysEnd = new Date(startOfToday.getTime() + 8 * 24 * 60 * 60 * 1000 - 1);

            // ==========================================
            // PAID PLANS
            // ==========================================
            const expiringShops = await Shop.find({
                planStatus: 'active',
                planExpiresAt: { $gte: startOfToday, $lte: in7DaysEnd }
            }).select('_id name planExpiresAt planStatus').lean();

            for (const shop of expiringShops) {
                try {
                    const daysLeft = Math.ceil((new Date(shop.planExpiresAt) - startOfToday) / (1000 * 60 * 60 * 24));
                    console.log(`[DEBUG] Shop: ${shop.name} | Expires: ${shop.planExpiresAt} | Days Left Calculated: ${daysLeft}`);
                    if (![1, 3, 7].includes(daysLeft)) {
            console.log(`[DEBUG] Skipping ${shop.name} because daysLeft is ${daysLeft}`);
            continue;
        }

                    const owner = await User.findOne({ shopId: shop._id, role: 'owner' }).select('email name').lean();
                    if (!owner || !owner.email) continue;

                    let subject, urgencyText, bgColor;
                    if (daysLeft === 1) {
                        subject = `🚨 NexiaCore: Your subscription for ${esc(shop.name)} expires TODAY`;
                        urgencyText = 'expires TODAY';
                        bgColor = '#fef2f2';
                    } else if (daysLeft === 3) {
                        subject = `⚠️ NexiaCore: ${daysLeft} days left on your Pro plan`;
                        urgencyText = `expires in ${daysLeft} days`;
                        bgColor = '#fffbeb';
                    } else {
                        subject = `📅 NexiaCore: Your Pro plan renews in ${daysLeft} days`;
                        urgencyText = `renews in ${daysLeft} days`;
                        bgColor = '#eff6ff';
                    }

                    await resend.emails.send({
                        from: process.env.EMAIL_FROM,
                        to: owner.email,
                        subject,
                        html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:16px;">
                            <h2 style="color:#0f172a;">Hi ${esc(owner.name)},</h2>
                            <div style="background:${bgColor};padding:20px;border-radius:12px;margin:20px 0;border:1px solid #cbd5e1;">
                                <p style="margin:0;font-size:16px;font-weight:bold;color:#1e293b;">
                                    Your NexiaCore Pro plan for <strong>${esc(shop.name)}</strong> ${urgencyText}.
                                </p>
                            </div>
                            <p style="font-size:14px;color:#475569;line-height:1.5;">To continue enjoying all Pro features without interruption, please renew your subscription.</p>
                            <a href="${process.env.CLIENT_URL}/settings/billing" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                                Renew Subscription Now →
                            </a>
                        </div>
                        `
                    });
                    console.info(`✅ [Cron] Reminder sent: ${owner.email} (${daysLeft} days left)`);
                } catch (emailErr) {
                    console.error(`❌ [Cron] Failed to send reminder to Shop ID ${shop._id}:`, emailErr);
                }
            }

            // ==========================================
            // TRIALS
            // ==========================================
            const expiringTrials = await Shop.find({
                planStatus: 'trial',
                trialEndsAt: { $gte: startOfToday, $lte: in7DaysEnd }
            }).select('_id name planExpiresAt planStatus trialEndsAt').lean();

            for (const shop of expiringTrials) {
                try {
                    const daysLeft = Math.ceil((new Date(shop.trialEndsAt) - startOfToday) / (1000 * 60 * 60 * 24));
                    if (![1, 3, 7].includes(daysLeft)) continue;

                    const owner = await User.findOne({ shopId: shop._id, role: 'owner' }).select('email name').lean();
                    if (!owner || !owner.email) continue;

                    await resend.emails.send({
                        from: process.env.EMAIL_FROM,
                        to: owner.email,
                        subject: `⏰ NexiaCore: Your free trial for ${esc(shop.name)} ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
                        html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:16px;">
                            <h2 style="color:#0f172a;">Hi ${esc(owner.name)},</h2>
                            <div style="background:#fffbeb;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #fef3c7;">
                                <p style="margin:0;font-size:16px;font-weight:bold;color:#b45309;">
                                    Your free trial for <strong>${esc(shop.name)}</strong> ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.
                                </p>
                            </div>
                            <p style="font-size:14px;color:#475569;line-height:1.5;">Upgrade to Pro now to secure your business data and keep accessing all features.</p>
                            <a href="${process.env.CLIENT_URL}/settings/billing" style="display:inline-block;background:#d97706;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                                Upgrade to Pro →
                            </a>
                        </div>
                        `
                    });
                    console.info(`✅ [Cron] Trial reminder sent: ${owner.email} (${daysLeft} days left)`);
                } catch (trialErr) {
                    console.error(`❌ [Cron] Failed to send trial reminder to Shop ID ${shop._id}:`, trialErr);
                }
            }
        } catch (error) {
            console.error('💥 [Cron] Fatal error in subscription reminder job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Colombo"
    });

    console.log('✅ Background Job: Subscription reminders scheduled (09:00 AM SLST)');
};