"use server";

import { createClient } from './supabase-server';
import { revalidatePath } from 'next/cache';
// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY!);

export async function approveListing(listingId: string, adminId: string) {
  const supabase = createClient();
  
  // 1. Update listing status
  const { error } = await supabase.from("listings").update({ status: "active", admin_notes: `Approved by ${adminId}` }).eq("id", listingId);
  if (error) throw new Error("Failed to update listing: " + error.message);
  
  // 2. Fetch landlord id and title
  const { data: listing } = await supabase
    .from("listings").select("landlord_id, title").eq("id", listingId).single();
  
  if (listing) {
    // 3. Email notifications (FCM would be another service)
    console.log(`Send push notification to landlord ${listing.landlord_id}`);
    
    // 4. Send approval email via Resend placeholder
    /*
    await resend.emails.send({
      from: "Sakeni <noreply@sakeni.app>",
      to: "landlord@example.com", // In a real app we'd fetch the landlord's email or use profile info
      subject: "Your listing is live!",
      html: `<p>Your listing <strong>${listing.title}</strong> is now live on Sakeni.</p>`
    });
    */
  }
  
  revalidatePath("/listings");
}

export async function rejectListing(listingId: string, adminId: string, reason: string) {
  const supabase = createClient();
  
  const { error } = await supabase.from("listings").update({ status: "rejected", flagged_reason: reason, admin_notes: `Rejected by ${adminId}` }).eq("id", listingId);
  if (error) throw new Error("Failed to update listing: " + error.message);
  
  revalidatePath("/listings");
}
