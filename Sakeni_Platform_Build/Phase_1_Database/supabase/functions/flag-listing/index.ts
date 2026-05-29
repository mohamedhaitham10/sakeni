import OpenAI from "https://deno.land/x/openai/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async (req) => {
  const { record } = await req.json(); // incoming webhook payload from Supabase
  if (!record) return new Response("No record provided", { status: 400 });
  
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  const prompt = `
    You are a fraud detection system for a student housing platform in Egypt.
    Score this listing for fraud risk from 0.00 (safe) to 1.00 (high risk).
    Flag if: price is unrealistically low, description is vague/copy-pasted,
    contains phone numbers, off-platform contact, or is identical to another listing.
    
    Listing: ${JSON.stringify(record)}
    
    Return JSON: { "score": 0.00, "reasons": ["reason1", "reason2"] }
  `;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: prompt }]
  });

  const content = completion.choices[0].message.content;
  const result = content ? JSON.parse(content) : { score: 0.0, reasons: [] };
  
  if (result.score > 0.7) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
            .from("listings")
            .update({ 
                status: 'flagged', 
                ai_flag_score: result.score, 
                flagged_reason: result.reasons?.join(", ") 
            })
            .eq("id", record.id);
    }
  }
  
  return new Response(JSON.stringify({ success: true, ai_flag_score: result.score }), { headers: { "Content-Type": "application/json" } });
});
