import { supabase } from "./config/db.js";

const testConnection = async () => {
  const { data, error } = await supabase.from("stores").select("*");

  if (error) {
    console.error("❌ Error al conectar con Supabase:", error);
  } else {
    console.log("✅ Conexión exitosa con Supabase");
    console.log(data);
  }
};

testConnection();