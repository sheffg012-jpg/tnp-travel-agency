// Secure payment initialization endpoint. Provider-specific payloads must be mapped
// from the merchant's approved API docs; never trust an amount supplied by the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req)=>{
 if(req.method!=='POST') return new Response('Method not allowed',{status:405});
 const auth=req.headers.get('Authorization'); if(!auth) return Response.json({error:'Authentication required'},{status:401});
 const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await supabase.auth.getUser(); if(!user) return Response.json({error:'Invalid session'},{status:401});
 const body=await req.json().catch(()=>null); if(!body?.booking_id||!body?.provider) return Response.json({error:'booking_id and provider are required'},{status:400});
 const {data:booking,error}=await supabase.from('bookings').select('id,customer_id,status,quoted_amount,currency,email,customer_name,reference').eq('id',body.booking_id).single();
 if(error||!booking) return Response.json({error:'Booking not found'},{status:404});
 if(booking.customer_id!==user.id) return Response.json({error:'Not authorized for this booking'},{status:403});
 if(!booking.quoted_amount||booking.quoted_amount<=0) return Response.json({error:'Booking must have an approved quote before payment'},{status:409});
 // Intentionally fail closed until the selected provider's merchant credentials and
 // API adapter are configured. Do not create a fake checkout or report paid status.
 const provider=String(body.provider).toLowerCase();
 if(provider==='flutterwave'&&!Deno.env.get('FLW_SECRET_KEY')) return Response.json({error:'Flutterwave merchant credentials are not configured'},{status:503});
 if(provider==='mocard'&&!Deno.env.get('MOCARD_API_KEY')) return Response.json({error:'Mocard merchant credentials are not configured'},{status:503});
 if(provider==='urubutopay'&&!Deno.env.get('URUBUTOPAY_API_KEY')) return Response.json({error:'UrubutoPay merchant credentials are not configured'},{status:503});
 return Response.json({error:'Provider adapter requires approved merchant API documentation and sandbox configuration. No payment was initiated.'},{status:501});
});
