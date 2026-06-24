# FoundLater SMS Setup

FoundLater is meant to be SMS-first. The web app is only a dashboard/prototype surface; the core loop is:

1. Text a link or note to your FoundLater number.
2. FoundLater saves it under your phone number.
3. Later, text a search like `find oak dresser apartment move`.
4. FoundLater texts back the matching creator, product, or link.

## Local Test

Start the app:

```sh
npm start
```

Save a link as if it came from your phone:

```sh
curl -X POST http://127.0.0.1:8787/api/sms \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+15551230000" \
  --data-urlencode "Body=https://www.instagram.com/reel/ABC123 beautiful oak dresser from @northroomstudio for apartment bedroom in 5 months"
```

Search it back:

```sh
curl -X POST http://127.0.0.1:8787/api/sms \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+15551230000" \
  --data-urlencode "Body=find oak dresser apartment move"
```

## Try With Real SMS

You need a public HTTPS URL and a Twilio phone number.

1. Start FoundLater locally:

```sh
npm start
```

2. Expose your local server with a tunnel:

```sh
ngrok http 8787
```

3. Copy the HTTPS forwarding URL from ngrok, then add `/api/sms`.

Example:

```text
https://abc123.ngrok-free.app/api/sms
```

4. In Twilio Console, open your phone number settings.

5. Under incoming messages, set:

```text
A message comes in: Webhook
URL: https://abc123.ngrok-free.app/api/sms
Method: HTTP POST
```

6. Text your Twilio number:

```text
https://www.instagram.com/reel/ABC123 beautiful oak dresser from @northroomstudio for apartment bedroom in 5 months
```

7. Then text:

```text
find oak dresser apartment move
```

## Current Behavior

- Saves are stored locally in `.deckcleaner-data/foundlater-sms-saves.json`.
- Saves are scoped by sender phone number.
- Search works through simple keyword matching.
- Text `help` for instructions.

## Next Production Step

Replace the local JSON file with a hosted database, then deploy the server so Twilio can call a permanent URL without ngrok.
