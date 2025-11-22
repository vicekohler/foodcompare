// server/src/config/db.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // SERVICE_KEY (service_role)
export const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
