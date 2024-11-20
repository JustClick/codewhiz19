import { NextResponse } from "next/server";
import sgMail from '@sendgrid/mail';

export async function POST(request: Request) {
  console.log('API Route - Environment Check:', {
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    hasContactEmail: !!process.env.CONTACT_EMAIL,
    nodeEnv: process.env.NODE_ENV
  });

  // Check for required environment variables
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key missing. Available env vars:', Object.keys(process.env));
    return NextResponse.json(
      { 
        success: false, 
        error: "SendGrid API key is not configured",
        debug: {
          env: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }

  if (!process.env.CONTACT_EMAIL) {
    console.error('Contact email missing');
    return NextResponse.json(
      { 
        success: false, 
        error: "Contact email is not configured",
        debug: {
          env: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }

  // Set SendGrid API key
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (error) {
    console.error('Error setting SendGrid API key:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Error initializing email service",
        debug: {
          message: error instanceof Error ? error.message : "Unknown error",
          env: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    console.log('Received form submission:', { name, email, subject, messageLength: message?.length });

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: "All fields are required",
          debug: {
            missing: {
              name: !name,
              email: !email,
              subject: !subject,
              message: !message
            }
          }
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid email format" 
        },
        { status: 400 }
      );
    }

    const msg = {
      to: process.env.CONTACT_EMAIL,
      from: {
        email: 'noreply@codewhiz.co',
        name: 'CodeWhiz Contact Form'
      },
      replyTo: email,
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">New Contact Form Submission</h2>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p style="margin-top: 20px;"><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    };

    try {
      console.log('Attempting to send email...');
      await sgMail.send(msg);
      console.log('Email sent successfully');
      return NextResponse.json({ 
        success: true,
        message: "Email sent successfully"
      });
    } catch (sendError: any) {
      console.error('SendGrid error details:', {
        message: sendError.message,
        response: sendError.response?.body,
        stack: sendError.stack
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to send email",
          debug: {
            message: sendError.message,
            response: sendError.response?.body,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "An unexpected server error occurred",
        debug: {
          message: error instanceof Error ? error.message : "Unknown error",
          env: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}