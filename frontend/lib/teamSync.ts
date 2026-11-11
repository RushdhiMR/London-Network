export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  bio: string;
  fallbackImage: string;
  image?: string;
  slug: string;
  email: string;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "team-rushdhi-mr",
    name: "Rushdhi MR",
    role: "Founder & Technology Lead",
    department: "Editorial Leadership",
    bio: "Guides technological infrastructure, real-time news delivery systems, and long-term digital newsroom innovation.",
    fallbackImage: "https://LondonNetwork.s3.us-east-005.backblazeb2.com/avatars/1789816511545-avatar-rushdhi-1789816511534-rxjq1.webp",
    image: "https://LondonNetwork.s3.us-east-005.backblazeb2.com/avatars/1789816511545-avatar-rushdhi-1789816511534-rxjq1.webp",
    slug: "rushdhi-mr",
    email: "rushdhiriyaj2005@gmail.com",
    order: 1,
  },
  {
    id: "team-ruzni",
    name: "Ruzni",
    role: "Editorial Director",
    department: "Editorial Leadership",
    bio: "Steers editorial policy, journalistic ethics, cross-border investigations, and high-impact investigative assignments.",
    fallbackImage: "/author_beard.jpg",
    image: "/author_beard.jpg",
    slug: "ruzni",
    email: "ruzni@londonbigben.com",
    order: 2,
  },
];

export function slugifyTeamName(name: string): string {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

