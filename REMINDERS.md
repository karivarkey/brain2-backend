# Reminder System

## Overview

The Brain2 reminder system allows the AI to automatically create and manage reminders during chat conversations. When you ask the AI to remind you about something, it parses your request, creates a reminder in the database, and schedules a push notification to be sent at the appropriate time.

## Architecture

### 1. **Reminder Mutations** (AI Integration)

When chatting with the AI, it can detect reminder requests and automatically create them.

Example:

```
User: "Remind me tomorrow at 3 PM to call mom"

AI Response: "Sure! I'll remind you tomorrow at 3 PM to call mom."
```

The AI returns a reminder mutation in its structured response:

```json
{
  "response": "Sure! I'll remind you tomorrow at 3 PM to call mom.",
  "mutations": [],
  "reminders": [
    {
      "action": "create_reminder",
      "type": "one_time",
      "title": "Call mom",
      "datetime": "2026-02-27T09:30:00.000Z"
    }
  ]
}
```

### 2. **Database Schema**

Reminders are stored in the `reminders` table with the following structure:

- `id`: Unique identifier
- `user_id`: User who created the reminder
- `fcm_token`: FCM token for push notifications
- `title`: Short reminder title
- `body`: Optional detailed message
- `trigger_at`: ISO 8601 UTC datetime for one-time reminders
- `rrule`: RRULE string for recurring reminders (not yet implemented)
- `timezone`: User's timezone
- `last_triggered_at`: Last time this reminder was fired
- `active`: Whether the reminder is active

### 3. **Scheduler**

A cron-like scheduler runs every 60 seconds to check for due reminders.

**Process:**

1. Query database for reminders where `trigger_at <= now` and `active = true`
2. For each due reminder:
   - Send FCM push notification
   - Mark as triggered (`last_triggered_at = now`)
   - Deactivate one-time reminders (`active = false`)

### 4. **Push Notifications**

Uses Firebase Cloud Messaging (FCM) to send push notifications to the user's device.

## Chat Integration

### Request Format

When calling the chat API, include `userId`, `fcmToken`, and `timezone`:

```json
{
  "conversation_id": "conv-123",
  "message": "Remind me tomorrow at 10 AM to do the dishes",
  "userId": "user-001",
  "fcmToken": "fcm-token-xxx",
  "timezone": "Asia/Kolkata"
}
```

### Response Format

The chat response includes reminders created:

```json
{
  "reply": "Sure! I'll remind you tomorrow at 10 AM to do the dishes.",
  "memoryChanges": [],
  "remindersCreated": ["Do the dishes"]
}
```

## API Endpoints

### Create Reminder (Manual)

```
POST /api/reminders
```

Request:

```json
{
  "userId": "user-001",
  "fcmToken": "fcm-token-xxx",
  "naturalLanguage": "Remind me every day at 9 AM to take vitamins",
  "timezone": "Asia/Kolkata"
}
```

### List User Reminders

```
GET /api/reminders/:userId?active=true
```

### Get Reminder by ID

```
GET /api/reminders/detail/:id
```

### Update Reminder

```
PATCH /api/reminders/:id
```

### Delete Reminder

```
DELETE /api/reminders/:id
```

### Toggle Active Status

```
POST /api/reminders/:id/toggle
```

## AI Parsing

The AI parser (using Gemini 2.0 Flash) converts natural language into structured reminder data:

**Input:** "Remind me tomorrow at 3 PM to call mom"

**Output:**

```json
{
  "type": "one_time",
  "title": "Call mom",
  "datetime": "2026-02-27T09:30:00.000Z"
}
```

**Input:** "Remind me every weekday at 8 AM to exercise"

**Output:**

```json
{
  "type": "recurring",
  "title": "Exercise",
  "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=0"
}
```

## Implementation Status

✅ **Completed**

- Database schema and migrations
- Reminder DB layer (CRUD operations)
- AI reminder parser service
- Chat integration (reminder mutations)
- Push notification service
- Cron scheduler (one-time reminders)
- REST API endpoints

⏳ **Future Work**

- Recurring reminders with RRULE support (requires `rrule` library)
- Snooze functionality
- Reminder categories/tags
- Time zone conversions for recurring reminders
- Production-grade scheduler (BullMQ, Cloudflare Cron, etc.)

## Example Usage

### Via Chat (Recommended)

```
User: Hey, remind me on Friday at 6 PM to buy groceries

AI: Sure thing! I've set a reminder for Friday at 6 PM to buy groceries.
```

The reminder is automatically created and scheduled.

### Via API

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "fcmToken": "your-fcm-token",
    "naturalLanguage": "Remind me in 2 hours to check the laundry",
    "timezone": "America/New_York"
  }'
```

## How It Works End-to-End

1. **User chats with AI**: "Remind me tomorrow at noon to submit the report"

2. **AI detects reminder intent** and returns structured mutation:

   ```json
   {
     "reminders": [
       {
         "action": "create_reminder",
         "type": "one_time",
         "title": "Submit the report",
         "datetime": "2026-02-27T06:30:00.000Z"
       }
     ]
   }
   ```

3. **Chat service processes mutation** and creates reminder in database

4. **Scheduler runs every minute**, checking for due reminders

5. **When time arrives**, scheduler:
   - Sends FCM push notification to user's device
   - Marks reminder as triggered
   - Deactivates one-time reminders

6. **User receives notification** on their PWA

## Environment Variables

Required:

- `GEMINI_API_KEY`: Google Gemini API key (for AI parsing)
- `GOOGLE_APPLICATION_CREDENTIALS` or `admin.json`: Firebase service account (for FCM)

## Database Initialization

```bash
bun run init
```

This creates the `reminders` table in `chat.db`.

## Running the Server

```bash
bun index.ts
```

The scheduler starts automatically when the server starts.
