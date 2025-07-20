import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import { tenants, categories, subcategories, questions, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertTenantSchema, insertCategorySchema, insertSubcategorySchema, insertQuestionSchema } from "@shared/schema";

const router = Router();

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  // For now, assume user 10 is admin - in production, check session/JWT
  const userId = req.session?.userId || 10;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Tenant Management Routes
router.get("/tenants", requireAdmin, async (req, res) => {
  try {
    const allTenants = await db.select().from(tenants);
    res.json(allTenants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.post("/tenants", requireAdmin, async (req, res) => {
  try {
    const validatedData = insertTenantSchema.parse(req.body);
    const [newTenant] = await db.insert(tenants).values(validatedData).returning();
    res.status(201).json(newTenant);
  } catch (error) {
    res.status(400).json({ error: "Invalid tenant data", details: error });
  }
});

router.put("/tenants/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertTenantSchema.partial().parse(req.body);
    const [updatedTenant] = await db
      .update(tenants)
      .set(validatedData)
      .where(eq(tenants.id, id))
      .returning();
    res.json(updatedTenant);
  } catch (error) {
    res.status(400).json({ error: "Failed to update tenant" });
  }
});

router.delete("/tenants/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tenants).where(eq(tenants.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

// Category Management Routes (tenant-specific)
router.get("/tenants/:tenantId/categories", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const tenantCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId));
    res.json(tenantCategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/tenants/:tenantId/categories", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const validatedData = insertCategorySchema.parse({ ...req.body, tenantId });
    const [newCategory] = await db.insert(categories).values(validatedData).returning();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: "Invalid category data", details: error });
  }
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertCategorySchema.partial().parse(req.body);
    const [updatedCategory] = await db
      .update(categories)
      .set(validatedData)
      .where(eq(categories.id, id))
      .returning();
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categories).where(eq(categories.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Subcategory Management Routes
router.get("/categories/:categoryId/subcategories", requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const categorySubcategories = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.categoryId, categoryId));
    res.json(categorySubcategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

router.post("/categories/:categoryId/subcategories", requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    // Get category to ensure tenant consistency
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    const validatedData = insertSubcategorySchema.parse({ 
      ...req.body, 
      categoryId,
      tenantId: category.tenantId 
    });
    const [newSubcategory] = await db.insert(subcategories).values(validatedData).returning();
    res.status(201).json(newSubcategory);
  } catch (error) {
    res.status(400).json({ error: "Invalid subcategory data", details: error });
  }
});

router.put("/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertSubcategorySchema.partial().parse(req.body);
    const [updatedSubcategory] = await db
      .update(subcategories)
      .set(validatedData)
      .where(eq(subcategories.id, id))
      .returning();
    res.json(updatedSubcategory);
  } catch (error) {
    res.status(400).json({ error: "Failed to update subcategory" });
  }
});

router.delete("/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(subcategories).where(eq(subcategories.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subcategory" });
  }
});

// Question Management Routes (tenant-specific)
router.get("/tenants/:tenantId/questions", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const tenantQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.tenantId, tenantId))
      .limit(limit)
      .offset(offset);
    res.json(tenantQuestions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.post("/tenants/:tenantId/questions", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const validatedData = insertQuestionSchema.parse({ ...req.body, tenantId });
    const [newQuestion] = await db.insert(questions).values(validatedData).returning();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(400).json({ error: "Invalid question data", details: error });
  }
});

router.put("/questions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertQuestionSchema.partial().parse(req.body);
    const [updatedQuestion] = await db
      .update(questions)
      .set(validatedData)
      .where(eq(questions.id, id))
      .returning();
    res.json(updatedQuestion);
  } catch (error) {
    res.status(400).json({ error: "Failed to update question" });
  }
});

router.delete("/questions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(questions).where(eq(questions.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// User Management Routes (tenant-specific)
router.get("/tenants/:tenantId/users", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const tenantUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        tenantId: users.tenantId
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));
    res.json(tenantUsers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Statistics Routes
router.get("/tenants/:tenantId/stats", requireAdmin, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    const categoriesCount = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId));
      
    const subcategoriesCount = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.tenantId, tenantId));
      
    const questionsCount = await db
      .select()
      .from(questions)
      .where(eq(questions.tenantId, tenantId));
      
    const usersCount = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    res.json({
      categories: categoriesCount.length,
      subcategories: subcategoriesCount.length,
      questions: questionsCount.length,
      users: usersCount.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenant statistics" });
  }
});

export default router;