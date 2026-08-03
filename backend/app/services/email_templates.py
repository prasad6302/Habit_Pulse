def get_habit_reminder_template(habit_name: str, user_name: str = "Habit Tracker User") -> tuple[str, str]:
    """Returns (subject, html_body) for scheduled habit reminders."""
    subject = f"Time for: {habit_name}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 550px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }}
        .badge {{ background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 12px; }}
        h1 {{ font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }}
        .habit-title {{ font-size: 18px; font-weight: 700; color: #38bdf8; background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 24px; text-align: center; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-align: center; }}
        .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Habit Reminder</span>
        <h1>Daily Ritual Alert 🚀</h1>
        <p>Hi there! It's time to log your scheduled habit for today:</p>
        <div class="habit-title">✨ {habit_name}</div>
        <p>Keep your momentum strong and maintain your active streak!</p>
        <div style="text-align: center;">
          <a href="http://localhost:5174" class="btn">Check In Now ✅</a>
        </div>
        <div class="footer">Sent with ❤️ by Habit Pulse. You can adjust your quiet hours & email preferences anytime.</div>
      </div>
    </body>
    </html>
    """
    return subject, html

def get_missed_nudge_template(habit_name: str) -> tuple[str, str]:
    """Returns (subject, html_body) for missed check-in nudges."""
    subject = "You haven't checked in today"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 550px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }}
        .badge {{ background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; display: inline-block; margin-bottom: 12px; }}
        h1 {{ font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }}
        .nudge-box {{ font-size: 16px; font-weight: 700; color: #f59e0b; background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px; text-align: center; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #f59e0b, #ec4899); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-align: center; }}
        .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Streak Shield Nudge 🔥</span>
        <h1>Don't Break Your Streak!</h1>
        <p>Evening reminder: You haven't checked in on your habit today:</p>
        <div class="nudge-box">🔥 {habit_name}</div>
        <p>Take 30 seconds to complete it before midnight to save your streak!</p>
        <div style="text-align: center;">
          <a href="http://localhost:5174" class="btn">Log Completion Now 🔥</a>
        </div>
        <div class="footer">Sent with ❤️ by Habit Pulse.</div>
      </div>
    </body>
    </html>
    """
    return subject, html

def get_weekly_digest_template(total_completions: int) -> tuple[str, str]:
    """Returns (subject, html_body) for Sunday weekly digests."""
    subject = "Your week in review"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 550px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }}
        .badge {{ background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; display: inline-block; margin-bottom: 12px; }}
        h1 {{ font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }}
        .stat-box {{ font-size: 28px; font-weight: 900; color: #34d399; background: #0f172a; padding: 20px; border-radius: 16px; border: 1px solid #334155; margin-bottom: 24px; text-align: center; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #10b981, #6366f1); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-align: center; }}
        .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Weekly Digest 📊</span>
        <h1>Your Week in Review!</h1>
        <p>Awesome work this week! Here is your 7-day accomplishment summary:</p>
        <div class="stat-box">🎉 {total_completions} Habit Check-Ins</div>
        <p>View full monthly analytics and streak trends on your dashboard.</p>
        <div style="text-align: center;">
          <a href="http://localhost:5174" class="btn">View Weekly Insights 📊</a>
        </div>
        <div class="footer">Sent with ❤️ by Habit Pulse.</div>
      </div>
    </body>
    </html>
    """
    return subject, html

def get_reset_password_template(reset_url: str) -> tuple[str, str]:
    """Returns (subject, html_body) for reset password emails."""
    subject = "Reset Your Password - Habit Pulse"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 550px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }}
        .badge {{ background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 12px; }}
        h1 {{ font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-align: center; }}
        .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Password Reset</span>
        <h1>Reset Your Password 🔒</h1>
        <p>You requested to reset your password for Habit Pulse. Click the button below to set a new password. This link will expire in 1 hour.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{reset_url}" class="btn">Reset Password</a>
        </div>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <div class="footer">Sent with ❤️ by Habit Pulse.</div>
      </div>
    </body>
    </html>
    """
    return subject, html

