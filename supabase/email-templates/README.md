# Email templates

Paste each file into Supabase → Authentication → Emails → Templates (needs custom SMTP).
All of them send a one-time code ({{ .Token }}); the link is a fallback.

| Template | File | Subject |
|---|---|---|
| Confirm signup | confirm-signup.html | Your Rank Culture code to confirm your email |
| Reset password | reset-password.html | Your Rank Culture password reset code |
| Magic link | magic-link.html | Your Rank Culture sign-in code |
| Change email address | change-email.html | Confirm your new email for Rank Culture |
| Reauthentication | reauthentication.html | Confirm it's you — Rank Culture |

Codes are 8 digits (Authentication → Email → Email OTP length). The site accepts 6–8.
