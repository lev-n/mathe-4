# Research summary: Mathe-Portal Klasse 4

| | |
|---|---|
| **Project** | Interactive maths practice portal for Klasse 4 (Grundschule, Germany). Vite + TypeScript, static site on Firebase Hosting, progress only in the browser (localStorage), no login. |
| **Research date** | 2026-10-18 (M16 and [174]–[197]: 2026-10-19) |
| **Language** | This document is in English. German curriculum terms (e.g. *Leitidee*, *Ergänzungsverfahren*) and all child-facing strings are kept in German. |
| **Status** | Basis for implementation. Several thresholds are heuristics and are marked as such (see section 7). This is not legal advice. |

## Key takeaways

1. **Make children answer, not reread.** Classroom quizzing improves learning (g = 0.50). In elementary school the estimate is numerically smaller (g = 0.33, wide CI), although the differences between school levels were not statistically significant [1]. Every practice screen asks the child to produce an answer.
2. **Feedback quality matters more than game graphics.** In computer-based learning, elaborated feedback (an explanation) had an effect of 0.49, while marking only right or wrong had 0.05 [10]. Feedback that carries a lot of information is the strongest kind of feedback (d = 0.99) [12]. So a wrong answer gets a targeted hint and a second try, and then a worked solution.
3. **The app plans spacing and mixing; the child does not.** Spaced retrieval beats massed retrieval (g = 0.74 after correction for publication bias), and an expanding review ladder was no better than a uniform one [3]. Learners left to practise on their own rarely complete spaced practice (shown with 15–17-year-olds) [5]. Mixed practice helps in maths, though it lowers accuracy during practice [6–9].
4. **Mastery thresholds (8 of 10) and target success rates (about 85 %) are heuristics.** The mastery-learning evidence is weak on standardised tests [24], and the 85 % rule comes from machine-learning theory [26]. We use these thresholds openly and will tune them.
5. **Gamification has small and uncertain effects** [46]. Tangible rewards (including symbolic ones such as certificates) undermine free-choice intrinsic motivation, more so in children (d = −0.39) than in college students (d = −0.27); unexpected rewards had no such effect [60]. In this app, stars and badges report mastery. There is no currency, no leaderboard and no streak that can be lost.
6. **Growth-mindset interventions have very small effects** (d = 0.08) [47]. We still use short, strategy-focused, non-inflated praise because it costs little and carries little risk, not because it is proven to raise achievement.
7. **The KMK Bildungsstandards 2022 are the alignment frame** [83]. LehrplanPLUS Bayern [85] and the NRW Lehrplan 2021 [88] set the limits of scope. Written division is not part of the KMK standards and is handled differently in each Land [94–96]. The written subtraction method also differs between Länder [99–103].
8. **Privacy by avoidance.** The app has no accounts, collects no personal data and makes no third-party requests. Nothing is written to the device until the child asks the app to remember their progress [109–117].
9. **Accessible and calm by default.** The app targets WCAG 2.2 AA plus selected AAA criteria. Touch targets are at least 48 px (64 px for primary controls). There are no timers by default, and feedback never relies on colour alone [133–140].

---

## 1. Purpose and method

### 1.1 Purpose

This document records the evidence and norms behind the design of the portal. It answers four questions:

1. Which practices from learning science fit digital maths practice in primary school (section 2)?
2. How can the app motivate 9–10-year-olds without manipulating them (section 3)?
3. What exactly does Klasse 4 cover according to the KMK Bildungsstandards and two Länder curricula, and which notation conventions apply (section 4)?
4. What do German and EU privacy law, accessibility standards and child-computer interaction research require from a login-free static web app (section 5)?

Section 6 maps every finding to a concrete design decision. Section 7 lists what remains uncertain.

### 1.2 Method

- **Date.** All searches and source checks were done on **2026-10-18**.
- **Four parallel research tracks.** AI research agents worked from a common brief, one per track: (1) learning science, (2) motivation, mindset and gamification, (3) curriculum alignment, and (4) privacy, security, accessibility and child UX. Each track recorded every finding with the topic, the finding, an evidence-strength label, its sources and a design implication.
- **Source preference.** We preferred meta-analyses and randomised or large studies, then official texts for law, standards and curricula, then vendor documentation for hosting. Practitioner sources were used only where nothing better existed, and they are labelled as such.
- **Verification.** A source counts as verified when the researcher opened the URL and confirmed the cited content. Some figures come from an abstract, a press release or a secondary summary; the text says so wherever this applies. Sources that could not be opened are marked **(not verified online)** in section 8.
- **Adversarial fact-check (2026-10-18).** After drafting, a separate pass re-opened the sources behind every curriculum statement (KMK 2022 and 2004 PDFs, LehrplanPLUS Bayern 1/2 and 3/4 online, NRW Lehrplan Mathematik 2021, BASS RdErl.) and the primary sources of most effect sizes. It corrected overstatements: for example, the school-level difference in [1], the moderator claims attributed to [17], the skill-badge claim in [63], the autonomy claim in [62], the age of the sample in [5], the anxiety measure in Plass & Hill (via [36]), the SuVe explanation results [102] and the date of [74]. It also added sources [169]–[173] and replaced [98]. Section 7.5 lists what could still not be opened.
- **Improvement research (2026-10-19).** For M16, a further search on rewarding improvement added sources [174]–[197]. It covered self-referential feedback, process praise, mastery and performance goals, overjustification, and learning vs performance. A separate adversarial pass re-opened these sources and made several corrections, for example:
  - the samples and the meaning of the social-comparison effect in [178];
  - the outcome measure in [181];
  - the claimed agreement between [186] and [187];
  - the reading of [188];
  - which pupils counted as "weakest" in [175];
  - the population claim for successive relearning [196][197].
- **What this is not.** This is not a systematic review. There was no registered protocol, no second coder and no review by human experts in Fachdidaktik or data-protection law. The legal sections are interpretations that should be reviewed before launch. Searches favoured English- and German-language sources.

**Evidence-strength labels used below**

| Label | Meaning |
|---|---|
| strong | Several meta-analyses or large RCTs point the same way |
| moderate | One meta-analysis, or several consistent studies with clear caveats |
| weak | A single small or correlational study, or theory that has not been tested with children |
| mixed | The studies contradict each other, or the effect size is disputed |
| normative | Law, standards, curricula or official guidance. These are binding or authoritative, but they are not empirical evidence. |

### 1.3 How to read this document

Each finding has an ID: **L** = learning science, **M** = motivation, **C** = curriculum, **P** = privacy, accessibility and UX. Section 6 uses these IDs. Inline numbers such as [12] refer to the numbered reference list in section 8. "g" is Hedges' g, "d" is Cohen's d, "k" is the number of studies or effect sizes, and "ES" means effect size.

---

## 2. Learning science

### L1 Retrieval practice (testing effect): strong

Yang et al. pooled 222 classroom studies (573 effects) with 48,478 students [1]. Quizzing raised achievement by **g = 0.499** overall. The effect was significant in elementary school but numerically smaller there: **g = 0.328** (95 % CI 0.085–0.571, k = 43 effects), compared with g = 0.597 in middle school. School level was *not* a significant moderator (Q(4) = 6.85, p = .144). For mathematics and statistics the effect was g = 0.433 (k = 27 effects; subject was not a significant moderator either). Three conditions did significantly better than the alternative:

- quizzes with corrective feedback: g = 0.537, against 0.374 without feedback;
- repeated quizzing: g = 0.444 for one test, 0.601 for two, and 0.642 for three or more;
- quizzes in the same format as the final test: g = 0.531, against 0.399.

*Caveat.* The elementary-school estimate is about two-thirds of the overall effect and rests on only 43 effects with a wide confidence interval; it is not reliably smaller, but it is not reliably as large either. Texts for parents and teachers must not promise large gains.

### L2 Spaced practice and scheduling: moderate

- **Optimal gap.** In an online study with more than 1,350 learners (adults, mean age 34, learning trivia facts), the best gap between study sessions was a shrinking share of how long the material had to be retained. It was about 20–40 % of the retention interval for 1 week, falling to about 5–10 % for 1 year [2]. Extrapolated by us to retention until the end of a school year, that suggests review gaps of roughly 2–4 weeks; this has not been tested with children.
- **Spaced beats massed; expanding does not beat uniform.** A meta-analysis of 29 studies found that spaced retrieval beat massed retrieval (uncorrected g = 1.02 from 11 studies; **g = 0.74** after trim-and-fill correction for publication bias). Expanding schedules were no better than uniform ones (g = 0.032, 95 % CI −0.10 to 0.17, in the preprint; the published value was not checked). A non-significant trend favoured expanding schedules only when items were presented more than 4 times (g = 0.2, p = .12) [3].
- **German classrooms.** In a study with German third and seventh graders (N = 213), practice spread over 3 days beat one massed session. For the third graders (semi-formal multiplication) the benefit was supported only at the 1-week test, not at 6 weeks; for the seventh graders it held at both delays (Bayesian analyses) [4].
- **Learners rarely carry out spacing on their own.** In self-regulated home practice, high-school students (grades 10–11, aged 15–17) assigned to distributed practice completed it far less often (35 %) than those assigned to massed practice (71 %) [5]. No comparable data for primary-school children were found.

*Caveat.* No RCT tests spacing inside a digital Klasse-4 app. In third graders the benefit had disappeared after 6 weeks [4].

### L3 Interleaving vs blocking: moderate

- **Grade 7 RCT.** In a preregistered cluster RCT (54 grade-7 classes, 787 students), the interleaved group scored 61 % against 38 % on an unannounced test one month later (**d = 0.83**) [6].
- **Fourth graders.** Interleaving four kinds of prism problems roughly doubled next-day scores but lowered accuracy during practice [7].
- **Meta-analysis.** The overall effect was g = 0.42, but only **g = 0.34 for maths** (95 % CI 0.11–0.57). Heterogeneity among the maths studies was large (I² = 76.9 %), and for word lists the effect was g = −0.39. Interleaving helps most when the categories are similar to each other [8].
- **German grade 3.** With 236 pupils in Hesse, interleaved and contrasted teaching of three-digit subtraction strategies produced more adaptive use of three of the four strategies (written algorithm, compensation, indirect addition; overall group effects partial η² = 0.12–0.23). There was no difference for the stepwise strategy [9].

*Caveat.* The strongest RCT is in grade 7. Lower accuracy during mixed practice can look like failure to a child or a parent.

### L4 Elaborated feedback in computer-based learning: strong

- **Computer-based item feedback.** A meta-analysis of 40 studies with 70 effect sizes found ES = **0.49** for elaborated feedback (an explanation), 0.32 for showing the correct answer and **0.05** for marking right or wrong. Effects were larger in mathematics and smaller with delayed feedback and in primary and high school. Most of the included studies were with university students [10].
- **Network meta-analysis.** Across 77 studies with 163 effect sizes, elaborated feedback was ranked most likely to be best for both lower- and higher-order outcomes. Marking only right or wrong was ranked least effective [11].
- **Feedback in general.** Across 435 studies (994 effect sizes, N > 61,000), the average was d = 0.48. High-information feedback reached **d = 0.99** (but from only k = 42 effects), corrective feedback 0.46 (k = 238), and reinforcement or punishment 0.24 (k = 39). "Feedback is more effective the more information it contains" [12].
- **Feedback can backfire.** Kluger & DeNisi found d = 0.41 on average, but more than a third of feedback interventions lowered performance. They worked worse the more they drew attention to the self rather than the task [15].

### L5 Feedback focus, praise and timing: moderate

Hattie & Timperley report an average feedback effect of 0.79 across 12 meta-analyses [13]. Praise came out at only 0.14 and programmed instruction at −0.04, and feedback about the self ("you are clever") rarely helps. As reported there, Kluger & DeNisi found an average of 0.38 and that 32 % of feedback effects were negative (the original paper reports d = 0.41 and "over one-third" [15]). Task feedback was 0.09 with praise and 0.34 without it. Under high threat to self-esteem the effect was 0.08, against 0.47 under low threat. Computer-delivered feedback reached 0.41, against 0.23.

Shute's guidelines say to give feedback only after an attempt, to focus on the task, to break elaborated feedback into small units, to avoid comparisons with others and to praise sparingly [14]. Immediate feedback suits difficult or new tasks, low achievers and procedural skills. Hints "can also be abused", so provisions against abuse should be built in. Extensive error analysis and cognitive diagnosis "may not provide sufficient benefit". The research on feedback timing is inconsistent.

### L6 Worked examples, fading and erroneous examples: strong for worked examples, weak and mixed for incorrect examples at this age

- **Worked examples.** A meta-analysis of 43 articles (55 studies, 181 effect sizes) reports g = 0.48 for studying worked examples compared with only solving problems. This figure comes from the abstract as reported in search results; the full article was not opened [16]. The authors' preliminary poster (40 articles, 49 studies, 185 effect sizes), which was verified, reports **g = 0.43 [0.31, 0.55]** with very large heterogeneity (I² = 94 %) and *no* significant moderators (type of example, format, grade level, content area) [17]. According to a secondary summary of the published paper, correct-only examples beat incorrect-only or mixed sets, and adding self-explanation prompts *reduced* the benefit [170]; these moderator results were not checked in the full text.
- **Fading.** Fading means removing worked steps one by one until the learner solves alone [18]. Fading combined with prompts to name the underlying principle gave medium-to-large effects on near and far transfer, without more time on task (university students) [19]. This sits uneasily with the self-explanation finding above; see 6.3.
- **Incorrect examples.** With 342 fourth and fifth graders learning decimals, adding incorrect examples brought no overall benefit on conceptual or procedural knowledge. Children with few prior misconceptions did better procedurally when incorrect examples were studied in sequence. Strong misconceptions persisted, and about 36 % of the children stayed highly confident while still making errors [20]. An earlier, smaller study by the same author (N = 74) reported benefits of comparing incorrect with correct examples [171] (not verified online). The evidence at this age is therefore mixed, not negative.

### L7 Expertise reversal and adaptive guidance: moderate

Guidance that helps novices, such as full worked examples, becomes redundant and can even hurt learners with more prior knowledge [21]. Tutorials that adapted the amount of guidance using quick first-step tests beat non-adapted versions. One study found ES = 0.46; another found 0.55 for knowledge and 0.69 for efficiency. Learners with more prior knowledge did better with fast fading, and learners with less did better with slow fading. *Caveat:* the participants were mostly high-school and college students.

### L8 Mastery learning: mixed

- **Bloom (1984).** Group mastery learning put the average student about 1 SD above conventional classes, and tutoring about 2 SD [22]. These were short 3-week units in grades 4, 5 and 8, measured with experimenter-made tests.
- **Kulik et al. (1990).** Across 108 controlled evaluations, mastery learning had positive effects on examinations. The effects were stronger for weaker students, and mastery learning used more time on task [23].
- **Slavin (1987).** He found "essentially no evidence" for group-based mastery learning on standardised achievement tests, and little evidence that effects lasted [24].
- **Guskey (2010).** Correctives must be qualitatively different from the original teaching and must be followed by a parallel second assessment. Students who master early get enrichment, and the correctives cost about 10–20 % more time. One example criterion he gives is 80 % [25].

### L9 Adaptive difficulty and target success rate: weak

Wilson et al. derived that learning is fastest at about 85 % training accuracy (an error rate of about 15.87 %) [26]. However, they derived it for gradient-descent learners and tested it only on machine-learning models and a model of perceptual learning in monkeys. The authors say the best difficulty for education has to be found empirically.

In secondary-school mathematics and science (grades 5–13, k = 92), intelligent tutoring systems reached g = 0.89 (k = 7) and drill-and-practice g = 0.58 (k = 4). The authors attribute drill's smaller effect partly to its lack of adaptation to prior knowledge [27]. In the 2024 synthesis of K-12 maths edtech, adaptive personalisation was associated with stronger effects [28].

### L10 Digital maths practice in primary school: moderate

- **Cheung & Slavin (2013).** They reviewed 74 rigorous studies with 56,886 students, 45 of them in primary school [29][30]. The overall effect was **d = 0.16**, with no significant difference between primary and secondary school. Supplemental computer-assisted instruction had d = 0.19, computer-managed learning 0.09 and comprehensive models 0.06. Use of more than 30 minutes a week gave d = 0.14–0.20, against 0.06 below that. High implementation fidelity gave 0.26, against 0.12.
- **Children with maths learning difficulties.** Across 15 RCTs (N = 1,073), the mean ES was 0.55. Video games had no advantage over digital drill or tutoring [31].
- **Morrison et al. (2024).** They found a small but significant positive effect. It was stronger with moderate intensity (about 30–75 minutes a week), with blended use of technology and print, and with high fidelity. Effects were inflated in quasi-experimental, developer-funded and small studies [28].
- **Hillmayr et al. (2020).** Their larger g = 0.65 applies to secondary school only. Supplemental use was descriptively better than replacing other teaching (0.64 against 0.51), but the difference was not significant (Q = 1.16, p = .28) [27].

*Honest expectation.* A well-built practice tool used alongside lessons can add a small effect. It is not a replacement for teaching.

### L11 Einmaleins: understand, derive, automatise: moderate

German primary didactics recommends three steps for the Einmaleins [33]. First, children understand what multiplication means. Then they automatise the *Kernaufgaben* (·1, ·2, ·5, ·10, plus the square numbers). They derive the other facts with *Tausch-*, *Nachbar-* and *Verdopplungsaufgaben*, for example 6 · 7 = 5 · 7 + 7. PIKAS calls rote recitation of whole rows a misunderstanding. It also argues that full automatisation matters because written multiplication otherwise overloads working memory.

In a longitudinal study of 139 Austrian first graders (addition and subtraction facts), children who derived a task in mid-year knew that task by heart at the end of the year significantly more often than children who had counted (p < .001) [32]. This result is correlational. In a design study of derived-facts teaching of multiplication, 8 of 48 lower-achieving children had "little if any success" by the end of grade 3. Gaps in addition and subtraction, or in the concept itself, seemed to block their progress [34]. A study combining strategy teaching with timed drills could not be opened [35].

### L12 Time pressure: weak (see also M10)

A review of 19 studies found that time pressure generally acts as a stressor [36]. It generally reduced accuracy and shifted strategy choice; the authors propose that worry uses up working memory, but whether time pressure changes strategy selection itself remains unclear. Among third and fourth graders (Plass & Hill, 1986, as reviewed there), children with high or middle *test* anxiety (not maths anxiety) did worse under time pressure than children with low anxiety; removing the time limit helped anxious boys much more than girls. The authors stress that this literature is sparse ("only 19" studies met their criteria).

### L13 Typical errors in written algorithms: moderate

Lüken et al. [37] use Gerster's error typology for written subtraction [38]. It covers:

- calculation errors;
- errors with zero;
- regrouping errors (*Übergangsfehler*: regrouping that is unnecessary or wrong);
- direction errors (in each column, subtracting the smaller digit from the larger one whatever its position);
- adding instead of subtracting;
- errors caused by unequal numbers of digits;
- perseveration (copying digits).

**Regrouping errors make up about half of all wrongly solved items** in the SuVe sample (N > 400, taught for understanding), somewhat less often with Abziehen/Entbündeln than with Ergänzen/Erweitern [37]. Earlier Klasse-4 studies, both reported in [37], found 46 % for *Ergänzen mit Erweitern* and 57 % for *Abziehen mit Entbündeln* (Jensen & Gasteiger, 2019), and 49.5 % for Ergänzen mit Erweitern (Kühnhold & Padberg, 1986), where direction errors came next at 16.5 %. In SuVe the second most frequent type was the direction error for Abziehen/Entbündeln but the calculation error for Ergänzen/Erweitern. From grade 3 to the middle of grade 4, the relative share of regrouping errors fell while direction errors rose, with both methods. Errors with a zero in the minuend were more frequent with Abziehen/Entbündeln, and perseveration was much more frequent with Ergänzen/Erweitern. Shute warns that extensive error diagnosis often does not pay off [14].

### L14 Place value, German number words and large numbers: moderate

German number words put the units before the tens ("vierundzwanzig" = 24). About 50 % of German first graders' number-writing errors were related to this inversion [40], as reported in [39]. The same review reports that place-value understanding in first grade predicted later calculation skill.

DZLM teacher material lists typical errors: reading "42" as "vierundzwanzig", and writing "zweiundvierzig" as 402 or 240 [41]. It notes that place-value problems often persist into higher grades. In TIMSS 2007–2019, only about 71–81 % of German fourth graders solved items such as "Welche Zahl ist 3 Einer + 2 Zehner + 4 Hunderter?". No strong empirical base was found on rounding misconceptions, so the rounding design rests on didactic convention.

### L15 Sachaufgaben: sense-making vs superficial calculation: moderate

In a study of 10–11-year-olds with matched pairs of standard and "problematic" word problems, children gave realistic reactions to only 17 % of the problematic items [43], as summarised in [42]. Only 2 of the 10 items got many realistic responses (49 % and 59 %); the others ranged from 0 % to 17 %. The findings have been replicated in several countries, including Germany. They relate to the well-known *Kapitänsaufgaben* ("How old is the captain?").

A review of the follow-up monograph confirms the pattern [44]. It attributes the behaviour to stereotyped textbook problems. More authentic presentation and familiar contexts increased realistic reactions, while small changes to test instructions did not. *Caveat:* the exact 1994 rates were not checked against the paywalled full text.

---

## 3. Motivation, mindset and ethical gamification

### M1 Process praise vs person praise: mixed

- **Original studies.** Across six studies with US fifth graders, children told "You must be smart at these problems" afterwards preferred performance goals more often than children told "You must have worked hard" [48]. After failure they also persisted less, enjoyed the task less and performed worse. In Study 1 (N = 128), 67 % of the intelligence-praised children chose performance goals, against 8 % of the effort-praised children.
- **Young children.** With 24 four-year-olds, generic praise ("You are a good drawer") led to worse reactions to later criticism than specific praise [49].
- **Failed replication.** A close replication with 624 Chinese 9–13-year-olds found no effect on any of 8 motivation and attribution measures, and only one borderline effect on performance (p = .049) [50]. Mindset researchers have disputed how far this replication generalises (source not verified online).

We adopt strategy-naming praise because it costs little and carries little risk, not because it is proven to work.

### M2 Inflated praise backfires for insecure children: moderate

Adults gave about twice as much inflated praise (words like "incredibly" or "perfect") to children with low self-esteem [51]. In a home observation of 114 parents, about a quarter of all praise was inflated. In an experiment with 240 children, inflated praise reduced challenge-seeking in children with low self-esteem and increased it in children with high self-esteem. All three studies come from one research group.

### M3 Process praise and later mindset: weak

