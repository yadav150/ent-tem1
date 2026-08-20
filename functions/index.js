const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Twilio client (credentials from environment variables)
const accountSid = functions.config().twilio.account_sid;
const authToken = functions.config().twilio.auth_token;
const client = twilio(accountSid, authToken);

// Twilio WhatsApp number (sender)
const FROM_WHATSAPP = functions.config().twilio.whatsapp_from || 'whatsapp:+14155238886'; // Sandbox default

// Admin's WhatsApp number (recipient)
const ADMIN_WHATSAPP = functions.config().twilio.admin_whatsapp_to;

// Firestore collection name
const COLLECTION = 'appointments';

/**
 * HTTP Cloud Function.
 * Endpoint: https://your-region-your-project.cloudfunctions.net/submitAppointment
 *
 * Expects POST with JSON body containing:
 *   fullName, phone, email, address, service, date, time, notes (optional)
 */
exports.submitAppointment = functions.https.onRequest(async (req, res) => {
    // Enable CORS for your frontend domain (adjust as needed)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
        return;
    }

    try {
        const data = req.body;

        // Basic validation
        const required = ['fullName', 'phone', 'email', 'address', 'service', 'date', 'time'];
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                res.status(400).json({ error: `Missing required field: ${field}` });
                return;
            }
        }

        // Sanitize and trim
        const appointment = {
            fullName: data.fullName.trim(),
            phone: data.phone.trim(),
            email: data.email.trim(),
            address: data.address.trim(),
            service: data.service.trim(),
            date: data.date.trim(),
            time: data.time.trim(),
            notes: (data.notes || '').trim(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };

        // 1. Save to Firestore
        const docRef = await admin.firestore().collection(COLLECTION).add(appointment);
        const docId = docRef.id;

        // 2. Send WhatsApp notification to admin
        const messageBody = `
🚨 *New Appointment Request*

👤 *Name:* ${appointment.fullName}
📞 *Phone:* ${appointment.phone}
✉️ *Email:* ${appointment.email}
📍 *Address:* ${appointment.address}
🛠️ *Service:* ${appointment.service}
📅 *Date:* ${appointment.date}
⏰ *Time:* ${appointment.time}
📝 *Notes:* ${appointment.notes || 'None'}
🆔 *Ref:* ${docId}
        `.trim();

        // Ensure admin WhatsApp number is configured
        if (ADMIN_WHATSAPP) {
            await client.messages.create({
                body: messageBody,
                from: FROM_WHATSAPP,
                to: ADMIN_WHATSAPP
            });
        } else {
            console.warn('Admin WhatsApp number not configured. Skipping message.');
        }

        // 3. Respond to client
        res.status(200).json({
            success: true,
            message: 'Appointment booked successfully.',
            id: docId
        });

    } catch (error) {
        console.error('Error processing appointment:', error);
        res.status(500).json({
            error: 'Internal server error. Please try again later.'
        });
    }
});
