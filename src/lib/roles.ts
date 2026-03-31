export const USER_ROLES = [
  "PROJECT_MANAGER",
  "ACCOUNT_MANAGER",
  "WEB_DEVELOPER",
  "WEB_DESIGNER",
  "ANALYTICS",
  "SEO",
  "CONTENT_WRITER",
  "SUPERUSER",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const NON_SUPERUSER_ROLES = USER_ROLES.filter((r) => r !== "SUPERUSER") as unknown as readonly Exclude<UserRole, "SUPERUSER">[];

export const ROLE_LABELS: Record<UserRole, string> = {
  PROJECT_MANAGER: "Project Manager",
  ACCOUNT_MANAGER: "Account Manager",
  WEB_DEVELOPER: "Web Developer",
  WEB_DESIGNER: "Web Designer",
  ANALYTICS: "Analytics",
  SEO: "SEO",
  CONTENT_WRITER: "Content Writer",
  SUPERUSER: "Superuser",
};

export function isSuperuser(role: string | undefined): boolean {
  return role === "SUPERUSER";
}
