export const quickSet = [
  {
    id:'q1', topic:'Technology & cities',
    passage:`A small city in Denmark recently replaced several traditional bus stops with “mobility points.” Each point still has a shelter and timetable, but it also offers secure bicycle parking, a repair stand, and a screen showing the arrival times of buses and shared cars. The city did not introduce the system simply to make waiting more comfortable. Its larger goal was to make it easier for residents to complete one journey using several kinds of transport. Early surveys suggest that commuters value reliable information more than extra seating. When people know that a bus is seven minutes away, they can decide whether to wait, cycle, or walk. Local shop owners were initially worried that fewer parking spaces would reduce business. Six months later, however, many reported more visitors on foot. The project has not eliminated private cars, nor was that its aim. Instead, planners describe it as an experiment in reducing “friction”: the small inconveniences that make people choose the most familiar option even when another choice might be cheaper or faster. The next phase will test whether the same design works in neighborhoods where residents travel longer distances.`,
    questions:[
      { prompt:'What was the main purpose of the mobility points?', choices:['To make mixed-mode journeys easier','To eliminate buses','To increase car parking'], answer:0 },
      { prompt:'What did commuters particularly value?', choices:['Larger shelters','Reliable arrival information','Free bicycle repairs'], answer:1 },
      { prompt:'What does “friction” mean here?', choices:['Conflict between shop owners','Physical damage to bicycles','Small barriers that shape choices'], answer:2 },
    ]
  },
  {
    id:'q2', topic:'Science & attention',
    passage:`Researchers studying attention have begun to examine the value of brief periods with no planned activity. In one experiment, participants learned a list of unfamiliar word pairs. One group then completed a simple puzzle, while another sat quietly for ten minutes without phones, music, or conversation. When tested later, the quiet group remembered more pairs. The result does not prove that doing nothing is always better than being active. The researchers argue instead that new memories may need a short period in which the brain is not asked to process competing information. This idea has practical limits. A noisy classroom cannot become completely silent after every lesson, and many people find unstructured time uncomfortable. Still, the study challenges the assumption that every spare minute should be filled. Some teachers now place short pauses between difficult topics, asking students to close their notes and think about what they have just learned. The pause is not a test and does not require a written summary. Its purpose is to allow ideas to settle before new material arrives. Further research will need to determine how long such pauses should last and whether their benefits differ across ages.`,
    questions:[
      { prompt:'What did the quiet group do after learning?', choices:['Took a written test','Sat without extra stimulation','Listened to music'], answer:1 },
      { prompt:'What explanation do researchers suggest?', choices:['Memory benefits from less competing input','Puzzles damage memory','Silence improves hearing'], answer:0 },
      { prompt:'Why do some teachers add short pauses?', choices:['To grade students quickly','To shorten lessons','To let ideas settle'], answer:2 },
    ]
  },
  {
    id:'q3', topic:'Business & trust',
    passage:`A neighborhood grocery service tried an unusual response to late deliveries. Instead of giving every affected customer the same coupon, it first explained what had caused the delay and then offered several choices: a refund, store credit, or a donation to a local food bank. Managers expected most people to choose the refund. Surprisingly, store credit was the most popular option, and nearly one in five customers selected the donation. Follow-up interviews suggested that the explanation mattered as much as the compensation. Customers were more forgiving when the company described a specific problem and the steps being taken to prevent it. Vague apologies, by contrast, were often interpreted as an attempt to avoid responsibility. The company also learned that choice itself could restore a sense of control after an inconvenience. This approach is not suitable for every failure; serious losses may require immediate refunds and formal support. For ordinary delays, however, the experiment suggests that trust is repaired through a combination of honesty, agency, and proportionate action. The firm now trains support staff to identify which of these elements a customer needs most.`,
    questions:[
      { prompt:'Which option was most popular?', choices:['A refund','Store credit','A food-bank donation'], answer:1 },
      { prompt:'Why did specific explanations help?', choices:['They showed responsibility and prevention','They made deliveries faster','They removed all compensation'], answer:0 },
      { prompt:'What broader lesson did the company learn?', choices:['All failures need the same response','Coupons always rebuild trust','Choice can restore control'], answer:2 },
    ]
  }
];

