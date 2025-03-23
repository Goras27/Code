const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// In-memory storage for OTPs
const otpStore = new Map();

// Check if required API keys are available
if (!process.env.SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY is not set");
    process.exit(1);
}

if (!process.env.SENDGRID_FROM_EMAIL) {
    console.error("SENDGRID_FROM_EMAIL is not set");
    process.exit(1);
}

if (!process.env.PASS2U_API_KEY) {
    console.error("PASS2U_API_KEY is not set");
    process.exit(1);
}

if (!process.env.PASS2U_MODEL_ID) {
    console.error("PASS2U_MODEL_ID is not set");
    process.exit(1);
}

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Pass2U configuration
const PASS2U_API_KEY = process.env.PASS2U_API_KEY;
const PASS2U_BASE_URL = 'https://api.pass2u.net/v2';

// Function to upload image to Pass2U and get hex
async function uploadImageToPass2U(imageUrl) {
    try {
        console.log("Downloading image from URL:", imageUrl);
        // Download the image first
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000 // 5 second timeout
        });
        console.log("Image downloaded successfully");

        const imageBuffer = Buffer.from(imageResponse.data);
        console.log("Image buffer created, size:", imageBuffer.length);

        // Upload to Pass2U
        console.log("Uploading image to Pass2U...");
        const response = await axios.post(`${PASS2U_BASE_URL}/images`, imageBuffer, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Content-Type': 'image/png',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        console.log("Image uploaded to Pass2U successfully");

        return response.data.hex;
    } catch (error) {
        console.error('Error uploading image to Pass2U:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
        });
        throw error;
    }
}

// Function to create Pass2U pass using our existing ID card design
async function createPass2UPass(studentData, idCardImageUrl) {
    try {
        // First upload the image and get the hex
        console.log("Attempting to upload image to Pass2U...");
        const imageHex = await uploadImageToPass2U(idCardImageUrl);
        console.log("Image uploaded successfully, hex:", imageHex);

        console.log("Creating pass with model ID:", process.env.PASS2U_MODEL_ID);
        // Create a simple pass that uses our existing ID card design
        const response = await axios.post(`${PASS2U_BASE_URL}/models/${process.env.PASS2U_MODEL_ID}/passes`, {
            // Basic pass information
            description: "TSU Student ID Card",
            organizationName: "Tennessee State University",
            
            // Visual appearance
            backgroundColor: "rgb(0, 51, 160)", // TSU Blue
            foregroundColor: "rgb(255, 255, 255)", // White
            labelColor: "rgb(255, 255, 255)", // White
            
            // Pass fields
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
                    value: studentData.classification,
                    label: "CLASSIFICATION"
                },
                {
                    key: "validUntil",
                    value: "December 1, 2026",
                    label: "VALID UNTIL"
                }
            ],

            // Pass images
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

            // Barcode configuration
            barcode: {
                message: studentData.studentId,
                format: "PKBarcodeFormatCode128",
                messageEncoding: "iso-8859-1",
                altText: studentData.studentId
            },

            // Additional settings
            sharingProhibited: true,
            voided: false,
            expirationDate: "2026-12-01T23:59:59Z"
        }, {
            headers: {
                'x-api-key': PASS2U_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log("Pass2U pass created successfully, response:", response.data);
        return {
            appleWalletUrl: `https://www.pass2u.net/d/${response.data.passId}`,
            googleWalletUrl: `https://www.pass2u.net/d/${response.data.passId}`
        };
    } catch (error) {
        console.error('Error creating Pass2U pass:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
        });
        
        // Return null URLs if Pass2U integration fails
        return {
            appleWalletUrl: null,
            googleWalletUrl: null
        };
    }
}

// Generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

