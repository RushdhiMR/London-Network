import { requireRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_TEAM_MEMBERS, TeamMember, slugifyTeamName } from "@/lib/teamSync";

function getDbPath(): string {
  const candidatePaths = [
    path.join(process.cwd(), "data", "digital_journal_db.json"),
    path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return candidatePaths[0];
}

function getTeamFromJson(): TeamMember[] {
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.team_members)) {
          return parsed.team_members;
        }
      }
    }
  } catch (err) {
    console.warn("[/api/team] Error reading team from JSON:", err);
  }
  return DEFAULT_TEAM_MEMBERS;
}

function saveTeamToJson(team: TeamMember[]): boolean {
  try {
    const dbPath = getDbPath();
    let dbData: any = {};
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      if (raw && raw.trim()) {
        try {
          dbData = JSON.parse(raw);
        } catch {}
      }
    }
    dbData.team_members = team;
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[/api/team] Error saving team to JSON:", err);
    return false;
  }
}

export async function GET() {
  try {
    const team = getTeamFromJson();
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
      const saved = saveTeamToJson(body.team);
      if (!saved) {
        return NextResponse.json({ success: false, error: "Failed to persist team" }, { status: 500 });
      }
      return NextResponse.json({ success: true, team: body.team });
    }

    const member = body.member || body;
    if (!member || !member.name || !member.name.trim()) {
      return NextResponse.json({ success: false, error: "Member name is required" }, { status: 400 });
    }

    const currentTeam = getTeamFromJson();
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

    const saved = saveTeamToJson(updatedTeam);
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

    const currentTeam = getTeamFromJson();
    const updatedTeam = currentTeam.filter(m => {
      if (targetId && String(m.id) === String(targetId)) return false;
      if (targetSlug && m.slug === targetSlug) return false;
      if (targetEmail && m.email && m.email.toLowerCase() === targetEmail.toLowerCase()) return false;
      return true;
    });

    const saved = saveTeamToJson(updatedTeam);
    if (!saved) {
      return NextResponse.json({ success: false, error: "Failed to delete team member" }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Error deleting team member" }, { status: 500 });
  }
}
