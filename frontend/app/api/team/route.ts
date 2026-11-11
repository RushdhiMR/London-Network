import { requireRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_TEAM_MEMBERS, TeamMember, slugifyTeamName } from "@/lib/teamSync";
import { getB2Client, isB2Configured } from "@/lib/backblaze";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

const B2_TEAM_KEY = "database/team_members.json";
const TMP_JSON_PATH = path.join("/tmp", "digital_journal_db.json");

const globalForTeam = globalThis as unknown as {
  __teamMembersCache?: TeamMember[];
  __teamB2CacheTime?: number;
};

function getDbPath(): string {
  const candidatePaths = [
    TMP_JSON_PATH,
    path.join(process.cwd(), "data", "digital_journal_db.json"),
    path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return candidatePaths[1];
}

async function getTeamFromB2(): Promise<TeamMember[] | null> {
  if (!isB2Configured()) return null;
  try {
    const now = Date.now();
    if (Array.isArray(globalForTeam.__teamMembersCache) && globalForTeam.__teamB2CacheTime && (now - globalForTeam.__teamB2CacheTime < 3000)) {
      return globalForTeam.__teamMembersCache;
    }
    const client = getB2Client();
    const bucket = (process.env.B2_BUCKET_NAME || "").trim();
    if (!client || !bucket) return null;

    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: B2_TEAM_KEY }));
    const bodyStr = await res.Body?.transformToString();
    if (bodyStr && bodyStr.trim()) {
      const parsed = JSON.parse(bodyStr);
      if (Array.isArray(parsed)) {
        globalForTeam.__teamMembersCache = parsed;
        globalForTeam.__teamB2CacheTime = Date.now();
        return parsed;
      }
    }
  } catch (err: any) {
    if (err?.name !== "NoSuchKey" && err?.Code !== "NoSuchKey") {
      console.warn("[/api/team] B2 read warning:", err?.message || err);
    }
  }
  return null;
}

async function saveTeamToB2(team: TeamMember[]): Promise<boolean> {
  if (!isB2Configured()) return false;
  try {
    const client = getB2Client();
    const bucket = (process.env.B2_BUCKET_NAME || "").trim();
    if (!client || !bucket) return false;

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: B2_TEAM_KEY,
      Body: Buffer.from(JSON.stringify(team, null, 2), "utf-8"),
      ContentType: "application/json",
    }));
    globalForTeam.__teamMembersCache = team;
    globalForTeam.__teamB2CacheTime = Date.now();
    return true;
  } catch (err: any) {
    console.warn("[/api/team] B2 save warning:", err?.message || err);
    return false;
  }
}

async function getTeamFromJson(): Promise<TeamMember[]> {
  const b2Team = await getTeamFromB2();
  if (b2Team !== null) {
    return b2Team;
  }
  if (Array.isArray(globalForTeam.__teamMembersCache)) {
    return globalForTeam.__teamMembersCache;
  }
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.team_members)) {
          globalForTeam.__teamMembersCache = parsed.team_members;
          return parsed.team_members;
        }
      }
    }
  } catch (err) {
    console.warn("[/api/team] Error reading team from JSON:", err);
  }
  return DEFAULT_TEAM_MEMBERS;
}

async function saveTeamToJson(team: TeamMember[]): Promise<boolean> {
  globalForTeam.__teamMembersCache = team;
  globalForTeam.__teamB2CacheTime = Date.now();

  let saved = false;

  // 1. Save to B2 for permanent persistence across Vercel serverless invocations
  const b2Saved = await saveTeamToB2(team);
  if (b2Saved) saved = true;

  // 2. Try writing to bundled/local DB path (works on localhost)
  const localCandidates = [
    path.join(process.cwd(), "data", "digital_journal_db.json"),
    path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
  ];
  const targetLocal = localCandidates.find(p => fs.existsSync(p)) || localCandidates[0];
  try {
    let dbData: any = {};
    if (fs.existsSync(targetLocal)) {
      const raw = fs.readFileSync(targetLocal, "utf-8");
      if (raw && raw.trim()) {
        try { dbData = JSON.parse(raw); } catch {}
      }
    }
    dbData.team_members = team;
    fs.writeFileSync(targetLocal, JSON.stringify(dbData, null, 2), "utf-8");
    saved = true;
  } catch (err) {
    // Expected on Vercel read-only filesystem
  }

  // 3. Always write to /tmp for Vercel active container persistence
  try {
    let tmpData: any = {};
    if (fs.existsSync(TMP_JSON_PATH)) {
      const raw = fs.readFileSync(TMP_JSON_PATH, "utf-8");
      if (raw && raw.trim()) {
        try { tmpData = JSON.parse(raw); } catch {}
      }
    }
    tmpData.team_members = team;
    fs.writeFileSync(TMP_JSON_PATH, JSON.stringify(tmpData, null, 2), "utf-8");
    saved = true;
  } catch (err) {}

  return saved;
}

