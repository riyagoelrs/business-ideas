# Viral Video Reverse Engineer

A static, browser-based TikTok analytics MVP that reverse-engineers a creator's strongest recent videos.

## What it does

- Enter a TikTok creator handle.
- Fetch up to ~100 recent public posts via TikWM's public metadata endpoint.
- Rank the top 50 by views within the fetched sample.
- Analyze duration, posting windows, caption-hook archetypes, recurring topics/words, engagement, and simple Pearson correlations.
- Generate a repeatable content-testing playbook.
- Export the ranked video data to CSV.
- Import JSON produced by the existing `tiktok-scraper` project as a fallback / alternate data source.

## Important caveats

- “Top 50” means the 50 highest-viewed videos within the posts the endpoint successfully returns, not necessarily the creator's all-time top 50.
- Hook analysis is based on the opening caption language, not automatic speech transcription.
- Correlations are descriptive and do not establish causation.
- TikTok/TikWM response behavior can change. The JSON import path keeps the analytics usable if browser requests are blocked.

## Live URL

Once merged to the `business-ideas` GitHub Pages branch, the app is available at:

`https://riyagoelrs.github.io/business-ideas/viral-video-reverse-engineer/`
