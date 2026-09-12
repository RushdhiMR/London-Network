import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET() {
  try {
    const advertiseLeads = await DB.getAllAdvertiseLeads();
    return NextResponse.json({
      success: true,
      leads: advertiseLeads
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
    const { name, submitterName, company, email, phone, whatsapp, serviceOption, requirements, budget } = body;

    const finalName = (submitterName || name || "").trim();
    if (!finalName) {
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

    if (!requirements || !requirements.trim()) {
      return NextResponse.json(
        { error: 'Inquiry details are required' },
        { status: 400 }
      );
    }

    const newLead = await DB.addAdvertiseLead({
      submitterName: finalName,
      company: company || 'N/A',
      email: email.trim(),
      phone: phone || '',
      whatsapp: whatsapp || '',
      serviceOption: serviceOption || 'Publish Company Article',
      requirements: requirements.trim(),
      budget: budget || 'Standard'
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your inquiry. Our commercial advertising team will contact you shortly.',
      lead: newLead
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
        { error: 'Lead ID and status are required' },
        { status: 400 }
      );
    }

    const updated = await DB.updateAdvertiseLeadStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { error: 'Advertise lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead status updated'
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
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const deleted = await DB.deleteAdvertiseLead(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Lead not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