export async function GET() {
  try {
    const team = await getTeamFromJson();
    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load team" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rbac = await requireRole(req, "admin");
    if (!rbac.authorized) return rbac.response;

    const body = await req.json().catch(() => ({}));

    // If an entire array of team members is provided (e.g. for reordering)
    if (Array.isArray(body.team)) {
      const saved = await saveTeamToJson(body.team);
      if (!saved) {
        return NextResponse.json({ success: false, error: "Failed to persist team" }, { status: 500 });
      }
      return NextResponse.json({ success: true, team: body.team });
    }

    const member = body.member || body;
    if (!member || !member.name || !member.name.trim()) {
      return NextResponse.json({ success: false, error: "Member name is required" }, { status: 400 });
    }

    const currentTeam = await getTeamFromJson();
    const slug = (member.slug?.trim() || slugifyTeamName(member.name)) || `member-${Date.now()}`;
    const id = member.id || `team-${Date.now()}`;
    const newMember: TeamMember = {
      id,
      name: member.name.trim(),
      role: member.role?.trim() || "Staff Writer",
      department: member.department?.trim() || "Reporting & Editorial Desks",
      bio: member.bio?.trim() || "",
      fallbackImage: member.fallbackImage || member.image || "/author_bluesuit.jpg",
      image: member.image || member.fallbackImage || "/author_bluesuit.jpg",
      slug,
      email: member.email?.trim() || `${slug}@londonbigben.com`,
      order: typeof member.order === "number" ? member.order : currentTeam.length + 1,
      updated_at: new Date().toISOString(),
    };

    const existingIndex = currentTeam.findIndex(m => String(m.id) === String(id) || m.slug === slug);
    let updatedTeam: TeamMember[];
    if (existingIndex >= 0) {
      updatedTeam = [...currentTeam];
      updatedTeam[existingIndex] = {
        ...updatedTeam[existingIndex],
        ...newMember,
        created_at: updatedTeam[existingIndex].created_at || new Date().toISOString(),
      };
    } else {
      newMember.created_at = new Date().toISOString();
      updatedTeam = [...currentTeam, newMember];
    }

    const saved = await saveTeamToJson(updatedTeam);
    if (!saved) {
      return NextResponse.json({ success: false, error: "Failed to persist team" }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updatedTeam, member: newMember });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Error updating team" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rbac = await requireRole(req, "admin");
    if (!rbac.authorized) return rbac.response;

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const slugParam = searchParams.get("slug");
    const emailParam = searchParams.get("email");

    const body = await req.json().catch(() => ({}));
    const targetId = idParam || body.id;
    const targetSlug = slugParam || body.slug;
    const targetEmail = emailParam || body.email;

    if (!targetId && !targetSlug && !targetEmail) {
      return NextResponse.json({ success: false, error: "Missing id, slug, or email for deletion" }, { status: 400 });
    }

    const currentTeam = await getTeamFromJson();
    const updatedTeam = currentTeam.filter(m => {
      if (targetId && String(m.id) === String(targetId)) return false;
      if (targetSlug && m.slug === targetSlug) return false;
      if (targetEmail && m.email && m.email.toLowerCase() === targetEmail.toLowerCase()) return false;
      return true;
    });

    const saved = await saveTeamToJson(updatedTeam);
    if (!saved) {
      return NextResponse.json({ success: false, error: "Failed to delete team member" }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Error deleting team member" }, { status: 500 });
  }
}
