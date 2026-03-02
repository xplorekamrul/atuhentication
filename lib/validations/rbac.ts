import "server-only";
import * as z from "zod";

// Role validation
export const roleCreateSchema = z.object({
   name: z.string().min(2).max(50, "Role name must be 50 characters or less"),
});

export const roleUpdateSchema = roleCreateSchema.extend({
   id: z.string(),
});

export const roleDeleteSchema = z.object({
   id: z.string(),
});

export const roleListSchema = z.object({
   page: z.number().int().min(1).default(1),
   pageSize: z.number().int().min(1).max(100).default(10),
   q: z.string().trim().optional(),
});

// RouteGroup validation
export const routeGroupCreateSchema = z.object({
   name: z.string().min(2).max(100, "Route group name must be 100 characters or less"),
});

export const routeGroupUpdateSchema = routeGroupCreateSchema.extend({
   id: z.string(),
});

export const routeGroupDeleteSchema = z.object({
   id: z.string(),
});

export const routeGroupListSchema = z.object({
   page: z.number().int().min(1).default(1),
   pageSize: z.number().int().min(1).max(100).default(10),
   q: z.string().trim().optional(),
});

// Route validation
export const routeCreateSchema = z.object({
   path: z.string().min(1).max(255, "Route path must be 255 characters or less"),
   name: z.string().min(1).max(100, "Route name must be 100 characters or less"),
   groupId: z.string(),
   visibleToAdmin: z.boolean().default(true),
   visibleToSuperAdmin: z.boolean().default(true),
   editableByAdmin: z.boolean().default(false),
   editableBySuperAdmin: z.boolean().default(true),
});

export const routeUpdateSchema = routeCreateSchema.extend({
   id: z.string(),
});

export const routeDeleteSchema = z.object({
   id: z.string(),
});

export const routeListSchema = z.object({
   page: z.number().int().min(1).default(1),
   pageSize: z.number().int().min(1).max(100).default(10),
   q: z.string().trim().optional(),
   groupId: z.string().optional(),
});

// Role-RouteGroup assignment
export const roleRouteGroupAssignSchema = z.object({
   roleId: z.string(),
   groupIds: z.array(z.string()).min(1, "Select at least one route group"),
});

// User-Role assignment
export const assignUserToRoleSchema = z.object({
   userId: z.string().or(z.number()),
   roleId: z.string().or(z.number()),
});

export const removeUserFromRoleSchema = z.object({
   userId: z.string().or(z.number()),
   roleId: z.string().or(z.number()),
});

export const assignMultipleRolesToUserSchema = z.object({
   userId: z.string().or(z.number()),
   roleIds: z.array(z.string().or(z.number())).min(1, "At least one role is required"),
});

export type RoleCreateValues = z.infer<typeof roleCreateSchema>;
export type RouteGroupCreateValues = z.infer<typeof routeGroupCreateSchema>;
export type RouteCreateValues = z.infer<typeof routeCreateSchema>;