// Send OTP endpoint
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    const otp = generateOTP();
    const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes

    try {
        // Store OTP with expiry time
        otpStore.set(email, { otp, expiryTime });

        const msg = {
            to: email,
            from: "spyakure@my.tnstate.edu",
            subject: "Your TSU Virtual ID OTP",
            text: `Your OTP is: ${otp}. This will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Your TSU Virtual ID OTP</h2>
                    <p>Your OTP is: <strong>${otp}</strong></p>
                    <p>This will expire in 5 minutes.</p>
                    <p>If you did not request this OTP, please ignore this email.</p>
                </div>
            `
        };

        await sgMail.send(msg);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

// Verify OTP endpoint
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);

    if (!storedData) {
        return res.status(400).json({ error: "No OTP found" });
    }

    if (Date.now() > storedData.expiryTime) {
        otpStore.delete(email);
        return res.status(400).json({ error: "OTP expired" });
    }

    if (storedData.otp === parseInt(otp)) {
        otpStore.delete(email);
        res.status(200).json({ message: "OTP verified successfully" });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

// Send ID card endpoint
app.post("/send-id-card", async (req, res) => {
    const { email, studentData } = req.body;

    if (!email || !studentData) {
        console.error("Missing required fields:", { email: !!email, studentData: !!studentData });
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        console.log("Starting ID card creation process for:", email);
        console.log("Student data received:", JSON.stringify(studentData, null, 2));

        // Read the email template
        const templatePath = path.join(__dirname, 'templates', 'email-template.html');
        console.log("Reading template from:", templatePath);
        
        try {
            let template = await fs.readFile(templatePath, 'utf8');
            console.log("Email template loaded successfully");

            // Generate barcode URL
            const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(studentData.studentId)}&code=Code128&multiplebarcodes=false&translate-esc=false&unit=mm&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&codepage=&width=200&height=50&fontname=Helvetica&fontsize=10&font=&checksum=false&istextdrawn=false`;
            console.log("Generated barcode URL:", barcodeUrl);

            // Ensure image URL is valid and accessible
            let imageUrl = studentData.imageUrl && studentData.imageUrl.trim()
                ? encodeURI(decodeURIComponent(studentData.imageUrl))
                : 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Tennessee_State_University_seal.svg/300px-Tennessee_State_University_seal.svg.png';
            console.log("Using image URL:", imageUrl);

            try {
                console.log("Creating Pass2U pass...");
                console.log("Pass2U API Key present:", !!process.env.PASS2U_API_KEY);
                console.log("Pass2U Model ID:", process.env.PASS2U_MODEL_ID);
                
                // Create Pass2U pass using our rendered ID card
                const passData = await createPass2UPass(studentData, imageUrl);
                console.log("Pass2U pass created successfully:", passData);

                // Replace all placeholders in the template
                template = template
                    .replace(/{{name}}/g, studentData.name || '')
                    .replace(/{{studentId}}/g, studentData.studentId || '')
                    .replace(/{{major}}/g, studentData.major || '')
                    .replace(/{{imageUrl}}/g, imageUrl)
                    .replace(/{{barcodeUrl}}/g, barcodeUrl)
                    .replace(/{{appleWalletUrl}}/g, passData.appleWalletUrl || '#')
                    .replace(/{{googleWalletUrl}}/g, passData.googleWalletUrl || '#');

                console.log("Template placeholders replaced successfully");
                console.log("SendGrid API Key present:", !!process.env.SENDGRID_API_KEY);
                console.log("Using sender email:", process.env.SENDGRID_FROM_EMAIL);

                // Send email using SendGrid
                const msg = {
                    to: email,
                    from: process.env.SENDGRID_FROM_EMAIL,
                    subject: "Your TSU Virtual ID Card",
                    html: template
                };

                try {
                    console.log("Sending email via SendGrid...");
                    await sgMail.send(msg);
                    console.log("Email sent successfully");
                    
                    res.status(200).json({ 
                        message: "ID card sent successfully",
                        passData: {
                            appleWalletUrl: passData.appleWalletUrl,
                            googleWalletUrl: passData.googleWalletUrl
                        }
                    });
                } catch (emailError) {
                    console.error("SendGrid Error Details:", {
                        error: emailError.message,
                        code: emailError.code,
                        response: emailError.response?.body,
                    });
                    throw new Error('Failed to send email: ' + (emailError.message || 'Unknown error'));
                }
            } catch (pass2uError) {
                console.error("Pass2U Error:", {
                    message: pass2uError.message,
                    response: pass2uError.response?.data,
                    status: pass2uError.response?.status
                });
                throw new Error('Failed to create Pass2U pass: ' + (pass2uError.message || 'Unknown error'));
            }
        } catch (templateError) {
            console.error("Template Error:", {
                message: templateError.message,
                stack: templateError.stack
            });
            throw new Error('Failed to process email template: ' + templateError.message);
        }
    } catch (error) {
        console.error("Error sending ID card:", {
            message: error.message,
            stack: error.stack,
            details: error.response?.data
        });
        res.status(500).json({ 
            error: "Failed to send ID card", 
            details: error.message
        });
    }
});

// Test endpoint to verify environment variables
app.get("/test", (req, res) => {
    const envStatus = {
        sendgrid_api: !!process.env.SENDGRID_API_KEY,
        sendgrid_email: !!process.env.SENDGRID_FROM_EMAIL,
        pass2u_api: !!process.env.PASS2U_API_KEY,
        pass2u_model: !!process.env.PASS2U_MODEL_ID
    };
    
    res.json({
        status: "Backend is working!",
        environment: envStatus
    });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