Parents of 53 children were filmed at home when the children were 1, 2 and 3 years old [52][53]. The share of process praise (praise for effort, strategies and actions) predicted children's beliefs that ability can grow, and their challenge-seeking, at ages 7–8. Person praise and the total amount of praise were not related. In the follow-up, process praise predicted maths and reading in grade 4 by way of the children's mindset (standardised paths about 0.30 and 0.24). Boys received more process praise than girls. The study is correlational and the sample is small.

### M4 Growth-mindset interventions: small, disputed and dependent on context (mixed)

- **Meta-analyses.** Sisk et al. found that mindset correlated only weakly with achievement (r = .10; r = .19 for children) [47]. Interventions averaged **d = 0.08** (95 % CI 0.02–0.14, k = 43, N = 57,155). Only 2 effect sizes involved children. The clearer benefits were for low-SES students (d = 0.34, based on 7 effect sizes).
- **National experiment.** A one-hour online intervention with 12,490 US ninth graders raised lower achievers' GPA by 0.10 grade points (0.11 SD). This happened only where peer norms supported challenge-seeking [54].
- **Later estimates.** Macnamara & Burgoyne estimated about 0.05 SD and found no reliable benefit in higher-quality studies [56]. Burnette et al. estimated 0.09 SD overall and 0.16 SD for at-risk groups. Both estimates are reported by Tipton et al., whose reanalysis of the Macnamara & Burgoyne data (after correcting coding errors) found 0.12 SD for at-risk groups in high-quality studies. The size of the effect remains disputed [55].

### M5 Self-determination theory and choice: strong

Self-determination theory holds that intrinsic motivation depends on three needs: competence, autonomy and relatedness [57]. A meta-analysis of 344 student samples (N = 223,209) found that intrinsic motivation relates to both success and well-being [58]. Motivation driven by rewards or punishment was not related to performance or persistence, and was related to lower well-being.

Being given a choice raises intrinsic motivation (d = 0.30 fixed-effect, 0.36 random-effects; 41 studies) [59]. The effect is stronger for children than for adults, with 2–4 successive choices, and when no reward follows the choice. It is largest for choices that do not matter for the task itself.

### M6 Overjustification: expected rewards undermine intrinsic motivation: strong

A meta-analysis of 128 experiments found that tangible rewards reduced free-choice intrinsic motivation [60]:

- overall d = −0.34, for children **−0.39** and for college students −0.27;
- rewards given just for doing a task were the most harmful for children (d = −0.43, after removing outliers);
- rewards for completing a task gave −0.36, and rewards for performance −0.28;
- *unexpected* tangible rewards had no effect (d = 0.01);
- positive verbal feedback helped overall (d = 0.33) but not significantly for children (d = 0.11, 7 studies).

Certificate-like awards count as tangible rewards in this literature. As summarised in [13], the harm was −0.68 for interesting tasks and −0.78 when rewards were given in a controlling way.

### M7 Gamification meta-analyses: moderate

Sailer & Homner found small positive effects of gamification on cognitive outcomes (g = .49, k = 19), motivational outcomes (g = .36, k = 16) and behavioural outcomes (g = .25, k = 9) [46]. Only the cognitive effect held up in methodologically rigorous studies, and motivational effects were not significant for interventions lasting one day or less. Li, Ma & Shi report much larger effects, for example g = 1.29 in elementary school (k = 12) and g = 2.0 in maths (k = 3) [61]. Their wide confidence intervals and implausible sizes suggest weak primary studies rather than a reliable estimate.

### M8 Which game elements help or harm: mixed

- **Need satisfaction.** In an experiment with adults, badges, leaderboards and performance graphs raised feelings of competence and perceived task meaningfulness (one facet of autonomy), and avatars, stories and teammates raised feelings of relatedness [62]. No element raised perceived decision freedom (the other facet of autonomy).
- **Badges for middle schoolers.** In a maths tutor used by 51 middle schoolers, low performers who earned more *participation* badges showed a larger increase in motivation to avoid looking incompetent (r = .46) [63]. For low performers, *skill* badges showed no significant association (r = .22). Across all users, however, skill badges also correlated with rising performance-avoidance (r = .40), and among high performers with rising expectancy of success (r = .49). The study is small and correlational.
- **Leaderboards.** In a 14-week university course, a leaderboard plus mandatory badges led to lower intrinsic motivation, lower satisfaction and lower final exam scores than an identical course without them [64], as summarised in [65].

### M9 Maths anxiety: strong association, unclear causality

- About half of the highest-achieving US first and second graders (N = 154) reported medium to high maths anxiety. It put them about half a school year behind their less anxious peers [66].
- Meta-analyses find a small-to-moderate negative relation between anxiety and achievement: r ≈ −.28 [67], and r = −.26 across 452 representative samples of students and adults from 90 countries [68] (not primary-school samples).
- A longitudinal study of 140 German-speaking children in grades 1–3 found no effect of maths anxiety on calculation in either direction [69].

### M10 Time pressure and timers: mixed

The review above concludes that time pressure "generally acts as a stressor", but also that the evidence is sparse [36]. An older study of third and fourth graders found that test-anxious children did worse under time pressure (Plass & Hill, 1986; primary study not opened, reported via [36] and [70]). A 2024 experiment with 113 fourth and fifth graders found no difference in self-reported anxiety between announced and unannounced 2-minute multiplication timings; harder problems, not timing, raised anxiety [70]. That report also notes that the US What Works Clearinghouse endorses timed fluency activities. The practical choice is therefore between optional, low-stakes timing and default countdowns.

### M11 Manipulative design is common in children's apps: moderate

Radesky et al. coded 133 apps used by 160 children aged 3–5 [71]. 80 % had at least one manipulative design feature. The most common were:

- navigation constraints (45.9 %);
- lures such as daily rewards (45.1 %);
- pressure from characters (24.8 %, e.g. "Do you want to give up?");
- invented time pressure (17.3 %).

Free apps had more such features than paid apps (median 3 against 1). Educational apps had fewer, but were not free of them.

### M12 Fair-design benchmarks (ICO Children's Code, EU DSA Art. 28 guidelines, 5Rights): normative

- **UK ICO Children's Code.** Standard 13 bans nudges that lead children to give up data or privacy, and encourages nudges that protect privacy and wellbeing, such as break prompts and pause-and-save [72]. Standard 5 asks services to present options to continue neutrally, to avoid features that automatically extend use, and to let children pause without losing progress [73].
- **European Commission guidelines for minors under DSA Art. 28** (published 14 July 2025 [75]; the version cited here is C(2025) 6826 final, dated 7 October 2025 [74]). They recommend turning off streaks, like counts and push notifications by default. They also say minors should not be exposed to design meant to drive engagement, including "the creation of virtual rewards for performing (repeated) actions", urgency or scarcity signals, "intermittent or random rewards", and certain virtual currencies.
- **5Rights Foundation** documents the cost of persuasive design for children [76].

These rules are not legally binding for a static German learning site, which is neither a UK service nor a DSA "online platform". They are still the best available standard of fair design for children.

### M13 Streaks: moderate

In seven studies, people treated a displayed streak of 3 or more repetitions as a goal in itself [77]. An intact streak raised continued engagement more than a broken one, even when actual past behaviour was the same. People tended to drop off after a streak broke, and more so when they blamed themselves. The participants were adults. Together with the EU recommendation [74], this suggests that consecutive-day streaks work through fear of loss, which is unsuitable for 9–10-year-olds.

### M14 Error culture ("Fehler als Lernchance"): moderate

- **KMK 2022.** The standards require teaching that "geht konstruktiv mit Fehlern und Präkonzepten um". They list as an end-of-grade-4 competence that children "finden, erklären und berichtigen Rechenfehler", and they name "Freude an der Mathematik" as a goal [83].
- **PIKAS.** Its principle of "ermutigende Leistungsbeurteilung" says feedback should be understandable to the child, sum up encouragingly and point to next steps [81].
- **LehrplanPLUS Bayern** stresses Selbstvertrauen and Lernfreude through "wertschätzende" guidance [82].
- **Laboratory evidence.** Making errors and then getting corrective feedback helps learning, especially in low-stakes settings. Errors made with high confidence are corrected most readily [45].
- **German classrooms.** In 69 grade 5–6 maths classes at academic secondary schools (1,641 students), reactions to errors became less adaptive over two years, but less so where the error climate was positive [78][79].
- **German error-culture work.** Whether errors feel like a chance to learn depends on how the environment reacts [80].

This must be balanced against L6: incorrect examples do not help at first learning. So error-finding tasks come only after a skill is secure.

### M15 German phrase bank (derived from M1, M2, M4, M9, M14)

