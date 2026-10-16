# Completed implementation and local validation

- 240/240 Long full Japanese translations authored without a translation API. All paragraph IDs/counts/order match the original bank. All 240 English passages and 1,200 questions/answers are unchanged against the supplied ZIP.
- Static translations load for new Long sessions and are stored in new history records. Existing bank-based history resolves the same translation by stable passage ID.
- First-session Rating amplification removed. Existing saved Rating/history values are not retroactively modified.
- Question limits: Quick 60 seconds; Long 120 seconds. Long reading allowance: 60 WPM, existing 30-second rounding retained. Actual measured WPM is not artificially fixed.
- New Long scoring: 5 × 4 points + summary max 10 = 30. Raw summary 11 is floored/capped to 10 before addition. Actual accuracy uses total/30.
- Expected accuracy at matching user/passage Rating is 2/3, or 20/30. Other Rating curve/update constants are unchanged.
- New records save scoring version/maxima. Old records lacking those fields remain displayed out of 25 with MC out of 15; no historical recalculation.
- Model summary prompt targets 250–300 Japanese characters while preserving all six essential elements and logical relationships. The user's answer length requirements are unchanged.

## Checks

- `node scripts/check-translations.mjs`: completed 240, missing 0.
- Unit suite and static build pass (rerun before release).
- Local browser at 390px: Quick begins 1:00; Long begins 2:00; 990-word reading allowance 16:30; timer position fixed/top 0; no first-session calibration badge.
- Local mock grading flow: 5 correct + raw summary 11 -> MC20/20, summary10/10, total30/30. Initial mocked503 keeps grading pending; retry saves once.
- History list/details show new30/30 and preexisting test10/25 simultaneously.
- History translation: all16 source paragraphs render; widths375/390/430 have no horizontal overflow. Browser error log empty.
- Test responses are local mocks, not real paid API calls. The changed model-summary prompt was checked in code; no live AI grading was billed during QA.
- Screenshots are in the chat workspace outputs, named `reading-rating-full-translation-mobile.png` and `reading-rating-score-30-local-test.png` (synthetic local test data).

Deployment status must be verified separately after push; local validation does not prove publication.
