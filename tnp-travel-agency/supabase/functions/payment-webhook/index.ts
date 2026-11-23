// Provider webhook endpoint placeholder. Implement exact signature verification for
// the chosen gateway before allowing any payment status transition.
Deno.serve(async(req)=>{
 if(req.method!=='POST') return new Response('Method not allowed',{status:405});
 return Response.json({received:false,error:'Webhook verification adapter is not configured. No payment state was changed.'},{status:501});
});