const quickTranslations = [
  `デンマークの小都市では最近、従来型のバス停の一部を「モビリティ・ポイント」に置き換えた。各地点には屋根と時刻表に加え、安全な駐輪場、修理台、バスやカーシェアの到着時刻を示す画面がある。目的は待ち時間を快適にするだけでなく、複数の交通手段を組み合わせた移動を容易にすることだ。初期調査では、通勤者は座席の追加より信頼できる情報を重視していた。バスが7分後に来ると分かれば、待つか、自転車か、歩くかを判断できる。当初、商店主は駐車場の減少を心配したが、半年後には徒歩の来客が増えたとの報告も多い。この計画は自家用車の廃止を狙うのではなく、人が慣れた手段を選んでしまう小さな不便、すなわち「摩擦」を減らす実験である。次の段階では、移動距離の長い地域でも同じ設計が機能するかを試す。`,
  `注意を研究する人々は、予定のない短い時間の価値を調べ始めている。ある実験では、参加者が見慣れない単語の組み合わせを覚えた後、一方のグループは簡単なパズルを行い、もう一方は携帯電話や音楽、会話なしで10分間静かに座った。後のテストでは静かなグループの成績が高かった。これは常に何もしない方が活動するより良いと証明するものではない。新しい記憶には、競合する情報を脳が処理しなくてよい短い時間が必要なのかもしれない、というのが研究者の説明だ。完全な静けさを毎回つくるのは難しく、何も決まっていない時間を不快に感じる人もいる。それでも、この研究は空き時間をすべて埋めるべきだという前提を問い直す。一部の教師は難しい話題の間に短い休止を入れ、ノートを閉じて直前の内容を考えさせている。これはテストでも記述要約でもなく、新しい内容の前に考えを定着させるためである。適切な長さや年齢差は今後の研究課題だ。`,
  `地域の食料品配達サービスは、遅配に対して珍しい対応を試した。全員に同じクーポンを渡すのではなく、遅れの原因を説明し、返金、店舗クレジット、地元フードバンクへの寄付から選べるようにした。管理者は返金が最多と予想したが、実際には店舗クレジットが最も人気で、約5人に1人が寄付を選んだ。聞き取りによれば、補償と同じほど説明が重要だった。具体的な問題と再発防止策が示されると顧客は寛容になり、曖昧な謝罪は責任逃れと受け取られやすかった。また、選択肢そのものが不便で失われた支配感を取り戻す助けになることも分かった。重大な損失には即時返金と正式な支援が必要だが、通常の遅れなら、誠実さ、選択の主体性、釣り合った対応の組み合わせが信頼を修復する。同社は今、この三要素のどれを顧客が最も必要としているか判断できるよう担当者を訓練している。`,
];

