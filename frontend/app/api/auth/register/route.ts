import { NextResponse } from 'next/server';
import { normalizeEmail, hashPassword, setAuthCookie } from '@/lib/auth';
import { DB } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      yearsOfExperience,
      years_of_experience,
      coverageAreas,
      coverage_areas,
      city,
      country,
      location,
      expertise,
      expertiseSlots,
    } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalized = normalizeEmail(email);

    if (!emailRegex.test(normalized)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userName = name.trim();
    // Public registration MUST default to 'reader' role strictly.
    const userRole: 'reader' = 'reader';

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    try {
      const expVal = yearsOfExperience !== undefined && yearsOfExperience !== '' ? Number(yearsOfExperience) : (years_of_experience !== undefined && years_of_experience !== '' ? Number(years_of_experience) : undefined);

      const rawExp = expertise ?? expertiseSlots;
      const parsedExpertise: string[] | undefined = Array.isArray(rawExp)
        ? rawExp.map((s: any) => (typeof s === 'object' && s?.topic ? String(s.topic) : String(s || '')).trim()).filter(Boolean).slice(0, 6)
        : typeof rawExp === 'string' && rawExp.trim()
          ? rawExp.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 6)
          : undefined;

      const rawAreas = coverageAreas ?? coverage_areas;
      let parsedAreas: string[] | undefined = Array.isArray(rawAreas)
        ? rawAreas.map((s: any) => String(s || '').trim()).filter(Boolean)
        : typeof rawAreas === 'string' && rawAreas.trim()
          ? rawAreas.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined;

      // If coverage areas not provided separately, automatically link with author's registered expertise slots
      if ((!parsedAreas || parsedAreas.length === 0) && parsedExpertise && parsedExpertise.length > 0) {
        parsedAreas = [...parsedExpertise];
      }

      const cleanCity = city ? String(city).trim() : undefined;
      const cleanCountry = country ? String(country).trim() : undefined;
      const cleanLocation = location ? String(location).trim() : (cleanCity && cleanCountry ? `${cleanCity}, ${cleanCountry}` : (cleanCity || cleanCountry || undefined));

      const newUser = await DB.createUser({
        name: userName,
        email: normalized,
        password_hash: passwordHash,
        role: userRole,
        provider: 'local',
        email_verified: false,
        yearsOfExperience: expVal,
        years_of_experience: expVal,
        coverageAreas: parsedAreas && parsedAreas.length > 0 ? parsedAreas : undefined,
        coverage_areas: parsedAreas && parsedAreas.length > 0 ? parsedAreas : undefined,
        city: cleanCity,
        country: cleanCountry,
        location: cleanLocation,
        expertise: parsedExpertise && parsedExpertise.length > 0 ? parsedExpertise : undefined,
      });

      const userPayload = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        provider: newUser.provider,
        yearsOfExperience: (newUser as any).yearsOfExperience,
        coverageAreas: (newUser as any).coverageAreas,
        city: (newUser as any).city,
        country: (newUser as any).country,
        location: (newUser as any).location,
        expertise: (newUser as any).expertise,
      };

      // Set HTTP-Only session cookie and return token for tab session isolation
      const token = await setAuthCookie(userPayload);

      // Send welcome email if configured
      try {
        await sendWelcomeEmail(normalized, userName);
      } catch (e) {
        console.warn('Welcome email notification skipped:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        user: userPayload,
        token,
      });
    } catch (dbError: any) {
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please log in instead.' },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