| Situation | Use (rotate 6–10 variants) | Never use |
|---|---|---|
| Correct | "Richtig! Du hast an den Übertrag gedacht." · "Stimmt! Gute Idee, erst zu überschlagen." · "Geschafft – du bist drangeblieben." · "Richtig! Du hast den Übertrag bei den Hundertern beachtet." | "Du bist so schlau!" · "Du bist ein Mathe-Genie!" · "Du bist ein Naturtalent!" · "Du warst so schnell!" · "PERFEKT!" · "Unglaublich!" · "Fantastisch!" · "Weltklasse!" |
| 1st wrong attempt | "Noch nicht ganz – probier es noch einmal." · "Fast! Prüfe noch einmal die Hunderterstelle." · "Hmm, das passt noch nicht. Schau dir den Tipp an." | "Falsch!" · "Leider falsch." · "Konzentrier dich!" |
| 2nd wrong attempt | "Lass uns das zusammen anschauen." · "So kannst du rechnen: …" · "Jetzt weißt du, worauf du achten musst. Hier ist eine ähnliche Aufgabe." | "Schon wieder falsch." · "Das war doch einfach!" · "Alle anderen schaffen das." |
| Normalising (at most once per session) | "Fehler helfen beim Lernen." · "Knifflige Aufgaben sind Training für deinen Kopf." · "Das kannst du noch nicht – aber du lernst es gerade." | "Dein Gehirn wächst bei jedem Fehler." |
| Round summary | "8 von 10 geschafft – 2 Aufgaben waren noch knifflig." (Implementation note: missed items of a Stufe that is not yet "Sicher" are not put into a later review, so the summary does not promise "üben wir später noch einmal"; each missed item already gets a Zwillingsaufgabe in the round, and the Stufe stays the "Weiter üben" suggestion.) | "2 Fehler!" · "Nicht bestanden" |
| Improvement (round summary "Das hast du verbessert", progress page "So hast du dich verbessert"; M16) | "Runden, Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10." · "Schriftlich addieren: Du hast den Übertrag jetzt fünfmal richtig beachtet." · "Runden, Stufe 2: Vor ein paar Tagen war das noch knifflig. Heute hast du so eine Aufgabe in der Wiederholung auf Anhieb gelöst." · "Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst." (Implementation note: always the child's own earlier answers, never a decline, never "0 von 10"; the badges for it are listed in the M16 row of 6.2.) | "Endlich!" · "Na also!" · "Viel besser!" · "Besser als die anderen" · "Jetzt machst du keine Fehler mehr" · any announcement such as "Schaffst du das wieder, bekommst du …" |
| Speed | (nothing; speed is never commented on) | "Zu langsam!" · "Schneller!" |
| Leaving or a break | "Super, dass du heute geübt hast. Bis zum nächsten Mal!" · "Gute Idee, eine Pause zu machen!" · "Du übst schon eine ganze Weile. Zeit für eine kleine Pause?" | "Willst du wirklich aufhören?" · "Dein Freund ist traurig, wenn du gehst." |
| Status labels | "Geübt" → "Sicher" → "Gemeistert" (1–3 stars, always with a legend; "Noch nicht geübt" without stars). Implementation note: one wording everywhere; "Geübt" matches L8 and the star legend. | "Serie verloren" · "Deine Serie ist in Gefahr!" · "0 Tage" |

### M16 Rewarding improvement (self-referential feedback, process praise, mastery goals, learning vs performance): moderate for the principles, weak for improvement badges at this age

- **Comparing with one's own past.** In 69 grade 5–6 maths classes at German Gymnasien (N = 1,641, mean age 10.5 at the start), maths self-concept fell by about 0.37 SD per school year [174]. For each SD of the temporal (individual) reference norm that the class perceived in its teacher, it fell about 0.10 SD less per year. For each SD of the perceived social norm, it fell about 0.05 SD more, most for pupils with poorer grade-4 grades. This is correlational: the students rated the norms in grade 6, and the sample is apparently the same as in [78]. Older quasi-experimental German studies compared classes whose teachers already held an individual or a social reference norm. Among fifth graders (N = 106 and 91), fear of failure fell under an individual norm, most in the lowest intelligence third. In primary school (N = 143 and 168), "net hope" (hope of success minus fear of failure) rose over four years under an individual norm. Both original studies are known here only from Rheinberg & Engeser's summary [175]. Among 410 fourth graders in northern Germany, judging oneself by one's own improvement went with a higher maths self-concept (β = .19). Judging oneself by solving all the tasks (a criterion norm) went with an even higher one (β = .24). A preference for social comparison did not (β = .06, n.s.), although it went with slightly better maths grades (β = .10). The study is cross-sectional and the scales were new [176]. A meta-analysis of the big-fish-little-pond effect (33 studies, N = 1,276,838) found that a higher-achieving class or school goes with a lower academic self-concept (overall β = −.28, 95 % CI −.32 to −.24). This held in primary school too (β = −.21, k = 9) [179].
- **Better than before, without wanting to beat others.** 583 Dutch children aged 8–18 (mean age 11.7) were randomly assigned to one of five conditions. They recalled being better or worse than peers, or better or worse than their own past self, or made no comparison [177]. Both kinds of downward comparison raised pride, but only social comparison raised the wish to outdo others. Being worse than one's past self caused as much shame as being worse than others. The study was a single session of recalled comparisons, and only a third of the children wrote about schoolwork (most chose friendship or sport). The effects did not differ by age. In observational data from grades 6–11 (N = 45,248), a student's own change in grades or test scores over 0.5–2 years fed maths self-concept only weakly (β = .09). The student's achievement level fed it much more (β = .37), which the authors interpret as a social-comparison effect [178].
- **Feedback about change, worded about the task.** In Kluger & DeNisi's meta-analysis, feedback that showed change from previous trials had d = 0.55 (k = 50), against 0.28 without it (k = 380). Normative feedback had no significant effect, and the samples were mostly adults [15]. In one study, 200 Israeli fifth and sixth graders did divergent-thinking tasks. After each of two sessions some got a one-sentence individual comment that said what the child had done and suggested a next step. This raised later interest and performance more than "very good", grades or no feedback [180]. In a lab study with 86 US fourth and fifth graders, children praised for mastery ("You've really learned how to solve these!") more often chose the longer version of a follow-up task (63 %) than children given social-comparison praise (30 %) or only a score (29 %). That praise also included "You've really become an expert at these!", a label the app avoids. In a second study with positive feedback afterwards, choices did not differ overall, and social-comparison praise lowered only girls' motivation [181]. Another study had 145 British 9–11-year-olds imagine succeeding and then failing. After one failure, objective feedback did as well as process praise, and person praise did worst. After a second failure the groups no longer differed [183]. In kindergarteners, hearing even a little generic praise ("good drawer") lowered persistence after imagined failures [184]. In a study with 40 fourth graders (10 per group), some got a process goal plus progress feedback that named the steps of a writing strategy ("You're learning to use the steps"). This raised self-efficacy and skill more than a general goal ("do your best"). The task was writing, not maths, and the figures come from the conference version [185]. The child studies [180][181][183][184][185] are short lab or scenario studies, most of them small (weak). A review concludes that praise helps motivation most when it seems sincere, credits controllable causes, supports autonomy, avoids leaning on social comparison and sets attainable standards. It suggests praising processes such as "strategies, self-corrections, or thoughtful concentration" [182].
- **Rewards.** In the data behind [60], verbal rewards given in an informational style raised intrinsic motivation (d = 0.66, 95 % CI 0.28–1.03), and given in a controlling style they lowered it (d = −0.44, CI −0.82 to −0.07) [186]. This supplemental analysis covers only 5 studies and does not separate children. For children, verbal rewards overall had no significant effect (d = 0.11, k = 7; see M6). Tangible rewards that depended on performance and that some participants did not get in full had the largest harmful effect in the whole meta-analysis (free choice, against no-feedback controls: d = −0.88, 95 % CI −1.12 to −0.65, k = 6) [186]. Unexpected tangible rewards had no effect (M6). Cameron et al. dispute the general harm [187] (mixed). Both sides agree that expected tangible rewards given for simply doing an interesting task lower intrinsic motivation. They disagree about rewards tied to the level of performance. Cameron et al. find them neutral or positive [187], while Deci et al. find them harmful, most of all when not everyone gets the full reward [186].
- **Mastery goals.** In education, mastery-approach goals correlate only r = .13 with performance (95 % CI .10–.15, k = 72 effect sizes; self-reported goals against performance not measured by self-report) [189]. They predict interest more consistently [190]. In an informal review, goals about proving one's ability went with test anxiety and low interest, while goals to outperform others did not [190]. Performance-avoidance goals go with more anxiety (r = .25, k = 24; ages 11–60), and the link grew stronger with age [191]. Ames's TARGET framework, as summarised in [192], says a mastery goal structure recognises "individual effort, improvement, and accomplishments". This is a framework, not a tested intervention. The goal findings above are mostly correlational.
- **Learning is not performance.** Performance during practice "is often an unreliable index" of learning [193]. In one experiment with 120 undergraduates, 78 % did better on a test after interleaved ("spaced") presentation, yet 78 % said massing was as good as or better [194]. With 126 seventh graders, interleaved practice beat blocked practice by d = 0.42 on a test 1 day later and by d = 0.79 on a test 30 days later [195]. Successive relearning means practising until each item is answered correctly and doing so again in later spaced sessions. It is described as a potent technique [196]. The studies we found were with college students and adults [197]; we found none with primary-school children.

Together these findings support comparing a child only with their own earlier answers and naming what the child did. They also show that a correct answer within the same round says little about learning, so the app keeps its biggest rewards for evidence from a later day (6.2). No study has tested such a system with 9–10-year-olds (7.1).

---

## 4. Curriculum alignment

### C1 KMK Bildungsstandards Mathematik Primarbereich: current version: normative

The current document is "Bildungsstandards für das Fach Mathematik Primarbereich (Beschluss der Kultusministerkonferenz vom 15.10.2004, i. d. F. vom 23.06.2022)" [83]. The revision followed a 2019 needs analysis, which found "mittelgroßer bis hoher Überarbeitungsbedarf", and a KMK decision of 18.06.2020 to revise all standards. The PDF carries editorial corrections dated 14.12.2022 and 13.04.2023.

The standards are *Regelstandards*, meaning the level expected on average, for the end of Jahrgangsstufe 4, and they are binding in all Länder ("in allen Ländern verbindliche Zielvorgaben"). They will be tested across the Länder for the first time in the IQB-Bildungstrend 2027. The IQB publishes the illustrative Lernaufgaben separately. The link printed in the PDF returned HTTP 404 when checked; the collection (22 tasks, filterable by Leitidee, process competence, Jahrgangsstufe and Anforderungsbereich, using the 2022 terms) is now at the IQB's "Lernaufgaben Mathematik Primarstufe" page [169].

### C2 What changed from 2004 to 2022: normative

[83][84]

- **Process competencies.** Five general competencies became **six prozessbezogene Kompetenzen**. The new one is "Mit mathematischen Objekten und Werkzeugen arbeiten", covering technical terms, symbols, facts and rules, and tools such as "Lineal, Zirkel, Taschenrechner, Apps".
- **Leitideen renamed.** "Zahlen und Operationen" became **Zahl und Operation**. "Muster und Strukturen" became **Muster, Strukturen und funktionaler Zusammenhang**, which now has an explicit overarching role (related standards in the other Leitideen are highlighted in yellow). "Daten, Häufigkeit und Wahrscheinlichkeit" became **Daten und Zufall**.
- **Größen.** "Gewichte" became **Massen**. 2004 listed "Geldwerte, Längen, Zeitspannen, Gewichte und Rauminhalte"; 2022 names Hohlmaße as a unit area and adds Flächeninhalte and Volumina ("Rauminhalte und Hohlmaße") as Größen. The wording is more concrete, e.g. "2,5 km | 2500 m | 2 km 500 m".
- **Bildung in der digitalen Welt.** This is a new cross-cutting emphasis, not a separate Leitidee. Competencies related to informatics are highlighted in blue.
- **Core content is unchanged.** Numbers up to 1 000 000, and written addition, subtraction and multiplication. **Neither version includes written division.**
- **Probability vocabulary.** It changed from "sicher, unmöglich, wahrscheinlich" (2004) to "sicher, möglich, unmöglich" plus comparisons such as "ist wahrscheinlicher als" (2022).
- **Number notation.** It changed from "1.000.000" (2004) to "1 000 000" (2022).

### C3 Anforderungsbereiche (AB I–III) as the basis for difficulty: normative

KMK 2022 defines three *Anforderungsbereiche* [83]:

- **AB I Reproduzieren:** "Wiedergabe von Grundwissen, Ausführen von Routinetätigkeiten …"
- **AB II Zusammenhänge herstellen:** "Erkennen mathematischer Zusammenhänge und Verknüpfen von Kenntnissen …"
- **AB III Verallgemeinern und Reflektieren:** "Übertragen von Erkenntnissen auf unbekannte Fragestellungen sowie Entwickeln und Reflektieren von Strategien, Begründungen und Folgerungen".

Work on all three is "für alle Schülerinnen und Schüler – unabhängig vom mathematischen Leistungsvermögen – von zentraler Bedeutung". The 2004 version called its AB assignments of sample tasks "vorläufige, empirisch nicht validierte Zuordnung" [84]. Its "Stellentafel" example keeps one context across AB I to III.

### C4 Baseline performance (IQB-Bildungstrend 2021): strong (descriptive)

"Fast 55 Prozent" of fourth graders reached or exceeded the KMK Regelstandard in Mathematik, and "rund 22 Prozent" missed the Mindeststandard [91]. Compared with 2016, that is 7 percentage points fewer at the Regelstandard and 6 more below the Mindeststandard [92]. The Kompetenzstufen are:

- I: below 390 points;
- II: 390–459 (Mindeststandard);
- III: 460–529 (Regelstandard);
- IV: 530–599 (Regelstandard plus);
- V: 600 and above (Optimalstandard).

**Roughly 1 in 5 users will be below the Mindeststandard.**

### C5 Bavarian and NRW curricula: validity and structure: normative

- **Bayern.** LehrplanPLUS Grundschule was declared binding by Verfügung of 18.05.2014 and has applied to Jgst. 4 since 2016/17 [87]. Mathematik is a double-grade plan for 3/4 with four Lernbereiche: 1 Zahlen und Operationen, 2 Raum und Form, 3 Größen und Messen and 4 Daten und Zufall. It also has the Gegenstandsbereich "Muster und Strukturen/Funktionaler Zusammenhang" and five process competencies (argumentieren, kommunizieren, modellieren, Probleme lösen, Darstellungen verwenden) [85]. No revised Mathematik plan was found despite the 2024 Stundentafel reform; the online plan was unchanged on 2026-10-18.
- **NRW.** The Lehrpläne für die Primarstufe (RdErl. v. 01.07.2021) apply "aufsteigend für alle Schülerinnen und Schüler, die ab dem 01.08.2022 in die Klasse 1 eintreten" [90]. The first Klasse-4 cohort under them was therefore 2025/26. The plan states expectations for the end of the Schuleingangsphase and for the end of Klasse 4. Its content areas are Zahlen und Operationen, Raum und Form, Größen und Messen and **Daten, Häufigkeiten, Wahrscheinlichkeiten**; its five process areas are Problemlösen, Modellieren, Kommunizieren, Argumentieren and Darstellen. Muster und Strukturen is not a separate area but an "integraler Bestandteil" [88][89].
- **Naming differs in part.** Both Länder say "Zahlen und Operationen" (KMK 2022: "Zahl und Operation"). NRW says "Daten, Häufigkeiten, Wahrscheinlichkeiten" (KMK 2022 and Bayern: "Daten und Zufall"). Neither treats "Muster, Strukturen und funktionaler Zusammenhang" as a Lernbereich of its own (Bayern: Gegenstandsbereich; NRW: integral part). "Raum und Form" and "Größen und Messen" match in all three. The app's teacher page should cite the KMK 2022 names and list the Land names alongside.
- **Both Länder** state expectations for the end of 3/4, so Klasse-3 content is legitimate as a warm-up.

### C6 Written division: not in the KMK standards, Länder differ, live debate in 2025/26: normative

Neither the 2004 nor the 2022 KMK standards include written division [83].

- **Bayern** requires pupils to apply it automatically with "Divisoren bis einschließlich 10, auch mit Rest" [85].
- **NRW** requires pupils only to "erläutern" the algorithm "durch einstellige Divisoren mit Verwendung der Restschreibweise". "Sicher ausführen" applies only to addition, subtraction and multiplication [88].
- **Niedersachsen** drops the full algorithm from primary school (Klassen 3/4 from 2027/28) [95]. The DZLM defends this and recommends *halbschriftliche* division instead, e.g. 1045 : 5 = 1000 : 5 + 45 : 5 [94].
- **Sachsen-Anhalt** kept written division in its new Grundschul-Lehrplan after a draft had replaced it with halbschriftliches Dividieren [96].

Worksheets commonly write a remainder as "33 : 4 = 8 R 1" [97]; NRW speaks of "Restschreibweise" without fixing a form [88]. This "R" notation is criticised because it breaks the transitivity of the equals sign (9 : 4 and 5 : 2 would both "equal" 2 R 1); "9 = 4 · 2 + 1" is often preferred [98].

### C7 Written subtraction method: Abziehen/Entbündeln vs Ergänzen/Erweitern: mixed

- **Bayern** prescribes the *Abziehverfahren* ("Subtraktion (Abziehverfahren)") [85]. Abziehen mit Entbündeln has been its binding Normalverfahren since the 2000 Lehrplan, replacing the tradition of Ergänzen mit Erweitern that the KMK had set in the 1950s [99]. (A 2021 workbook says "gültig in Bayern seit 2015" [104], which probably refers to LehrplanPLUS; the earlier date in [99] is the academic source.)
- **NRW** prescribes no method; the Lehrplan only says "Subtraktion (mit einem Subtrahenden)" [88][100].
- **Other Länder.** Ergänzen mit Erweitern "war lange Zeit in Deutschland vorgeschrieben"; today the choice is left to schools "in fast allen Bundesländern", usually decided by the Fachkonferenz [101]. KMK 2022 names no method [83]. No source was found for the exact year in which the national prescription ended.

In the SuVe study (N = 415 pupils in NRW and Niedersachsen; 231 Abziehen, 184 Ergänzen), children taught Abziehen mit Entbündeln described the regrouping step (how the transfer works) far more often, at least imprecisely [101][102][103]. Right after instruction the figures were 54 % against 7 %; in mid-Klasse 4 they were 35 % against 3 %. Purely mechanical or wrong explanations were more common with Ergänzen mit Erweitern. **However, the reason why the method gives the right result (Konstanz der Differenz vs Bündelungsprinzip) was named clearly more often with Ergänzen mit Erweitern**; with Abziehen it almost never appeared [102]. Neither method produced good explanations in most children. Results on calculation accuracy were still under analysis in 2024; error-type distributions appeared in 2025 [37]. Typical spoken forms for each method are documented in workbook material [104].

### C8 Größen: units, comma notation, fractions, time: normative

- **KMK 2022** names Geldwerte, Längen, Zeitspannen, Massen, Hohlmaße/Volumina and Flächeninhalte [83]. It expects simple fractions with quantities ("1/2 m, Dreiviertelstunde, 1/4 l") and several notations for the same quantity.
- **Bayern 3/4** adds km, mm, s, kg, g, l and ml to the units from 1/2 [85][86]. It names comma notation only "bei Meter und Zentimeter sowie bei Euro und Cent" ("auch mit dem im Alltagsgebrauch üblichen Komma"), expects results for time spans to be noted "auch in gemischter Schreibweise (z. B. 1 h 25 min)" and names no Tonne.
- **NRW Klasse 4** adds mm, km, Sekunde, g, kg, **t**, ml and l, plus **Datenmengen (Byte, kB, MB)**. It requires "rechnen mit Größen (auch mit Dezimalzahlen)" [88].
- **Both Länder** use ½, ¼ and ¾ with quantities. **Neither lists dm, cm² or m².**

### C9 Geometry: area and perimeter by unit squares, Körper and Würfelnetze: normative

KMK 2022 requires the "Grundprinzip des Messens" [83]: "Flächeninhalte durch Auslegen mit Einheitsquadraten, Rauminhalte durch Messen mit Einheitswürfeln". It also requires comparing figures by Umfang and Flächeninhalt, and relating "Körper und Netz".

NRW asks pupils to determine area and perimeter "u. a. durch Auslegen mit Einheitsquadraten oder Zerlegen in Teilstücke" [88]. Bayern already covers both in 1/2 [86], and in 3/4 requires "verschiedene Netze von Würfeln und Netze von Quadern" and the term "deckungsgleich" [85]. **None of the three requires an area formula or area units.** Up to rotation and reflection, there are **11 cube nets among the 35 free hexominoes** [105][106].

### C10 Probability vocabulary without numerical probabilities: normative

- **KMK 2022** requires the terms "sicher, möglich, unmöglich" and comparing chances "datenbasiert" ("ist wahrscheinlicher als", "hat größere Chancen als") [83].
- **NRW** uses "sicher, (un-)wahrscheinlich, (un-)möglich" [88].
- **Bayern 1/2** already sets "die Grundbegriffe sicher, möglich und unmöglich sowie die Begriffe wahrscheinlich und unwahrscheinlich in ihrer alltagssprachlichen Bedeutung" [86]. In 3/4 it adds estimating Gewinnchancen (Glücksrad, Würfel) and systematically varying conditions, such as the number or colour of Kugeln in einem Säckchen [85].
- **IQB VERA-3 material** does not give probabilities as explicit values, because that would require fractions; it uses comparisons such as "gleich wahrscheinlich" and "wahrscheinlicher als" [93]. It also calls standalone "wahrscheinlich"/"unwahrscheinlich" unsuitable for VERA, because they "könnten … eher verwirrend als klärend sein", and recommends the basic terms "sicher", "möglich, aber nicht sicher" and "unmöglich" [93].

### C11 Notation of large numbers: normative

KMK 2022 writes "1 000 000" with spaces and "2500 m" ungrouped [83]. KMK 2004 used "1.000.000" [84]. The NRW Lehrplan 2021 is itself inconsistent: it mostly writes "1.000.000" but also "1 000 000" [88]; Bayern writes "Million" in words [85]. The CGPM (2003, reaffirming 1948) states that "neither dots nor commas are ever inserted in the spaces between groups" [107]. DIN 5008 groups digits in threes with spaces, including four-digit numbers ("2 000 Stück"), and recommends a dot only for money amounts ("2.000,50 €") [108][157]. A current Klasse-4 workbook prints "7 889 321" and also groups four-digit numbers ("3 845") [104]. Children will therefore meet both dot and space notation.

### C12 Process competencies in auto-checked tasks: normative

KMK 2022 spells out concrete process standards [83]:

- **Argumentieren:** "hinterfragen mathematische Aussagen und prüfen diese auf Korrektheit".
- **Darstellen:** "übertragen eine Darstellungsform in eine andere".
- **Modellieren:** "entnehmen … relevanten Informationen", "prüfen und interpretieren die mathematische Lösung", "formulieren zu Termen … Sachaufgaben".
- **Problemlösen:** heuristics such as systematisches Probieren, Rückwärtsarbeiten and Tabellen.

Bayern tags every Kompetenzerwartung with its process competencies [85], and NRW lists comparable expectations [88]. **Kommunizieren** (talking with others, Mathekonferenzen) is inherently social, and a solo app without accounts cannot meaningfully cover it.

### C13 Sachaufgaben and modelling: moderate

The curricula require exactly the steps that children tend to skip (see L15):

- **KMK:** interpret the result and check it against the situation [83].
- **NRW:** "begründen, ob Näherungswerte … ausreichen oder ein genaues Ergebnis nötig ist" [88].
- **Bayern:** multi-step problems, Fermi tasks, and extending or shortening Sachsituationen [85].

More authentic contexts increase realistic reactions [44].

### C14 NRW-specific extras (informatics strand): normative

NRW requires that by the end of Klasse 4 pupils "wandeln Zahlen des Dezimalsystems in Zahlen des Binärsystems um und umgekehrt", and it lists Datenmengen as a quantity [88]. KMK 2022 marks comparable informatics competencies but does not name binary numbers [83]. Bayern 3/4 contains neither.

### 4.15 Alignment table

The standards are abridged quotations. BY = LehrplanPLUS Bayern Mathematik 3/4 [85][86]. NRW = Lehrplan Mathematik Primarstufe 2021, end of Klasse 4 [88]. KMK = Bildungsstandards 2022 [83].

| App topic | KMK Leitidee | Concrete KMK standards (abridged) | Bayern (LehrplanPLUS 3/4) | NRW (Lehrplan 2021) | Klasse-4 scope in the app |
|---|---|---|---|---|---|
| **(a) Zahlen bis 1 000 000**: Stellenwert, Runden, Zahlenstrahl | Zahl und Operation; Muster, Strukturen und funktionaler Zusammenhang | Aufbau des dezimalen Stellenwertsystems erkennen, erklären, nutzen (Bündelungs-, Stellenwertprinzip); Zahlen bis 1 000 000 verschieden darstellen (Stufenschrift, Stellenwerttabelle) und in Beziehung setzen; im Zahlenraum orientieren (ordnen, Nachbarzahlen); runden und überschlagen sachadäquat; Strukturen in Zahlenfolgen | LB 1.1: count flexibly to a million; order and compare "auch anhand des Zahlenstrahls"; 1000 = 10 H = 100 Z; Stellenwertschreibweise ↔ Stufenschrift ("7H 3Z 4E") ↔ Zahlwort ↔ material; Teiler/Vielfache; Fermi estimates. "Runden" not named (Überschlag in LB 1.2/1.3) | Zahlverständnis: count, name and write numbers to 1 000 000; Bündelung, Stellenwertschreibweise; switch representations; Vorgänger/Nachfolger; "runden und schätzen … mit aufgabenabhängiger Genauigkeit"; Binärzahlen | 0 to 1 000 000; Stellentafel M HT ZT T H Z E; Stufenschrift; Zahlwort; additive decomposition; Nachbarzahlen; <, >, =; steps of 1 000 to 100 000; rounding to Z, H, T, ZT, HT incl. carry and reverse questions; zoomed Zahlenstrahl segments; Teiler/Vielfache ≤ 100; Binärzahlen 0–31 optional |
| **(b) Schriftliche Addition, Subtraktion, Multiplikation, Division** | Zahl und Operation (written division is **not** in KMK) | "verstehen schriftliche Verfahren der Addition, Subtraktion und Multiplikation, beschreiben den Algorithmus, führen diesen geläufig aus"; kontrollieren Lösungen (Überschlag, Umkehroperation); "finden, erklären und berichtigen Rechenfehler"; Fachbegriffe sachgerecht verwenden | LB 1.2: "wenden automatisiert die schriftlichen Verfahren der Addition, der Subtraktion (Abziehverfahren), der Multiplikation (ein- und zweistellige Multiplikatoren) und der Division (Divisoren bis einschließlich 10, auch mit Rest) an"; choose Kopf / halbschriftlich / schriftlich; Überschlag | Ziffernrechnen: "erläutern" all four (division "durch einstellige Divisoren mit Verwendung der Restschreibweise"); "führen … Addition, Subtraktion und Multiplikation sicher aus"; multiplication "auch mit mehrstelligen Faktoren"; no subtraction method prescribed | +: 2–4 Summanden, sum ≤ 1 000 000; −: one Subtrahend, 0–5 regroupings, zeros in the Minuend; ·: × 1-digit, × 2-digit, × 3-digit (Stufe 3, NRW); product ≤ 1 000 000; ÷: divisor 2–9 (10 optional), dividend 3–6 digits, Rest, zeros in the quotient; Überschlag + Probe on every item; halbschriftlich division mode |
| **(c) Kopfrechnen und Einmaleins** | Zahl und Operation; Muster … (Gleichheit von Termen, strukturierte Päckchen) | "beherrschen die Grundaufgaben des Kopfrechnens (… Einmaleins) gedächtnismäßig und leiten deren Umkehrungen sicher ab"; transfer to analogous tasks up to a million; flexible mental and halbschriftlich strategies; Rechengesetze (Tauschaufgaben); Zusammenhänge zwischen Operationen | LB 1.2: kleines Einmaleins and its Umkehrungen "automatisiert und flexibel"; transfer (6 · 4 → 60 · 4); vorteilhafte Lösungswege; ANNA-Zahlen, strukturierte Päckchen; LB 1.1 Teiler/Vielfache | Schnelles Kopfrechnen up to 1 000 000; "geben alle Zahlensätze des kleinen Einmaleins automatisiert wieder und leiten deren Umkehraufgaben sicher ab"; Distributiv- and Konstanzgesetz; Kraft der 5/10, Kernaufgaben | 100 multiplication facts + 90 division facts (divisor 1–10, never ÷ 0); analogues with Stufenzahlen (7 · 800, 3 500 : 7); Ergänzen to 1 000 … 1 000 000; Verdoppeln/Halbieren; · and : by 10/100/1 000; strategies (Tausch-, Nachbar-, Zerlegungsaufgabe, Konstanz der Differenz); Teiler/Vielfache ≤ 100 |
| **(d) Größen und Messen**: Geld, Längen, Gewichte (Massen), Zeit, Hohlmaße | Größen und Messen | vergleichen und ordnen Größen; Standardeinheiten kennen und in Beziehung setzen; Repräsentanten (Höhe der Tür); einfache Brüche mit Größen (1/2 m, Dreiviertelstunde, 1/4 l); verschiedene Schreibweisen ("2,5 km \| 2500 m \| 2 km 500 m"); schätzen; Plausibilität; Sachaufgaben mit Größen | LB 3.1–3.3: km, mm, s, kg, g, l, ml (+ m, cm, €, ct, h, min, Woche, Monat, Jahr from 1/2); comma named only for m/cm and €/ct; time spans also in mixed notation "1 h 25 min"; ½, ¼, ¾; no Tonne | mm, km, s, g, kg, **t**, ml, l, **Byte/kB/MB**; analog and digital clocks; reference quantities 1 g, 500 g, 1 kg, 1 t, 1 km; ¼, ½, ¾; "rechnen mit Größen (auch mit Dezimalzahlen)" | Units ct, €, mm, cm, m, km, g, kg, ml, l, s, min, h, Tag, Woche, Monat, Jahr; t and Datenmengen as NRW option; no dm, cm², m², hl; comma with 2 decimals for € and m; 3 decimals for km/kg/l on Stufe 3 only; mixed notation for time only; fractions only ½, ¼, ¾ |
| **(e) Geometrie**: Flächen, Umfang, Symmetrie, Körper, Netze | Raum und Form; Größen und Messen; Muster (Bandornamente) | räumliche Beziehungen (Bauplan ↔ Bauwerk, Körper ↔ Netz); gedanklich operieren (falten, drehen, spiegeln); Körper und ebene Figuren klassifizieren; Umfang/Flächeninhalt vergleichen; Grundprinzip des Messens (Einheitsquadrate, Einheitswürfel); Achsensymmetrie, Bandornamente | LB 2: Würfelgebäude ↔ Baupläne; folding nets in the head; Würfel vs Quader; "verschiedene Netze von Würfeln und Netze von Quadern"; "deckungsgleich"; Symmetrieachse, Spiegelbild; Rauminhalt with unit cubes; area/perimeter already in 1/2 | Flächeninhalt and Umfang "durch Auslegen mit Einheitsquadraten oder Zerlegen"; Sechseck, Achteck, Parallelogramm; senkrecht, parallel, rechter Winkel; Pyramide, Zylinder; Würfelnetze; Rauminhalt with Einheitswürfeln; symmetry on Gitterpapier | Grid figures of 4–40 Kästchen; area in Kästchen, perimeter in Kästchenlängen (or cm); no formula, no cm²; symmetry axes vertical/horizontal (diagonal on Stufe 3); Körper (Würfel, Quader, Kugel, Zylinder, Kegel, Pyramide, Prisma) with Ecken/Kanten/Flächen; 35 hexominoes / 11 cube nets; opposite faces; Würfelgebäude, Bauplan, Ansichten |
| **(f) Daten, Häufigkeit und Wahrscheinlichkeit** | Daten und Zufall | Daten erfassen und strukturieren; in Tabellen und Diagrammen darstellen und Informationen entnehmen; Darstellungen kritisch reflektieren; einfache Kombinatorik (systematisch, Baumdiagramm, Tabelle); "sicher, möglich, unmöglich"; Chancen "datenbasiert" vergleichen | LB 4.1: larger tables, Balkendiagramm; Fahrpläne, Preislisten; derive data not shown directly; LB 4.2: Gewinnchancen (Glücksrad, Würfel), vary conditions (Kugeln im Säckchen); Kombinatorik in LB 1.3 | Daten und Häufigkeiten in Diagrammen und Tabellen (also digital); Kalender, Diagramme; "bestimmen zunehmend systematischer die Anzahl verschiedener Möglichkeiten"; "sicher, (un-)wahrscheinlich, (un-)möglich" | Strichliste ↔ Tabelle ↔ Säulen-/Balkendiagramm ↔ Bilddiagramm (≤ 6 categories, frequencies ≤ 100); Fahrpläne and Preislisten; misleading diagrams; combinatorics ≤ 36 cases; Würfel, Münze, Glücksrad, Säckchen ≤ 20 Kugeln; no numeric probabilities |
| **(g) Sachaufgaben** in everyday contexts | Spans Zahl und Operation; Größen und Messen; Muster … (funktionale Beziehungen); main process competencies Modellieren and Problemlösen | Rechenoperationen in Sachaufgaben anwenden und Beziehung Sache ↔ Lösungsschritte beschreiben; Näherungswerte, Plausibilität; funktionale Beziehungen (Menge–Preis), Proportionalität; Informationen entnehmen; Lösung interpretieren; Sachaufgaben zu Termen formulieren | LB 1.3: relevant information from texts and tables; multi-step problems; Fermi tasks; Vorwärts-/Rückwärtsarbeiten; Überschlag vs exact; LB 3.3: "je mehr – desto mehr/weniger" | Sachsituationen; Tabellen, Skizzen; "begründen, ob Näherungswerte … ausreichen"; write Sachaufgaben for given models; relate results back to the situation | 1–3 steps, numbers ≤ 1 000 000; contexts: Einkaufen, Taschengeld, Klassenfahrt, Schulfest, Fahrplan, Zoo, Backen, Bücherei, Garten; Menge–Preis tables; interpreting the remainder; extra and missing information; Fermi estimates; no sensitive contexts or brands |

### 4.16 Difficulty levels (Stufen) per topic

The Stufen map roughly onto AB I, II and III [83]. They are never hard-locked.

| Topic | Stufe 1 (≈ AB I) | Stufe 2 (≈ AB II) | Stufe 3 (≈ AB III) |
|---|---|---|---|
| (a) | Read and write numbers ≤ 100 000 from a Stellentafel or Zahlwort; Vorgänger/Nachfolger; round 4–5-digit numbers to H or T; labelled points on a Zahlenstrahl with step 1 000 | 6-digit numbers with internal zeros; add or move one Plättchen and state the change ("um 9 000 größer"); round to ZT/HT incl. carry; unlabelled Zwischenstriche on a zoomed Zahlenstrahl; order 5 numbers made of the same digits | Largest or smallest number with n Plättchen; the range that rounds to a target; "Welche Zahl liegt näher an 1 000 000?" with a reason; "Stimmt das?" with a choice of reason |
| (b) | + and − with 3–4 digits and ≤ 1 regrouping; × 1-digit; ÷ 1-digit without Rest and without zeros in the quotient | 5–6 digits, several regroupings, Entbündeln over zeros, 3–4 Summanden; × 2-digit; ÷ with zeros in the quotient and with Rest; Überschlag before calculating | Fehlerdetektiv; Ziffernrätsel (missing digits); × 3-digit (NRW); decide Kopf / halbschriftlich / schriftlich (5 000 − 1) |
| (c) | Kernaufgaben, then all multiplication and division facts, spaced | Umkehr- and Platzhalteraufgaben (□ · 7 = 56); analogues with 1–3 zeros (60 · 4, 2 400 : 6); mixed operations; Ergänzen to Stufenzahlen | vorteilhaft rechnen (25 · 4 · 37); continue and explain strukturierte Päckchen; "Welche Terme haben dasselbe Ergebnis?"; Teiler/Vielfache puzzles |
| (d) | One-step conversion between neighbouring units (4 m = 400 cm); money in comma notation; read clock times; choose the plausible unit | Mixed ↔ comma notation (2 km 50 m = 2 050 m); order quantities in different units; time spans across hours (8:45 Uhr → 10:20 Uhr); Wechselgeld; ½, ¼, ¾ | Multi-step tasks (Einkaufszettel, Rezept); plausibility ("Ein Hund wiegt 30 g?"); estimating from reference quantities; find the conversion error; km/kg/l with 3 decimals |
| (e) | Name Körper and figures; count Ecken/Kanten/Flächen; count the Kästchen of a rectangle; vertical axis symmetric yes/no | Area and perimeter of composite grid figures; complete a mirror image; is this hexomino a Würfelnetz?; count cubes incl. hidden ones | Opposite faces; the same area with a larger perimeter; diagonal axes; Bauplan ↔ Ansicht; why a net cannot fold (choose a reason) |
| (f) | Read a value or the largest category; classify events as sicher/möglich/unmöglich | Differences and totals; Strichliste → Diagramm; Fahrtzeit from a Fahrplan; compare two Säckchen or Glücksräder by counts; combinations of 2 sets | Change a Säckchen so an event becomes more likely; judge a misleading diagram; 3-set combinatorics (3 · 3 · 2) with a Baumdiagramm; "Ist das Spiel fair?" |
| (g) | One step, all data relevant, numbers ≤ 10 000 | Two steps; data from a table, diagram or Fahrplan; one piece of extra information; mixed money or time units; "Überschlag reicht / genau rechnen" | Three steps or Fermi; interpret the remainder; missing data or a nonsense question (Kapitänsaufgabe); match a story ↔ Term; Menge–Preis proportionality; judge a given answer |

---

## 5. Privacy (DSGVO/TDDDG), accessibility and child-appropriate UX

### P1 § 25 TDDDG and progress in localStorage: normative (interpretation)

§ 25(1) TDDDG requires consent for **any** storing of information on the user's device [109]. § 25(2) Nr. 2 exempts storage that is "unbedingt erforderlich, damit der Anbieter eines digitalen Dienstes einen vom Nutzer ausdrücklich gewünschten digitalen Dienst zur Verfügung stellen kann".

The German supervisory authorities' guidance (DSK, Nov 2024) adds several points [110]:

- Local Storage and Session Storage count as storage, whether or not the data is personal.
- Add-on functions are only "wished for" once the user explicitly uses them.
- Without a login, "use" by default means one session.

The Article 29 Working Party exempts UI customisation only when the user explicitly asks for it, and persistence beyond the session needs prominent information [111]. The EDPB says that reading local storage on the device is not "access" as long as the data never leaves the device, but writing it is still "storage" [112]. **No court has ruled on anonymous learning progress in localStorage, so this is interpretation, not settled law.**

### P2 DSGVO scope, Art. 8 (children) and child-friendly transparency: normative

Art. 8 DSGVO applies only when processing relies on consent for a service offered directly to a child. Below 16, a parent must give or authorise that consent [113]. Germany has not lowered this age [116]. Recital 38 asks for specific protection of children's data, especially in marketing and profiling [115]. Art. 12 requires clear, plain language, "insbesondere für Informationen, die sich speziell an Kinder richten" [114].

**A site that relies on no consent and collects no personal data does not trigger Art. 8 at all**, apart from the hosting logs it cannot avoid. Avoiding data is therefore the most robust way to comply.

### P3 LG München I, 20.01.2022 (Google Fonts): self-host every asset: normative

The court ruled that loading Google Fonts dynamically sent visitors' IP addresses to Google without consent [117]. It granted an injunction and €100 in damages under Art. 82 DSGVO, and it found no legitimate interest, because the font can be used without the browser contacting Google. The ruling is a first-instance judgment about Google Fonts. Applying it to other CDNs follows the same logic but is our inference.

### P4 What Firebase Hosting (Google) processes: normative

- **What is processed.** Hosting processes end users' IP addresses to detect abuse and for usage analysis, and keeps IP data "for a few months" [118].
- **Where.** Hosting is a global service, and Fastly (US) is the CDN subprocessor [119]. On 2026-10-18, responses came from Fastly edge nodes in Frankfurt and Munich, and the HSTS header was present [123].
- **Roles are not clean.** Firebase calls Google a processor, but it also counts IP addresses as "Firebase Service Data" used under Google's own privacy policy [118].
- **Transfers to the US.** The Data Processing and Security Terms include SCCs and state Google's EU-US Data Privacy Framework certification [120]. The General Court upheld the DPF on 3 Sep 2025, and an appeal to the CJEU is pending (C-703/25 P) [122].
- **Detailed request logs** go to Cloud Logging only if it is linked [121].

### P5 Impressum and Datenschutzerklärung: normative

§ 5 DDG requires an Impressum for "geschäftsmäßige, in der Regel gegen Entgelt angebotene digitale Dienste" [124]. Even a free, non-commercial portal falls under § 18(1) MStV unless it serves "ausschließlich persönlichen oder familiären Zwecken" [125]. The fragFINN criteria, which govern the kid-safe whitelist used in many German schools, go further [126]. They ask for a named contact person, a postal address that is not a PO box, a phone number, an e-mail address and a current privacy policy.

### P6 Security headers and CSP for a static Vite SPA on Firebase Hosting: normative

Firebase Hosting sends HSTS by default but no CSP or other hardening headers. These are configured through `headers` in `firebase.json` [123][127]. OWASP recommends nosniff, a strict Referrer-Policy, a Permissions-Policy, frame-ancestors and COOP [128]. Small assets may be inlined as `data:` URIs, which must never be allowed in `script-src` [129]. A strict `style-src` does not block React's `style` prop [130]. vite-plugin-pwa's `injectRegister: 'inline'` inserts an inline script, while `'script'` does not [131]. A Vite build without inline scripts can use `script-src 'self'` [132].

### P7 WCAG 2.2 AA: the criteria that matter most here: normative

WCAG 2.2 became a W3C Recommendation on 5 October 2023; the current version is dated 12 December 2024 [133]. The criteria most relevant here are:

- **Level AA:**
  - text contrast ≥ 4.5:1 (1.4.3); UI components ≥ 3:1 (1.4.11);
  - reflow at 320 CSS px (1.4.10); text-spacing overrides (1.4.12);
  - visible focus (2.4.7); focus never fully hidden by sticky content (2.4.11) [135];
  - targets ≥ 24 × 24 px (2.5.8), which W3C calls a minimum [134];
  - single-pointer alternatives to dragging (2.5.7);
  - status messages announced without moving focus (4.1.3) [136].
- **Level A:** full keyboard operability (2.1.1); errors described in text (3.3.1); labels for inputs (3.3.2); adjustable time limits (2.2.1).
- **AAA extras we adopt:** 44 × 44 px targets (2.5.5); focus appearance (2.4.13); animation triggered by interaction can be disabled (2.3.3).
- **Colour.** About 1 in 12 men has a colour-vision deficiency [137].
- **Legal frame in Germany (our reading, not legal advice).** BITV 2.0 binds public bodies ("Informationen und Dienstleistungen öffentlicher Stellen") and presumes conformity when harmonised European standards are met [173]; it would apply if a school, a school authority or a Land operated the portal. The Barrierefreiheitsstärkungsgesetz (from 28 June 2025) covers listed consumer products and services such as "Dienstleistungen im elektronischen Geschäftsverkehr", e-books and banking [172], which a free, non-commercial practice site does not appear to be. Targeting WCAG 2.2 AA goes beyond what either law is likely to require here.

### P8 Touch-target size for 9–10-year-olds: moderate

Anthony et al. collected more than 10,000 touches from 66 participants (37 children) on smartphones [138]. The youngest group (7–10, including three 5–7-year-olds) had more difficulty than older groups with "small" 0.25-inch (6.35 mm) targets; read off their Figure 5, roughly a third of first attempts missed. The authors recommend enlarged active areas, and they observed "holdover" touches at the previous target's position (1.5 % of touches). Pointing accuracy depends strongly on age [139]. NN/g recommends at least 2 × 2 cm targets for young children, which is a practitioner guideline [140].

On typical school devices, 1 CSS px ≈ 0.19 mm (our own calculation). That makes 24 px ≈ 4.6 mm, 48 px ≈ 9 mm and 64 px ≈ 12 mm. No study gives an exact optimum for 9–10-year-olds.

### P9 Calm motion, sound and time limits: normative

`prefers-reduced-motion: reduce` reflects a setting in the operating system and has been widely supported since 2020 [141]. Scaling and panning large objects can trigger vestibular discomfort. WCAG requires adjustable time limits (2.2.1), a way to pause automatic motion that lasts longer than 5 s (2.2.2), and, at AAA, the option to disable animation triggered by interaction (2.3.3) [133].

### P10 Fonts for young readers: weak evidence

- **Andika** was designed "for literacy use and beginning readers" [142].
- **Atkinson Hyperlegible** makes similar characters easy to tell apart (B/8, O/0, 1/I/i/l) and exists as Next (variable) and Mono [143]. Its maker cites awards and adoption, not controlled studies.
- **Playwrite DE Grund** digitises the German Grundschrift, but only in thin weights (100–400) [144].

All of these are available on npm as `@fontsource` packages (OFL) [145]. Evidence that "child fonts" help is weak: children read Verdana faster than the child-oriented Sassoon Primary [146].

### P11 Font size and line length for 9–10-year-olds: mixed

- Children aged 9–11 preferred 14 pt sans-serif text, but reading speed did not differ [147].
- 7–9-year-olds read 9 % faster at an x-height of 5.0 mm than at 4.2 mm [146].
- Smaller fonts and longer lines hurt second graders (d = .35 and .54), while for fifth graders the smaller font *improved* comprehension (d = .43) [148].
- With 51 children in grades 3–5, no single format was best for everyone, but each child's best font was about 101 words per minute faster than their worst [149][150].

Klasse 4 sits between these groups, and individual differences are large.

### P12 Dyslexia-friendly typography and read-aloud: moderate

The Dyslexie font neither helped nor hurt 170 + 147 children, and most of them preferred Arial [151]. OpenDyslexic brought no gain [152]. Extra letter spacing roughly halved reading errors in 74 dyslexic children aged 8–14 [153]. Browser TTS voices may run on a remote server: `SpeechSynthesisVoice.localService === false` means remote synthesis [154].

### P13 Number input on tablets and Chromebooks: moderate

`<input type="number">` causes real problems [155]. Dictation fails in it, and screen readers announce it as a spin button. Scrolling changes the value silently, and large numbers can turn into exponential notation. The recommended alternative is `type="text"` with `inputmode="numeric"`. `inputmode="decimal"` adds the locale's decimal separator, and `"none"` suppresses the virtual keyboard when the app supplies its own keypad [156]. DIN 5008 groups large numbers with spaces, but money amounts with dots [157]. Children may therefore type 1000000, 1 000 000 or 1.000.000.

### P14 Storage robustness on iPads and shared Chromebooks: moderate

- **Safari** deletes all script-writable storage after 7 days of Safari use without interaction on the site [158]. Home-screen web apps have their own counter.
- **WebKit storage policy (2023).** Storage is "best-effort" and can be evicted. `navigator.storage.persist()` is granted by heuristics [159].
- **Shared Chromebooks.** In managed guest sessions, all local data is wiped when the session ends [160].
- **Service worker plugin.** vite-plugin-pwa 2.0.0 was released on 2026-10-03, so it is less than 3 weeks old; 1.3.x supports Vite 8 [161].

**Progress kept only in localStorage is inherently fragile in school settings.**

### P15 Performance on shared, low-end school hardware: normative

DigitalPakt 2.0 was announced in December 2024 with €5 bn over six years, shared equally by Bund and Länder [162]. ICILS 2023 (grade 8, not primary school) found about 5 students per school device, down from almost 10 in 2018 [163]; no comparable figure for Grundschulen was found. Devices are therefore shared, centrally managed and often several years old. No reliable statistic on the iPad vs Chromebook split in German Grundschulen was found. For a 3-second first load on a mid-range phone, a 2024 budget allows about 365 KiB of compressed JavaScript within 730 KiB in total [164].

### P16 Screen readers: live feedback, labels, simple maths: normative

Results must be announced without moving focus, using `role="status"` [136]. `aria-live="polite"` waits for a pause, and the live region must already exist in the page before it is updated [165]. Chrome supports MathML Core since version 109 [166]. A December 2025 test found native MathML read well in NVDA and VoiceOver, while `role="math"` with `aria-label` was unreliable [167]. How German screen-reader voices pronounce "·" and ":" was not confirmed.

### P17 Keyboard and non-drag alternatives for interactive tasks: normative

WCAG 2.5.7 (AA) and 2.1.1 (A) require that dragging can be replaced by single taps or clicks and that everything works by keyboard [133]. This affects number-line placement, symmetry completion and nets. The WAI-ARIA slider pattern defines `role="slider"` with Arrow, PageUp/PageDown and Home/End keys [168].

---

## 6. How the findings shape the design

### 6.1 The core learning loop (summary)

1. **Start screen.** If reviews are due, a "Heute wiederholen" warm-up of 3–5 items comes first (L1, L2).
2. **Choice.** The child picks a topic (a–g) and a Stufe. The app shows a suggestion but never forces it (M5).
3. **Einstiegs-Check.** Three items. If all 3 are right on the first try, the child goes straight to practice. Otherwise a "So geht's" worked example follows, with fading over 3 items (L6, L7). *Implementation note (deliberate deviation):* the first 3 items of a new skill-Stufe are plain items. As soon as one of them is not right on the first try, the "So geht's" example is shown before the next item of that skill-Stufe; 3/3 → no example. There is no 3-item fading: after the example the child solves whole items again, with hints and the worked solution as the safety net, and "Beispiel ansehen" stays available. The example also comes back after 2 items in a row of the same skill-Stufe needed the worked solution.
4. **Round.** 10 items with a fixed mix of AB I/II/III and at least one Knobelaufgabe (C3).
5. **Per item.** The child answers and taps "Prüfen". A correct answer gets a short, specific confirmation. After a 1st wrong attempt the child sees a targeted hint and tries again. After a 2nd wrong attempt the app shows the worked steps and then a Zwillingsaufgabe (L4, L13).
6. **Round summary.** For example "8 von 10 geschafft – 2 Aufgaben waren noch knifflig" (see M15: missed items of a Stufe that is not yet "Sicher" are not scheduled for a later review, so the summary makes no such promise). Below it, "Das hast du verbessert" lists improvements against the child's own earlier answers, largest first, and new badges appear (M16). Then two equally weighted buttons: "Noch eine Runde" and "Fertig für heute" (M9, M12).
7. **In the background.** The mastery state per Stufe is updated, the Leitner boxes are updated, and the change is saved after every answer if the child opted in (L2, L8, P1).

### 6.2 Finding → design decision

#### Learning science

| ID | Finding (evidence) | Design decision in the app |
|---|---|---|
| L1 | Retrieval practice helps (g = 0.50); the elementary-school estimate is lower and uncertain (g = 0.33, wide CI) [1] | Every practice screen requires a produced answer; there is no read-only mode. Free numeric entry is the default. Multiple choice is used only where the content needs it (probability words, "Stimmt das?" reasons). Each session starts with a 3–5 item "Wiederholung" warm-up from earlier topics. A Stufe can reach "Gemeistert" only after retrieval in ≥ 3 different sessions. *Implementation note:* "≥ 3 different sessions" is counted as ≥ 3 distinct practice days per Stufe (`practiceDays`), the day-granular stand-in that needs no session ids or times (P1). |
| L2 | Spaced > massed (g = 0.74, bias-corrected); expanding ≈ uniform; learners rarely carry out spacing on their own [2–5] | The app owns a Leitner scheduler per skill-Stufe and per Einmaleins fact. It stores box and `nextDue` (day granularity). Box intervals: same session, 1, 3, 7, 14, 28 days. A wrong answer moves the item down **one** box and never resets it. The "Heute wiederholen" queue is capped at 8 items a day. Overdue items wait without any guilt message. *Implementation note:* the cap of 8 is per day, not per round: `ProgressState.reviewed` counts the review answers of the current day. |
| L3 | Interleaving helps in maths (g = 0.34; d = 0.83 in the grade-7 RCT) but lowers accuracy during practice [6–9] | A new skill is practised in a block of 5–8 items. "Gemischte Übung" unlocks once ≥ 2 skills in a topic are "Sicher". In it, no two consecutive items need the same strategy, and look-alike pairs are mixed on purpose (+/−, Umfang/Flächeninhalt, ·/: in Sachaufgaben, runden auf Z/H/T, cm–m vs g–kg). About 50 % of review items come from earlier topics. Errors in mixed practice move Leitner boxes but never remove a "Sicher" status. Info line for adults: "Gemischtes Üben fühlt sich schwerer an, wirkt aber nachhaltiger." |
| L4 | Elaborated feedback (0.49) ≫ right/wrong only (0.05); high-information feedback d = 0.99 [10–12][15] | Two-stage loop on the same screen. **1st wrong:** one targeted hint (specific to the bug when the answer matches one, otherwise a generic step hint) and a second try. **2nd wrong:** the worked solution step by step with the child's own numbers, the correct answer, then a "Zwillingsaufgabe" (same structure, new numbers). Every generator returns structured `steps[]` and `hints[]`, and both are unit-tested. |
| L5 | Task-focused, immediate feedback; praise sparingly; no comparisons with others [13][14] | Feedback comes immediately after each item: one sentence plus one visual (Stellenwerttafel, Punktefeld, Zahlenstrahl). Praise names the strategy. Comparisons are only with the child's own past ("Letzte Woche 6 von 10, heute 8 von 10"). Wrong answers use neutral colours and no sound. Written algorithms are checked after submission, never interrupted mid-column. |
| L6 | Worked examples help (g ≈ 0.43–0.48); fading with prompts to name the principle helped university students, but self-explanation prompts may reduce the worked-example benefit; evidence on incorrect examples at this age is weak and mixed [16–20][170][171] | Each new Stufe opens with a "So geht's" card showing one example step by step. Fading then works backward over 3 items: the last step blank, then the last two, then the whole item. The principle prompt is a one-tap choice ("Welche Regel hast du benutzt? Entbündeln / Übertrag / Stellenwert"), never typed. Error-finding items appear only on Stufe 3 or after "Sicher". *Implementation note (deliberate deviation):* the "So geht's" card is not forced at the start of a new Stufe; it follows the Einstiegs-Check (see L7 and §6.1 step 3), and the backward fading over 3 items and the one-tap principle prompt are not implemented. |
| L7 | Expertise reversal; adapting fading to the learner works better [21] | Each Stufe starts with a 3-item "Einstiegs-Check". 3/3 correct on the first try → skip the example and fading and offer the next Stufe. ≤ 2/3 → full example and fading path. After 2 consecutive errors the worked example comes back, and fading slows to one step every second item. "Beispiel ansehen" is always available but never forced. *Implementation note (deliberate deviation):* the example is shown as soon as one of the 3 check items is not right on the first try (not after all 3), with no fading afterwards; it comes back after 2 consecutive items of the same skill-Stufe needed the worked solution. The next Stufe is suggested after 5 first-try correct answers in a row. |
| L8 | Mastery learning helps on experimenter-made tests but is weak on standardised tests [22–25] | Per-Stufe states: **Geübt (1★)** = attempted. **Sicher (2★)** = ≥ 8 of the last 10 correct on the first try, including the last 3; an answer given after a hint does not count as correct. **Gemeistert (3★)** = also ≥ 4 of 5 correct in a spaced check ≥ 3 days later. A failed check starts a corrective path with a *different* representation (worked example or material view). Children at Gemeistert get "Knobelaufgaben". Nothing is hard-locked. All of this is documented as a heuristic. |
| L9 | The 85 % rule is machine-learning theory; adaptivity goes with larger effects [26–28] | Each topic has a staircase across Stufe 1–3 driven by explicit generator parameters (digit count, number of carries, zeros, divisor size). The app suggests moving up after 5 consecutive first-try correct answers and quietly drops one sub-step after 2 consecutive errors. The target is a rolling first-try success rate of 75–90 %. Unit tests assert that each Stufe stays inside its declared parameter bounds. |
| L10 | Digital practice adds small effects (d ≈ 0.16); best at 30–75 min a week, as a supplement, blended with paper [27–31] | The app is positioned as "Ergänzung zum Unterricht". A round is 10 items, about 10–15 minutes. The page for adults recommends about 3 sessions a week. A printable worksheet mode exists. No effort goes into game graphics. Texts describe effects honestly ("kleine bis mittlere Effekte") and make no promise about grades. |
| L11 | Kernaufgaben → Ableiten → Automatisieren; derived facts go with later recall [32–34] | The Einmaleins trainer has 3 phases. **Verstehen:** arrays on a Punktefeld. **Ableiten:** the nearest Kernaufgabe is shown as a scaffold. **Automatisieren:** spaced retrieval of all 100 facts, tracked individually, with Tauschaufgaben linked. Facts are ordered ·1, ·2, ·5, ·10 → squares → derived facts, never row by row. A wrong fact shows the derivation ("5 · 7 = 35 → 6 · 7 = 35 + 7 = 42"). A quick diagnostic can start a child at "Basis-Training" without stigma. |
| L12 | Time pressure is a stressor; the evidence is sparse [36] | No timers, countdowns or speed scores by default. Response time is recorded silently and used only for scheduling: a correct answer slower than about 3 s (a heuristic) keeps the fact in review. |
| L13 | Regrouping errors are about half of all errors; next come direction errors (Abziehen) or calculation errors (Ergänzen); zero-in-minuend errors are more frequent with Abziehen, perseveration with Ergänzen [37][38] | Each algorithm has a "bug library" of 5–8 faulty procedures that compute the expected wrong answers: smaller-from-larger, forgotten carry or regrouping, 0 − n = n, adding instead of subtracting, missing 0 in the quotient, unshifted partial products. If the child's answer matches a bug, the hint for that bug points to the column. Digits are entered column by column with carry boxes. Stufe 2–3 deliberately generate zeros in the minuend (4003 − 1278) and multiple regroupings. Tests check that each bug maps a known item to its expected wrong answer and that a correct answer never triggers a bug. |
| L14 | Inversion and zero errors; place value is still fragile in Klasse 4 [39–41] | The Stellenwerttafel (M HT ZT T H Z E) is the main representation. Items include unordered decompositions ("3 E + 4 H + 2 Z"), bundling ("14 Z = □ H □ Z") and Zahlwort dictation with internal zeros ("dreihundertviertausendzwanzig" → 304 020). The checker detects swapped tens and ones and missing or extra zeros, and the feedback places the child's digits in the table. Rounding items highlight the decisive digit and show the Zahlenstrahl between the two candidate values. |
| L15 | Children calculate without making sense of the situation (17 % realistic reactions) [42–44] | 10–20 % of each topic's items are Sachaufgaben. Items with missing information offer a button "Nicht lösbar – es fehlt eine Angabe". Answers about Größen require a unit. The wording varies, so a keyword like "insgesamt" never predicts the operation. Feedback refers back to the situation ("Kann man 4,67 Autos nehmen?"). |

#### Motivation, mindset and gamification

| ID | Finding (evidence) | Design decision in the app |
|---|---|---|
| M1 | Person praise may harm; replication failed [48–50] | Trait and speed praise are banned at template level (list in M15). Every generator returns a `didWhat` tag, so success feedback can name the action ("Du hast den Übertrag bei den Hundertern beachtet."). |
| M2 | Inflated praise lowers challenge-seeking in insecure children [51] | Success feedback is "Richtig!" or "Stimmt!" plus one specific sentence, with no superlatives. Each correct item gets a check animation shorter than 1 s. A larger celebration happens only when a Stufe reaches Sicher or Gemeistert. Each situation has 6–10 rotating phrase variants. |
| M3 | Process praise correlates with later mindset (correlational) [52][53] | Feedback is identical and gender-neutral for every child; no gender data is collected. The page "Für Eltern und Lehrkräfte" gives praise examples and says the evidence is correlational. Summaries are worded around process ("Du hast im Thema Runden zwei Stufen geschafft."). |
| M4 | Mindset interventions have tiny effects (d ≈ 0.08) [47][54–56] | No mindset lessons or videos. At most one normalising sentence per session, either when the child first enters a harder Stufe or after a second wrong attempt. Status labels use "noch nicht" wording. No neuro-hype and no claim of grade gains. |
| M5 | Choice, competence and relatedness drive intrinsic motivation [57–59] | The child chooses the topic (7) and the Stufe. The app shows a suggestion ("Vorschlag: Runden – Stufe 2") but never locks or forces it. Each decision offers 2–4 options. A mascot animal and a colour theme are chosen once, can be changed, and are never rewarded. Language is non-controlling ("Du kannst noch eine Runde üben"). |
| M6 | Expected tangible rewards undermine intrinsic motivation, especially in children (d = −0.39) [60] | No currency, shop, unlockables, or points for logins or time spent. Rewards are never announced before a task ("Hol dir 3 Sterne!" is not used). Stars appear afterwards and come with a legend. Badges arrive as a surprise and name the competence ("Du kannst jetzt Zahlen bis 1 Million sicher runden."). There is no to-do list of badges to chase. |
| M7 | Gamification effects are small and uncertain [46][61] | At most four motivation elements: progress per topic, 0–3 stars per Stufe, 15–25 mastery badges, and an optional weekly practice-day goal. No story screens. The first exercise is at most 2 taps from the home screen. *Implementation note:* the badge element has 21 mastery badges plus 4 improvement badges (M16), 25 in all. The improvement badges are no fifth element: they use the same gallery and the same surprise rule, and the 15–25 limit applies to all badges together (7.6). |
| M8 | Performance graphs raise felt competence; skill badges look less risky than participation badges (small correlational study, mixed); leaderboards plus mandatory badges harmed in one course [62–65] | Each topic has a personal progress graph that compares only with the child's own past. Badges are skill badges with concrete criteria, e.g. "Runden-Profi: zwei Runden hintereinander mit mindestens 8 von 10 richtig auf Stufe 3". No leaderboards, rankings, percentiles or participation badges. The badge gallery is on its own screen. |
| M9 | Maths anxiety is linked to lower achievement [66–69] | The app says "Üben" and "Training", never "Test" or "Prüfung". No red X, no buzzer; sound is off by default. Wrong answers use a neutral accent colour plus an icon plus text. "Tipp" and "Pause / Fertig für heute" are always visible. Round summaries count successes. Missed items come back later through the scheduler, not in immediate repetition loops. |
| M10 | Timers: plausible harm, mixed evidence [36][70] | An optional "Blitzrunde" for Einmaleins and Kopfrechnen, available only for facts that are Gemeistert. It lasts 2 minutes, with no shrinking bar, and ends with a calm "Die Zeit ist um." It compares only with the child's own best, never affects stars, badges or mastery, and can be hidden by a parent or teacher. |
| M11 | 80 % of children's apps contain manipulative design [71] | A banned-patterns checklist is part of code review (6.4). The exit button is always visible and leaving takes one tap. |
| M12 | ICO, DSA and 5Rights benchmarks for fair design [72–76] | Progress is saved after every answer (if the child opted in). After each round, "Noch eine Runde" and "Fertig für heute" are equally large and equally coloured. No autoplay into the next round. After 20 minutes of continuous practice, one break suggestion appears. No push notifications, reminders or e-mail, and no random rewards. The page for adults documents these "Fair-Design-Prinzipien". |
| M13 | Streaks work through fear of loss; the EU recommends turning them off by default [74][77] | No consecutive-day streak. Instead: (a) a weekly goal "Übungstage diese Woche: ●●○" (default 3, adjustable 1–5) that resets quietly every Monday; (b) a lifetime counter that never drops ("Du hast schon an 12 Tagen geübt."); (c) an in-session "5 richtig hintereinander!" that is never shown as broken. No "0 Tage" and no "Serie verloren". The weekly goal can be hidden. |
| M14 | KMK requires a constructive error culture and "Rechenfehler finden, erklären, berichtigen" [45][78–83] | A "Fehlerdetektiv" item type for all four written algorithms: find the planted error in a worked calculation and pick why it is wrong. It appears on Stufe 3 or after "Sicher" (see L6). The phrase bank in M15 is used, with "du" throughout. |
| M16 | Comparing with one's own past raises pride without the wish to beat others. A teacher's social reference norm and a higher-achieving class go with lower self-concept, most for weaker pupils (correlational). Social comparison also raises the wish to beat others. Specific, informational, learning-framed feedback beats generic praise. Correctness during practice is a weak index of learning. (Moderate for the principles; improvement badges untested with children, weak.) [174–187][189–197] | Pure functions in `src/state/growth.ts` detect five kinds of improvement, always against the child's own earlier answers (thresholds in 7.2). (1) **Self-corrected:** a task solved on the 2nd attempt after a real wrong attempt and the hint. (2) **Twin solved:** a Zwillingsaufgabe solved on the first try after the worked solution. (3) **Error overcome:** a typical error from the error library has happened in several tasks of a skill. It then no longer happens in the next tasks that offer it, and the last of them falls on a later day. (4) **Skill improved:** after a hard start (few first tries and real mistakes in the first 10), three blocks of 10 answers in a row on later days each have at least 8 of 10 first try and at least 4 more than the start. The blocks span at least two later days. (5) **Lasting improvement:** a once-missed task type (a skill-Stufe or an Einmaleins fact) is solved on the first try in a spaced review days after the miss. The scheduler picks the review items, and a miss counts only when it cost something (before Sicher, in a review, or when it lowered a Leitner box). Kinds 1–2 happen within one round, which shows performance rather than learning [193]. So each gets one calm line and no badge: an M15 second-try line (at most 3 per round) or a twin line (a round has at most 2 twins); the round summary adds at most one line for each. Kinds 3–5 need evidence from a later day or from a review the child cannot start, so wrong answers alone never earn them. Kind 4 can still follow a start that was bad on purpose if the child then really solves at least 24 of 30 first try on later days (7.2). They earn the badges "Stolperstein überwunden" (kind 3), "Besser geworden" (kind 4), "Gut behalten" (kind 5) and "Vieles behalten" (kind 5 in three topics, the biggest). Each badge is earned once. It appears only after practice (in the round summary next to "Das hast du verbessert", or on the goodbye screen when the round ends at the break suggestion) and in the badge gallery, and is never announced or shown during a round. Titles and messages name what the child did, with stored numbers ("Du hast den Übertrag jetzt fünfmal richtig beachtet."). They contain no traits and no superlatives. Effort is named only as an action on that task, as in the M15 second-try lines. That a written badge title works like spoken generic praise [184] is an inference. The progress page shows "So hast du dich verbessert" per skill with gains only ("Stufe 1: Am Anfang 4 von 10 auf Anhieb, später 9 von 10."), never a decline: the best value is kept, so a line once shown never shrinks or disappears (M13). The ban on rankings and percentiles (6.4) also covers this view, and it shows no class or group averages [179]. Improvement badges add to the mastery badges and do not replace them (M7). Stored growth data are counts and days per skill-Stufe, the day of the last miss per Einmaleins fact and a capped set of error tags per skill (P1). |

#### Curriculum

| ID | Finding (evidence) | Design decision in the app |
|---|---|---|
| C1 | KMK 2022 Regelstandards are binding [83] | Every generator is tagged with its Leitidee and an internal standard ID (e.g. `ZO-RO-7`). The tags appear on the page for teachers and in the worksheet footer. The standards are cited as "KMK (2022), Beschluss vom 15.10.2004 i. d. F. vom 23.06.2022". |
| C2 | In 2022, Muster became cross-cutting; new competence "Objekte und Werkzeuge"; digital strand [83][84] | "Muster" items appear inside every topic: Zahlenfolgen (a), strukturierte Päckchen (c), Menge–Preis (g), Bandornamente (e). Algorithms are shown as named step sequences ("Schritt 1: Einer …"). There are Fachbegriff items (Summand, Divisor, Kante …). The app uses the 2022 vocabulary (Massen; sicher/möglich/unmöglich) and the 2022 notation (1 000 000). |
| C3 | AB I–III matter for all children [83][84] | Three Stufen ≈ AB I/II/III. The AB mix per 10-item round is 7/2/1 on Stufe 1, 4/4/2 on Stufe 2 and 2/5/3 on Stufe 3. Every round, even on Stufe 1, has at least one Knobelaufgabe. |
| C4 | About 22 % of fourth graders are below the Mindeststandard [91][92] | Stufe 1 has visible scaffolds (Stellentafel, Rechenstrich, Kernaufgaben hint). A "Wiederholen" entry covers Klasse-3 prerequisites (Zahlenraum bis 1 000, all Einmaleins facts). The default suggestion is Stufe 2, which is about the Regelstandard. |
| C5 | Bayern and NRW define expectations for the end of 3/4 [85–90] | Stufe 1 may include Klasse-3 content. Curriculum references (title, date, URL) are kept in one data file, `src/data/curriculum.ts`, so a future revision only needs a data update. |
| C6 | Written division is not in the KMK standards, and the Länder differ [83][85][88][94–98] | A division sub-topic with divisors 2–9 (10 optional), dividends of at most 6 digits, with and without Rest (R < divisor), and zeros in the quotient. Remainders are written "23 : 5 = 4 R 3", always with the Probe "4 · 5 + 3 = 23". "=" is never chained between two R results. An optional "halbschriftlich teilen" mode is accepted as well. The page for teachers labels the topic "länderspezifisch". |
| C7 | Bayern mandates Abziehen and NRW is open; in SuVe, Abziehen children described the regrouping step more often, Ergänzen children named why the method works more often [37][85][88][99–104] | Setting "Verfahren: Abziehen (Entbündeln) \| Ergänzen (Erweitern)", default Abziehen, never mixed within a session. Generators, Sprechweise and bug library are specific to the method. Abziehen: "2 minus 7 geht nicht, ich entbündele einen Zehner. 12 minus 7 gleich 5." Ergänzen: "Von 7 bis 12 fehlen 5, 1 gemerkt." Entbündeln across zeros (805 − 328; 100 000 − 43 572) is its own AB-II item class. |
| C8 | Units, comma notation and fractions [83][85][86][88] | The unit set is ct, €, mm, cm, m, km, g, kg, ml, l, s, min, h, Tag, Woche, Monat, Jahr. t and Datenmengen are options; dm, cm², m² and hl are not used. On Stufe 1–2 the comma appears only with € and m (2 decimals); km, kg and l with 3 decimals appear only on Stufe 3. Time is always in mixed notation ("1 h 25 min"), never "1,5 h". Fractions are limited to ½, ¼ and ¾. |
| C9 | Area by unit squares, no formula; Würfelnetze [83][85][88][105][106] | Area and perimeter only on a Kästchen grid: area in Kästchen, perimeter in Kästchenlängen (or cm when 1 Kästchen = 1 cm). No formula and no cm². A "Würfelnetz-Prüfer" uses all 35 hexominoes (11 nets, 24 distractors), randomly rotated or mirrored, plus tasks on opposite faces. Würfelgebäude include hidden cubes and Baupläne. |
| C10 | No numerical probabilities in Grundschule [83][85][86][88][93] | Stufe 1: classify events as sicher, möglich or unmöglich. Stufe 2: compare by counts ("3 von 10 Kugeln sind rot") with wahrscheinlicher / weniger wahrscheinlich / gleich wahrscheinlich. Stufe 3: change the conditions, or judge whether a game is fair. No fractions, percentages or Laplace formulas. Following VERA [93], "wahrscheinlich"/"unwahrscheinlich" are used only comparatively by default; an NRW option adds them as everyday labels because the NRW plan names them [88]. |
| C11 | KMK 2022 uses spaces; the SI forbids dots and commas as separators [83][107][108] | Numbers with 5 or more digits are displayed with U+202F narrow no-break spaces (12 345; 1 000 000); 4-digit numbers stay ungrouped (2500); dots are never used as separators. The parser accepts 345678, 345 678 and 345.678. "345,678" in an integer task triggers a hint rather than "falsch". |
| C12 | Process standards are concrete; Kommunizieren is social [83][85][88] | Each topic has auto-checkable formats: ≥ 2 for Argumentieren ("Stimmt das?" plus a choice of reason), ≥ 2 for Darstellen (matching representations: Stellentafel ↔ Zahl ↔ Zahlenstrahl, Strichliste ↔ Diagramm, Netz ↔ Würfel), and ≥ 2 for Modellieren where it fits ("Welche Rechnung passt zur Geschichte?"). There are also Fehlerdetektiv items and "Systematisch probieren" with a table scaffold. Worksheets carry "Erkläre deinem Partner …" prompts. The app does not claim to cover Kommunizieren. |
| C13 | The curricula require interpretation and plausibility checks [44][85][88] | At least 20 % of Sachaufgaben (up to 40 % on Stufe 3) are "Denk-Aufgaben": interpreting a remainder, extra or missing information, plausibility checks ("Kann ein Schulweg 25 km lang sein?"). Every Sachaufgabe ends with an Antwortsatz assembled from word chips, including the unit. Contexts come from children's lives and avoid sensitive topics, brands and real people. |
| C14 | NRW has extras: Binärzahlen and Datenmengen [83][88] | An optional "Forscher-Ecke: Binärzahlen" (0–31 with 5 Bit-Kärtchen) that does not count toward mastery. Datenmengen appear only as an NRW option. Neither is required for v1. |

#### Privacy, security, accessibility and UX

| ID | Finding (evidence) | Design decision in the app |
|---|---|---|
| P1 | § 25 TDDDG covers localStorage; the exception requires a function the user explicitly asked for [109–112] | Nothing is written to localStorage, IndexedDB or Cache Storage on page load; an E2E test asserts that storage is empty after visiting every route. After the first completed task the app asks "Soll ich mir deinen Fortschritt auf diesem Gerät merken?" with [Ja, merken] and [Nein] of equal weight, plus "Wird nur auf diesem Gerät gespeichert. Nichts wird verschickt." and a link to /datenschutz. "Nein" keeps progress in memory for the session only. One versioned key, `mathe4.v1`, holds aggregates only: no ID, names or free text, and dates at day granularity. Settings are saved only once changed. The settings offer "Fortschritt löschen" and "Nicht mehr merken". |
| P2 | Art. 8 applies only to consent; avoiding data is the most robust strategy [113–116] | Nothing relies on consent. No accounts, no fields for name, age, class or school, no free-text inputs, no contact form (a mailto link for adults). Optional local profiles use picture avatars without names. /datenschutz has two layers: a "Für Kinder erklärt" box of 5–7 sentences, then the full legal text. |
| P3 | LG München I: transferring IPs to Google Fonts was unlawful [117] | All fonts are self-hosted through `@fontsource` packages, and the app contacts no third-party origin at runtime. A CI step greps `dist/` for `fonts.googleapis`, `fonts.gstatic`, `jsdelivr`, `unpkg`, `cdnjs` and `googletagmanager`, and a Playwright test asserts that every request goes to the page's own origin. |
| P4 | Firebase Hosting processes IPs; Fastly is the CDN; the DPF appeal is pending [118–123] | Firebase is used as a pure static host: no SDK, no `/__/firebase/init.js`, no Analytics, no Cloud Logging link. The Data Processing and Security Terms are accepted. /datenschutz names Google and Fastly, Art. 6(1)(f), IP retention of "a few months", and the DPF plus SCCs. The build stays a plain `dist/` that can move to another host. |
| P5 | § 5 DDG, § 18 MStV, fragFINN criteria [124–126] | /impressum and /datenschutz are linked from a footer on every screen. The operator supplies the Impressum details before deployment; no placeholders are invented. |
| P6 | Firebase sends no CSP by default; OWASP header set [127–132] | `firebase.json` sets these headers for `**`: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin` and `X-Frame-Options: DENY`. `index.html` is served with `no-cache` and `/assets/**` with `max-age=31536000, immutable`, plus an SPA rewrite to `/index.html`. The code never needs `unsafe-inline` or `unsafe-eval`: it uses plain CSS or CSS Modules and no runtime CSS-in-JS. |
| P7 | WCAG 2.2 AA [133–137] | The target is WCAG 2.2 AA plus AAA 2.5.5, 2.4.13 and 2.3.3. Colour tokens are unit-tested for contrast: task text ≥ 7:1, all other text ≥ 4.5:1, borders, focus rings, progress bars and star outlines ≥ 3:1. Focus is a 3 px solid outline with a 2 px offset. No sticky bars can hide a focused element. The layout works at 320 px and at 400 % zoom. Everything works by keyboard: Tab, Enter for "Prüfen" and "Weiter", Esc to close dialogs. Feedback is never colour-only (icon + text + colour). axe-core runs on every route. |
| P8 | Children miss small targets [138–140] | Answer buttons, keypad keys and "Prüfen"/"Weiter" are ≥ 64 × 64 CSS px; all other controls are ≥ 48 × 48 px, with gaps ≥ 8 px and hit areas that extend into the gaps. After a screen change, taps on a newly rendered control at the previous tap position are ignored for 400 ms (our own heuristic). Icons always come with a text label. A Playwright test measures every control. |
| P9 | Reduced motion and adjustable time limits [133][141] | Celebrations last ≤ 800 ms and use opacity and translate, with scale ≤ 1.1. No full-screen confetti, parallax or looping animation. Under `prefers-reduced-motion` all changes happen instantly; the in-app toggle "Animationen aus" does the same. Durations come from the custom property `--motion-ms`, which is set to 0 in both cases. Sound is off by default. |
| P10 | Legible fonts; no evidence that child fonts help [142–146] | The UI and task font is Atkinson Hyperlegible Next (variable, weights 400–700, latin subset). Columns and place-value tables use Atkinson Hyperlegible Mono. An optional "Schulschrift" setting switches to Andika. Playwrite DE Grund is used only for decorative headings of 28 px or more and never for digits. Fonts total ≤ 150 KB, with `font-display: swap` and a system-ui fallback. |
| P11 | Font-size effects are mixed and individual differences are large [146–150] | Body text is 1.25rem (20 px) with line-height 1.5, at most 60ch wide, left-aligned. Task expressions are 2.25–2.5rem, and digits in inputs at least 2rem. A "Schrift größer" setting adds 25 %. rem units are used throughout. Sachaufgaben are at most 3–4 lines. |
| P12 | Dyslexia fonts bring no benefit; extra spacing helps [151–154] | No OpenDyslexic or Dyslexie. A "Mehr Abstand" setting applies letter-spacing 0.12em, word-spacing 0.16em and line-height 1.8. No italics, all caps or justified text. An optional "Vorlesen" button uses only German voices with `localService === true` and is hidden when none exists. |
| P13 | `type=number` is problematic; German number formats vary [155–157] | Integer answers use `<input type="text" inputmode="numeric" autocomplete="off" spellcheck="false" enterkeyhint="done">`, and Größen answers use `inputmode="decimal"`. `type="number"` is never used. A pure, unit-tested `parseAnswer()` handles separators and decimal marks, and gives a hint instead of "falsch" when input is ambiguous. On touch devices the default is an in-app Ziffernblock (0–9, ",", ⌫, "Prüfen"; keys ≥ 64 px) with `inputmode="none"`; it never covers the focused field. A physical keyboard always works. |
| P14 | Safari evicts storage after 7 days; managed guest sessions wipe it [158–161] | Every storage call is wrapped in try/catch, with an in-memory fallback. The schema is versioned, with migrations that are unit-tested. The progress page says "Dein Fortschritt ist nur auf diesem Gerät gespeichert". "Fortschritt sichern" and "Fortschritt laden" export and import a small JSON file or a copyable code, with validation. `navigator.storage.persist()` is called only after opt-in. All logic runs on the client. There is **no service worker in v1**. |
| P15 | Shared, older devices; a 2024 performance budget [162–164] | CI enforces budgets: initial JS ≤ 150 KiB gzip, each lazily loaded topic chunk ≤ 30 KiB, fonts ≤ 150 KiB, total initial transfer ≤ 400 KiB. Geometry, number lines and charts are hand-written SVG and animations are CSS only; no chart or UI-kit libraries. Lighthouse (mobile) must reach performance ≥ 90, TBT < 200 ms and CLS < 0.05. *Implementation note:* `scripts/check-dist.mjs` fails the build when initial JS exceeds 150 KiB or a topic chunk exceeds a hard limit of 40 KiB gzip; 30 KiB stays the target and is reported as a warning. After the content review (longer worked steps and feedback), Geometrie (≈ 36 KiB), Daten (≈ 32 KiB) and Größen (≈ 31 KiB) are above the target. |
| P16 | Status messages, live regions and MathML [136][165–167] | The app shell has one persistent, visually hidden `<div role="status" aria-live="polite" aria-atomic="true">`. After "Prüfen" it receives a complete German sentence ("Richtig! 3 mal 4 ist 12."); wrong answers are never announced as assertive or alert. Every input has a visible label. The visual expression is `aria-hidden` and sits next to screen-reader text built from the generator data ("Wie viel ist 3 mal 4?"). Written algorithms are a `<table>` with labelled per-digit inputs. Focus moves only after a user action. |
| P17 | No drag-only interactions; full keyboard support [133][168] | The number line is a slider following the APG pattern: Arrow = minor tick, PageUp/PageDown = major tick, Home/End, and German `aria-valuetext` ("4 500"). Tapping a position also works. Symmetry tasks use a grid of toggle buttons ≥ 48 px with arrow keys and Space. Nets use "Antippen und Ablegen" (tap a piece, then tap a slot). Each of these has a keyboard-only Playwright test. |

### 6.3 Resolved tensions between recommendations

| Tension | Resolution |
|---|---|
| **Hint timing.** Shute says to give feedback after an attempt [14]; anxiety protection says to keep "Tipp" visible (M9) | The "Tipp" button is always visible. Before the first attempt it gives only a strategy prompt, never the answer. Any hint use means the item does not count as first-try correct. The full solution appears only after 2 wrong attempts. |
| **What stars mean.** Accuracy stars per round (M6) vs mastery stars per Stufe (L8) | Stars have one meaning: the mastery state of a Stufe (1 Geübt, 2 Sicher, 3 Gemeistert). Round summaries use counts ("8 von 10 geschafft"), not stars. |
| **Streaks.** The project brief asks for streaks; the evidence and the EU guidance argue against loss-based streaks (M13) | "Streaks" are implemented as the in-session "5 richtig hintereinander!" and the weekly practice-day goal. Nothing can be lost. |
| **Error-finding tasks.** KMK requires "Rechenfehler finden" (M14, C12); evidence that incorrect examples help at first learning is weak and mixed at this age (L6) | Fehlerdetektiv appears only on Stufe 3 or after "Sicher", never during first learning. |
| **Principle prompts.** Fading plus principle prompts helped (L6, [19]); self-explanation prompts reduced the worked-example benefit in the 2023 meta-analysis (L6, [170]) | The principle prompt is a single one-tap choice after the faded item, never typed and never blocking; it does not affect mastery. Its value is checked in the pilot (7.2). |
| **Number notation.** The project brief writes "1.000.000"; KMK 2022 writes "1 000 000" (C11) | Numbers are displayed with narrow spaces, dots are accepted on input, and the topic is labelled "Zahlen bis 1 000 000". |
| **Persistence vs § 25 TDDDG.** The brief requires progress in localStorage (P1) | Progress is saved only after the child agrees to the "merken" prompt. Before that, it lives in memory only. |
| **Offline (PWA) vs § 25 TDDDG.** Precache counts as storage (P14) | No service worker in v1. A later option "Offline verfügbar machen" would use vite-plugin-pwa 1.3.x with `injectRegister: 'script'`. |
| **Target success rate.** 70–85 % (motivation track) vs 75–90 % (learning track) | A rolling first-try success rate of 75–90 %, treated as a heuristic to tune. |
| **Number of levels.** 3 Stufen vs 3–4 including "Profi" | 3 Stufen, plus optional "Knobelaufgaben" for children at Gemeistert. |

### 6.4 Banned-patterns checklist (part of code review)

- Praise for traits or speed, and superlatives (see M15).
- "Falsch!", "Leider falsch.", "Schon wieder falsch.", "Das war doch einfach!", "Konzentrier dich!", "Alle anderen schaffen das."
- A red X, a buzzer, alarm red for errors, or feedback shown by colour alone.
- Timers or countdowns by default, and "Zu langsam!" or "Schneller!".
- Leaderboards, rankings, percentiles or participation badges.
- Currency, a shop, loot or mystery boxes, random bonus stars, or rewards announced before a task.
- Consecutive-day streaks, and messages about losing anything ("Serie verloren", "0 Tage").
- Push notifications, reminders or e-mail.
- A mascot that guilt-trips on exit, a hidden or delayed exit button, autoplay into the next round, or pop-ups during a round.
- Any third-party request: fonts, CDNs, analytics, embeds or external images.
- Storage writes before opt-in, and cookies.
- Free-text inputs and fields for personal data.
- `type="number"` inputs, and drag-only interactions.

---

## 7. Limitations and open questions

### 7.1 Evidence gaps

- **Spacing and interleaving.** No RCT tests them inside a digital Klasse-4 maths app. In German third graders the spacing benefit had disappeared after 6 weeks [4], so the size of the effect for 9–10-year-olds over a school year is unclear.
- **Mastery criterion.** The best criterion for primary-school children is not established (80 % or 90 %, how many items, how many separate sessions). The "8 of 10 plus a spaced check" rule is a heuristic [22–25].
- **Target success rate.** The 85 % figure comes from machine-learning theory and is untested with children doing arithmetic [26].
- **Bug-specific feedback.** It may not beat generic elaborated feedback by enough to justify the complexity [14]. An A/B test is impossible without analytics, so evaluation would need offline or classroom studies.
- **Rounding misconceptions.** The evidence for German Klasse 4 is thin [41].
- **Mindset wording and process praise** have not been tested in a German Klasse-4 digital tool; the benefit could be close to zero [47][50].
- **Motivation elements.** It is untested whether stars, badges and weekly practice-day counters act as "expected rewards" for 9–10-year-olds in Deci's sense [60]. All the streak evidence comes from adults [77].
- **Blitzrunde.** It is unclear whether an opt-in Blitzrunde raises anxiety for children who are already anxious. The 2024 study used only self-reported anxiety and the primary article was not opened [70].
- **Hint overuse.** Hint overuse ("gaming the system") in primary-school tutors was not researched, so whether hints should cost anything remains open.
- **Gamification samples.** The evidence comes mostly from higher-education and adult samples [46][62][64]. The large primary-school effects in [61] look inflated.
- **Improvement badges.** No study tests improvement-based badges or a "So hast du dich verbessert" view with 9–10-year-olds. The nearest evidence comes from three sources:
  - teachers' reference norms [174][175];
  - one session of recalled comparisons [177];
  - short praise and feedback experiments with non-maths tasks [180][181].

  The argument that these badges are safe (unexpected, informational, tied to evidence from a later day) rests on experiments with tangible rewards in lab tasks, and the interpretation of that research is disputed [186][187]. Badges count as symbolic tangible rewards in this literature. Badges for improvement are tied to performance, which is where the two sides disagree most. They also stay unexpected only until a child has earned the first one.
- **Small expected effects.** A student's own improvement feeds self-concept only weakly (β = .09, grades 6–11) [178]. Feedback moves motivation less than learning (d = 0.33 vs 0.51) [12]. Mastery goals correlate only about r = .13 with performance [189]. The page for adults should not promise gains in self-concept or grades.

### 7.2 Heuristics to tune in a pilot with a few children

- The thresholds: 8 of the last 10 items for "Sicher", 4 of 5 in the spaced check, 5 in a row to suggest moving up, and 2 errors to step down.
- A first-try success rate of 75–90 %.
- An Einmaleins latency of about 3 s for "automatised".
- A 20-minute break suggestion.
- A weekly goal of 3 days.
- The badge criteria.
- Touch targets of 64 px and 48 px, and the 400 ms holdover guard.
- A body text size of 20 px and a line length of 60ch.
- The Leitner intervals (1/3/7/14/28 days).
- Whether the one-tap principle prompt during fading helps or hurts (see 6.3).
- The improvement thresholds (constants in `src/state/growth.ts`):
  - an error must happen in 2 tasks of a skill before it can be overcome, then 5 first-try tasks in a row that offer it; the task that completes the run must be first-try correct and on a later day (a "Tipp" answer never completes it). Einmaleins facts are left to "Gut behalten", which tracks each fact on its own;
  - "Besser geworden" needs a hard start: at most 6 of the first 10 first try, with at least 3 real wrong attempts (not only "Tipp"). The answers on later days are then cut into blocks of 10. Three blocks in a row must each reach max(8, start + 4) first try (start 4 → 8, 5 → 9, 6 → 10), and the last of them must fall on a later day than the first. Only the first 8 blocks count, so a child needs at least 40 answers on 3 days;
  - the progress view shows a gain of 2 or more and keeps the best value;
  - "Gut behalten" needs 3 days between the last miss and the spaced review. A miss counts only when it cost something: before "Sicher", in a review, in mixed practice when it lowered the Leitner box, or for an Einmaleins fact that had already left box 0;
  - at most 12 error types per skill are kept.

  A low start partly rises again by chance (regression to the mean). A simulation with the app's own reducers tested this. Each simulated child practised one skill-Stufe: 2,000 children per profile, rounds of 10 (or 5) on days 1–3 apart, up to 20 sessions (40 in a check of longer practice). The earlier rule compared a sliding window on every answer and accepted "Sicher" after a hard start. On one Stufe it fired for up to 80 % of children whose ability never changed (40 sessions; 55 % of those who always solve about 60 % first try, after 8 sessions). The block rule above fires on one Stufe for at most about 4 % of them, at every ability level, including good and bad days, held-out seeds and longer practice. The badge is earned once, on any Stufe, so a child who practises many Stufen without learning has more chances. Over 10 Stufen with a hard start each (treated as independent), that is about 1–26 % depending on the profile and about 10 % on average, against 42–100 % (about 90 % on average) with the earlier rule. In return, it fires for about 40–50 % of children who really learn: 72 % of those who go from 4 to 9 of 10 within three sessions, and 13 % for a small gain from 6 to 8. It comes later, after a median of 50–70 answers instead of 19–45, and a child who stops after three sessions never gets it. Kinds 3 and 5 and the progress view still show smaller and earlier gains. Answering wrong on purpose at the start still works for a child who then really solves at least 24 of the next 30. This costs at least 40 answers on 3 days, and the rule is never announced. The simulation is a model with assumed profiles, not data from children; `src/state/growth.sim.test.ts` keeps its main result as a test.
- The caps: per round at most 3 effort lines after a second try, at most 2 twin lines (a round has at most 2 twins) and 4 "Das hast du verbessert" notes. Check whether children read them as recognition or as noise. Also check whether children who are almost always right feel overlooked. In one small classroom experiment (one teacher, two history classes, N = 17 and 19), both above- and below-average pupils under an individual norm at first felt less encouraged to take part. After about 2 weeks this passed. By the end, all groups felt more encouraged than the above-average pupils under a social norm [175].
- Whether "Vieles behalten" should require first-try success for the same task type in spaced reviews on two different days, instead of or in addition to three different topics. This would move closer to successive relearning (practice to criterion, repeated over several spaced sessions) [196][197]. In one classroom study, the benefit of interleaving was almost twice as large on a test 30 days later as on a test one day later [195] (see also [193]).
- Whether any child answers wrong on purpose to earn improvement badges. (The count-based "Dranbleiber" badge for 10 knifflige Aufgaben solved with a hint or on the second try invited this, so it was removed, 7.6.) In [188], incentives predicted the quantity of performance better than intrinsic motivation did, while intrinsic motivation predicted its quality better (meta-analysis across school, work and sport; abstract only).

### 7.3 Curriculum questions

- **Target Bundesland.** It is not set. The proposal is a general KMK default with Abziehen mit Entbündeln as the subtraction default, and Bayern and NRW options for subtraction method, Tonne, Datenmengen, × 3-digit, divisor 10 and Binärzahlen.
- **Division and mastery.** Should written division count toward topic mastery and badges, or stay an optional sub-topic? The Niedersachsen Kerncurriculum and ministry text were not read directly, only reporting on them [94][95].
- **Other Länder.** Only Bayern and NRW were checked. Other curricula (Baden-Württemberg, Niedersachsen, Berlin-Brandenburg, Sachsen) may include cm², dm, other remainder notations or another subtraction method.
- **Clock times.** Should they be written "14:30 Uhr" or "14.30 Uhr"? This was not checked against DIN 5008 or school books.
- **Four-digit numbers.** KMK writes 2500 ungrouped, while DIN 5008 examples ("2 000 Stück") and a current workbook ("3 845") group them [104][108]. This needs confirming with teachers.
- **Remainder notation.** The "R" notation is common but criticised [98]. Should Stufe 3 offer "23 = 4 · 5 + 3"?
- **SuVe accuracy.** Final SuVe results on calculation accuracy were still pending in 2024 [101][102].
- **IQB examples.** The IQB illustrative Lernaufgaben for KMK 2022 (the link in the PDF returns 404; the collection is now at [169]) could provide AB I–III items for calibration. They have not yet been reviewed item by item.
- **500-€ note.** Should it appear in money tasks? It has not been issued since 2019 but is still legal tender. The current plan uses notes up to 200 €.

### 7.4 Legal and technical questions

- **Opt-in localStorage.** Will German supervisory authorities accept persistent localStorage progress after "Ja, merken" as an explicitly requested function under § 25(2) Nr. 2 TDDDG? DSK guidance assumes session-only use for services without login [110], and no court has ruled. A short legal review is advisable.
- **Service-worker caches** may count as storage [112][158]. This is why v1 has no service worker.
- **DPF appeal.** If the CJEU appeal C-703/25 P succeeds, transfers would rest on SCCs alone [122]. An EU-only static host should be kept ready as a fallback.
- **Controller or processor.** The exact controller/processor split for Hosting IP logs needs careful wording in the Datenschutzerklärung [118].
- **Operator identity.** Who operates the site (a private person, an association or a school) determines the Impressum content and whether BITV 2.0 applies, as it does for public bodies [124][125].
- **Youth-protection law.** German youth-protection law (JuSchG § 24a) was not researched. UN CRC General Comment No. 25 could not be retrieved and is not cited.
- **Target devices.** The iPad vs Chromebook split in German Grundschulen is unknown [163], so the device matrix should be confirmed with schools.
- **Screen readers and TTS.** How German NVDA and VoiceOver voices pronounce "·" and ":", and whether ChromeOS and iPadOS voices run locally, must be tested on real devices before "Vorlesen" is enabled [154][167].

### 7.5 Sources not opened directly

The following were used only via abstracts, summaries or secondary reports:

- Barbieri et al. 2023 [16], Woodward 2006 [35], Gerster 1982 [38], Zuber et al. 2009 [40] and Verschaffel et al. 1994 [43];
- Macnamara & Burgoyne 2023 [56], Hanus & Fox 2015 [64] and Krinzinger et al. 2009 [69];
- the exact r for Barroso et al. [67], Maki et al. 2024 (via [70]) and Steuer et al. 2013 [79];
- the MDPI page for Day et al. 2024 [150];
- the moderator results of the published worked-examples meta-analysis, known only via a secondary summary [170], and Durkin's 2009 thesis [171].
- For M16:
  - Zentall & Morris [184], Cameron et al. [187] and the Review of Educational Research exchange between Cameron and Deci, Ryan & Koestner, Cerasoli et al. [188], Rohrer et al. 2015 [195] and Rawson & Dunlosky [196] (abstracts only);
  - the primary studies summarised in [175] (Rheinberg 1979, Trudewind & Kohne 1982, Rheinberg & Krug 2005);
  - the journal version of [185], whose figures come from the conference paper.

They are marked in section 8.

### 7.6 Decisions by the operator (2026-10-19)

- **Badges.** 25 in all, improvement badges included (M7). The count-based "Dranbleiber" badge was removed: it rewarded
  effort alone and could be earned by answering wrong on purpose. Small improvements (a second try, a twin task) keep only
  their calm lines in the round and in the summary, including the self-correction line that can appear in most rounds. Its
  counter (`totals.afterHint`) is no longer stored; older saved progress and backups load without it.
- **Badge names.** "Stolperstein überwunden", "Besser geworden", "Gut behalten" and "Vieles behalten" stay.
- **"Besser geworden" is stricter** (7.2): three good blocks of 10 in a row on later days after a hard start, chosen
  by simulation so that chance alone rarely earns it on any one Stufe (at most about 4 %; more for a child who practises
  many Stufen). Reaching "Sicher" after a hard start is no longer enough on
  its own, but the progress view still says so.
- **One device per child.** Mathe 4 does not tell children apart: siblings who share a browser share one progress record,
  improvement tracking included. The page for adults says so. Later: local profiles in the browser's storage, then an
  export per profile. Note for that step: P2 plans profiles with picture avatars and without names, so a name field would
  need P2 checked again.
- **Stored data approved.** Storing error types per skill and the days of misses (M16, P1) for the improvement badges
  is approved. The privacy page describes these data.
- **Rollbacks.** The site is public but has no real users yet, so rolling back to an older version is acceptable as it
  is. A released older version (main saves version 2) never overwrites progress saved with a higher version number; it
  stops saving. Version 3 has not been released yet, so this branch changed its shape (`totals.afterHint` and the
  growth field `laterOk` dropped) without a new number; an earlier build of this branch would read such progress as
  damaged. From the first release on, every change of the stored shape bumps the version. Check this again before real
  users arrive.
- **Accepted as they are.** Skills without error-library tags (for example geometrie.spiegeln, geometrie.koerper,
  sachaufgaben.modellieren) cannot earn "Stolperstein überwunden", and the Einmaleins trainer is left to "Gut behalten".
  Misses that cost nothing do not start a "Gut behalten". Relearning after a long break gets no reward of its own.
  Without consent, the larger improvements rarely show. "Beenden" in the middle of a round drops that round's summary
  lines (badges earned are kept).

---

## 8. References

All URLs were accessed on 2026-10-18, except those in subsection F (2026-10-19). "(not verified online)" means the researchers could not open the full source or confirm the cited content. The figures come from the secondary source named in the text or, where the entry says "abstract only", from the abstract.

### A. Learning science and maths didactics

- [1] Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review. *Psychological Bulletin, 147*(4), 399–435. https://gwern.net/docs/spacedrepetition/2021-yang.pdf
- [2] Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science, 19*(11), 1095–1102. https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf
- [3] Latimier, A., Peyre, H., & Ramus, F. (2021). A meta-analytic review of the benefit of spacing out retrieval practice episodes on retention. *Educational Psychology Review, 33*, 959–987 (online 2020; https://doi.org/10.1007/s10648-020-09572-8). Figures checked in the preprint, PsyArXiv kzy7u (file at https://osf.io/kzy7u/download); the published article was not opened. https://osf.io/preprints/psyarxiv/kzy7u/
- [4] Barzagar Nazari, K., & Ebersbach, M. (2019). Distributing mathematical practice of third and seventh graders: Applicability of the spacing effect in the classroom. *Applied Cognitive Psychology, 33*(2), 288–298. https://doi.org/10.1002/acp.3485
- [5] Barzagar Nazari, K., & Ebersbach, M. (2018). Distributed practice: Rarely realized in self-regulated mathematical learning. *Frontiers in Psychology, 9*, 2170. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.02170/full
- [6] Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. *Journal of Educational Psychology, 112*(1), 40–52. https://ies.ed.gov/ncee/wwc/Study/88770
- [7] Taylor, K., & Rohrer, D. (2010). The effect of interleaving practice. *Applied Cognitive Psychology, 24*(6), 837–848. https://digitalcommons.usf.edu/psy_facpub/1760/
- [8] Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin, 145*(11), 1029–1052. https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf
- [9] Nemeth, L., Werker, K., Arend, J., Vogel, S., & Lipowsky, F. (2019). Interleaved learning in elementary school mathematics: Effects on the flexible and adaptive use of subtraction strategies. *Frontiers in Psychology, 10*, 86. https://www.frontiersin.org/articles/10.3389/fpsyg.2019.00086/full
- [10] Van der Kleij, F. M., Feskens, R. C. W., & Eggen, T. J. H. M. (2015). Effects of feedback in a computer-based learning environment on students' learning outcomes: A meta-analysis. *Review of Educational Research, 85*(4), 475–511. https://people.acer.org/en/publications/effects-of-feedback-in-a-computer-based-learning-environment-on-s/ (abstract also via https://kcs.ecnu.edu.cn/95/a8/c48324a693672/page.htm)
- [11] Mertens, U., Finn, B., & Lindner, M. A. (2022). Effects of computer-based feedback on lower- and higher-order learning outcomes: A network meta-analysis. *Journal of Educational Psychology, 114*(8), 1743–1772. https://www.leibniz-ipn.de/en/research/publications/effects-of-computer-based-feedback-on-lower-and-higher-order-learning-outcomes
- [12] Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis of educational feedback research. *Frontiers in Psychology, 10*, 3087. https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/full (also https://pmc.ncbi.nlm.nih.gov/articles/PMC6987456)
- [13] Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research, 77*(1), 81–112 (includes summaries of Kluger & DeNisi, 1996, and Deci, Koestner & Ryan, 1999). https://www.uky.edu/~gmswan3/575/Hattie_Timperly_2007.pdf
- [14] Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research, 78*(1), 153–189. https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf
- [15] Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance: A historical review, a meta-analysis, and a preliminary feedback intervention theory. *Psychological Bulletin, 119*(2), 254–284. https://cris.huji.ac.il/en/publications/the-effects-of-feedback-interventions-on-performance-a-historical/
- [16] Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023). A meta-analysis of the worked examples effect on mathematics performance. *Educational Psychology Review, 35*(1), 11. https://doi.org/10.1007/s10648-023-09745-1 **(not verified online)**
- [17] Clerjuste, S., Chawla, K., Barbieri, C. A., & Miller-Cotto, D. (2022). A meta-analysis of the worked examples effect on mathematics performance [Poster]. University of Delaware (preliminary: 40 articles, 49 studies, 185 effect sizes; no significant moderators). https://www.cehd.udel.edu/wp-content/uploads/2022/02/Worked-Examples-Meta-Poster_022722_SC.pdf
- [18] Renkl, A., & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving in cognitive skill acquisition: A cognitive load perspective. *Educational Psychologist, 38*(1), 15–22. https://asu.elsevierpure.com/en/publications/structuring-the-transition-from-example-study-to-problem-solving--2
- [19] Atkinson, R. K., Renkl, A., & Merrill, M. M. (2003). Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. *Journal of Educational Psychology, 95*(4), 774–783. https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-/
- [20] Durkin, K. (2012). *The effectiveness of incorrect examples and comparison when learning about decimal magnitude* (Doctoral dissertation, Vanderbilt University). https://ir.vanderbilt.edu/handle/1803/11934
- [21] Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. *Educational Psychology Review, 19*, 509–539. https://www.uky.edu/~gmswan3/EDC608/Kalyuga2007_Article_ExpertiseReversalEffectAndItsI.pdf
- [22] Bloom, B. S. (1984). The 2 sigma problem: The search for methods of group instruction as effective as one-to-one tutoring. *Educational Researcher, 13*(6), 4–16. https://Www.Gwern.net/doc/psychology/1984-bloom.pdf
- [23] Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). Effectiveness of mastery learning programs: A meta-analysis. *Review of Educational Research, 60*(2), 265–299. https://doi.org/10.3102/00346543060002265
- [24] Slavin, R. E. (1987). Mastery learning reconsidered. *Review of Educational Research, 57*(2), 175–213. https://Www.Gwern.net/doc/psychology/1987-slavin.pdf
- [25] Guskey, T. R. (2010). Lessons of mastery learning. *Educational Leadership, 68*(2), 52–57. https://www.ascd.org/el/articles/lessons-of-mastery-learning
- [26] Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. *Nature Communications, 10*, 4646. https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579
- [27] Hillmayr, D., Ziernwald, L., Reinhold, F., Hofer, S. I., & Reiss, K. M. (2020). The potential of digital tools to enhance mathematics and science learning in secondary schools: A context-specific meta-analysis. *Computers & Education, 153*, 103897. https://epub.ub.uni-muenchen.de/84380/1/1-s2.0-S0360131520300968-main.pdf
- [28] Morrison, J. R., Borokhovski, E., Bernard, R. M., & Slavin, R. E. (2024). A quantitative synthesis of outcomes of educational technology approaches in K-12 mathematics. Johns Hopkins CRRE (IES award R305A210186 summary). https://ies.ed.gov/use-work/awards/quantitative-synthesis-outcomes-educational-technology-approaches-k-12-mathematics
- [29] Cheung, A. C. K., & Slavin, R. E. (2013). The effectiveness of educational technology applications for enhancing mathematics achievement in K-12 classrooms: A meta-analysis. *Educational Research Review, 9*, 88–113 (figures via TUM Clearinghouse Kurzreview 7). https://www.clearinghouse.edu.tum.de/wp-content/uploads/2018/12/CHU_KR-7_Cheung_2013_Digitale-Anwendungen_Mathe.pdf
- [30] Best Evidence Encyclopedia (2021). Summary of Cheung & Slavin (2013): Mathematics – effectiveness of technology. https://bestevidence.org/2021/02/07/mathematics-effectiveness-of-technology/
- [31] Benavides-Varela, S., Zandonella Callegher, C., Fagiolini, B., Leo, I., Altoè, G., & Lucangeli, D. (2020). Effectiveness of digital-based interventions for children with mathematical learning difficulties: A meta-analysis. *Computers & Education, 157*, 103953. https://docs.opendeved.net/lib/LM4QWEVI
- [32] Gaidoschik, M. (ca. 2010). Zur Entwicklung von Rechenstrategien im ersten Schuljahr. PIKAS-Informationstext (summary of dissertation study, N = 139). https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_3_-_Umgang_mit_Rechenschwierigkeiten/IM/Informationstexte/Beitrag_Gaidoschik.pdf
- [33] PIKAS (2010). 1·1 richtig üben – Basisinfos. TU Dortmund / DZLM. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_3_-_Umgang_mit_Rechenschwierigkeiten/UM/1x1_richtig_ueben/Basisinfos/basisinfos_1x1_ueben.pdf
- [34] Gaidoschik, M., Deweis, K. M., & Guggenbichler, S. (2018). How lower-achieving children cope with derived facts-based teaching of basic multiplication: Findings from a design research study. In *Proceedings of CERME10* (pp. 346–353). https://bia.unibz.it/esploro/outputs/conferenceProceeding/How-lower-achieving-children-cope-with-derived/991005773303001241
- [35] Woodward, J. (2006). Developing automaticity in multiplication facts: Integrating strategy instruction with timed practice drills. *Learning Disability Quarterly, 29*, 269–289. https://journals.sagepub.com/doi/10.2307/30035554 **(not verified online)**
- [36] Caviola, S., Carey, E., Mammarella, I. C., & Szucs, D. (2017). Stress, time pressure, strategy selection and math anxiety in mathematics: A review of the literature. *Frontiers in Psychology, 8*, 1488. https://pmc.ncbi.nlm.nih.gov/articles/PMC5585192
- [37] Lüken, M., Jensen, S., & Gasteiger, H. (2025). Schüler*innenfehler bei der schriftlichen Subtraktion – zwei Verfahren im Vergleich. In *Beiträge zum Mathematikunterricht 2025* (pp. 55–58). WTM. https://eldorado.tu-dortmund.de/bitstreams/c2c376bd-00fc-483c-a37a-66eb9b4d61f5/download
- [38] Gerster, H.-D. (1982). *Schülerfehler bei schriftlichen Rechenverfahren – Diagnose und Therapie*. Herder (cited via [37]). https://eldorado.tu-dortmund.de/bitstreams/c2c376bd-00fc-483c-a37a-66eb9b4d61f5/download **(not verified online)**
- [39] Bahnmueller, J., Moeller, K., Mann, A., & Nuerk, H.-C. (2015). On the limits of language influences on numerical cognition. *Frontiers in Psychology, 6*, 1216 (reports Zuber et al., 2009, and Moeller et al., 2011). https://pmc.ncbi.nlm.nih.gov/articles/PMC4532912
- [40] Zuber, J., Pixner, S., Moeller, K., & Nuerk, H.-C. (2009). On the language specificity of basic number processing: Transcoding in a language with inversion and its relation to working memory capacity. *Journal of Experimental Child Psychology, 102*(1), 60–77. https://doi.org/10.1016/j.jecp.2008.04.003 **(not verified online)**
- [41] DZLM (2022). Stellenwertverständnis – Fortbildungsmaterial Primarstufe (includes TIMSS item solution rates). https://maco.dzlm.de/sites/maco/files/material-lul/dzlm_maco_prim_stellenwert_220712.pdf
- [42] De Corte, E., Verschaffel, L., & Greer, B. (2000/2002). Connecting mathematics problem solving to the real world (position paper; summarises Verschaffel, De Corte & Lasure, 1994). https://sites.unipa.it/grim/Jdecorte.PDF
- [43] Verschaffel, L., De Corte, E., & Lasure, S. (1994). Realistic considerations in mathematical modelling of school arithmetic word problems. *Learning and Instruction, 4*(4), 273–294. https://doi.org/10.1016/0959-4752(94)90002-7 **(not verified online)**
- [44] Novotná, J. Review of Verschaffel, L., Greer, B., & De Corte, E. (2000). *Making Sense of Word Problems*. Lisse: Swets & Zeitlinger. https://people.fjfi.cvut.cz/novotant/jarmila.novotna/Versch-sp1_5.pdf
- [45] Metcalfe, J. (2017). Learning from errors. *Annual Review of Psychology, 68*, 465–489. https://files.eric.ed.gov/fulltext/ED574569.pdf

### B. Motivation, mindset, gamification and fair design

- [46] Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056 (PDF: https://opus.bibliothek.uni-augsburg.de/opus4/files/109056/109056.pdf)
- [47] Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mind-sets important to academic achievement? Two meta-analyses. *Psychological Science, 29*(4), 549–571. https://englelab.gatech.edu/articles/2018/Sisk,%20Burgoyne%20et%20al.%20(2018)%20-%20Mindset%20and%20Academic%20Achievement.pdf
- [48] Mueller, C. M., & Dweck, C. S. (1998). Praise for intelligence can undermine children's motivation and performance. *Journal of Personality and Social Psychology, 75*(1), 33–52. https://www.columbia.edu/cu/psychology/courses/3615/Readings/Mueller_Dweck.pdf
- [49] Cimpian, A., Arce, H. C., Markman, E. M., & Dweck, C. S. (2007). Subtle linguistic cues affect children's motivation. *Psychological Science, 18*, 314–316 (as summarised by the BPS Research Digest). https://bps.org.uk/research-digest/how-praise-children
- [50] Li, Y., & Bates, T. C. (2019). You can't change your basic ability, but you work at things, and that's how we get hard things done: Testing the role of growth mindset on response to setbacks, educational attainment, and cognitive ability. *Journal of Experimental Psychology: General, 148*(9), 1640–1655. https://westminsterresearch.westminster.ac.uk/item/v62v1/you-can-t-change-your-basic-ability-but-you-work-at-things-and-that-s-how-we-get-hard-things-done-testing-the-role-of-growth-mindset-on-response-to-setbacks-educational-attainment-and-cognitive
- [51] Brummelman, E., Thomaes, S., Orobio de Castro, B., Overbeek, G., & Bushman, B. J. (2014). "That's not just beautiful—that's incredibly beautiful!": The adverse impact of inflated praise on children with low self-esteem. *Psychological Science* (as summarised in the Ohio State University news release). https://news.osu.edu/when-being-called-incredibly-good-is-bad-for-children/
- [52] Gunderson, E. A., Gripshover, S. J., Romero, C., Dweck, C. S., Goldin-Meadow, S., & Levine, S. C. (2013). Parent praise to 1- to 3-year-olds predicts children's motivational frameworks 5 years later. *Child Development, 84*(5) (SRCD press release). https://www.srcd.org/print/pdf/node/590
- [53] Gunderson, E. A., Sorhagen, N. S., Gripshover, S. J., Dweck, C. S., Goldin-Meadow, S., & Levine, S. C. (2018). Parent praise to toddlers predicts fourth grade academic achievement via children's incremental mindsets. *Developmental Psychology, 54*(3), 397–409. https://pmc.ncbi.nlm.nih.gov/articles/PMC5826820
- [54] Yeager, D. S., et al. (2019). A national experiment reveals where a growth mindset improves achievement. *Nature, 573*, 364–369. https://pmc.ncbi.nlm.nih.gov/articles/PMC6786290/
- [55] Tipton, E., Bryan, C., Murray, J., McDaniel, M., Schneider, B., & Yeager, D. S. (2023). Why meta-analyses of growth mindset and other interventions should follow best practices for examining heterogeneity. *Psychological Bulletin, 149*(3–4), 229–241 (reports the Macnamara & Burgoyne and Burnette et al. estimates). https://pmc.ncbi.nlm.nih.gov/articles/PMC10495100/
- [56] Macnamara, B. N., & Burgoyne, A. P. (2023). Do growth mindset interventions impact students' academic achievement? A systematic review and meta-analysis with recommendations for best practices. *Psychological Bulletin, 149*(3–4), 133–173. https://doi.org/10.1037/bul0000352 **(not verified online)**
- [57] Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist, 55*(1), 68–78. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
- [58] Howard, J. L., Bureau, J., Guay, F., Chong, J. X. Y., & Ryan, R. M. (2021). Student motivation and associated outcomes: A meta-analysis from self-determination theory. *Perspectives on Psychological Science, 16*(6), 1300–1323. https://www.psychologicalscience.org/journals/perspectives/1745691620966789/
- [59] Patall, E. A., Cooper, H., & Robinson, J. C. (2008). The effects of choice on intrinsic motivation and related outcomes: A meta-analysis of research findings. *Psychological Bulletin, 134*(2), 270–300. https://selfdeterminationtheory.org/wp-content/uploads/2019/10/2008_PatallCooperRobinson_PsychBulletin.pdf
- [60] Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6), 627–668. https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
- [61] Li, M., Ma, S., & Shi, Y. (2023). Examining the effectiveness of gamification as a tool promoting teaching and learning in educational settings: A meta-analysis. *Frontiers in Psychology, 14*, 1253549. https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/
- [62] Sailer, M., Hense, J. U., Mayr, S. K., & Mandl, H. (2017). How gamification motivates: An experimental study of the effects of specific game design elements on psychological need satisfaction. *Computers in Human Behavior, 69*, 371–380. https://opus.bibliothek.uni-augsburg.de/opus4/files/109059/109059.pdf
- [63] Abramovich, S., Schunn, C., & Higashi, R. M. (2013). Are badges useful in education?: It depends upon the type of badge and expertise of learner. *Educational Technology Research and Development, 61*(2), 217–232. https://www.cmu.edu/roboticsacademy/PDFs/Research/Abramovich-Schunn-Higashi_Badges.pdf
- [64] Hanus, M. D., & Fox, J. (2015). Assessing the effects of gamification in the classroom: A longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance. *Computers & Education, 80*, 152–161. https://doi.org/10.1016/j.compedu.2014.08.019 **(not verified online)**
- [65] UCLA Center for Mental Health in Schools. Information Resource: About gamified learning and intrinsic motivation for classroom learning (secondary summary of [64]). https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf
- [66] Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2013). Math anxiety, working memory, and math achievement in early elementary school. *Journal of Cognition and Development, 14*(2), 187–202 (University of Chicago news release). https://news.uchicago.edu/story/math-anxiety-causes-trouble-students-early-first-grade
- [67] Barroso, C., Ganley, C. M., McGraw, A. L., Geer, E. A., Hart, S. A., & Daucourt, M. C. (2021). A meta-analysis of the relation between math anxiety and math achievement. *Psychological Bulletin, 147*(2), 134–168 (summary by Columbia EPIC; the exact r = −.28 comes from abstract snippets and was not verified). https://epic.tc.columbia.edu/research/academic-alert/blog-posts/the-relation-between-math-anxiety-and-math-achievement
- [68] Brunner, M., Preckel, F., Götz, T., Lüdtke, O., & Keller, L. (2026). High math anxiety is associated with lower math achievement across 90 countries: An individual participant data meta-analysis of representative student and adult samples. *Psychological Bulletin, 152*(2), 207–253. https://doi.org/10.1037/bul0000514 https://www.leibniz-ipn.de/en/research/publications/high-math-anxiety-is-associated-with-lower-math-achievement-across-90-countries
- [69] Krinzinger, H., Kaufmann, L., & Willmes, K. (2009). Math anxiety and math ability in early primary school years. *Journal of Psychoeducational Assessment, 27*(3), 206–225. https://journals.sagepub.com/doi/abs/10.1177/0734282908330583 **(not verified online)**
- [70] Education Week (2024, August). Do timed tasks really worsen math anxiety? (report on Maki, Zaslofsky, Codding & Woods, 2024, *Journal of School Psychology*; the primary article was not opened). https://www.edweek.org/teaching-learning/do-timed-tasks-really-worsen-math-anxiety/2024/08
- [71] Radesky, J., Hiniker, A., McLaren, C., et al. (2022). Prevalence and characteristics of manipulative design in mobile applications used by children. *JAMA Network Open, 5*(6), e2217641. https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/
- [72] UK Information Commissioner's Office. Age appropriate design: A code of practice for online services. Standard 13: Nudge techniques. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/
- [73] UK Information Commissioner's Office. Age appropriate design code, Standard 5: Detrimental use of data. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/5-detrimental-use-of-data/
- [74] European Commission (2025). Communication from the Commission: Guidelines on measures to ensure a high level of privacy, safety and security for minors online, pursuant to Article 28(4) of Regulation (EU) 2022/2065, C(2025) 6826 final, Brussels, 7.10.2025 (first published 14 July 2025, see [75]). https://ec.europa.eu/newsroom/dae/redirection/document/118226
- [75] European Commission (2025, 14 July). Commission publishes guidelines on the protection of minors (Art. 28 DSA). https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors
- [76] 5Rights Foundation (2023). Disrupted Childhood: The cost of persuasive design (2023 update). https://5rightsfoundation.com/in-action/disrupted-childhood-the-cost-of-persuasive-design-2023.html
- [77] Silverman, J., & Barasch, A. (2023). On or off track: How (broken) streaks affect consumer decisions. *Journal of Consumer Research, 49*(6), 1095–1117. https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb/full
- [78] Dresel, M., Daumiller, M., Spear, J., Janke, S., Dickhäuser, O., & Steuer, G. (2025). Learning from errors in mathematics classrooms: Development over 2 years in dependence of perceived error climate. *British Journal of Educational Psychology, 95*(1), 180–196. https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/113769
- [79] Steuer, G., Rosentritt-Brunn, G., & Dresel, M. (2013). Dealing with errors in mathematics classrooms: Structure and relevance of perceived error climate. *Contemporary Educational Psychology, 38*(3), 196–210 (existence confirmed; content not read). https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/40734 **(not verified online)**
- [80] Hascher, T., & Hagenauer, G. Lernen aus Fehlern (book chapter; qualitative essay study, N = 72, grades 5 and 11; cites Oser & Spychiger, 2005, *Lernen ist schmerzhaft*, Beltz). https://fhnw.ch/plattformen/schul-in/wp-content/uploads/sites/344/2023/10/Hascher_Hagenauer_Lernen_aus_Fehlern.pdf
- [81] PIKAS (TU Dortmund / DZLM). Zehn didaktische Prinzipien von PIKAS: Prinzip der ermutigenden Leistungsbeurteilung. https://pikas.dzlm.de/pikasfiles/uploads/upload/Projektinfos/PIKAS-Unterrichtsprinzipien.pdf
- [82] ISB Bayern. LehrplanPLUS Grundschule, Fachprofil Mathematik. https://www.lehrplanplus.bayern.de/fachprofil/grundschule/mathematik

### C. Curriculum, standards and notation

- [83] Kultusministerkonferenz (2022). *Bildungsstandards für das Fach Mathematik Primarbereich* (Beschluss vom 15.10.2004 i. d. F. vom 23.06.2022). KMK, Berlin/Bonn. https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-Primarbereich-Mathe.pdf (also reachable at https://www.kmk.org/fileadmin/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-Primarbereich-Mathe.pdf)
- [84] Kultusministerkonferenz (2004). *Bildungsstandards im Fach Mathematik für den Primarbereich*. Beschluss vom 15.10.2004. Luchterhand/Wolters Kluwer. https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2004/2004_10_15-Bildungsstandards-Mathe-Primar.pdf
- [85] ISB Bayern. LehrplanPLUS Grundschule, Fachlehrplan Mathematik 3/4 (online; accessed 2026-10-18). https://www.lehrplanplus.bayern.de/fachlehrplan/grundschule/4/mathematik
- [86] ISB Bayern. LehrplanPLUS Grundschule, Fachlehrplan Mathematik 1/2. https://www.lehrplanplus.bayern.de/fachlehrplan/grundschule/2/mathematik
- [87] Bayerisches Staatsministerium für Bildung und Kultus, Wissenschaft und Kunst (2014). LehrplanPLUS Grundschule – Lehrplan für die bayerische Grundschule (Druckfassung; Verfügung vom 18.05.2014). Copy hosted on a Universität Hamburg server, not the ministry's own site. https://ltdata1.informatik.uni-hamburg.de/HCDS/EDU/pdfs/AL_0201_BY_GrS.pdf
- [88] Ministerium für Schule und Bildung NRW (2021). Lehrplan Mathematik für die Primarstufe in Nordrhein-Westfalen. https://lehrplannavigator.nrw.de/system/files/media/document/file/ps_lp_m_einzeldatei_2021_08_02.pdf
- [89] Ministerium für Schule und Bildung NRW (2021). Lehrpläne für die Primarstufe in Nordrhein-Westfalen (Sammelband, Heft 2012). https://lehrplannavigator.nrw.de/system/files/media/document/file/ps_lp_sammelband_2021_08_02.pdf
- [90] BASS NRW. RdErl. d. MSB v. 01.07.2021 – Lehrpläne für die Primarstufe. https://bass.schule.nrw/19449.htm
- [91] Stanat, P., et al. / IQB (2022). IQB-Bildungstrend 2021 – Pressemappe. https://www.iqb.hu-berlin.de/media/documents/IQB_Bildungstrend2021_Pressemappe.pdf
- [92] Kultusministerkonferenz (2022). IQB-Bildungstrends (article). https://www.kmk.org/aktuelles-1/artikelansicht/iqb-bildungstrends.html
- [93] IQB. VERA-3 Mathematik: Daten, Häufigkeit und Wahrscheinlichkeit – Fachdidaktisches Material. https://www.iqb.hu-berlin.de/media/exercise_group_files/VERA-3_Mathematik/Daten_Haeufigkeit_Wahrscheinlichkeit_FachdidaktischesMaterial.pdf
- [94] DZLM / Prediger, S. (2026, January). Verständiges Rechnen statt »Ziffernzauber« beim Dividieren in der Grundschule (Q&A). https://dzlm.de/sites/dzlmtheme/files/260122_q_a_dzlm_schriftl_dividieren_primar.pdf
- [95] news4teachers (2025, 18 December). Bildungsreform: Warum Grundschüler künftig kein schriftliches Dividieren mehr lernen. https://www.news4teachers.de/2025/12/bildungsreform-warum-grundschueler-kuenftig-kein-schriftliches-dividieren-mehr-lernen/
- [96] Volksstimme (2026, 7 September). Grundschule Sachsen-Anhalt: neuer Lehrplan, schriftliche Division wieder enthalten. https://www.volksstimme.de/leben/familie/grundschule-sachsen-anhalt-lehrplan-2026-schriftliche-division-grundschule-digitalisierung-4315287
- [97] levrai.de. Arbeitsblatt Division mit Rest Klasse 3 (example of the "R" notation). https://online-lernen.levrai.de/grundschule/m/klasse_3/division_rest/05_arbeitsblatt_division_mit_rest_klasse_3.pdf
- [98] Wikipedia (de). Division mit Rest (section on the school notation "9 : 4 = 2 Rest 1" and why it violates the transitivity of "="). https://de.wikipedia.org/wiki/Division_mit_Rest (replaces an unverified dewiki.de mirror)
- [99] Motzer, R. (2011). Schriftliche Subtraktion – Abziehen oder Ergänzen? In *Beiträge zum Mathematikunterricht 2011* (pp. 579–582). WTM. https://opus.bibliothek.uni-augsburg.de/opus4/files/64594/142.pdf
- [100] PIKAS (2011). Basisinformationen zur Unterrichtsplanung Teil 2 (Addition/Subtraktion). TU Dortmund. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_5_-_Individuelles_und_gemeinsames_Lernen/UM/Ich-Du-Wir/Planungen/Basisinfos_Planung_Teil2.pdf
- [101] Gasteiger, H., Jensen, S., Lüken, M., Peter-Koop, A., Grommé, E., & Nonte, S. (2024). "Abziehen mit Entbündeln" und "Ergänzen mit Erweitern": Eine vergleichende Studie. In *Beiträge zum Mathematikunterricht 2024* (pp. 59–62). WTM. https://eldorado.tu-dortmund.de/bitstreams/c8675191-fce5-4abc-a1b6-d9ed6555c83f/download
- [102] Jensen, S., Lüken, M., Gasteiger, H., & Peter-Koop, A. (2024). Schriftliche Subtraktionsalgorithmen verstehen: Ergebnisse einer vergleichenden Studie. In *Beiträge zum Mathematikunterricht 2024* (pp. 937–940). https://eldorado.tu-dortmund.de/bitstreams/a11cbf4b-8ce1-4eeb-a8d1-9e2231fb1f76/download
- [103] Universität Bielefeld, IDM AG 3. Projekt Erwerb arithmetischer Kompetenz (SuVe) – Projektseite. https://www.uni-bielefeld.de/fakultaeten/mathematik/idm/arbeitsgruppe/ag-3/forschung/erwerb_arith_kompetenz/
- [104] PONS / Klett Lerntraining (2021). *Sicher ins Gymnasium Mathematik 4. Klasse* – Schriftliche Subtraktion (spoken form of the Bavarian Abziehverfahren; number notation pp. 18–19). https://static.klett-lerntraining.de/grundschule/docs/925873_Erklaerung_bayerisches_Abziehverfahren.pdf
- [105] Wikipedia (de). Würfelnetz (11 nets). https://de.wikipedia.org/wiki/Würfelnetz
- [106] Weisstein, E. W. Hexomino. *MathWorld* (35 free hexominoes). https://mathworld.wolfram.com/Hexomino.html
- [107] BIPM / CGPM (2003). Resolution 10 of the 22nd CGPM: Symbol for the decimal marker. https://www.bipm.org/en/committees/cg/cgpm/22-2003/resolution-10
- [108] Georg-August-Universität Göttingen. Schreibregeln nach DIN 5008 (Zahlen). https://uni-goettingen.de/de/6103.html

### D. Privacy, security, accessibility and child UX

- [109] § 25 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz). https://www.gesetze-im-internet.de/ttdsg/__25.html
- [110] Datenschutzkonferenz (2024). Orientierungshilfe der Aufsichtsbehörden für Anbieter:innen von digitalen Diensten (OH Digitale Dienste), Version 1.2, November 2024, Rn. 21, 26, 66–81. https://datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf
- [111] Article 29 Working Party (2012). Opinion 04/2012 on Cookie Consent Exemption (WP 194), § 3.6. https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf
- [112] European Data Protection Board (2024). Guidelines 2/2023 on Technical Scope of Art. 5(3) of ePrivacy Directive, Version 2.0 (adopted 7 October 2024), paras 36–37, 44. https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en
- [113] Art. 8 DSGVO. https://dsgvo-gesetz.de/art-8-dsgvo/
- [114] Art. 12 DSGVO. https://dsgvo-gesetz.de/art-12-dsgvo/
- [115] Erwägungsgrund 38 DSGVO. https://dsgvo-gesetz.de/erwaegungsgruende/nr-38/
- [116] Wissenschaftliche Dienste des Deutschen Bundestages (2023). Regeln für den Schutz der personenbezogenen Daten von Kindern im Internet (WD 10 – 019/23). https://www.bundestag.de/resource/blob/959324/WD-10-019-23-pdf.pdf
- [117] LG München I, Urteil vom 20.01.2022 – 3 O 17493/20 (BeckRS 2022, 612). https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612
- [118] Google / Firebase. Privacy and Security in Firebase. https://firebase.google.com/support/privacy
- [119] Google / Firebase. Firebase subprocessors. https://firebase.google.com/terms/subprocessors
- [120] Google / Firebase. Firebase Data Processing and Security Terms. https://firebase.google.com/terms/data-processing-terms
- [121] Google / Firebase. View, analyze, and export Hosting web request logs. https://firebase.google.com/docs/hosting/web-request-logs-and-metrics
- [122] Official Journal of the EU, C/2025/6610. Appeal brought on 31 October 2025 by Philippe Latombe against the judgment of the General Court in Case T-553/23 (Case C-703/25 P). https://eur-lex.europa.eu/eli/C/2025/6610/oj/eng
- [123] Own observation: HTTP response headers of https://firebase-tools.web.app on 2026-10-18 (x-served-by cache-fra / cache-muc; strict-transport-security). https://firebase-tools.web.app
- [124] § 5 DDG (Digitale-Dienste-Gesetz). https://www.gesetze-im-internet.de/ddg/__5.html
- [125] § 18 Medienstaatsvertrag (MStV). https://www.gesetze-bayern.de/Content/Document/MStV-18
- [126] fragFINN e.V. (2023). fragFINN Kriterienkatalog 2023. https://eltern.fragfinn.de/wp-content/uploads/sites/2/2023/10/fragFINN_Kriterienkatalog_2023.pdf
- [127] Google / Firebase. Configure Hosting behavior (headers, rewrites, cleanUrls). https://firebase.google.com/docs/hosting/full-config
- [128] OWASP Cheat Sheet Series. HTTP Security Response Headers Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- [129] Vite documentation. Features: Content Security Policy (CSP). https://vite.dev/guide/features
- [130] MDN Web Docs. CSP: style-src. https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- [131] vite-plugin-pwa documentation. Register Service Worker (injectRegister options). https://vite-pwa-org.netlify.app/guide/register-service-worker.html
- [132] web.dev. Mitigate cross-site scripting (XSS) with a strict Content Security Policy. https://web.dev/articles/strict-csp
- [133] W3C (2023/2024). Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation (first published 5 October 2023; current version 12 December 2024). https://www.w3.org/TR/WCAG22/
- [134] W3C WAI. Understanding SC 2.5.8 Target Size (Minimum). https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [135] W3C WAI. Understanding SC 2.4.11 Focus Not Obscured (Minimum). https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- [136] W3C WAI. Understanding SC 4.1.3 Status Messages (WCAG 2.2). https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- [137] National Eye Institute. Color Blindness. https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness
- [138] Anthony, L., Brown, Q., Tate, B., Nias, J., Brewer, R., & Irwin, G. (2013). Designing smarter touch-based interfaces for educational contexts. *Personal and Ubiquitous Computing* (preprint). https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf
- [139] Hourcade, J. P., Bederson, B. B., Druin, A., & Guimbretière, F. (2004). Differences in pointing task performance between preschool children and adults using mice. *ACM TOCHI, 11*(4), 357–386. https://iro.uiowa.edu/esploro/outputs/journalArticle/Differences-in-pointing-task-performance-between/9984259477902771
- [140] Liu, F. (2018). Design for kids based on their stage of physical development. Nielsen Norman Group. https://www.nngroup.com/articles/children-ux-physical-development/
- [141] MDN Web Docs. prefers-reduced-motion. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- [142] SIL International. Andika font family (Release 7.000, 2025). https://software.sil.org/andika/
- [143] Braille Institute. Atkinson Hyperlegible Font (including Next and Mono). https://www.brailleinstitute.org/freefont/
- [144] Fontsource. Playwrite DE Grund (TypeTogether; Grundschrift model; OFL-1.1). https://fontsource.org/fonts/playwrite-de-grund/about
- [145] npm registry. @fontsource/atkinson-hyperlegible-next (and andika, atkinson-hyperlegible-mono, playwrite-de-grund), v5.3.0. https://registry.npmjs.org/@fontsource/atkinson-hyperlegible-next
- [146] Wilkins, A., Cleave, R., Grayson, N., & Wilson, L. (2009). Typography for children may be inappropriately designed. *Journal of Research in Reading, 32*(4), 402–412. https://repository.essex.ac.uk/1476/
- [147] Bernard, M. L., Chaparro, B. S., Mills, M. M., & Halcomb, C. G. (2002). Examining children's reading performance and preference for different computer-displayed text. *Behaviour & Information Technology, 21*. https://portfolio.erau.edu/en/publications/examining-childrens-reading-performance-and-preference-for-differ/
- [148] Katzir, T., Hershko, S., & Halamish, V. (2013). The effect of font size on reading comprehension on second and fifth grade children: Bigger is not always better. *PLoS ONE, 8*(9), e74061. https://pmc.ncbi.nlm.nih.gov/articles/PMC3777945/
- [149] Day, S. L., Atilgan, N., Giroux, A. E., & Sawyer, B. D. (2024). The influence of format readability on children's reading speed and comprehension. *Education Sciences, 14*(8), 854 (summary by Readability Matters). https://readabilitymatters.org/articles/research-highlight-the-influence-of-format-readability-on-childrens-reading-speed-and-comprehension
- [150] Day, S. L., et al. (2024). *Education Sciences, 14*(8), 854. MDPI (publisher page returned HTTP 403). https://www.mdpi.com/2227-7102/14/8/854 **(not verified online)**
- [151] Kuster, S. M., van Weerdenburg, M., Gompel, M., & Bosman, A. M. T. (2018). Dyslexie font does not benefit reading in children with or without dyslexia. *Annals of Dyslexia, 68*(1), 25–42. https://pmc.ncbi.nlm.nih.gov/articles/PMC5934461/
- [152] Wery, J. J., & Diliberto, J. A. (2017). The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy. *Annals of Dyslexia, 67*(2), 114–127. https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233
- [153] Zorzi, M., et al. (2012). Extra-large letter spacing improves reading in dyslexia. *PNAS, 109*(28), 11455–11459. https://pmc.ncbi.nlm.nih.gov/articles/PMC3396504
- [154] MDN Web Docs. SpeechSynthesisVoice.localService. https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService
- [155] GOV.UK Design System team (2020). Why the GOV.UK Design System team changed the input type for numbers. GDS Technology blog. https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/
- [156] MDN Web Docs. HTML inputmode global attribute. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode
- [157] Universität Passau. Merkblatt DIN 5008 (Zahlengliederung, Geldbeträge). https://www.uni-passau.de/fileadmin/dokumente/beschaeftigte/kommunikation_marketing/webredaktion/DIN_5008.pdf
- [158] Wilander, J. (2020). Full third-party cookie blocking and more. WebKit blog. https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- [159] Liu, S. (2023). Updates to storage policy. WebKit blog. https://webkit.org/blog/14403/updates-to-storage-policy/
- [160] Google Chrome Enterprise Help. Managed guest session devices. https://support.google.com/chrome/a/answer/3017014?hl=en
- [161] npm registry. vite-plugin-pwa (1.3.0 of 2026-05-05 supports Vite ^8; 2.0.0 released 2026-10-03). https://registry.npmjs.org/vite-plugin-pwa
- [162] Kultusministerkonferenz (2024, 13 December). Digitalpakt 2.0: Ein Meilenstein für die digitale Bildung in Deutschland soll weitergehen (press release). https://www.kmk.org/aktuelles/pressearchiv/mitteilung/digitalpakt-20-ein-meilenstein-fuer-die-digitale-bildung-in-deutschland-soll-weitergehen.html
- [163] Kultusministerkonferenz (2024). ICILS 2023: Digitale Kompetenzen von Achtklässlerinnen und Achtklässlern über dem internationalen Durchschnitt, aber noch nicht ausreichend (press release). https://www.kmk.org/aktuelles-1/artikelansicht/digitale-kompetenzen-von-achtklaesslerinnen-und-achtklaesslern-ueber-dem-internationalen-durchschnitt-aber-noch-nicht-ausreichend.html
- [164] Russell, A. (2024). The performance inequality gap, 2024. infrequently.org. https://infrequently.org/2024/01/performance-inequality-gap-2024/
- [165] MDN Web Docs. ARIA: aria-live attribute. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
- [166] Igalia (2023). Igalia brings MathML back to Chromium (Chrome 109). https://igalia.com/2023/01/10/Igalia-Brings-MathML-Back-to-Chromium.html
- [167] Sánchez, M. (2025, 12 December). A11y considerations in math on the web. HTMHell Advent Calendar. https://www.htmhell.dev/adventcalendar/2025/12/
- [168] W3C WAI-ARIA Authoring Practices Guide. Slider pattern. https://www.w3.org/WAI/ARIA/apg/patterns/slider/

### E. Added during the fact-check (2026-10-18)

- [169] IQB. Lernaufgaben Mathematik Primarstufe (illustrative tasks for the Bildungsstandards; 22 tasks, filters by Leitidee, process competence, Jahrgangsstufe and Anforderungsbereich). https://www.iqb.hu-berlin.de/de/schule/aufgaben/primar/lernaufgaben-mathematik-primar/
- [170] Adler, R. (2024, 25 January). Guest post: Worked examples: An effective tool for math learning. The Learning Scientists blog (secondary summary of [16]: correct examples beat incorrect ones; self-explanation prompts reduced the benefit). https://www.learningscientists.org/blog/2024/1/25-1
- [171] Durkin, K. (2009). *The effectiveness of comparing correct and incorrect examples for learning about decimal magnitude* (Master's thesis, Vanderbilt University; N = 74 fourth and fifth graders). https://ir.vanderbilt.edu/handle/1803/15069 **(not verified online; repository timed out, content known only from search summaries)**
- [172] § 1 BFSG (Barrierefreiheitsstärkungsgesetz), scope of products and services from 28 June 2025. https://www.gesetze-im-internet.de/bfsg/__1.html
- [173] §§ 1 and 3 BITV 2.0 (Barrierefreie-Informationstechnik-Verordnung), goals and applicable standards for public bodies. https://www.gesetze-im-internet.de/bitv_2_0/__3.html

### F. Added for the improvement system (2026-10-19)

All URLs in this subsection were accessed on 2026-10-19.

- [174] Dickhäuser, O., Janke, S., Praetorius, A.-K., & Dresel, M. (2017). The effects of teachers' reference norm orientations on students' implicit theories and academic self-concepts. *Zeitschrift für Pädagogische Psychologie, 31*(3–4), 205–219. https://doi.org/10.1024/1010-0652/a000208 (accepted manuscript, peDOCS: https://www.pedocs.de/volltexte/2023/23774/pdf/ZfPP_2017_Dickhaeuser_et_al_The_effects_of_teachers_reference_A.pdf; apparently the same sample as [78], with the same size, classes and five waves; neither text names a shared project)
- [175] Rheinberg, F., & Engeser, S. (2010). Motive training and motivational competence. In O. C. Schultheiss & J. C. Brunstein (Eds.), *Implicit motives* (pp. 510–548). Oxford University Press. https://doi.org/10.1093/acprof:oso/9780195335156.003.0018 (pre-publication author manuscript: https://www.uni-trier.de/fileadmin/fb1/prof/PSY/PGA/bilder/Rheinberg_und_Engeser.pdf; page numbers from Crossref; gives no effect sizes; the primary studies it summarises, Rheinberg 1979, Trudewind & Kohne 1982 and Rheinberg & Krug 2005, were not opened)
- [176] Lohbeck, A. (2017). Die individuell präferierte Bezugsnormorientierung und das Selbstkonzept von Grundschulkindern im Fach Mathematik. *Zeitschrift für Pädagogische Psychologie, 31*(1), 41–55. https://doi.org/10.1024/1010-0652/a000199 (publisher version read in a copy hosted by FHNW: https://fhnw.ch/plattformen/schul-in/wp-content/uploads/sites/344/2023/10/lohbeck_bezugsnormorientierungen_selbstkonzepte.pdf)
- [177] Gürel, Ç., Brummelman, E., Sedikides, C., & Overbeek, G. (2020). Better than my past self: Temporal comparison raises children's pride without triggering superiority goals. *Journal of Experimental Psychology: General, 149*(8), 1554–1566. https://doi.org/10.1037/xge0000733 (UvA-DARE: https://pure.uva.nl/ws/files/54562740/00004785_202008000_00009.pdf)
- [178] Wolff, F., & Möller, J. (2022). An individual participant data meta-analysis of the joint effects of social, dimensional, and temporal comparisons on students' academic self-concepts. *Educational Psychology Review, 34*(4), 2569–2608. https://link.springer.com/article/10.1007/s10648-022-09686-1 (open access; PDF read; 10 data sets from 12 studies, grades 6–11, mean ages 11.1–17.1; Table 3 gives B, SE and β)
- [179] Fang, J., Huang, X., Zhang, M., Huang, F., Li, Z., & Yuan, Q. (2018). The big-fish-little-pond effect on academic self-concept: A meta-analysis. *Frontiers in Psychology, 9*, 1569. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01569/full (33 studies, N = 1,276,838; overall β = −.28; primary school β = −.21, k = 9; the printed confidence interval for the primary-school subgroup is internally inconsistent and is not quoted)
- [180] Butler, R. (1987). Task-involving and ego-involving properties of evaluation: Effects of different feedback conditions on motivational perceptions, interest, and performance. *Journal of Educational Psychology, 79*(4), 474–482. https://doi.org/10.1037/0022-0663.79.4.474 (full text read in a copy on a teacher-resource site: https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/Task-Involving%20and%20Ego-Involving%20Properties%20of%20Evaluation.pdf)
- [181] Corpus, J. H., Ogle, C. M., & Love-Geiger, K. E. (2006). The effects of social-comparison versus mastery praise on children's intrinsic motivation. *Motivation and Emotion, 30*(4), 333–343 (pages as listed by Crossref; the author PDF prints 335–345). https://doi.org/10.1007/s11031-006-9039-4 (author PDF: https://www.reed.edu/psychology/motivation/assets/downloads/Corpus_Ogle_LoveGeiger_2006.pdf)
- [182] Henderlong, J., & Lepper, M. R. (2002). The effects of praise on children's intrinsic motivation: A review and synthesis. *Psychological Bulletin, 128*(5), 774–795. https://pubmed.ncbi.nlm.nih.gov/12206194/ (full text read in a copy on a university course site: https://jwilson.coe.uga.edu/emat7050/Students/Ramsey/HenderlongLepper2002.pdf)
- [183] Skipper, Y., & Douglas, K. (2012). Is no praise good praise? Effects of positive feedback on children's and university students' responses to subsequent failures. *British Journal of Educational Psychology, 82*(2), 327–339. http://eprints.gla.ac.uk/185739/1/185739.pdf (accepted manuscript; imagined scenarios)
- [184] Zentall, S. R., & Morris, B. J. (2010). "Good job, you're so smart": The effects of inconsistency of praise type on young children's motivation. *Journal of Experimental Child Psychology, 107*(2), 155–163. https://pubmed.ncbi.nlm.nih.gov/20570281/ **(not verified online; abstract only; N = 135 kindergarteners)**
- [185] Schunk, D. H., & Swartz, C. W. (1993). Goals and progress feedback: Effects on self-efficacy and writing achievement. *Contemporary Educational Psychology, 18*(3), 337–354. https://doi.org/10.1006/ceps.1993.1024 (figures checked in the conference version with full method and results, ERIC ED359216: https://files.eric.ed.gov/fulltext/ED359216.pdf; the journal article was not opened and may report further experiments)
- [186] Deci, E. L., Koestner, R., & Ryan, R. M. (2001). Extrinsic rewards and intrinsic motivation in education: Reconsidered once again. *Review of Educational Research, 71*(1), 1–27. https://doi.org/10.3102/00346543071001001 (scanned PDF: https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf; summarises the data of [60] with sub-analyses, so it is not independent confirmation)
- [187] Cameron, J., Banko, K. M., & Pierce, W. D. (2001). Pervasive negative effects of rewards on intrinsic motivation: The myth continues. *The Behavior Analyst, 24*(1), 1–44. https://doi.org/10.1007/BF03392017 (PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC2731358/; body only as page scans) **(not verified online; abstract only)**. The exchange in *Review of Educational Research, 71*(1), by Cameron (29–42) and by Deci, Ryan & Koestner (43–51), is known only from abstracts and bibliographic data.
- [188] Cerasoli, C. P., Nicklin, J. M., & Ford, M. T. (2014). Intrinsic motivation and extrinsic incentives jointly predict performance: A 40-year meta-analysis. *Psychological Bulletin, 140*(4), 980–1008. https://doi.org/10.1037/a0035661 (PubMed: https://pubmed.ncbi.nlm.nih.gov/24491020/; k = 183, N = 212,468 from school, work and sport; the ages of the samples and the share of experimental studies were not checked) **(not verified online; abstract only)**
- [189] Van Yperen, N. W., Blaga, M., & Postmes, T. (2014). A meta-analysis of self-reported achievement goals and nonself-report performance across three achievement domains (work, sports, and education). *PLoS ONE, 9*(4), e93594. https://pmc.ncbi.nlm.nih.gov/articles/PMC3974764/ (full text read via Europe PMC; Table 3)
- [190] Senko, C., Hulleman, C. S., & Harackiewicz, J. M. (2011). Achievement goal theory at the crossroads: Old controversies, current challenges, and new directions. *Educational Psychologist, 46*(1), 26–47. https://doi.org/10.1080/00461520.2011.538646 (copy read on a university course site: https://eclass-b.uoa.gr/modules/document/file.php/PPP387/achievement%20goal%20review%20paper.pdf)
- [191] Diaconu-Gherasim, L. R., Elliot, A. J., Zancu, A. S., Brumariu, L. E., Măirean, C., Opariuc-Dan, C., & Crumpei-Tanasă, I. (2024). A meta-analysis of the relations between achievement goals and internalizing problems. *Educational Psychology Review, 36*(4), 109. https://doi.org/10.1007/s10648-024-09943-5 (open access; 47 samples, N = 22,387, ages 11–60; for performance-avoidance goals and anxiety, Table 2 gives k = 24, r = .25, 95 % CI .20–.30, with 20 of the 24 samples cross-sectional)
- [192] Meece, J. L., Anderman, E. M., & Anderman, L. H. (2006). Classroom goal structure, student motivation, and academic achievement. *Annual Review of Psychology, 57*, 487–503. https://doi.org/10.1146/annurev.psych.56.091103.070258 (PDF: https://www.acces.fse.ulaval.ca/fichiers/site_acces/documents/Classroom_goal_structure_student_motivation_and_academic_achievement.pdf; TARGET table after Ames 1992 on p. 493)
- [193] Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance: An integrative review. *Perspectives on Psychological Science, 10*(2), 176–199. https://doi.org/10.1177/1745691615569000 (PDF: https://hwb.gov.wales/api/storage/1031b700-acaf-4eda-a4bc-758715e85ff2/Learning%20versus%20Performance%20An%20Integrative%20Review.pdf)
- [194] Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science, 19*(6), 585–592. https://doi.org/10.1111/j.1467-9280.2008.02127.x (PDF: https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Kornell_Bjork_2008_PsychScience.pdf)
- [195] Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics learning. *Journal of Educational Psychology, 107*(3), 900–908. https://doi.org/10.1037/edu0000001 (abstract via OpenAlex: https://api.openalex.org/works/doi:10.1037/edu0000001) **(not verified online; abstract only)**
- [196] Rawson, K. A., & Dunlosky, J. (2022). Successive relearning: An underexplored but potent technique for obtaining and maintaining knowledge. *Current Directions in Psychological Science, 31*(4), 362–368. https://doi.org/10.1177/09637214221100484 (abstract: https://www.psychologicalscience.org/journals/current-directions/09637214221100484/) **(not verified online; abstract only)**
- [197] Higham, P. A., Zengel, B., Bartlett, L. K., & Hadwin, J. A. (2022). The benefits of successive relearning on multiple learning outcomes. *Journal of Educational Psychology, 114*(5), 928–944. https://doi.org/10.1037/edu0000693 (accepted manuscript: http://repository.essex.ac.uk/30280/1/EDU-2020-0708_R2_accepted.pdf; 264 undergraduates in an introductory psychology module)

Re-opened for M16 without a new number: [15], Table 2, p. 273 (feedback about change from previous trials d = 0.55, k = 50, against 0.28, k = 380; praise 0.09; normative feedback n.s.), read in a third-party copy of uncertain licence: https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/The%20effects%20of%20feedback%20interventions.pdf. Also [12], Table 3 (motivational outcomes d = 0.33, 95 % CI 0.23–0.42, k = 109, against cognitive outcomes d = 0.51, k = 597).