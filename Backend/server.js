const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5002;

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Pass2U API configuration
const PASS2U_API_KEY = process.env.PASS2U_API_KEY;
const PASS2U_BASE_URL = 'https://api.pass2u.net/v2';

// Function to upload image to Pass2U
async function uploadImageToPass2U(imageUrl) {
    try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        const base64Image = imageBuffer.toString('base64');
        
        const response = await axios.post(`${PASS2U_BASE_URL}/images`, {
            image: base64Image
        }, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.hex;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Function to create Pass2U pass
async function createPass2UPass(studentData, idCardImageUrl) {
    try {
        console.log("Creating pass for student:", studentData.name);
        const imageHex = await uploadImageToPass2U(idCardImageUrl);
        console.log("Image uploaded with hex:", imageHex);

        const passResponse = await axios.post(`${PASS2U_BASE_URL}/models/${process.env.PASS2U_MODEL_ID}/passes`, {
            description: "TSU Student ID Card",
            organizationName: "Tennessee State University",
            backgroundColor: "rgb(0, 51, 160)",
            foregroundColor: "rgb(255, 255, 255)",
            labelColor: "rgb(255, 255, 255)",
            fields: [
                {
                    key: "name",
                    value: studentData.name,
                    label: "NAME"
                },
                {
                    key: "studentId",
                    value: studentData.studentId,
                    label: "T NUMBER"
                },
                {
                    key: "major",
                    value: studentData.major,
                    label: "MAJOR"
                },
                {
                    key: "classification",
                    value: studentData.classification || "Student",
                    label: "CLASSIFICATION"
                },
                {
                    key: "validUntil",
                    value: "December 1, 2026",
                    label: "VALID UNTIL"
                }
            ],
            images: [
                {
                    type: "icon",
                    hex: imageHex
                },
                {
                    type: "logo",
                    hex: imageHex
                },
                {
                    type: "strip",
                    hex: imageHex
                }
            ],
            barcode: {
                message: studentData.studentId,
                format: "PKBarcodeFormatCode128",
                messageEncoding: "iso-8859-1",
                altText: studentData.studentId
            },
            sharingProhibited: false,
            voided: false,
            expirationDate: "2026-12-01T23:59:59Z"
        }, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const passId = passResponse.data.passId;
        console.log("Pass created with ID:", passId);

        return {
            passId: passId,
            appleWalletUrl: `https://pass2u.net/v1/p2u/${passId}.pkpass`,
            googleWalletUrl: `https://www.pass2u.net/d/${passId}`
        };
    } catch (error) {
        console.error('Error creating pass:', error);
        throw error;
    }
}

// Send ID card endpoint
app.post('/send-id-card', async (req, res) => {
    try {
        const { email, studentData } = req.body;
        
        if (!email || !studentData) {
            return res.status(400).json({ error: 'Email and student data are required' });
        }

        console.log("Creating pass for email:", email);
        const passData = await createPass2UPass(studentData, studentData.imageUrl);
        console.log("Pass created:", passData);

        // Read email template
        const templatePath = path.join(__dirname, 'templates', 'email-template.html');
        let emailHtml = await fs.readFile(templatePath, 'utf8');

        // Replace placeholders in template
        emailHtml = emailHtml.replace(/{{name}}/g, studentData.name)
                            .replace(/{{studentId}}/g, studentData.studentId)
                            .replace(/{{major}}/g, studentData.major)
                            .replace(/{{imageUrl}}/g, studentData.imageUrl)
                            .replace(/{{appleWalletUrl}}/g, passData.appleWalletUrl)
                            .replace(/{{googleWalletUrl}}/g, passData.googleWalletUrl);

        // Get the .pkpass file
        console.log("Downloading .pkpass file...");
        const passResponse = await axios.get(passData.appleWalletUrl, {
            responseType: 'arraybuffer'
        });
        console.log(".pkpass file downloaded");

        // Send email with pass file attached
        console.log("Sending email with pass attachment...");
        await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Your TSU Virtual ID Card',
            html: emailHtml,
            attachments: [
                {
                    content: Buffer.from(passResponse.data).toString('base64'),
                    filename: 'TSU-Student-ID.pkpass',
                    type: 'application/vnd.apple.pkpass',
                    disposition: 'attachment',
                    contentId: 'passFile'
                }
            ]
        });
        console.log("Email sent successfully");

        res.json({ 
            message: 'ID card sent successfully',
            passData: passData
        });
    } catch (error) {
        console.error('Error in /send-id-card:', error);
        res.status(500).json({ 
            error: 'Failed to send ID card',
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