const quickEnhancements = [
  [
    { extra:'To make every bus stop more comfortable by adding extra seating and larger weatherproof shelters.', explanation:'The correct option captures the stated larger goal: helping residents combine several transport modes. Extra comfort is mentioned only to contrast with that goal; eliminating buses and increasing parking contradict the passage.', evidence:'“Its larger goal was to make it easier for residents to complete one journey using several kinds of transport.”' },
    { extra:'The removal of parking spaces, because commuters preferred walking to every other available form of transport.', explanation:'Reliable arrival information is explicitly described as more valuable than extra seating. Repairs are available, but not said to be free or most valued; neither shelters nor parking removal answers the survey finding.', evidence:'“Early surveys suggest that commuters value reliable information more than extra seating.”' },
    { extra:'The financial cost of changing between a bus, a shared car, and a privately owned bicycle.', explanation:'Here “friction” means small inconveniences that push people toward a familiar choice. It is not social conflict, bicycle damage, or specifically the financial cost of changing modes.', evidence:'The colon defines friction as “the small inconveniences that make people choose the most familiar option.”' },
  ],
  [
    { extra:'They discussed the word pairs together so that conversation could strengthen their later recall.', explanation:'The quiet group sat for ten minutes without phones, music, or conversation. The other options introduce activities the passage assigns elsewhere or never mentions.', evidence:'“Another sat quietly for ten minutes without phones, music, or conversation.”' },
    { extra:'Memory improves whenever learners deliberately avoid reviewing material for a long period after studying it.', explanation:'The researchers propose a short interval with less competing input. They do not claim puzzles damage memory, silence changes hearing, or that learners should avoid review for a long time.', evidence:'“New memories may need a short period in which the brain is not asked to process competing information.”' },
    { extra:'To give students an unannounced memory test before the teacher introduces the next difficult topic.', explanation:'Teachers use the pause to let recently learned ideas settle. It is explicitly not a test or written summary, and the passage does not say it shortens lessons.', evidence:'“Its purpose is to allow ideas to settle before new material arrives.”' },
  ],
  [
    { extra:'The same coupon offered automatically to every customer whose grocery delivery arrived later than promised.', explanation:'Store credit was the most popular choice. A refund was expected to win, donation attracted nearly one fifth, and the uniform coupon describes the older approach rather than a selected option.', evidence:'“Surprisingly, store credit was the most popular option.”' },
    { extra:'They allowed the company to replace compensation with an apology while spending less on customer support.', explanation:'Specific explanations signaled responsibility and prevention. They did not speed up the original delivery or remove compensation; the cheaper-support claim is not in the passage.', evidence:'Customers responded when the company described “a specific problem and the steps being taken to prevent it.”' },
    { extra:'Customers will forgive any serious loss as long as a company provides several compensation choices.', explanation:'The broader lesson is that choice can restore control, alongside honesty and proportionate action. The text rejects identical responses and warns serious losses may need immediate refunds.', evidence:'“Choice itself could restore a sense of control after an inconvenience.”' },
  ],
];

const quickChoiceSets = [
  [
    ['To make journeys combining buses, bicycles, walking, and shared cars easier for local residents.','To remove buses gradually and replace public transport with bicycles and shared cars throughout the city.','To increase the number of parking spaces available beside shops and traditional bus shelters.','To make waiting at every stop more comfortable mainly by adding seats and larger shelters.'],
    ['They valued larger shelters that protected everyone from bad weather while waiting for delayed buses.','They valued dependable arrival information that helped them choose whether to wait, walk, or cycle.','They valued free bicycle repairs provided by trained staff at every new mobility point.','They valued the removal of parking spaces because they preferred walking to every other transport option.'],
    ['It refers to disagreement between shop owners and planners about the loss of parking spaces.','It refers to physical wear that makes shared bicycles difficult or unsafe for residents to use.','It refers to small inconveniences that push people toward a familiar option even when alternatives may be better.','It refers specifically to the financial cost of changing between several forms of transport.'],
  ],
  [
    ['They immediately completed a written test that required them to recall every unfamiliar word pair.','They sat quietly for ten minutes without phones, music, conversation, or another planned task.','They listened to calm music designed to prevent the new memories from disappearing too quickly.','They discussed the word pairs together so conversation could strengthen their later recall.'],
    ['New memories may benefit from a short interval in which the brain receives less competing information.','Completing even a simple puzzle damages memory because it permanently replaces recently learned material.','A silent room improves people’s hearing, which then makes unfamiliar spoken words easier to remember.','Learners remember more whenever they avoid reviewing studied material for a long period afterward.'],
    ['They use the pauses to grade students quickly before beginning the next difficult part of a lesson.','They use the pauses mainly to reduce the amount of material that must be taught that day.','They use the pauses to let recently learned ideas settle before additional information arrives.','They use the pauses as unannounced memory tests that students must complete without their notes.'],
  ],
  [
    ['A direct refund to the customer’s original payment method was the option chosen most often.','Store credit was selected more often than either refunds or donations to the local food bank.','A donation to the local food bank was chosen by a clear majority of affected customers.','The company’s old standard coupon remained more popular than any of the newly offered choices.'],
    ['They showed that the company understood the specific failure and was taking steps to prevent it.','They immediately made the delayed groceries arrive faster, so compensation was no longer necessary.','They allowed the company to remove all compensation while customers accepted a verbal apology instead.','They reduced support costs by giving every customer exactly the same account of the delay.'],
    ['Every service failure should receive the same response so customers can predict the company’s policy.','Customers trust a company only when it gives coupons, regardless of the seriousness of the loss.','Giving people meaningful choices can restore some control after an inconvenience has taken it away.','Customers will forgive any serious loss whenever a company offers several forms of compensation.'],
  ],
];

