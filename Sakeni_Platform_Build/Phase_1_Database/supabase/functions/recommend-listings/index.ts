import OpenAI from "https://deno.land/x/openai/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async (req) => {
  const { student_id, viewed_listing_ids, saved_listing_ids, filters } = await req.json();
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return new Response("Missing env", { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch student profile
  const { data: profile } = await supabase.from("profiles").select("university").eq("id", student_id).single();
  
  // Fetch candidate listings
  let query = supabase
    .from("listings")
    .select("id, title, listing_type, monthly_rent, area, nearest_university, distance_to_university_km, is_furnished, has_wifi")
    .eq("status", "active")
    .limit(50);
    
  if (viewed_listing_ids && viewed_listing_ids.length > 0) {
      query = query.not("id", "in", `(${viewed_listing_ids.join(",")})`);
  }

  const { data: listings } = await query;

  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{
      role: "system",
      content: `You are a housing recommendation engine. Given a student's preferences and a list of listings, 
      return the top 5 listing IDs ranked by fit. Return JSON: { "ranked_ids": ["uuid1", "uuid2", ...] }`
    }, {
      role: "user",
      content: JSON.stringify({
        student: { university: profile?.university, filters },
        saved_ids: saved_listing_ids,
        candidates: listings
      })
    }]
  });

  const content = completion.choices[0].message.content;
  const result = content ? JSON.parse(content) : { ranked_ids: [] };
  
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
