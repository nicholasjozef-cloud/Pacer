import { pgTable, text, uuid, integer, boolean, date, timestamp, jsonb, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User settings table - matches Supabase user_settings
export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  bodyWeight: integer("body_weight").default(168),
  targetTime: text("target_time").default("2:59:59"),
  raceDate: date("race_date"),
  inTrainingPlan: boolean("in_training_plan").default(false),
  totalTrainingWeeks: integer("total_training_weeks").default(16),
  currentWeek: integer("current_week").default(1),
  trainingStartDate: date("training_start_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Day details table - matches Supabase day_details
export const dayDetails = pgTable("day_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  workoutType: text("workout_type"),
  miles: real("miles"),
  pace: text("pace"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fats: integer("fats"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Strava connections table
export const stravaConnections = pgTable("strava_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  athleteId: text("athlete_id").notNull(),
  athleteData: jsonb("athlete_data"),
  expiresAt: timestamp("expires_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertDayDetailsSchema = createInsertSchema(dayDetails).omit({
  id: true,
  updatedAt: true,
});

// TypeScript types
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type DayDetails = typeof dayDetails.$inferSelect;
export type InsertDayDetails = z.infer<typeof insertDayDetailsSchema>;

export type StravaConnection = typeof stravaConnections.$inferSelect;

// Frontend-friendly types
export interface UserSettingsData {
  bodyWeight: number;
  targetTime: string;
  raceDate: string | null;
  inTrainingPlan: boolean;
  totalTrainingWeeks: number;
  currentWeek: number;
  trainingStartDate: string | null;
}

export interface DayDetailsData {
  workout: string | null;
  miles: number | null;
  pace: string | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  notes: string | null;
}

export interface Workout {
  day: string;
  type: string;
  planned: number;
  actual: number | null;
  pace: string | null;
  fromStrava?: boolean;
  stravaDate?: string;
}

export interface TrainingPlan {
  [week: number]: Workout[];
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city?: string;
  state?: string;
  country?: string;
}

// Workout types for color coding
export type WorkoutType = 'Rest' | 'Easy' | 'Recovery' | 'Tempo' | 'Intervals' | 'Long Run';

export const WORKOUT_TYPES: WorkoutType[] = ['Rest', 'Easy', 'Recovery', 'Tempo', 'Intervals', 'Long Run'];

// Keep legacy user type for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