quickSet.forEach((passage, passageIndex) => {
  passage.translation = quickTranslations[passageIndex];
  passage.questions.forEach((question, questionIndex) => {
    const enhancement = quickEnhancements[passageIndex][questionIndex];
    question.choices = quickChoiceSets[passageIndex][questionIndex];
    question.explanation = enhancement.explanation;
    question.evidence = enhancement.evidence;
  });
});

export const longPassage = {
  id:'long-demo-1', title:'The Productive Ambiguity of Public Spaces', topic:'Cities, belonging, and informal use',
  passage:`A public square appears, at first glance, to be a simple category of urban space. It is neither a private garden nor a commercial interior; it is open, visible, and shared. Yet the most successful squares are rarely defined by openness alone. They are distinguished by a productive ambiguity about what people are permitted to do there. A step may be a seat, a low wall may become a lunch table, and a patch of shade may serve in turn as a meeting place, a playground, or a temporary stage. None of these uses needs to have been specified by the designer. Indeed, an environment that explains every possible activity in advance can feel less public than one that leaves room for interpretation.

This does not mean that design is irrelevant. On the contrary, apparently spontaneous activity often depends on carefully arranged conditions. People linger where there are edges to lean against, choices between sun and shade, and enough visual interest to observe without being forced to participate. Small differences in height can separate a busy route from a quiet corner without erecting a barrier. The designer’s achievement is therefore paradoxical: to support unplanned behavior through deliberate decisions. Good public space is not undesigned. It is designed without exhausting the meanings of what has been built.

The distinction matters because municipal authorities increasingly evaluate public projects through measurable performance. They may count visitors, record the length of stays, or calculate the economic activity associated with nearby shops. Such evidence can reveal whether a costly project is broadly used, and public agencies are right to demand accountability. Problems arise, however, when the available measures become substitutes for the values they were meant to indicate. A crowded square may be lively, but it may also be uncomfortable for anyone who cannot move quickly. A rise in surrounding rents may be classified as economic success while quietly displacing the residents whose taxes helped finance the improvement.

Measurement also tends to favor activities that produce visible traces. A market stall generates sales; a scheduled concert produces tickets and attendance figures. By comparison, the value of sitting alone among strangers is difficult to record. Yet this modest experience can be central to urban life. It allows a person to be private without being isolated and to encounter difference without the obligations of direct exchange. The sociologist Lyn Lofland described public space as a realm in which people learn to coexist with those they do not know. That learning is often uneventful. Its very ordinariness makes it easy to overlook.

Attempts to make squares safer illustrate a related tension. Clear sightlines, adequate lighting, and regular maintenance can help a wide range of users feel secure. But surveillance systems and rules against loosely defined “loitering” can transform safety into selective welcome. The question is not merely whether behavior is monitored; shops and transport stations also observe their users. The deeper issue is who must continually prove that their presence has a legitimate purpose. A person carrying a shopping bag is readily understood as a customer. Someone sitting for an hour without buying anything may be treated as a problem, even when causing no harm.

This unequal burden of explanation reveals why publicness cannot be reduced to legal ownership. A plaza owned by a city may function like a controlled corridor, while a privately maintained courtyard may allow a surprising range of informal uses. What matters is the practical distribution of permission: who may enter, remain, improvise, and return. These permissions are communicated not only through posted rules but also through prices, seating, security practices, opening hours, and subtle signals about whose appearance is considered normal.

The strongest public spaces therefore balance legibility with incompleteness. People need to understand how to enter and move through them, and they need basic confidence that the environment will not expose them to avoidable danger. At the same time, the space must not prescribe a narrow script. It should be possible to use it competently without using it identically. This balance cannot be achieved once and preserved forever. A square changes as neighborhoods change, as climates warm, and as customs of work and leisure evolve. Management must remain responsive without converting every new behavior into either a program or a prohibition.

Perhaps the most useful way to judge a public square is not to ask whether it fulfills its designer’s original intention. A more demanding question is whether it can acquire meanings that its designers did not foresee while remaining accessible to people with unequal resources. Such a standard resists a tidy score. It requires observation, argument, and revision. That inconvenience may itself be valuable. A genuinely public place is not a finished answer to the problem of living together; it is one of the settings in which a city continues to negotiate the question.`,
  questions:[
    { prompt:'What is the passage’s central claim?', choices:['Public squares should maximize visitor counts','Successful public spaces combine deliberate support with openness to unplanned meanings','Private courtyards are always more public than city plazas','Designers should avoid influencing behavior'], answer:1 },
    { prompt:'Why does the author discuss measurable performance?', choices:['To reject all public accountability','To show that useful indicators can displace the values they represent','To argue that rent increases are always beneficial','To recommend ticketed events'], answer:1 },
    { prompt:'What does sitting alone among strangers illustrate?', choices:['An invisible but meaningful form of urban participation','A failure of programming','A security risk','A commercial opportunity'], answer:0 },
    { prompt:'What is implied by the phrase “burden of explanation”?', choices:['Everyone must state why they enter a square','Some people’s presence is treated as less self-justifying than others’','Rules should be explained more clearly','Designers must defend every seat'], answer:1 },
    { prompt:'Which evaluation would the author most likely support?', choices:['Whether the square stays faithful to its original plan','Whether all activity can be assigned a numerical score','Whether unforeseen uses remain possible and broadly accessible','Whether surveillance eliminates loitering'], answer:2 },
  ],
  vocabulary:{ ambiguity:'曖昧さ', linger:'長居する', paradoxical:'逆説的な', displacing:'立ち退かせること', coexist:'共存する', surveillance:'監視', legitimate:'正当な', distribution:'配分', legibility:'分かりやすさ', prescribe:'規定する' },
  sampleSummary:'公共空間の価値は、単なる開放性や利用者数ではなく、意図的な設計が予期しない多様な使い方を許すことにある。数値評価や安全対策は有用だが、本来の価値を置き換えたり、特定の人にだけ滞在理由を求めたりする危険もある。優れた広場は安全と分かりやすさを備えながら用途を固定せず、資源の異なる人々が自由に意味を加えられる場所である。その価値は一度の点数ではなく、変化に応じた観察・議論・修正を通じて保たれる。'
};

