const { z } = require("zod");

const CompanyType = z.enum([
  "startup_b2b",
  "startup_b2c",
  "agency",
  "vc",
  "saas",
  "enterprise",
  "ngo",
  "other",
]);

const StatusLabel = z.enum(["released", "working_since"]);

const Designer = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

const ImageMobile = z.object({
  src: z.string().min(1),
  srcset: z.string().optional().default(""),
  sizes: z.string().min(1),
  alt: z.string().min(1),
});

const ImageDesktopFull = z.object({
  backgroundImageUrl: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const Images = z.object({
  mobile: ImageMobile,
  desktopFull: ImageDesktopFull,
});

const Project = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  url: z.string().min(1),
  titleLine: z.string().min(1),
  featured: z.boolean().optional().default(false),
  companyType: CompanyType,
  statusLabel: StatusLabel,
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  designer: Designer.optional(),
  contributions: z.array(z.string()).default([]),
  caseStudyNotes: z.string().optional(),
  images: Images,
});

const ProjectsFile = z.object({
  version: z.number().int().min(1),
  projects: z.array(Project),
});

module.exports = { ProjectsFile, Project, CompanyType, StatusLabel };

