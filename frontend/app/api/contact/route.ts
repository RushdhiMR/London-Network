import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET() {
  try {
    const contactSubmissions = await DB.getAllContactSubmissions();
    return NextResponse.json({
      success: true,
      contactSubmissions
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, email, phone, whatsapp, type, message } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const newSubmission = await DB.addContactSubmission({
      name,
      company,
      email,
      phone,
      whatsapp,
      type: type || 'General Inquiry',
      message
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out. Your message has been received by our editorial and support desk.',
      submission: newSubmission
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Submission ID and status are required' },
        { status: 400 }
      );
    }

    const updated = await DB.updateContactSubmissionStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { error: 'Contact submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact submission status updated'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const removed = await DB.deleteContactSubmission(id);
    return NextResponse.json({
      success: true,
      removed
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