longPassage.translation = `公共広場は一見すると単純な都市空間に見える。私有庭園でも商業施設の内部でもなく、開かれ、目に見え、共有されている。しかし優れた広場を特徴づけるのは、単なる開放性ではなく、そこで何をしてよいかについての生産的な曖昧さである。段差は椅子になり、低い壁は昼食のテーブルになり、日陰は待ち合わせ場所、遊び場、仮設舞台へと姿を変える。設計者がすべての用途を指定する必要はなく、あらゆる活動を先回りして説明する環境は、解釈の余地を残す場所より公共的でなく感じられることさえある。

だからといって設計が不要なわけではない。むしろ自然発生的に見える活動は、慎重に整えられた条件に支えられている。人は、寄りかかれる縁、日向と日陰の選択肢、参加を強制されず眺められるだけの視覚的な面白さがある場所に留まる。わずかな高低差は障壁を立てずに通路と静かな隅を分けられる。設計者の成果は、意図的な判断によって予定外の行動を支えるという逆説にある。良い公共空間は無設計なのではなく、建築物の意味を使い切らないように設計されている。

この区別が重要なのは、自治体が公共事業を測定可能な成果で評価する傾向を強めているからだ。来訪者数、滞在時間、周辺店舗の経済活動などの証拠は、高額な事業が広く使われているかを示し、説明責任にも役立つ。だが、測定値が本来示すはずの価値そのものの代わりになると問題が起きる。混雑した広場は活気がある一方、素早く移動できない人には不快かもしれない。周辺家賃の上昇が経済的成功とされても、整備費を税で支えた住民を静かに追い出すこともある。

測定は目に見える痕跡を残す活動を優遇しやすい。市場の店は売上を、コンサートはチケットと入場者数を生む。それに対し、見知らぬ人々の間で一人座る価値は記録しにくい。しかしそれは、孤立せずに私的であり、直接交流する義務なしに違いに触れるという都市生活の核心になりうる。社会学者リン・ロフランドは、公共空間を、知らない者同士が共存を学ぶ領域と表現した。その学びはたいてい何事もなく、その平凡さゆえに見落とされやすい。

広場を安全にしようとする試みも、同様の緊張を示す。見通し、照明、維持管理は多くの利用者に安心を与えるが、監視や曖昧な「目的のない滞在」を禁じる規則は、安全を選別的な歓迎へ変えうる。問題は単に監視の有無ではなく、誰が自分の存在に正当な目的があると絶えず証明させられるかである。買い物袋を持つ人は顧客と理解されやすいが、何も買わず一時間座る人は、害を与えていなくても問題視されかねない。

この説明責任の不平等は、公共性が法的所有だけでは決まらないことを示す。市有広場が管理された通路のように機能する一方、民間管理の中庭が意外に多様な非公式利用を認める場合もある。重要なのは、誰が入り、留まり、工夫し、戻ってこられるかという許可の実際の配分だ。許可は掲示規則だけでなく、価格、座席、警備、営業時間、誰の外見を普通と見なすかという微妙な合図からも伝わる。

したがって最も優れた公共空間は、分かりやすさと未完成さを両立させる。入り方と移動方法が分かり、避けられる危険にさらされないという基本的な安心は必要だ。同時に、空間が狭い筋書きを押し付けてはならない。人々が有能に使えても、全員が同じ使い方をする必要はない。この均衡は一度完成して永続するものではなく、地域、気候、仕事や余暇の習慣とともに変化する。管理は新しい行動をすべて企画か禁止に変えることなく対応し続けなければならない。

公共広場を評価する最も有用な問いは、設計者の当初意図を満たしたかではないかもしれない。予想外の意味を獲得しながら、資源の異なる人々にも利用可能であり続けるかを問うべきだ。この基準は簡潔な点数化になじまず、観察、議論、修正を必要とする。その不便さ自体に価値があるのかもしれない。真に公共的な場所は、共に生きる問題への完成した答えではなく、都市がその問いを交渉し続ける舞台の一つだからである。`;

