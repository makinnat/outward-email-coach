/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */

function extractSnippet(text, regex, contextChars) {
  contextChars = contextChars || 60;
  const m = text.match(regex);
  if (!m) return null;
  const start = Math.max(0, m.index - 15);
  const end = Math.min(text.length, m.index + m[0].length + contextChars);
  let snippet = text.slice(start, end).replace(/\n/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

// Extract a full sentence containing a regex match
function extractSentence(text, regex) {
  const m = text.match(regex);
  if (!m) return null;
  const before = text.slice(0, m.index);
  const after = text.slice(m.index + m[0].length);
  const sentStart = Math.max(before.lastIndexOf('.') + 1, before.lastIndexOf('!') + 1, before.lastIndexOf('?') + 1, before.lastIndexOf('\n') + 1, 0);
  let sentEnd = m.index + m[0].length;
  const endMatch = after.match(/[.!?\n]/);
  if (endMatch) sentEnd += endMatch.index + 1;
  else sentEnd = text.length;
  return text.slice(sentStart, sentEnd).replace(/\n/g, ' ').trim();
}

// Get the closing lines of an email
function getClosing(text, lines) {
  lines = lines || 3;
  const all = text.split('\n').filter(l => l.trim().length > 0);
  return all.slice(-lines).join(' ').trim();
}

// Get the opening lines of an email
function getOpening(text, chars) {
  chars = chars || 150;
  const clean = text.replace(/^(hi|hey|hello|dear)[^,\n]*[,]?\s*/i, '').trim();
  return clean.substring(0, chars).replace(/\n/g, ' ').trim() + (clean.length > chars ? '...' : '');
}



/* ═══════════════════════════════════════════════════════
   GRADING ENGINE
═══════════════════════════════════════════════════════ */



function analyzeEmail(email, gradeCustomization) {
  const lower = email.toLowerCase();
  const words = email.split(/\s+/);
  const wordCount = words.length;
  const paragraphs = email.split(/\n\s*\n/);
  const firstPara = (paragraphs[0] || '').toLowerCase();
  const first80w = words.slice(0, 80).join(' ').toLowerCase();

  let score = 100;
  const issues = [], coaching = [], goods = [];


  // ── 1. EARLY PRODUCT / PITCH ─────────────────────────────────────────
  const earlyPitchRegexes = [
    /\bwe (offer|provide|help|build|create|enable|deliver)\b/i,
    /\bour (platform|product|solution|service|software|tool|system|offering|technology)\b/i,
    /\bi('m| am) (reaching out|writing) (about|to (tell|share|introduce|show))\b/i,
    /\bi wanted to (introduce|tell you about|show you|share|reach out about)\b/i,
    /\bi want to introduce\b/i,
    /\bintroducing our\b/i,
    /\bi('d| would) (like|love) to (show|introduce|share)\b/i,
    /\bschedule (a|your) (demo|call|meeting) (today|now)\b/i,
    /\bbook (a|your) demo\b/i,
    /\bget (a free)? demo\b/i,
  ];

  const pitchInFirstPara = earlyPitchRegexes.some(r => r.test(firstPara));
  const pitchInFirst80  = earlyPitchRegexes.some(r => r.test(first80w));

  if (pitchInFirstPara || pitchInFirst80) {
    const matchedRe = earlyPitchRegexes.find(r => r.test(firstPara)) || earlyPitchRegexes.find(r => r.test(first80w));
    const found = extractSentence(email, matchedRe) || extractSnippet(email, matchedRe);
    score -= 10;
    issues.push({
      title: 'Product introduced too early',
      found: found,
      body: 'When you lead with what you sell, you are treating this person as a target, not a human being with their own challenges. Before you have the right to talk about your product, you need to show that you understand their world. Ask yourself: what is this person struggling with right now? What are their objectives? Start there.',
      before: found,
      after: 'Try opening with a specific observation about their situation instead. Lead with something that shows you understand their world before you ever mention what you do.',
    });
  } else if (earlyPitchRegexes.some(r => r.test(lower))) {
    const matchedRe = earlyPitchRegexes.find(r => r.test(lower));
    const found = extractSentence(email, matchedRe) || extractSnippet(email, matchedRe);
    score -= 2;
    coaching.push({
      title: 'Product mention appears mid-email',
      found: found,
      body: 'Good instinct waiting to bring this in. Make sure by the time you mention what you offer, the reader feels like you genuinely understand their challenge first. The product should feel like a natural answer to a problem they already recognize.',
      before: null,
      after: null,
    });
  } else {
    const opener = getOpening(email, 120);
    goods.push({
      title: 'Not leading with a pitch',
      found: opener,
      body: 'You are not opening with what you sell \u2014 that is a skill, not an accident. Here is why this works: when a prospect reads your first sentence, they are deciding "is this about me, or is this about them trying to sell me something?" By NOT leading with a product or service, you pass that test. The reader stays open. Keep doing this intentionally \u2014 always lead with their world, not your offering.',
    });
  }


  // ── 2. GENERIC OPENERS ────────────────────────────────────────────────
  const genericChecks = [
    { re: /hope this (email|message|note|finds you)[^.!?]*/i },
    { re: /hope you('re| are) (doing well|having)[^.!?]*/i },
    { re: /my name is\b[^.!?]*/i },
    { re: /i('m| am) reaching out[^.!?]*/i },
    { re: /i (came across|noticed) your (profile|linkedin)[^.!?]*/i },
    { re: /i wanted to (reach out|connect)[^.!?]*/i },
    { re: /i hope this (message|email)[^.!?]*/i },
    { re: /just (wanted|checking|following up|circling back)[^.!?]*/i },
  ];

  const genericMatches = genericChecks.filter(c => c.re.test(firstPara));
  if (genericMatches.length > 0) {
    const found = extractSnippet(email, genericMatches[0].re, 80);
    score -= Math.min(genericMatches.length * 9, 22);
    issues.push({
      title: 'Generic opener \u2014 this could be sent to anyone',
      found: found,
      body: 'A generic opener tells the reader you did not take the time to learn about them. If you genuinely want to understand this person and what they are dealing with, your opening line should prove it. What do you know about their situation, their team, their recent challenges? Lead with that.',
      before: found,
      after: 'Replace this with the most specific thing you know about this person. What do you know about their team, their role, a recent change at their company? That should be your opening line.',
    });
  }


  // ── 3. PERSONALIZATION (Does this sound like YOU?) ────────────────────
  // At Arbinger, personalization means: does the email sound like it came
  // from a specific human being with a real personality? Does Lee sound
  // like Lee? Does Mandi sound like Mandi? Or does it sound like it was
  // generated by an AI or copied from a template?

  // Detect AI-generated / generic voice patterns
  const aiPhrases = [
    { re: /i wanted to take a moment/i,            label: '"I wanted to take a moment"' },
    { re: /please don't hesitate to/i,             label: '"Please don\'t hesitate to"' },
    { re: /please do not hesitate to/i,            label: '"Please do not hesitate to"' },
    { re: /I look forward to the opportunity/i,    label: '"I look forward to the opportunity"' },
    { re: /i('m| am) (excited|thrilled|delighted) to (share|connect|reach|hear|announce|let you know)/i, label: '"I\'m excited/thrilled to..."' },
    { re: /\bin today's (fast-paced|rapidly|ever-changing|dynamic|competitive)\b/i, label: '"In today\'s fast-paced..."' },
    { re: /\b(navigating|navigate) the (complexities|landscape|challenges|world) of\b/i, label: '"Navigate the complexities of..."' },
    { re: /\bthat (said|being said|noted)\b/i,    label: '"That said / That being said"' },
    { re: /\bmoreover\b/i,                         label: '"Moreover"' },
    { re: /\bfurthermore\b/i,                      label: '"Furthermore"' },
    { re: /\badditionally\b/i,                     label: '"Additionally"' },
    { re: /\bit('s| is) worth (noting|mentioning|highlighting)\b/i, label: '"It\'s worth noting..."' },
    { re: /\bwith that in mind\b/i,                label: '"With that in mind"' },
    { re: /\bi('d| would) be (happy|glad|delighted|pleased) to\b/i, label: '"I\'d be happy to..."' },
    { re: /\brest assured\b/i,                     label: '"Rest assured"' },
    { re: /\bat the end of the day\b/i,            label: '"At the end of the day"' },
    { re: /\bin this (regard|context)\b/i,         label: '"In this regard"' },
    { re: /\bensure (that )?(you|your|we|the)\b/i, label: '"Ensure that..."' },
    { re: /\bfacilitate\b/i,                       label: '"Facilitate"' },
    { re: /\butilize\b/i,                          label: '"Utilize" (just say "use")' },
  ];

  const foundAiPhrases = aiPhrases.filter(c => c.re.test(email));

  // Check for lack of contractions (AI tends to write formally)
  const contractionCount = (email.match(/\b(I'm|I'd|I'll|I've|you're|you'll|you've|don't|doesn't|didn't|can't|won't|wouldn't|couldn't|shouldn't|we're|we'll|we've|they're|it's|that's|there's|here's|what's|who's|let's|isn't|aren't|wasn't|weren't|hasn't|haven't)\b/gi) || []).length;
  const sentenceCount = (email.match(/[.!?]+/g) || []).length || 1;
  const noContractions = contractionCount === 0 && sentenceCount > 3;

  // Check for overly uniform sentence starters
  const sentences = email.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const starters = sentences.map(s => s.split(/\s+/)[0].toLowerCase());
  const starterCounts = {};
  starters.forEach(s => { starterCounts[s] = (starterCounts[s] || 0) + 1; });
  const maxRepeatedStarter = Math.max(...Object.values(starterCounts), 0);
  const uniformStarters = sentences.length > 3 && maxRepeatedStarter >= Math.ceil(sentences.length * 0.5);

  let personalityScore = 0; // higher = more problems
  personalityScore += foundAiPhrases.length * 3;
  if (noContractions) personalityScore += 4;
  if (uniformStarters) personalityScore += 3;

  if (personalityScore >= 8) {
    const labels = foundAiPhrases.slice(0, 3).map(c => c.label);
    // Extract multiple AI phrases from their actual email
    const aiSnippets = foundAiPhrases.slice(0, 2).map(c => extractSentence(email, c.re)).filter(Boolean);
    const found = aiSnippets.length > 0 ? aiSnippets[0] : null;
    score -= 22;
    issues.push({
      title: 'This does not sound like you \u2014 it sounds AI-generated',
      found: found,
      body: 'This email reads like it was written by ChatGPT, not by a real person with a real personality. It uses phrases like ' + labels.join(', ') + (noContractions ? ', has no contractions (nobody actually writes that formally)' : '') + (uniformStarters ? ', and most sentences start the same way' : '') + '. Your prospects can tell. If Lee writes an email, it should sound like Lee. If Mandi writes one, it should sound like Mandi. Write it yourself, in your own voice, the way you would actually talk to this person if they were sitting across from you.',
      before: aiSnippets.length > 0 ? aiSnippets[0] : null,
      after: 'Rewrite this sentence the way you would actually say it out loud to a colleague. Use contractions. Be casual. Let your personality come through.',
    });
  } else if (personalityScore >= 4) {
    const labels = foundAiPhrases.slice(0, 2).map(c => c.label);
    const aiSnippet = foundAiPhrases.length > 0 ? extractSentence(email, foundAiPhrases[0].re) : null;
    score -= 10;
    coaching.push({
      title: 'This could sound more like you',
      found: aiSnippet,
      body: 'Parts of this email feel polished in a way that does not sound like a real person wrote it.' + (labels.length > 0 ? ' Phrases like ' + labels.join(', ') + ' are tell-tale signs of AI or template writing.' : '') + (noContractions ? ' You are also not using any contractions, which makes the tone feel stiff.' : '') + ' Read this out loud \u2014 does it sound like something you would actually say? If not, rewrite it the way you would talk. Your personality is an asset, not something to hide behind polished language.',
      before: aiSnippet,
      after: 'Try rewriting this the way you would actually say it. Use your natural voice, contractions and all.',
    });
  } else {
    // Find a sentence that demonstrates their natural voice
    const voiceSnippet = getOpening(email, 140);
    goods.push({
      title: 'This sounds like a real person wrote it',
      found: voiceSnippet,
      body: 'This is a skill worth understanding so you can repeat it. Your email sounds like it came from a real human being, not an AI or a template. Here is why that matters: prospects are drowning in AI-generated outreach right now. When something sounds genuinely human, it stands out. What makes yours work: ' + (contractionCount > 0 ? 'you use contractions naturally, ' : '') + 'the phrasing feels like YOUR voice, not a machine\'s. Keep writing this way. Do not be tempted to "polish" your emails with AI \u2014 the imperfections are what make them feel real.',
    });
  }


  // ── 3b. CUSTOMIZATION (Specific info about the contact / account) ────
  // Only scored if the user checks the "I added customization" box.

  if (gradeCustomization) {

  const customizationSignals = [
    { re: /i (noticed|saw|read|heard|came across).{0,30}(you|your|they|the company|the team)/i,
      label: 'a specific observation about them' },
    { re: /congratulations/i,
      label: 'a congratulations on something specific' },
    { re: /recently (announced|launched|expanded|hired|raised|acquired|published)/i,
      label: 'a reference to a recent event at their company' },
    { re: /i (was reading|was looking at|went through|listened to|watched)/i,
      label: 'a reference to content you researched' },
    { re: /\byour (team|company|organization|business|growth|challenges|goals|work) (at|has|is|just|recently)/i,
      label: 'a specific reference to their team or company' },
    { re: /\b(specifically|in particular)\b.*\byou\b/i,
      label: 'a specific callout directed at them' },
    { re: /i (asked|talked|spoke) (with|to)\b/i,
      label: 'a reference to a prior conversation' },
    { re: /you (mentioned|said|told me|shared|brought up)/i,
      label: 'a callback to something they told you' },
    { re: /last time we (spoke|talked|met|connected)/i,
      label: 'a reference to your last interaction' },
    { re: /i (saw|read|noticed) (your|that you|the) (post|article|comment|interview|talk|presentation)/i,
      label: 'a reference to something they published or shared' },
  ];

  const custMatches = customizationSignals.filter(s => s.re.test(email));
  const custHits = custMatches.length;

  if (custHits === 0) {
    const theirOpening = getOpening(email, 160);
    score -= 18;
    issues.push({
      title: 'No customization \u2014 nothing specific about this person or account',
      found: theirOpening,
      body: 'You checked the customization box, but there is nothing in this email that shows you know anything about this specific person, their company, their role, or what they are dealing with. If you are being outward, you care about their needs, wants, and objectives \u2014 and the email should prove it. Before you write, do your homework: check their LinkedIn, read about their company, look at what content they have engaged with. Pull up their record in Salesforce and look at what campaigns they have interacted with \u2014 that tells you what topics they care about and gives you a natural way into the conversation. The reader should think "this person actually knows something about my world."',
      before: theirOpening,
      after: 'Add a specific detail about them here. What have they engaged with in Salesforce? What is happening at their company? What did they say last time you talked? Put that right up front.',
    });
  } else if (custHits === 1) {
    const matched = custMatches[0];
    const found = extractSnippet(email, matched.re, 60);
    score -= 7;
    coaching.push({
      title: 'Light customization \u2014 you started, now go deeper',
      found: found,
      body: 'You included ' + matched.label + ', which is a good start. But one detail can still feel surface-level. Go further: pull up their Salesforce record and look at what campaigns and content they have engaged with. That tells you what topics matter to them and gives you a much more compelling reason to connect. The more specific you get about their world, the more the reader feels like a person to you rather than a name on a list.',
      before: null,
      after: null,
    });
  } else {
    // Quote the specific customization signals found
    const custSnippets = custMatches.slice(0, 2).map(m => {
      const snippet = extractSnippet(email, m.re, 50);
      return snippet ? ('"' + snippet.replace(/^\.\.\./, '').replace(/\.\.\.$/, '').trim() + '"') : null;
    }).filter(Boolean);
    const custLabels = custMatches.slice(0, 3).map(m => m.label);
    goods.push({
      title: 'Good customization \u2014 specific details about this person',
      body: 'Your email includes ' + custLabels.join(', and ') + '.' + (custSnippets.length > 0 ? ' For example: ' + custSnippets.join(' and ') + '.' : '') + ' That effort tells the reader "I did not just spray this out to a list \u2014 I actually took time to learn about you." That is what being outward looks like in practice. To go even further, check their Salesforce campaigns to see what content they have engaged with \u2014 referencing that shows you are paying attention to what matters to them.',
    });
  }

  } // end if (gradeCustomization)


  // ── 4. BUZZWORDS / MARKETING LANGUAGE ─────────────────────────────────
  const buzzwords = [
    'synergy','leverage','best-in-class','industry-leading','cutting-edge',
    'revolutionary','world-class','seamlessly','game-changer','game changer',
    'disruptive','state-of-the-art','robust','holistic','end-to-end',
    'paradigm','empower','circle back','touch base','move the needle',
    'value-add','value add','thought leader','best in breed','best of breed',
    'innovative solution','full suite','comprehensive platform','at scale'
  ];
  const foundBuzz = buzzwords.filter(b => lower.includes(b));

  if (foundBuzz.length > 0) {
    // Extract the actual sentence containing the first buzzword
    const buzzRe = new RegExp('\\b(' + foundBuzz.slice(0, 2).map(b => b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'i');
    const buzzSentence = extractSentence(email, buzzRe);
    score -= Math.min(foundBuzz.length * 5, 18);
    issues.push({
      title: 'Corporate buzzwords undercut your authenticity',
      found: 'Found: "' + foundBuzz.slice(0, 4).join('", "') + '"' + (foundBuzz.length > 4 ? ' and ' + (foundBuzz.length - 4) + ' more' : ''),
      body: 'These words are marketing-speak, and they put a wall between you and the person reading this. They make the email sound like it came from a department, not a human being who cares. If you are genuinely trying to understand this person\'s challenges, say exactly what you mean in plain language.',
      before: buzzSentence,
      after: 'Rewrite this sentence using the simplest, most direct language possible. Say exactly what you mean the way you would explain it to a friend. No jargon, no corporate-speak.',
    });
  }


  // ── 5. WE vs. YOU RATIO ───────────────────────────────────────────────
  const weCount  = (lower.match(/\bwe\b/g) || []).length;
  const youCount = (lower.match(/\b(you|your)\b/g) || []).length;

  if (weCount > youCount + 2 && weCount > 3) {
    // Extract an actual "we" sentence from their email
    const weSentence = extractSentence(email, /\bwe\b/i);
    score -= 12;
    issues.push({
      title: 'Too focused on "we" \u2014 not enough on them',
      found: 'You say "we" ' + weCount + ' times vs. "you/your" ' + youCount + ' times.',
      body: 'When an email is dominated by "we," the reader feels like a prop in your story instead of the main character. Being outward means centering on what they need, what they are trying to achieve, and what they are struggling with. Rewrite every "we" sentence from their perspective.',
      before: weSentence,
      after: 'Take this sentence and rewrite it from the reader\'s perspective. Instead of what WE do, describe what THEY are experiencing and what THEY could achieve.',
    });
  } else if (youCount >= weCount) {
    // Find a "you/your" sentence to quote
    const youSentence = extractSentence(email, /\b(you|your)\b/i);
    goods.push({
      title: 'Prospect-focused language',
      found: youSentence,
      body: 'You say "you/your" ' + youCount + ' times vs. "we" only ' + weCount + ' time' + (weCount !== 1 ? 's' : '') + '. That ratio matters. It means the reader feels like this email is about THEIR world, not yours. This is a trained skill: every time you write a sentence that starts with "we," challenge yourself to flip it to "you." The best sales emails make the reader the main character.',
    });
  }


  // ── 6. FIRST-PERSON / HUMAN VOICE ─────────────────────────────────────
  const hasI = /\bI\b/.test(email);
  if (!hasI && wordCount > 25) {
    const impersonalSentence = extractSentence(email, /^[A-Z][^.!?]*[.!?]/m) || getOpening(email, 120);
    score -= 6;
    coaching.push({
      title: 'Missing first-person voice',
      found: impersonalSentence,
      body: 'Using "I" makes the email feel like it is coming from a real person who has a genuine perspective to share, not a system or a team. Try opening with "I" to signal that there is a human on the other end who actually cares about this conversation.',
      before: impersonalSentence,
      after: 'Rewrite this with "I" — something like "I want to make sure you get something real out of this" or "I have been thinking about your situation." Let the reader know there is a real person behind this email.',
    });
  }


  // ── 6b. PASSIVE / WEAK LANGUAGE ───────────────────────────────────────
  const passiveChecks = [
    { re: /i was wondering if\b/i,                                  label: '"I was wondering if..."' },
    { re: /i (just |only )?(wanted|want) to (quickly )?(check|see|ask|reach|follow|touch)/i, label: '"I just wanted to..."' },
    { re: /i was hoping\b/i,                                        label: '"I was hoping..."' },
    { re: /i thought (maybe|perhaps|possibly)\b/i,                  label: '"I thought maybe..."' },
    { re: /sorry (to bother|for (bothering|reaching))\b/i,          label: '"Sorry to bother you"' },
    { re: /i (don't|do not) want to (bother|take up|waste)\b/i,     label: '"I don\'t want to bother you"' },
    { re: /if (you have|you've got) (a moment|a (few )?(minutes?|secs?|seconds?))/i, label: '"If you have a moment..."' },
    { re: /whenever you (get a chance|have time|are free)\b/i,       label: '"Whenever you get a chance..."' },
    { re: /no (rush|pressure|worries|obligation)\b/i,               label: '"No rush / no pressure"' },
    { re: /feel free to\b/i,                                        label: '"Feel free to..."' },
    { re: /i (know|realize|understand) you('re| are) (busy|swamped|slammed)/i, label: '"I know you\'re busy"' },
    { re: /i (apologize|am sorry) for\b/i,                          label: '"I apologize for..."' },
    { re: /i (might|may) be able to\b/i,                            label: '"I might be able to..."' },
    { re: /perhaps (we|i|you) (could|can|might)\b/i,                label: '"Perhaps we could..."' },
    { re: /would it (possibly|maybe) be\b/i,                        label: '"Would it possibly be..."' },
    { re: /i (hope i'm|hope i am) not (bothering|interrupting|intruding)\b/i, label: '"I hope I\'m not bothering you"' },
  ];

  const foundPassive = passiveChecks.filter(c => c.re.test(email));
  const passiveLabels = foundPassive.map(c => c.label);

  if (foundPassive.length >= 3) {
    // Extract actual passive sentences from their email
    const passiveSnippets = foundPassive.slice(0, 2).map(c => extractSentence(email, c.re)).filter(Boolean);
    const found = passiveSnippets.length > 0 ? passiveSnippets.join(' ... ') : extractSnippet(email, foundPassive[0].re, 50);
    const firstPassive = passiveSnippets.length > 0 ? passiveSnippets[0] : null;
    score -= 18;
    issues.push({
      title: 'Passive and apologetic tone',
      found: found,
      body: 'Your email uses ' + foundPassive.length + ' weak phrases: ' + passiveLabels.slice(0, 3).join(', ') + (foundPassive.length > 3 ? ', and more' : '') + '. When you apologize for reaching out or hedge everything, you are signaling that you do not believe you have something valuable to offer. But you do. If you genuinely want to help this person, write like it. A person who has real insight to share does not start with "sorry to bother you." They share the insight.',
      before: firstPassive,
      after: 'Rewrite this without the apology or hedge. State what you want to share and why it matters to them. If you want a meeting, say so directly: "Let\'s schedule 15 minutes next week to discuss." Not "would you maybe have time." Confidence is not arrogance — it is conviction that you can help.',
    });
  } else if (foundPassive.length >= 1) {
    const found = extractSentence(email, foundPassive[0].re) || extractSnippet(email, foundPassive[0].re, 50);
    score -= 8;
    coaching.push({
      title: 'Watch for passive phrasing',
      found: found,
      body: 'Phrases like ' + passiveLabels.join(', ') + ' weaken your message. They communicate "I am not sure I deserve your time." But if you genuinely believe you can help this person, the email should reflect that confidence. Cut the hedge. Say what you mean.',
      before: found,
      after: 'Rewrite this line without the hedge. Say what you mean directly. If you want a meeting, state it: "Let\'s schedule time next week." If you have something to share, share it. No apologies, no softening.',
    });
  } else if (wordCount > 30) {
    // Find a confident-sounding sentence to quote
    const confidentSentence = extractSentence(email, /\bI (want|am|believe|think|have|know)\b/) || extractSentence(email, /\bI\b/);
    goods.push({
      title: 'Confident, direct tone',
      found: confidentSentence,
      body: 'No apologetic or hedging language anywhere. Your email reads like it comes from someone who has genuine conviction and believes they can help. This is a skill: many new salespeople unconsciously soften every sentence with "just," "maybe," "no rush," or "sorry to bother." You avoided all of that. That directness tells the reader "this person has something worth saying." Keep writing with this confidence.',
    });
  }


  // ── 6c. DISTANCING & GENERALIZING LANGUAGE ────────────────────────────
  const distancingChecks = [
    // Group references instead of "you"
    { re: /part of (the )?(group|team|cohort|audience|those)/i,
      label: 'group reference',
      fix: 'Replace the group reference with "you." Talk directly to this one person, not to a crowd.' },
    { re: /those (who |that )?(attend|join|participat|register)/i,
      label: 'impersonal group reference',
      fix: 'Replace "those who..." with "you will..." — make it personal and direct.' },
    { re: /\b(attendees|participants|registrants)\b/i,
      label: 'impersonal group noun',
      fix: 'Replace the group noun with "you." Instead of what attendees should do, tell THIS person what YOU want THEM to do.' },
    { re: /people who (tend to|usually|typically|often|generally)/i,
      label: 'generalized "people who" reference',
      fix: 'Replace "people who..." with a direct statement to them. Tell them what they will get, not what "people" generally get.' },

    // Hedging modals
    { re: /it might (be helpful|help|make sense|be useful|be worth)/i,
      label: 'hedging with "might"',
      fix: 'Drop "it might" and state it directly. Instead of suggesting something might help, invite them to do it.' },
    { re: /it (could|may) (be helpful|help|be useful|be worth considering)/i,
      label: 'hedging modal',
      fix: 'Remove the hedging. Say what you actually want them to do or think about — directly.' },
    { re: /you might (want to|consider|think about|find it helpful)/i,
      label: 'softened suggestion',
      fix: 'Drop "you might want to" and make it a direct invitation. "Come with your most pressing challenge" is stronger than "you might want to think about bringing one."' },
    { re: /you may (want to|find|consider)/i,
      label: 'hedging "you may"',
      fix: 'Replace "you may" with a direct statement. Tell them what to do, not what they "may" want to consider.' },

    // "As your [role]" impersonal role-stating
    { re: /as your (main |primary |lead |dedicated )?(rep|representative|point of contact|contact|account manager|advisor|partner)/i,
      label: 'impersonal role-stating',
      fix: 'Delete the role title and say what you actually intend to DO for them. Your title does not build trust — your actions do.' },
    { re: /as (the|your) [a-z]+ (rep|representative|point of contact|contact|advisor)\b/i,
      label: 'impersonal role framing',
      fix: 'Remove the role label. Instead of stating your title, state your intention — what you want to help them with.' },

    // Vague relationship language
    { re: /get to know you better/i,
      label: 'vague "get to know you" language',
      fix: 'Replace this with a specific question about their objectives. Instead of "get to know you," ask what outcome they are trying to achieve or what challenge is in their way.' },
    { re: /connect (sometime|soon|at some point|when you have time)/i,
      label: 'indefinite "connect sometime"',
      fix: 'Replace the vague timing with a direct statement — "Let\'s set up 20 minutes next Tuesday or Wednesday." Give them something concrete to say yes to.' },
    { re: /it would be (great|wonderful|nice|fantastic|helpful) to (hear|connect|chat|meet|learn|discuss)/i,
      label: 'passive "it would be great"',
      fix: 'Replace "it would be great to..." with "I want to..." — own the ask. Make it direct and personal.' },
    { re: /would love the chance to/i,
      label: '"would love the chance"',
      fix: 'Replace this with what you actually want to do for them. Not "I would love the chance" but "I want to help you with X. Let\'s set up time next week to talk through it."' },
    { re: /hitting the mark for you/i,
      label: 'vague "hitting the mark"',
      fix: 'Be more direct. Instead of asking if things are "hitting the mark," ask them straight: "Did it help? What was useful and what was not?"' },
  ];

  const foundDistancing = distancingChecks.filter(c => c.re.test(email));

  if (foundDistancing.length >= 2) {
    const found = foundDistancing.slice(0, 2).map(c => {
      const snippet = extractSnippet(email, c.re, 80);
      return snippet;
    }).filter(Boolean).join(' ... ');
    score -= 20;

    // Extract the actual sentence from their email for before
    const firstSentence = extractSentence(email, foundDistancing[0].re);
    const distLabels = foundDistancing.slice(0, 3).map(c => c.label);
    issues.push({
      title: 'Distancing language \u2014 pulling back from the reader',
      found: found || null,
      body: 'Your email uses language that creates distance instead of connection. Detected: ' + distLabels.join(', ') + '. When you are being outward, you see this person as a real human being with specific needs, wants, and objectives. The email should sound like one person talking to another \u2014 not a form letter with a name field.',
      before: firstSentence,
      after: foundDistancing[0].fix,
    });
  } else if (foundDistancing.length === 1) {
    const item = foundDistancing[0];
    const found = extractSentence(email, item.re) || extractSnippet(email, item.re, 80);
    score -= 8;
    coaching.push({
      title: 'Watch for distancing language',
      found: found,
      body: 'This phrase (' + item.label + ') creates distance between you and the reader. If you genuinely want to help this person, write like it is just the two of you in a room. Be direct. Be personal.',
      before: found,
      after: item.fix,
    });
  } else if (wordCount > 30) {
    // Find a direct "you" sentence to quote
    const directSentence = extractSentence(email, /\bI want (to |you )/i) || extractSentence(email, /\byou\b/i);
    goods.push({
      title: 'Direct, personal address throughout',
      found: directSentence,
      body: 'You write directly to the reader with no group references, hedging modals, or role-distancing. That kind of directness communicates "I see you as a person, and I am talking to you." This is a skill to develop intentionally: every time you are tempted to write "attendees" or "people who," replace it with "you." Every time you want to say "it might be helpful," say "I want you to." That directness is what makes outward communication feel real.',
    });
  }


  // ── 7. CLEAR NEXT STEP & ENGAGEMENT ─────────────────────────────────
  // Does the email end with a clear, specific ask or question that
  // prompts the reader to respond? This is a scored category.

  const softCTA = [
    /would (it make sense|you be open|you have time)/i,
    /worth a (quick )?(call|conversation|chat)/i,
    /open to (a quick )?(call|chat|conversation)/i,
    /curious if (this|it)/i,
    /\b15[- ]?min(ute)?s?\b/i, /\b20[- ]?min(ute)?s?\b/i, /\b30[- ]?min(ute)?s?\b/i,
    /quick call/i, /quick chat/i, /short call/i,
    /can (we|i) (set up|schedule|find|grab)/i,
    /let's (schedule|set up|find time|find \d+|grab|block|hop on|jump on|connect|explore)/i,
    /i('d| would) like to (set up|schedule|find time|find \d+|grab)/i,
    /i('d| would) (genuinely |really )?like to (hear|find|set up|schedule|grab)/i,
    /does (this|that|it) (resonate|sound|make sense)/i,
    /what (day|time|does your|would) /i,
    /are you (free|available|around)/i,
    /does (monday|tuesday|wednesday|thursday|friday|next week) work/i,
    // Meeting / call invitations
    /hop on a (call|zoom|teams|meeting)/i,
    /jump on a (call|zoom|teams|meeting)/i,
    /get on a (call|zoom|teams|meeting)/i,
    /let's (discuss|talk|chat|connect|meet)/i,
    /in advance of (the|our|your|this)/i,
    // Registration / link-based CTAs
    /register(ed)? (through|via|using|with|at|here)/i,
    /get (you |your team |everyone )?(signed up|registered|enrolled)/i,
    /sign up (through|via|using|with|at|here|for)/i,
    /(through|via|using) (the|this) link/i,
    /send me (the |your )?(email|contact|name|info)/i,
    /I('ll| will) get (you|your|the|them) (signed up|registered|enrolled|added)/i,
    // Calendar / booking link CTAs
    /link to my calendar/i,
    /book (time|a time|a meeting|a call|a slot|a spot|with me)/i,
    /book time with/i,
    /find a time/i,
    /grab a time/i,
    /pick a time/i,
    /here('s| is) (a |my )?(link|calendar|booking|availability)/i,
    /schedule (a |some )?time (with|on|through|via)/i,
    /my (calendar|booking|availability) (link|page|below|here|above)/i,
    /calendly/i, /hubspot.*meeting/i,
    // Direct time-ask patterns (e.g., "let's find 20 minutes")
    /let's find \d+ min/i,
    /i'd like to find \d+ min/i,
    /\bcalendar\b/i,
    // Meeting invitations phrased as offers (not direct asks)
    /carve out time to (meet|talk|chat|connect|discuss)/i,
    /i('d| would) welcome (that|the (chance|opportunity)|a (call|conversation|chat|meeting))/i,
    /i('d| would) (love|enjoy|appreciate) (that|the (chance|opportunity)|a (call|conversation|chat|meeting))/i,
    /(meet|connect|talk|chat) (one another|each other|with each other|with one another)/i,
    /use this link/i,
    /use (the|this|my) (link|calendar|booking)/i,
    /time that works (best |well )?(for you|for your)/i,
    /time.{0,20}works.{0,10}for you/i,
    // Common scheduling tool URLs embedded in emails
    /meetings\.hubspot\.com/i,
    /outlook\.office365\.com.*booking/i,
    /acuityscheduling/i, /savvycal/i, /cal\.com/i, /doodle\.com/i,
    // Event / conference meetup asks
    /connect in person/i,
    /meet (up )?(in person|face to face)/i,
    /meet (up |you )?(at|during|before|after) (the |a )?(conference|event|summit|convention|expo|atd|workshop)/i,
    /connect (at|during|before|after) (the |a )?(conference|event|summit|convention|expo|atd|workshop)/i,
    /stop by (our|the|my) (booth|session|talk|presentation|workshop)/i,
    /see you (at|there|during)/i,
    /catch up (at|during|before|after)/i,
    /grab (coffee|lunch|a drink|breakfast|dinner) (at|during|before|after)/i,
  ];
  const hardCTA = [
    /\bbuy now\b/i, /\bsign up (today|now)\b/i, /\bget started today\b/i,
    /\bpurchase (now|today)\b/i, /\bsubscribe now\b/i, /\bclick here to buy\b/i,
  ];

  // Detect questions in the email (especially near the end)
  const allQuestions = email.match(/[^.!?\n][^.!?\n]*\?/g) || [];

  // For short emails (<120 words), search the whole email for questions;
  // otherwise search the last 50% (more generous than 40%)
  const questionSearchStart = wordCount < 120 ? 0 : Math.floor(email.length * 0.5);
  const questionSearchZone = email.substring(questionSearchStart);
  const endQuestions = questionSearchZone.match(/[^.!?\n][^.!?\n]*\?/g) || [];

  // Engagement questions that prompt a response
  const engagementQuestionPatterns = [
    /what (is|are|would|do|does|has|have|challenges|keeps)/i,
    /what('s|s) (the|your|one|a |that )/i,
    /what (if |pattern |dynamic |challenge |outcome |people |team |situation )/i,
    /how (is|are|do|does|would|has|have|did|can|could|about)/i,
    /how did (you|your|they|the)/i,
    /where (is|are|do|does)/i,
    /when('s| is| was| did) (the |your |the last )/i,
    /have you (ever|thought|considered|experienced|tried|seen)/i,
    /did you (stay|get|notice|see|feel|think|try|find|ever)/i,
    /does (this|that) (resonate|sound|ring true|apply)/i,
    /is (this|that|it) (something|relevant|a priority|on your radar)/i,
    /can (we|i) /i,
    /would (you|it|that|this) /i,
    /do you (think|see|have|know|find)/i,
    /will you (be |be at |attend |come to |join |make it)/i,
    /are you (going|attending|coming|planning|heading)/i,
    // Conversational / relationship-building questions
    /how did you (get|find|hear|learn|discover|become|come|start|end up)/i,
    /what (got|gets|brought|brings|drew|drives|made|makes) you/i,
    /what (do|did|would|could) you (think|feel|make|say|suggest|recommend|prefer)/i,
    /who (is|are|was|did|do|does)/i,
    /where did (you|your)/i,
    /when did (you|your)/i,
    /why (do|did|does|is|are|would)/i,
    // Event / conference attendance questions
    /are you (attending|going to|headed to|planning to attend|registered for|signed up for|joining)/i,
    /will you (be at|be attending|be going to|be joining|make it to)/i,
    /are you.{0,20}(conference|event|summit|convention|expo|atd|workshop|seminar)/i,
    /will (i |we )?(see you|catch you) (at|there)/i,
    /you (going|headed|coming|planning).{0,20}(conference|event|summit|convention|expo|atd|workshop)/i,
  ];

  // Check both end-zone questions AND all questions in the email
  // (a clear engagement question anywhere in a short email counts)
  const hasEngagementQuestionInEnd = endQuestions.some(q =>
    engagementQuestionPatterns.some(p => p.test(q))
  );
  const hasEngagementQuestionAnywhere = allQuestions.some(q =>
    engagementQuestionPatterns.some(p => p.test(q))
  );
  // For short emails, any engagement question counts;
  // for longer emails, prefer end-zone but accept anywhere with reduced weight
  const hasEngagementQuestion = hasEngagementQuestionInEnd ||
    (wordCount < 150 && hasEngagementQuestionAnywhere);

  const hasSoftCTA = softCTA.some(r => r.test(email));
  const hasHardCTA = hardCTA.some(r => r.test(email));

  if (hasHardCTA) {
    const matchedRe = hardCTA.find(r => r.test(email));
    const found = extractSnippet(email, matchedRe, 40);
    score -= 18;
    issues.push({
      title: 'Hard-sell CTA in a prospecting email',
      found: found,
      body: 'Asking a prospect to buy or sign up before they even know you is treating them as a means to your end, not as a person you want to help. In prospecting, the only ask should be: can we have a conversation? That is it. Earn the next step.',
      before: found || 'Sign up today for a free demo!',
      after: 'I would like to set up 15 minutes this week to hear what your team is working through and see if there is something I can help with. Does Thursday or Friday work better for you?',
    });
  } else if (!hasSoftCTA && !hasEngagementQuestion && wordCount > 40) {
    const closing = getClosing(email, 3);
    score -= 15;
    issues.push({
      title: 'No clear next step and no question to prompt a response',
      found: closing,
      body: 'Your email does not end with a clear ask or even a question. Without a next step, the reader has nothing to respond to \u2014 and most people will not invent one on their own. If you genuinely want to start a conversation with this person, make it easy for them. End with a specific question that shows you care about their answer, or a concrete next step they can say yes to.',
      before: closing,
      after: 'End with two things: (1) a question that teases out what they are trying to accomplish — their job to be done. Something like "What is the outcome your team needs from L&D this year?" or "What is the challenge that is keeping your leaders up at night?" (2) A direct next step: "Let\'s schedule 15 minutes next week to talk through it." Statement, not a question.',
    });
  } else if (hasSoftCTA && hasEngagementQuestion) {
    // Best case: both a question AND a clear next step
    const questionFound = endQuestions.length > 0 ? endQuestions[endQuestions.length - 1].trim() : null;
    const ctaMatch = softCTA.find(r => r.test(email));
    const ctaSnippet = ctaMatch ? extractSnippet(email, ctaMatch, 40) : null;
    goods.push({
      title: 'Strong close \u2014 clear next step with an engaging question',
      found: (questionFound ? questionFound : '') + (ctaSnippet ? (questionFound ? ' ... ' : '') + ctaSnippet : ''),
      body: 'You close with both a question that invites the reader to think and respond' + (questionFound ? ' ("' + questionFound.substring(0, 80) + '")' : '') + ' and a clear next step' + (ctaSnippet ? ' ("' + ctaSnippet.substring(0, 60) + '")' : '') + '. This is a trained skill worth naming: a good question surfaces the reader\'s job to be done \u2014 what outcome they need, what challenge is in their way. A good next step is a direct statement, not a question ("Let\'s schedule time" not "Would you be open to"). That combination turns an email into a real conversation. Keep doing both intentionally.',
    });
  } else if (hasSoftCTA) {
    const matchedRe = softCTA.find(r => r.test(email));
    const found = matchedRe ? extractSentence(email, matchedRe) || extractSnippet(email, matchedRe, 40) : null;
    score -= 3;
    coaching.push({
      title: 'Good next step \u2014 but add a question to spark a reply',
      found: found,
      body: 'You have a clear call to action, which is good. But add a question that teases out their job to be done \u2014 the outcome they are trying to achieve, the challenge that is in the way, or the progress they are trying to make. Try: "What is the outcome your leadership team needs from L&D this year?" or "What is the challenge your team keeps running into that you have not been able to solve?" or "What would it look like if your team was actually aligned on this?" These are not small-talk questions \u2014 they are designed to surface what the person is really trying to accomplish.',
      before: found,
      after: 'Add a JTBD question before your ask: "What is the outcome your team needs this quarter?" or "What is the one challenge that keeps coming back?" Then make your meeting ask a statement: "Let\'s schedule 15 minutes next week to talk through it."',
    });
  } else if (hasEngagementQuestion) {
    const questionFound = endQuestions.length > 0 ? endQuestions[endQuestions.length - 1].trim() : null;
    score -= 3;
    coaching.push({
      title: 'Good question \u2014 now add a specific next step',
      found: questionFound ? questionFound : null,
      body: 'You ask a question that could get the reader thinking, which is great. But without a concrete next step, they may not know what to do with their answer. Pair your question with a direct meeting statement \u2014 not a question. "Let\'s schedule 15 minutes next week to talk through it" or "I\'d like to set up a call Thursday to dig into this with you." The question gets them engaged, the statement gives them a clear path forward.',
      before: questionFound,
      after: 'After your question, add a direct next step as a statement: "Let\'s schedule 15 minutes next week to discuss." or "I\'d like to set up time Thursday or Friday to dig into this." Direct, not a question.',
    });
  }


  // ── 8. LENGTH ─────────────────────────────────────────────────────────
  if (wordCount > 300) {
    score -= 12;
    issues.push({
      title: 'Too long (' + wordCount + ' words)',
      found: null,
      body: 'A long email from someone you do not know signals that the sender is thinking about what they want to say, not about the reader\'s experience. If you genuinely care about this person\'s time, prove it by being concise. Aim for 75\u2013150 words. Every sentence should serve the reader, not you.',
      before: null,
      after: null,
    });
  } else if (wordCount > 200) {
    score -= 5;
    coaching.push({
      title: 'A bit long (' + wordCount + ' words)',
      found: null,
      body: 'At this length, you are asking a lot of a reader who does not know you yet. Go through sentence by sentence and ask: "Does this serve them, or does this serve me?" Cut everything that serves you.',
      before: null,
      after: null,
    });
  } else if (wordCount >= 60 && wordCount <= 160) {
    goods.push({
      title: 'Good length (' + wordCount + ' words)',
      body: 'At ' + wordCount + ' words, this is concise and respectful of the reader\'s time. Here is why this matters as a skill: a prospect who does not know you will spend about 10 seconds deciding whether to read or delete your email. Short emails get read. Long ones get skimmed or trashed. You are proving that every sentence serves the reader, not you. Keep holding yourself to this standard — if a sentence does not serve THEM, cut it.',
    });
  }


  // ── SCORE & GRADE ─────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  let grade, tag;
  if      (score >= 90) { grade = 'A'; tag = 'Excellent \u2014 this sounds like a real person who genuinely wants to help'; }
  else if (score >= 80) { grade = 'B'; tag = 'Good \u2014 minor adjustments will make this feel more personal'; }
  else if (score >= 70) { grade = 'C'; tag = 'Average \u2014 several areas where you can be more outward'; }
  else if (score >= 55) { grade = 'D'; tag = 'Below average \u2014 the reader will feel marketed to, not cared about'; }
  else                  { grade = 'F'; tag = 'Needs a fresh start \u2014 rewrite with the reader\'s world at the center'; }


  // ── BOTTOM LINE ───────────────────────────────────────────────────────
  let bottomLine = '';
  if (issues.length > 0) {
    const biggest = issues[0].title.toLowerCase();
    if (biggest.includes('product introduced too early')) {
      bottomLine = 'Before you mention what you sell, earn the right to. Show this person you understand what they are dealing with. Ask yourself: What are their needs? What are their objectives? Start with that, and the product conversation will come naturally.';
    } else if (biggest.includes('not sound like you') || biggest.includes('ai-generated')) {
      bottomLine = 'This email does not sound like it came from you. It sounds like it came from an AI. Stop prompting a tool to write your emails and start writing like yourself. Read what you wrote out loud \u2014 if it does not sound like something you would actually say in a conversation, delete it and try again in your own voice.';
    } else if (biggest.includes('customization')) {
      bottomLine = 'This email has nothing specific about this person or their situation. Before you write, spend 5 minutes learning about them \u2014 their company, their role, what they are dealing with. Then reference what you found. The reader should feel like you actually know something about their world.';
    } else if (biggest.includes('generic opener')) {
      bottomLine = 'Delete your first sentence and replace it with the most specific, relevant thing you know about this person\'s situation. That one change will transform how this email lands.';
    } else if (biggest.includes('we')) {
      bottomLine = 'Rewrite every "we" sentence from the reader\'s perspective. What are they trying to achieve? What keeps them up at night? Center the email on their world, not yours.';
    } else if (biggest.includes('passive')) {
      bottomLine = 'If you genuinely believe you can help this person, write like it. Cut every apology and every hedge. A person with real insight to share does not start with "sorry to bother you."';
    } else if (biggest.includes('distancing')) {
      bottomLine = 'Rewrite every sentence as if you are talking to one specific person across a table. Replace "part of the group" with "you." Replace "it might be helpful" with "I want to invite you to." Replace "as your rep" with what you actually intend to do for them. Make it personal, direct, and real.';
    } else {
      bottomLine = 'Your top priority: ' + issues[0].body.split('.')[0] + '.';
    }
  } else if (coaching.length > 0) {
    bottomLine = coaching[0].body.split('.')[0] + '.';
  } else {
    bottomLine = 'Strong work. This email sounds like it is coming from a real person who genuinely wants to understand the reader and help them with something that matters. That is exactly how outward prospecting should feel.';
  }

  return { score, grade, tag, issues, coaching, goods, bottomLine };
}


/* ═══════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════ */







/* ═══════════════════════════════════════════════════════
   COACHING CHAT
═══════════════════════════════════════════════════════ */

let lastResults = null;
let originalEmail = '';

// ── Interactive coaching flow state ──
let activeFlow = null;   // null, 'opener', 'custom', 'cta', 'passive', 'voice', 'distancing', 'we'
let flowStep = 0;
let flowData = {};

function clearFlow() { activeFlow = null; flowStep = 0; flowData = {}; }

// ── FLOW DEFINITIONS ──
// Each flow is an array of steps. Each step has:
//   ask: what the coach says at this step
//   key: where to store the user's answer in flowData
// The last entry has no key — it's the wrap-up that uses all collected data.

function getFlowSteps(flow) {
  if (flow === 'opener') return [
    { ask: 'Let\'s fix this opener. First — **who is this person?** What is their name, role, and company?', key: 'who' },
    { ask: 'Good. Now, **what do you actually know about their situation right now?** Any recent changes at their company, challenges they are facing, something they posted, or something from Salesforce?', key: 'situation' },
    { ask: 'Last one: **what is the outcome YOU want from this email?** Not "book a meeting" — what do you genuinely want to help them with?', key: 'intent' },
    { ask: '_generate_opener_' }
  ];
  if (flow === 'custom') return [
    { ask: 'Let\'s build customization into this email. **Who is this person and what company are they at?**', key: 'who' },
    { ask: 'Have you checked their **Salesforce record**? What campaigns or content have they engaged with? If you haven\'t checked yet, go look — I\'ll wait.', key: 'salesforce' },
    { ask: 'What do you know about **what is happening at their company** right now? Growth, restructuring, new leadership, expansion, challenges?', key: 'company' },
    { ask: 'Last question: **what do you think their job to be done is?** What outcome are they trying to achieve, or what challenge is in their way that they haven\'t solved yet?', key: 'jtbd' },
    { ask: '_generate_custom_' }
  ];
  if (flow === 'cta') return [
    { ask: 'Let\'s build a strong close. First — **what is the next step you actually want?** Be specific. A 15-minute call? An intro to someone else on their team? A reply?', key: 'nextstep' },
    { ask: 'Now think about their **job to be done**. What outcome is this person trying to achieve? What challenge are they dealing with that they have not solved? What would progress look like for them?', key: 'jtbd' },
    { ask: 'One more: **what would you ask this person if they were sitting across from you right now** and you genuinely wanted to understand their world?', key: 'question' },
    { ask: '_generate_cta_' }
  ];
  if (flow === 'passive') return [
    { ask: 'Let\'s make this more direct. I found these passive phrases in your email: **' + getPassivePhrases() + '**. Pick the one that feels most important to fix. What were you **actually trying to say** with that sentence?', key: 'intent' },
    { ask: 'Good. Now say it like you would say it to a friend — **no apology, no hedge, no softening.** Just the real message. Type it out.', key: 'rewrite' },
    { ask: '_generate_passive_' }
  ];
  if (flow === 'voice') return [
    { ask: 'Let\'s make this sound like you. **If this person was sitting across from you at a coffee shop right now, what would you actually say to them?** Don\'t think about it — just type it the way you would say it out loud.', key: 'natural' },
    { ask: 'That\'s your voice. Now — **what is one thing you genuinely believe about the work Arbinger does that makes you want to share it with this person?** Not a pitch. A belief.', key: 'belief' },
    { ask: '_generate_voice_' }
  ];
  if (flow === 'distancing') return [
    { ask: 'Let\'s make this more direct and personal. I found distancing language in your email — things like group references or hedging. **Who specifically are you writing to?** What is their first name?', key: 'name' },
    { ask: 'Now: **what do you actually want for ' + (flowData.name || 'this person') + '?** Not what you want to sell them — what do you want them to experience or achieve?', key: 'want' },
    { ask: 'Last: **what would you say to ' + (flowData.name || 'them') + ' if it was just the two of you talking?** No group language, no title, no hedging. Just you to them.', key: 'direct' },
    { ask: '_generate_distancing_' }
  ];
  if (flow === 'we') return [
    { ask: 'Your email is too focused on "we." Let\'s flip it. **Pick one sentence from your email that starts with "we" and type it here.**', key: 'wesentence' },
    { ask: 'Now — **what is the reader experiencing that makes this relevant to them?** What are they struggling with, trying to achieve, or dealing with?', key: 'theirworld' },
    { ask: '_generate_we_' }
  ];
  return [];
}

function getPassivePhrases() {
  if (!lastResults) return '';
  var all = lastResults.issues.concat(lastResults.coaching);
  var passiveItem = all.find(function(i) { return i.title.toLowerCase().includes('passive'); });
  return passiveItem ? passiveItem.found || passiveItem.title : 'passive phrasing';
}

// ── Generate wrap-up responses using collected data ──
function generateFlowResult() {
  if (activeFlow === 'opener') {
    var who = flowData.who || 'the person';
    var situation = flowData.situation || '';
    var intent = flowData.intent || '';
    var resp = '**Here is how to build your opener:**\n\n';
    if (situation && situation.length > 10) {
      resp += 'Lead with what you know: take the most specific detail from what you just told me about their situation and make that your first sentence. Something like:\n\n';
      resp += '"I noticed [specific detail about ' + who + ']. That kind of [challenge/change] usually surfaces [relevant problem]..."\n\n';
    } else {
      resp += 'You mentioned you don\'t know much about their situation yet. Before you write another word — go do 5 minutes of research. Check their LinkedIn, their company news, their Salesforce record. Then come back and the opener will write itself.\n\n';
    }
    resp += 'Your intent is to ' + (intent || 'help them') + '. But do NOT say that yet. The opener should be 100% about THEIR world. Your intent comes later.\n\n';
    resp += 'Try writing a new opening line now and paste it here — I\'ll tell you if it lands.';
    return resp;
  }
  if (activeFlow === 'custom') {
    var resp = '**Here is how to weave customization in:**\n\n';
    if (flowData.salesforce && flowData.salesforce.length > 10) {
      resp += '**From Salesforce:** You said they engaged with ' + flowData.salesforce + '. Reference this early — "I noticed you checked out [content/campaign]. That tells me [topic] is on your radar..."\n\n';
    } else {
      resp += '**Salesforce tip:** Go pull up their record right now. Look at campaign engagement — which webinars, content, or events have they interacted with? That tells you what they care about and gives you a natural opening.\n\n';
    }
    if (flowData.company && flowData.company.length > 10) {
      resp += '**Company context:** You mentioned ' + flowData.company + '. Put this in the first two sentences. Show them you know what is going on in their world.\n\n';
    }
    if (flowData.jtbd && flowData.jtbd.length > 10) {
      resp += '**Their job to be done:** You think they are trying to ' + flowData.jtbd + '. This is gold. Frame your email around this — show that you understand the outcome they need, and hint that you have ideas about how to get there.\n\n';
    }
    resp += 'Now try rewriting your email with these details woven in, and paste it here. I\'ll re-grade it.';
    return resp;
  }
  if (activeFlow === 'cta') {
    var nextstep = flowData.nextstep || 'a meeting';
    var jtbd = flowData.jtbd || '';
    var question = flowData.question || '';
    var resp = '**Here is your closing formula:**\n\n';
    if (question && question.length > 5) {
      resp += '**Your question:** "' + question + '"\n';
      resp += 'This is good if it surfaces their job to be done. ';
      if (!/\?$/.test(question.trim())) resp += 'Make sure it ends with a question mark. ';
      resp += 'The question should make them think about their own situation — not just say yes or no.\n\n';
    }
    if (jtbd && jtbd.length > 10) {
      resp += 'If your question doesn\'t directly connect to their JTBD (' + jtbd + '), try something like:\n"What is the biggest obstacle standing between your team and [their desired outcome]?"\n"What would it take for [their challenge] to actually get resolved this quarter?"\n\n';
    }
    resp += '**Your next step:** State it directly — don\'t ask permission.\n';
    resp += 'Instead of "Would you be open to..." say: "**Let\'s schedule ' + nextstep + '.**" or "**I\'d like to set up ' + nextstep + ' — does Thursday or Friday work?**"\n\n';
    resp += 'The pattern is: JTBD question first, then direct meeting statement. Try writing your new close and paste it here.';
    return resp;
  }
  if (activeFlow === 'passive') {
    var intent = flowData.intent || '';
    var rewrite = flowData.rewrite || '';
    var resp = '**That is better.** ';
    if (rewrite && rewrite.length > 5) {
      resp += 'You wrote: "' + rewrite + '"\n\n';
      if (/sorry|wonder|maybe|perhaps|just wanted|no rush|feel free|if you have/i.test(rewrite)) {
        resp += 'I still see some hedging in there. Read it again — is there an apology or a softener you can cut? Say it even more directly. The reader should feel your conviction, not your hesitation.\n\n';
      } else {
        resp += 'That sounds like someone with conviction. Notice the difference? No apology, no hedging — just a clear statement from someone who believes they can help. That is the energy your whole email should have.\n\n';
      }
    }
    resp += 'Now go through the rest of your email and apply this same approach. Every time you see "just," "maybe," "no rush," or an apology — cut it and say what you actually mean. Then paste your revised email here and I\'ll re-grade it.';
    return resp;
  }
  if (activeFlow === 'voice') {
    var natural = flowData.natural || '';
    var belief = flowData.belief || '';
    var resp = '';
    if (natural && natural.length > 10) {
      resp += '**This is your voice:** "' + natural + '"\n\n';
      resp += 'Read that back. That sounds like a human being. THAT is the energy your email should have. Not polished, not templated — real.\n\n';
    }
    if (belief && belief.length > 10) {
      resp += '**Your belief:** "' + belief + '"\n\n';
      resp += 'This matters because when that conviction comes through in your writing, people can feel it. You are not selling a product — you are sharing something you believe in. Let that show.\n\n';
    }
    resp += 'Now rewrite your email using this voice. Use contractions. Vary your sentence length. Start sentences differently. If a sentence sounds like something ChatGPT would write, delete it and write what you would actually say. Paste your rewrite here and I\'ll re-grade it.';
    return resp;
  }
  if (activeFlow === 'distancing') {
    var name = flowData.name || 'them';
    var want = flowData.want || '';
    var direct = flowData.direct || '';
    var resp = '';
    if (direct && direct.length > 10) {
      resp += '**That is how you should write.** You said: "' + direct + '"\n\n';
      resp += 'Notice: no group references, no title-dropping, no hedging. Just one person talking to ' + name + '. That is the standard for every sentence in your email.\n\n';
    }
    if (want && want.length > 10) {
      resp += '**What you want for ' + name + ':** ' + want + '. Let that come through. Instead of "as your representative," show them what you intend to DO for them.\n\n';
    }
    resp += 'Now go through your email line by line. Every time you see "attendees," "the group," "those who," "as your rep," or "it might be helpful" — rewrite it as if you are talking directly to ' + name + '. Paste the revision here and I\'ll re-grade it.';
    return resp;
  }
  if (activeFlow === 'we') {
    var wesentence = flowData.wesentence || '';
    var theirworld = flowData.theirworld || '';
    var resp = '';
    if (wesentence && theirworld) {
      resp += '**Original:** "' + wesentence + '"\n\n';
      resp += '**Their world:** ' + theirworld + '\n\n';
      resp += '**Now flip it.** Rewrite that sentence so it starts with "you" or "your" and describes their experience instead of your capabilities. Something like: "Your team is [dealing with what you described] — and that is exactly the kind of challenge where [what Arbinger does] makes the biggest difference."\n\n';
    }
    resp += 'Apply this to every "we" sentence in your email. The reader should feel like the main character, not the audience. Paste your revision here and I\'ll re-grade it.';
    return resp;
  }
  return 'Paste your revised email here and I\'ll re-grade it.';
}

// ── Main chat handler ──


// ── Quick Q&A for informational questions (not interactive flows) ──
function generateQuickResponse(q) {
  if (!lastResults) return 'Paste an email first, and I will coach you through improving it.';

  if (q.match(/score|grade|improv|better|higher|point/)) {
    if (lastResults.issues.length > 0) {
      var topIssues = lastResults.issues.slice(0, 2).map(function(i) { return i.title; });
      return 'Your biggest issues are: **' + topIssues.join('** and **') + '**. Say "help me fix [area]" and I will walk you through it step by step. Or paste a revised email to re-grade it.';
    }
    if (lastResults.coaching.length > 0) {
      return 'You are close! Minor tweaks: ' + lastResults.coaching.map(function(c) { return c.title; }).join('; ') + '. Say "help me fix" any of these and I will coach you through it.';
    }
    return 'You are at a **' + lastResults.grade + ' (' + lastResults.score + '/100)**. Strong. If you want to push higher, ask me to help with a specific area.';
  }

  if (q.match(/what (should|can|do)|where (do|should)|how do/)) {
    if (lastResults.issues.length > 0) {
      return 'Start with your biggest issue: **' + lastResults.issues[0].title + '**. Say "help me fix this" and I will walk you through it. You can also say things like "help me fix the opener" or "help me add customization" or "help me fix the close."';
    }
    return 'Your email is in good shape. You can say "help me fix [area]" to work on any section, or paste a revised version to re-grade it.';
  }

  // Default — always guide toward interactive flows
  var areas = [];
  lastResults.issues.forEach(function(i) { areas.push(i.title); });
  lastResults.coaching.forEach(function(c) { areas.push(c.title); });

  if (areas.length > 0) {
    return 'I can walk you through fixing any of these step by step. Try saying:\n\n' +
      '- "Help me fix the opener"\n' +
      '- "Help me add customization"\n' +
      '- "Help me fix the close"\n' +
      '- "Help me sound more like myself"\n' +
      '- "Help me be more direct"\n\n' +
      'Or paste a revised email to re-grade it.';
  }

  return 'Nice work — this email is strong. You can say "help me fix [area]" to drill into any section, or paste a revised version to re-grade it. Try: "help me fix the opener," "help me add customization," or "help me fix the close."';
}


/* ═══════════════════════════════════════════════════════
   LIVE COACHING ENGINE
   Real-time nudges while composing an email.
═══════════════════════════════════════════════════════ */

// Generate JTBD question suggestions based on context
function generateJtbdSuggestion(context) {
  context = context || {};
  const who = (context.who || '').toLowerCase();
  const goal = (context.goal || '').toLowerCase();
  const jtbd = (context.jtbd || '').toLowerCase();

  // If they already filled in the JTBD field, craft a question from it
  if (jtbd) {
    // Generate a question that references their specific JTBD
    if (jtbd.match(/turnover|retention|attrition|keeping|losing/)) {
      return 'Try: "What\'s driving the turnover you\'re seeing, and what would it look like if your team actually wanted to stay?"';
    }
    if (jtbd.match(/leadership|leader|manager|executive/)) {
      return 'Try: "What outcome does your leadership team need to deliver this year, and what\'s getting in the way?"';
    }
    if (jtbd.match(/culture|engagement|morale|trust/)) {
      return 'Try: "What would it look like if your culture was actually working the way you need it to?"';
    }
    if (jtbd.match(/conflict|silo|collaboration|alignment|team/)) {
      return 'Try: "What\'s the cost of the misalignment you\'re seeing, and what would change if your teams were actually working together?"';
    }
    if (jtbd.match(/performance|results|productivity|accountability/)) {
      return 'Try: "What results does your team need to hit, and what keeps getting in the way?"';
    }
    if (jtbd.match(/training|development|l&d|learning|program/)) {
      return 'Try: "What outcome do you need from your development investment this year — what would make it worth it?"';
    }
    if (jtbd.match(/customer|service|satisfaction|experience/)) {
      return 'Try: "What would it look like if your team saw every customer interaction as a chance to genuinely help, not just resolve a ticket?"';
    }
    // Generic fallback using their actual JTBD text
    return 'Try asking about their JTBD directly: "What\'s the biggest obstacle standing between your team and ' + jtbd.substring(0, 60) + '?"';
  }

  // If they filled in who/role, tailor to the role
  if (who.match(/vp|vice president|director|head of/)) {
    return 'Try a question like: "What\'s the one outcome your team needs to deliver this year that you\'re not confident you\'ll hit?"';
  }
  if (who.match(/hr|people|talent|chief people/)) {
    return 'Try: "What\'s the people challenge that keeps showing up no matter what you\'ve tried?"';
  }
  if (who.match(/ceo|president|founder|owner/)) {
    return 'Try: "What\'s the organizational challenge that\'s costing you the most right now?"';
  }
  if (who.match(/l&d|learning|development|training/)) {
    return 'Try: "What would a successful leadership development outcome actually look like for your organization this year?"';
  }
  if (who.match(/sales|revenue|commercial/)) {
    return 'Try: "What\'s getting in the way of your team hitting the numbers you need?"';
  }

  // If they filled in a goal, use that
  if (goal.match(/discovery|call|meeting|conversation/)) {
    return 'If it fits, try a JTBD question like: "What\'s the challenge your team keeps running into that you haven\'t been able to solve?" — it surfaces what they\'re really trying to accomplish.';
  }
  if (goal.match(/register|event|webinar|session|workshop/)) {
    return 'If it fits, try: "What\'s the outcome you\'re hoping to walk away with?" — it makes the invitation feel personal, not mass-sent.';
  }

  // Generic JTBD questions
  return 'If it fits this email, try a JTBD question like: "What\'s the outcome your team needs this quarter?" or "What challenge keeps showing up that you haven\'t been able to solve?"';
}

function liveCoach(text, context) {
  // context = { who: '', goal: '', jtbd: '' }  (optional fields from the Write tab)
  context = context || {};
  const tips = [];
  if (!text || text.trim().length < 15) return tips;

  const lower = text.toLowerCase();
  const words = text.split(/\s+/);
  const wordCount = words.length;
  const paragraphs = text.split(/\n\s*\n/);
  const firstPara = (paragraphs[0] || '').toLowerCase();
  const first80w = words.slice(0, 80).join(' ').toLowerCase();

  // ── 1. Length gauge ──
  if (wordCount < 30) {
    tips.push({ icon: '📏', title: 'Keep going', tip: wordCount + ' words so far. Sweet spot is 75–150 words.' });
  } else if (wordCount >= 30 && wordCount <= 75) {
    tips.push({ icon: '📏', title: 'Getting there', tip: wordCount + ' words — you\'re building momentum. Aim for 75–150.' });
  } else if (wordCount > 75 && wordCount <= 150) {
    tips.push({ icon: '✅', title: 'Great length', tip: wordCount + ' words — right in the sweet spot. Every sentence should serve the reader.' });
  } else if (wordCount > 150 && wordCount <= 200) {
    tips.push({ icon: '⚠️', title: 'Getting long', tip: wordCount + ' words — start trimming. Ask: "Does this sentence serve them or me?"' });
  } else {
    tips.push({ icon: '🚨', title: 'Too long', tip: wordCount + ' words. Prospects won\'t read this. Cut ruthlessly — aim for under 150.' });
  }

  // ── 2. Opener check ──
  const earlyPitchRegexes = [
    /\bwe (offer|provide|help|build|create|enable|deliver)\b/i,
    /\bour (platform|product|solution|service|software|tool|system|offering|technology)\b/i,
    /\bi('m| am) (reaching out|writing) (about|to (tell|share|introduce|show))\b/i,
    /\bi wanted to (introduce|tell you about|show you|share|reach out about)\b/i,
    /\bintroducing our\b/i,
    /\bi('d| would) (like|love) to (show|introduce|share)\b/i,
  ];
  const genericOpeners = [
    /hope this (email|message|note|finds you)/i,
    /hope you('re| are) (doing well|having)/i,
    /my name is\b/i,
    /i('m| am) reaching out/i,
    /just (wanted|checking|following up|circling back)/i,
  ];

  if (wordCount > 8) {
    const pitchEarly = earlyPitchRegexes.some(r => r.test(firstPara) || r.test(first80w));
    const genericOpen = genericOpeners.some(r => r.test(firstPara));
    if (pitchEarly) {
      tips.push({ icon: '🚨', title: 'Leading with your product', tip: 'Your opener is about what you sell. Flip it — what is THIS person dealing with? Lead with their world.' });
    } else if (genericOpen) {
      tips.push({ icon: '🚨', title: 'Generic opener', tip: '"Hope this finds you well" could go to anyone. Replace it with the most specific thing you know about this person.' });
    } else if (wordCount > 20) {
      tips.push({ icon: '✅', title: 'Good opener', tip: 'You\'re not leading with a pitch or a generic line. Nice.' });
    }
  }

  // ── 3. We vs You pulse ──
  const weCount = (lower.match(/\bwe\b/g) || []).length;
  const youCount = (lower.match(/\b(you|your)\b/g) || []).length;
  if (wordCount > 20) {
    if (weCount > youCount + 2 && weCount > 3) {
      tips.push({ icon: '🚨', title: '"We" heavy (' + weCount + ' vs ' + youCount + ')', tip: 'You say "we" more than "you." Flip it — rewrite "we" sentences from the reader\'s perspective.' });
    } else if (weCount > youCount && weCount > 2) {
      tips.push({ icon: '⚠️', title: 'Watch the we/you ratio', tip: '"We" ' + weCount + ' times, "you/your" ' + youCount + '. Try flipping a few "we" sentences to focus on them.' });
    } else if (youCount > weCount) {
      tips.push({ icon: '✅', title: 'Prospect-focused', tip: '"You/your" ' + youCount + ' vs "we" ' + weCount + ' — the reader feels centered.' });
    }
  }

  // ── 4. Passive/weak language ──
  const passivePatterns = [
    { re: /i was wondering if\b/i, label: '"I was wondering if..."' },
    { re: /i (just |only )?(wanted|want) to (quickly )?(check|see|ask|reach|follow|touch)/i, label: '"I just wanted to..."' },
    { re: /i was hoping\b/i, label: '"I was hoping..."' },
    { re: /sorry (to bother|for (bothering|reaching))\b/i, label: '"Sorry to bother you"' },
    { re: /i (don't|do not) want to (bother|take up|waste)\b/i, label: '"I don\'t want to bother you"' },
    { re: /no (rush|pressure|worries|obligation)\b/i, label: '"No rush / no pressure"' },
    { re: /feel free to\b/i, label: '"Feel free to..."' },
    { re: /i (know|realize|understand) you('re| are) (busy|swamped|slammed)/i, label: '"I know you\'re busy"' },
    { re: /perhaps (we|i|you) (could|can|might)\b/i, label: '"Perhaps we could..."' },
  ];
  const foundPassive = passivePatterns.filter(c => c.re.test(text));
  if (foundPassive.length > 0) {
    tips.push({ icon: '⚠️', title: 'Passive language detected', tip: 'Found: ' + foundPassive.map(p => p.label).join(', ') + '. If you believe you can help them, write like it. Cut the hedge.' });
  }

  // ── 5. Buzzwords ──
  const buzzwords = [
    'synergy','leverage','best-in-class','industry-leading','cutting-edge',
    'revolutionary','world-class','seamlessly','game-changer','game changer',
    'robust','holistic','end-to-end','paradigm','empower','circle back',
    'touch base','move the needle','value-add','thought leader','innovative solution',
    'comprehensive platform','at scale'
  ];
  const foundBuzz = buzzwords.filter(b => lower.includes(b));
  if (foundBuzz.length > 0) {
    tips.push({ icon: '⚠️', title: 'Buzzwords', tip: 'Found: "' + foundBuzz.slice(0, 3).join('", "') + '". Say it in plain language the way you\'d explain it to a friend.' });
  }

  // ── 6. AI / template voice ──
  const aiPhrases = [
    /i wanted to take a moment/i, /please don't hesitate to/i,
    /I look forward to the opportunity/i,
    /i('m| am) (excited|thrilled|delighted) to/i,
    /\bin today's (fast-paced|rapidly|ever-changing)\b/i,
    /\bmoreover\b/i, /\bfurthermore\b/i, /\badditionally\b/i,
    /\butilize\b/i, /\bfacilitate\b/i, /\bensure (that )?(you|your|we)\b/i,
  ];
  const aiHits = aiPhrases.filter(r => r.test(text));
  const contractionCount = (text.match(/\b(I'm|I'd|I'll|don't|doesn't|can't|won't|wouldn't|we're|it's|that's|let's)\b/gi) || []).length;
  const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;

  if (aiHits.length >= 2 || (aiHits.length >= 1 && contractionCount === 0 && sentenceCount > 3)) {
    tips.push({ icon: '🤖', title: 'Sounds AI-generated', tip: 'This reads like ChatGPT, not like you. Use contractions. Be casual. Write the way you\'d actually talk.' });
  } else if (contractionCount === 0 && sentenceCount > 3 && wordCount > 40) {
    tips.push({ icon: '⚠️', title: 'Too formal', tip: 'No contractions anywhere — reads stiff. Try "I\'m" instead of "I am", "don\'t" instead of "do not". Sound like yourself.' });
  }

  // ── 7. Distancing language ──
  const distancingPatterns = [
    { re: /part of (the )?(group|team|cohort|audience|those)/i, tip: 'Replace "part of the group" with "you." Talk to one person.' },
    { re: /\b(attendees|participants|registrants)\b/i, tip: 'Replace group nouns with "you." Talk directly to THIS person.' },
    { re: /it might (be helpful|help|make sense)/i, tip: '"It might" is hedging. Say what you actually want them to do.' },
    { re: /as your (main |primary |lead )?(rep|representative|point of contact|account manager)/i, tip: 'Drop the role title. State what you intend to DO for them instead.' },
    { re: /it would be (great|wonderful|nice) to (hear|connect|chat|meet)/i, tip: '"It would be great" is passive. Try "I want to..." — own the ask.' },
    { re: /get to know you better/i, tip: 'Replace with a specific question about their objectives or challenges.' },
  ];
  const foundDist = distancingPatterns.filter(d => d.re.test(text));
  if (foundDist.length > 0) {
    tips.push({ icon: '⚠️', title: 'Distancing language', tip: foundDist[0].tip });
  }

  // ── 8. CTA / close check ──
  if (wordCount > 50) {
    const liveCTA = [
      /let's (schedule|set up|find time|grab|block|hop on|jump on|connect|discuss|talk|chat|meet)/i,
      /i('d| would) like to (set up|schedule)/i,
      /\b15[- ]?min/i, /\b20[- ]?min/i, /\b30[- ]?min/i,
      /can (we|i) (set up|schedule)/i,
      /does (monday|tuesday|wednesday|thursday|friday|next week) work/i,
      /hop on a (call|zoom|teams|meeting)/i,
      /jump on a (call|zoom|teams|meeting)/i,
      /get on a (call|zoom|teams|meeting)/i,
      /in advance of (the|our|your|this)/i,
      /register(ed)? (through|via|using|with|at|here)/i,
      /get (you |your team |everyone )?(signed up|registered|enrolled)/i,
      /sign up (through|via|using|with|at|here|for)/i,
      /(through|via|using) (the|this) link/i,
      /send me (the |your )?(email|contact|name|info)/i,
      /I('ll| will) get (you|your|the|them) (signed up|registered|enrolled|added)/i,
      /would (it make sense|you be open|you have time)/i,
      /open to (a quick )?(call|chat|conversation)/i,
      /are you (free|available|around)/i,
      // Calendar / booking link CTAs
      /link to my calendar/i,
      /book (time|a time|a meeting|a call|a slot|a spot|with me)/i,
      /book time with/i,
      /find a time/i,
      /grab a time/i,
      /pick a time/i,
      /here('s| is) (a |my )?(link|calendar|booking|availability)/i,
      /schedule (a |some )?time (with|on|through|via)/i,
      /my (calendar|booking|availability) (link|page|below|here|above)/i,
      /calendly/i, /hubspot.*meeting/i,
      // Meeting invitations phrased as offers
      /carve out time to (meet|talk|chat|connect|discuss)/i,
      /i('d| would) welcome (that|the (chance|opportunity)|a (call|conversation|chat|meeting))/i,
      /(meet|connect|talk|chat) (one another|each other)/i,
      /use this link/i,
      /use (the|this|my) (link|calendar|booking)/i,
      /time that works (best |well )?(for you|for your)/i,
      /time.{0,20}works.{0,10}for you/i,
      /meetings\.hubspot\.com/i,
      /acuityscheduling/i, /savvycal/i, /cal\.com/i, /doodle\.com/i,
    ];
    // For short emails, search the whole email for questions; otherwise last 50%
    const sidebarWordCount = text.split(/\s+/).length;
    const questionStart = sidebarWordCount < 120 ? 0 : Math.floor(text.length * 0.5);
    const endQuestions = text.substring(questionStart).match(/[^.!?\n][^.!?\n]*\?/g) || [];

    const hasCTA = liveCTA.some(r => r.test(text));
    const hasQuestion = endQuestions.length > 0;

    if (hasCTA && hasQuestion) {
      tips.push({ icon: '✅', title: 'Strong close', tip: 'You have both a question and a clear next step. Great finish.' });
    } else if (hasCTA && !hasQuestion) {
      // They have a next step — suggest a JTBD question based on context
      const jtbdSuggestion = generateJtbdSuggestion(context);
      tips.push({ icon: '💡', title: 'Consider a JTBD question', tip: 'You have a solid next step. If it makes sense for this email, adding a question that teases out what they\'re trying to accomplish can deepen engagement. ' + jtbdSuggestion });
    } else if (!hasCTA && hasQuestion) {
      tips.push({ icon: '💡', title: 'Add a direct next step', tip: 'Good question — now pair it with a statement: "Let\'s schedule 15 minutes next week to discuss."' });
    } else {
      // Missing close — generate specific JTBD questions to help
      const jtbdHelp = generateJtbdSuggestion(context);
      tips.push({ icon: '🚨', title: 'Missing a close', tip: 'No clear next step yet. Try ending with a direct statement like "Let\'s hop on a call this week to discuss" or "Get registered through the link." ' + jtbdHelp });
    }
  }

  // ── 9. Context-aware nudges ──
  if (context.who && wordCount > 10) {
    const nameFirst = context.who.split(/\s/)[0].toLowerCase();
    if (!lower.includes(nameFirst) && !lower.includes('hi') && !lower.includes('hey')) {
      tips.push({ icon: '💡', title: 'Use their name', tip: 'You filled in who this is for (' + context.who + ') but haven\'t addressed them yet.' });
    }
  }

  // ── 10. JTBD coaching ──
  const jtbdVal = (context.jtbd || '').trim().toLowerCase();
  const jtbdUnknown = !jtbdVal || jtbdVal.match(/^(i )?(don't|dont|do not) know/i) || jtbdVal.match(/^(not sure|unsure|no idea|idk|n\/a|na|none|unknown|\?+|-)$/i) || jtbdVal.length < 3;

  if (jtbdUnknown && wordCount > 20) {
    // They don't know the JTBD — help them figure it out
    const jtbdDiscovery = generateJtbdDiscoveryTip(context);
    tips.push({ icon: '💡', title: 'Discover their job to be done', tip: jtbdDiscovery });
  } else if (context.jtbd && !jtbdUnknown && wordCount > 30) {
    // They know the JTBD — nudge them to weave it in
    const jtbdLower = context.jtbd.toLowerCase();
    // Check if they've already referenced the JTBD theme in the email
    const jtbdKeywords = jtbdLower.split(/\s+/).filter(w => w.length > 4);
    const referencedJtbd = jtbdKeywords.some(kw => lower.includes(kw)) ||
      lower.includes('challenge') || lower.includes('outcome') || lower.includes('goal') || lower.includes('objective');
    if (!referencedJtbd) {
      tips.push({ icon: '💡', title: 'Weave in their JTBD', tip: 'You noted their job to be done ("' + context.jtbd.substring(0, 50) + (context.jtbd.length > 50 ? '...' : '') + '") — try referencing it in the email so they know you understand what they\'re working on.' });
    } else {
      tips.push({ icon: '✅', title: 'JTBD referenced', tip: 'You\'re connecting to what they\'re trying to accomplish. That shows you see them, not just a name on a list.' });
    }
  }

  return tips;
}

// Generate tips for discovering JTBD when the rep doesn't know it
function generateJtbdDiscoveryTip(context) {
  context = context || {};
  const who = (context.who || '').toLowerCase();

  // Tailor discovery advice based on role if available
  if (who.match(/vp|vice president|director|head of|chief|c-suite|coo|cfo/)) {
    return 'You don\'t know their JTBD yet — that\'s OK, but your email should try to surface it. Try asking: "What\'s the outcome your team needs to deliver this year that feels at risk?" or "What\'s the one leadership challenge that keeps resurfacing?" These questions help you discover what they\'re really trying to accomplish.';
  }
  if (who.match(/hr|people|talent|chief people/)) {
    return 'You don\'t know their JTBD yet. Try asking: "What\'s the people challenge your team keeps bumping into?" or "What would it look like if your culture was actually driving the results you need?" Their answer IS the job to be done.';
  }
  if (who.match(/l&d|learning|development|training/)) {
    return 'You don\'t know their JTBD yet. Try: "What outcome does your organization need from leadership development this year?" or "What would make this year\'s investment in L&D actually stick?" Their answer tells you the job.';
  }
  if (who.match(/sales|revenue|commercial|business dev/)) {
    return 'You don\'t know their JTBD yet. Try: "What\'s getting in the way of your team closing at the rate you need?" or "What would change if every rep was actually selling the way your best rep does?" That surfaces the real job.';
  }
  if (who.match(/manager|supervisor|team lead/)) {
    return 'You don\'t know their JTBD yet. Try: "What\'s the biggest challenge you\'re facing with your team right now?" or "What would it look like if your team was fully bought in?" These surface what they\'re really trying to get done.';
  }

  // Generic discovery questions
  return 'You don\'t know their JTBD yet — that\'s what your email can help you discover. Try asking: "What\'s the challenge your team keeps running into?" or "What outcome are you trying to drive this year?" or "What would change if the people problem you\'re seeing was actually solved?" Their answer IS the job to be done — and it gives you the foundation for every conversation after this.';
}
