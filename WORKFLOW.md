# INSIDER INDIA — Booking se Project tak (step by step)

Har booking page (`/admin/bookings/<id>`) ke top par **Workflow** box dikhata hai ki kaunsa step ho gaya aur **Next** kya karna hai, ek button ke saath.

| # | Step | Kaun karega | Kahan / kaise |
|---|------|-------------|---------------|
| 1 | Customer booking karta hai | Customer | Website → Book a consultation (11 steps). Thank-you page par **approximate budget** + "final budget nahi hai" note dikhta hai. |
| 2 | Contractor assign | Admin | Booking page → Contractor box → contractor chuno → **Assign contractor**. Customer + contractor ko notification. |
| 3 | Site visit schedule | Contractor / Admin | Booking page → Site visits → **Schedule visit** (date-time). Customer ko WhatsApp/in-app. |
| 4 | Site visit complete | Contractor | Site visits → **Complete** → site condition + photos/documents upload. |
| 5 | Measurements | Contractor | **Open measurement sheet** → rooms + measurements (width/height/length, unit) → **Save and finalise** (sheet lock ho jaati hai; admin "Reopen" kar sakta hai). |
| 6 | Quotation banana | Contractor | Booking page → Quotations → **Create quotation** → editor mein **Add from measurements** (har room = section, har measurement = item with quantity & unit) → har item mein Material ₹/unit + Labour ₹/unit (ya Unit price) bharo → material/finish/description → **Save**. |
| 7 | Admin review ke liye bhejna | Contractor | Editor → **Submit for admin review**. Ab contractor edit nahi kar sakta, customer ko abhi nahi dikhta. |
| 8 | Admin review | Admin | Rates check karo; price badloge to **reason** maangega (audit log + price-change history). Discount, GST, validity, payment schedule (100% total) daalo → **Preview PDF**. Galti ho to **Return to contractor**. |
| 9 | Customer ko bhejna | Admin | **Approve & send to customer** → PDF banta hai, customer ko WhatsApp + dashboard notification. |
| 10 | Customer ka jawab | Customer | Dashboard → Quotations → **Accept** / **Request revision** / **Decline**. Revision par admin **Create revision** (V2, V3…) → update → Approve & send dobara. Purane versions safe rehte hain. |
| 11 | Project | Admin | Accept hote hi project ban jaata hai → Console → Projects → **Start project** → stages (Design → … → Handover) → milestones, payments, site photo updates. Customer dashboard mein sab dikhta hai. |

## Budget kahan dikhta hai
- **Estimate calculator** se aaye customer: unka chosen package + range.
- **Direct booking**: booking ke time BHK + typical rooms + chune hue services se automatic indicative budget (budget answer ke sabse paas wala package). Customer ke thank-you page, dashboard, booking page aur admin booking page par — hamesha "final budget nahi hai" note ke saath. Final price sirf quotation mein.

## OTP (provider lagne tak)
`backend/.env` mein `OTP_FIXED_CODE=1234` → har OTP **1234**, kuch send nahi hota, OTP screen par "Testing mode" hint. Provider (MSG91/Meta WhatsApp…) Admin → Settings mein lagao, phir `OTP_FIXED_CODE` hata do. Production (`NODE_ENV=production`) mein ye tabhi chalega jab `ALLOW_FIXED_OTP=true` ho — live site par kabhi mat rakhna (koi bhi kisi bhi customer number se login kar lega).