const longEnhancements = [
  { extra:'Successful public squares emerge mainly when designers leave them almost entirely unplanned and avoid shaping how visitors behave.', explanation:'The author argues for deliberate support combined with openness to unforeseen meanings. Choice A reduces value to counts, C overgeneralizes one comparison, and D wrongly treats design itself as the problem; the added option similarly ignores the role of careful design.', evidence:'“Good public space is not undesigned. It is designed without exhausting the meanings of what has been built.”' },
  { extra:'To demonstrate that economic measurements are the only reliable way to compare the public value of different squares.', explanation:'Measurements can support accountability, but become harmful when treated as substitutes for the values they indicate. The author does not reject all measurement, celebrate rents, favor tickets, or call economic metrics uniquely reliable.', evidence:'“Problems arise, however, when the available measures become substitutes for the values they were meant to indicate.”' },
  { extra:'A private retreat that has little connection to the social learning made possible by genuinely public environments.', explanation:'Sitting alone among strangers is presented as quiet but meaningful urban participation: privacy without isolation and exposure to difference without compulsory exchange. It is not failed programming, a risk, a commercial event, or mere retreat.', evidence:'“It allows a person to be private without being isolated and to encounter difference without the obligations of direct exchange.”' },
  { extra:'People who remain in public without spending money create a practical burden that managers are justified in removing.', explanation:'The phrase describes an unequal demand placed on some people to justify harmless presence. It does not mean everyone must announce a purpose, that signs need clearer wording, that designers defend furniture, or that noncustomers are necessarily burdens.', evidence:'“The deeper issue is who must continually prove that their presence has a legitimate purpose.”' },
  { extra:'Whether managers can preserve one stable set of permitted uses despite changes in climate, neighborhood life, and custom.', explanation:'The author favors judging whether unforeseen meanings and broad access remain possible. Fidelity to the original plan, total quantification, surveillance, and preserving fixed uses all conflict with the passage’s emphasis on evolving incompleteness.', evidence:'The final paragraph asks whether a square “can acquire meanings that its designers did not foresee while remaining accessible to people with unequal resources.”' },
];

