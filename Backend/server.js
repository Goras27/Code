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
        // Download the image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        
        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        
        // Upload to Pass2U
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
        // First upload the image and get the hex
        console.log("Attempting to upload image to Pass2U...");
        const imageHex = await uploadImageToPass2U(idCardImageUrl);
        console.log("Image uploaded successfully, hex:", imageHex);

        console.log("Creating pass with model ID:", process.env.PASS2U_MODEL_ID);
        
        // Create the pass
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
        console.log("Pass created successfully with ID:", passId);

        // Get the .pkpass file
        const downloadResponse = await axios.get(`${PASS2U_BASE_URL}/passes/${passId}/download`, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Accept': 'application/vnd.apple.pkpass'
            },
            responseType: 'arraybuffer'
        });

        return {
            passData: downloadResponse.data,
            passId: passId
        };
    } catch (error) {
        console.error('Error creating Pass2U pass:', error);
        throw error;
    }
}

// Endpoint to serve .pkpass file
app.get('/download-pass/:passId', async (req, res) => {
    try {
        const { passId } = req.params;
        
        // Download the pass from Pass2U
        const response = await axios.get(`${PASS2U_BASE_URL}/passes/${passId}/download`, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Accept': 'application/vnd.apple.pkpass'
            },
            responseType: 'arraybuffer'
        });

        // Set the correct headers for .pkpass file
        res.set({
            'Content-Type': 'application/vnd.apple.pkpass',
            'Content-Disposition': `attachment; filename=TSU-ID-${passId}.pkpass`,
            'Content-Length': response.data.length
        });

        // Send the file
        res.send(response.data);
    } catch (error) {
        console.error('Error downloading pass:', error);
        res.status(500).json({ error: 'Failed to download pass' });
    }
});

// Send ID card endpoint
app.post('/send-id-card', async (req, res) => {
    try {
        const { email, studentData } = req.body;
        
        if (!email || !studentData) {
            return res.status(400).json({ error: 'Email and student data are required' });
        }

        // Create the pass
        const { passData, passId } = await createPass2UPass(studentData, studentData.imageUrl);

        // Generate pass URLs
        const passUrls = {
            appleWalletUrl: `${process.env.BACKEND_URL || 'https://tsu-virtual-id-backend.onrender.com'}/download-pass/${passId}`,
            googleWalletUrl: `https://www.pass2u.net/d/${passId}`
        };

        // Read email template
        const templatePath = path.join(__dirname, 'templates', 'email-template.html');
        let emailHtml = await fs.readFile(templatePath, 'utf8');

        // Replace placeholders in template
        emailHtml = emailHtml.replace(/{{name}}/g, studentData.name)
                            .replace(/{{studentId}}/g, studentData.studentId)
                            .replace(/{{major}}/g, studentData.major)
                            .replace(/{{imageUrl}}/g, studentData.imageUrl)
                            .replace(/{{appleWalletUrl}}/g, passUrls.appleWalletUrl)
                            .replace(/{{googleWalletUrl}}/g, passUrls.googleWalletUrl);

        // Send email
        await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Your TSU Virtual ID Card',
            html: emailHtml,
            attachments: [
                {
                    content: passData.toString('base64'),
                    filename: 'TSU-Student-ID.pkpass',
                    type: 'application/vnd.apple.pkpass',
                    disposition: 'attachment'
                }
            ]
        });

        res.json({ 
            message: 'ID card sent successfully',
            passData: passUrls
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
