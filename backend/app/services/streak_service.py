from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import pytz

from app.models.habit import Habit
from app.models.checkin import CheckIn
from app.models.notification import ScheduledNotification

class StreakService:
    @staticmethod
    def get_user_local_date(user_timezone: str) -> date:
        """Returns the current date in the user's local timezone."""
        try:
            tz = pytz.timezone(user_timezone)
        except Exception:
            tz = pytz.UTC
        return datetime.now(tz).date()

    @classmethod
    def calculate_streak_stats(cls, habit: Habit, checkins: List[CheckIn], user_timezone: str) -> Dict[str, Any]:
        """
        Calculates streak metrics (current streak, longest streak, completion rate, milestones)
        based on the habit's frequency and check-in history.
        """
        if not checkins:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "total_completions": 0,
                "completion_rate": 0.0,
                "unlocked_milestones": []
            }

        # Extract local check-in dates and sort them
        checkin_dates = sorted(list(set(ci.completed_date for ci in checkins)))
        total_completions = len(checkin_dates)
        
        current_local_date = cls.get_user_local_date(user_timezone)
        
        current_streak = 0
        longest_streak = 0
        
        freq_type = habit.frequency.type
        
        if freq_type == "daily":
            # --- DAILY STREAK ---
            # If habit is paused, preserve current streak based on last active checkins (freeze streak)
            if habit.is_paused:
                if checkin_dates:
                    current_streak = 1
                    expected_date = checkin_dates[-1] - timedelta(days=1)
                    idx = len(checkin_dates) - 2
                    while idx >= 0:
                        if checkin_dates[idx] == expected_date:
                            current_streak += 1
                            expected_date -= timedelta(days=1)
                            idx -= 1
                        elif checkin_dates[idx] > expected_date:
                            idx -= 1
                        else:
                            break
                else:
                    current_streak = 0
            # Active if last check-in was today or yesterday
            elif checkin_dates[-1] >= current_local_date - timedelta(days=1):
                # Count backwards
                temp_date = checkin_dates[-1]
                idx = len(checkin_dates) - 1
                current_streak = 0
                
                # Check if it covers today/yesterday
                if checkin_dates[-1] >= current_local_date - timedelta(days=1):
                    current_streak = 1
                    expected_date = checkin_dates[-1] - timedelta(days=1)
                    idx -= 1
                    
                    while idx >= 0:
                        if checkin_dates[idx] == expected_date:
                            current_streak += 1
                            expected_date -= timedelta(days=1)
                            idx -= 1
                        elif checkin_dates[idx] > expected_date:
                            # Skip duplicate dates
                            idx -= 1
                        else:
                            break
            else:
                current_streak = 0

            # Calculate longest streak
            longest_streak = 0
            temp_streak = 0
            prev_date = None
            for d in checkin_dates:
                if prev_date is None:
                    temp_streak = 1
                elif d == prev_date + timedelta(days=1):
                    temp_streak += 1
                elif d > prev_date + timedelta(days=1):
                    temp_streak = 1
                # Ignore duplicates
                if d != prev_date:
                    longest_streak = max(longest_streak, temp_streak)
                    prev_date = d
            longest_streak = max(longest_streak, temp_streak)

        elif freq_type == "weekly":
            # --- WEEKLY (SPECIFIC DAYS OF WEEK) STREAK ---
            scheduled_days = habit.frequency.days_of_week or [0, 1, 2, 3, 4, 5, 6] # Default all
            
            # Helper to check if a date is scheduled
            def is_scheduled(d: date) -> bool:
                return d.weekday() in scheduled_days

            # Generate all scheduled dates from the first checkin to current_local_date
            start_d = checkin_dates[0]
            end_d = current_local_date
            
            scheduled_dates = []
            curr = start_d
            while curr <= end_d:
                if is_scheduled(curr):
                    scheduled_dates.append(curr)
                curr += timedelta(days=1)

            completed_set = set(checkin_dates)
            
            # Calculate current streak
            # The user might not have completed today yet, which is fine if it's scheduled today.
            # If today is scheduled and not completed, check if yesterday (or last scheduled before today) was completed.
            current_streak = 0
            if scheduled_dates:
                # Find index of last scheduled date to check
                last_scheduled = scheduled_dates[-1]
                
                # If the last scheduled date is today and not completed, the active check-in window is the one before it.
                check_idx = len(scheduled_dates) - 1
                if last_scheduled == current_local_date and current_local_date not in completed_set:
                    check_idx -= 1
                
                # Check backwards
                while check_idx >= 0:
                    sch_d = scheduled_dates[check_idx]
                    if sch_d in completed_set:
                        current_streak += 1
                        check_idx -= 1
                    else:
                        break # Gap detected

            # Calculate longest streak
            longest_streak = 0
            temp_streak = 0
            # Walk through scheduled dates forward
            for sch_d in scheduled_dates:
                if sch_d in completed_set:
                    temp_streak += 1
                    longest_streak = max(longest_streak, temp_streak)
                else:
                    temp_streak = 0
            longest_streak = max(longest_streak, temp_streak)

        elif freq_type == "custom":
            # --- CUSTOM INTERVAL STREAK (Every X days) ---
            interval = habit.frequency.custom_interval_days or 1
            
            # Check if current streak is still active
            # Max allowed gap is `interval` days
            if (current_local_date - checkin_dates[-1]).days <= interval:
                current_streak = 0
                # Traverse backwards
                idx = len(checkin_dates) - 1
                current_streak = 1
                
                while idx > 0:
                    gap = (checkin_dates[idx] - checkin_dates[idx-1]).days
                    if gap <= interval:
                        current_streak += 1
                        idx -= 1
                    else:
                        break
            else:
                current_streak = 0

            # Calculate longest streak
            longest_streak = 0
            temp_streak = 0
            prev_d = None
            for d in checkin_dates:
                if prev_d is None:
                    temp_streak = 1
                else:
                    gap = (d - prev_d).days
                    if gap <= interval:
                        temp_streak += 1
                    else:
                        temp_streak = 1
                longest_streak = max(longest_streak, temp_streak)
                prev_d = d
            longest_streak = max(longest_streak, temp_streak)
            
        else:
            current_streak = total_completions
            longest_streak = total_completions

        # Compute completion rate (e.g. completions over last 30 days)
        # We can look at the past 30 days of scheduled completions
        thirty_days_ago = current_local_date - timedelta(days=30)
        completions_past_30 = sum(1 for d in checkin_dates if d >= thirty_days_ago)
        
        # Calculate maximum possible completions in past 30 days
        if freq_type == "daily":
            possible = 30
        elif freq_type == "weekly":
            scheduled_days = habit.frequency.days_of_week or [0, 1, 2, 3, 4, 5, 6]
            possible = sum(1 for i in range(30) if (current_local_date - timedelta(days=i)).weekday() in scheduled_days)
        elif freq_type == "custom":
            interval = habit.frequency.custom_interval_days or 1
            possible = max(1, 30 // interval)
        else:
            possible = 30
            
        completion_rate = round((completions_past_30 / max(1, possible)) * 100, 1)

        # Milestone badges logic
        unlocked_milestones = []
        milestone_definitions = [
            {"id": "first_step", "name": "First Step", "description": "Log your first completion!", "condition": lambda tc, cs: tc >= 1},
            {"id": "streak_3", "name": "3-Day Streak", "description": "Maintain a 3-day active streak.", "condition": lambda tc, cs: cs >= 3},
            {"id": "streak_7", "name": "Week of Fire", "description": "Maintain a 7-day active streak.", "condition": lambda tc, cs: cs >= 7},
            {"id": "streak_30", "name": "Habit Master", "description": "Maintain a 30-day active streak.", "condition": lambda tc, cs: cs >= 30},
            {"id": "completions_10", "name": "Double Digits", "description": "Log 10 total completions.", "condition": lambda tc, cs: tc >= 10},
            {"id": "completions_50", "name": "Half Century", "description": "Log 50 total completions.", "condition": lambda tc, cs: tc >= 50},
        ]
        for m in milestone_definitions:
            if m["condition"](total_completions, current_streak):
                unlocked_milestones.append({
                    "id": m["id"],
                    "name": m["name"],
                    "description": m["description"]
                })

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_completions": total_completions,
            "completion_rate": completion_rate,
            "unlocked_milestones": unlocked_milestones
        }