const longChoiceSets = [
  ['Public squares should be judged mainly by whether they maximize visitor counts and nearby commercial activity.','Successful public spaces use deliberate design while leaving room for unplanned behavior and meanings to emerge.','Privately maintained courtyards are consistently more public in practice than plazas legally owned by cities.','Designers should avoid influencing behavior because any planned feature necessarily reduces a place’s public character.'],
  ['The author wants to reject every numerical measure because public agencies should not be held accountable for spending.','Useful indicators can become harmful when authorities treat them as substitutes for the values they were meant to represent.','Rising rents should be accepted as reliable evidence that a public-space project has benefited its original residents.','Ticketed events provide the fairest available measure because their attendance and revenue leave visible records.'],
  ['It shows a quiet but meaningful form of urban participation that offers privacy without complete social isolation.','It demonstrates that a square has failed to provide enough scheduled activities for people who arrive alone.','It identifies prolonged solitary sitting as a security risk that stronger monitoring should discourage.','It describes a commercial opportunity for shops to convert passive visitors into paying customers.'],
  ['Every visitor must formally explain a legitimate purpose before being permitted to enter a public square.','Some people are expected to justify harmless presence continually, while others are accepted without explanation.','Rules governing public places create a burden mainly because officials fail to explain them in simple language.','Designers are personally required to defend the purpose of every seat, wall, and path they include.'],
  ['Whether the completed square remains faithful to every element of its designer’s original intention.','Whether all forms of activity in the square can be converted into one consistent numerical performance score.','Whether unforeseen uses remain possible while people with unequal resources continue to have meaningful access.','Whether increasingly comprehensive surveillance can eliminate behavior that managers classify as loitering.'],
];

longPassage.questions.forEach((question, index) => {
  const enhancement = longEnhancements[index];
  question.choices = longChoiceSets[index];
  question.explanation = enhancement.explanation;
  question.evidence = enhancement.evidence;
});

longPassage.vocabulary = {
  ambiguity:{contextMeaning:'用途を一つに限定しない曖昧さ',basicMeaning:'曖昧さ、多義性',partOfSpeech:'noun'},
  linger:{contextMeaning:'その場に長く留まる',basicMeaning:'長居する、残り続ける',partOfSpeech:'verb'},
  paradoxical:{contextMeaning:'意図的な設計が予定外の行動を支えるという逆説的な',basicMeaning:'逆説的な、一見矛盾した',partOfSpeech:'adjective'},
  displacing:{contextMeaning:'元からいた住民を立ち退かせること',basicMeaning:'移動させる、取って代わる',partOfSpeech:'verb'},
  coexist:{contextMeaning:'知らない人々と同じ空間で共存する',basicMeaning:'共存する',partOfSpeech:'verb'},
  surveillance:{contextMeaning:'公共空間で利用者を監視すること',basicMeaning:'監視、見張り',partOfSpeech:'noun'},
  legitimate:{contextMeaning:'その場にいる正当な目的',basicMeaning:'正当な、合法的な',partOfSpeech:'adjective'},
  distribution:{contextMeaning:'利用許可が人々にどう配分されるか',basicMeaning:'分配、配布、分布',partOfSpeech:'noun'},
  legibility:{contextMeaning:'空間の使い方の分かりやすさ',basicMeaning:'読みやすさ、理解しやすさ',partOfSpeech:'noun'},
  prescribe:{contextMeaning:'利用方法を狭く規定する',basicMeaning:'規定する、処方する',partOfSpeech:'verb'},
};
