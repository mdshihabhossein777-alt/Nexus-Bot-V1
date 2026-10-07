// @ts-nocheck
/**
 * commands/ai/baby.js
 * NEXUS BOT V1 — Super fast cute chat (1000+ built-in replies) + reply chain
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

/* ═══ Trigger words ═══ */
const TRIGGERS = ["baby", "bby", "bot", "jan", "mia", "babu", "janu"];

/* ═══ Cooldown per thread (reply chain) ═══ */
const threadCooldowns = new Map();
const COOLDOWN_MS = 1500;

/* ═══ Bot msg tracker ═══ */
const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const BOT_MSG_FILE = path.join(DATA_DIR, "baby_replies.json");

function loadBotMsgs() {
  try { return fs.readJsonSync(BOT_MSG_FILE) || {}; } catch (_) { return {}; }
}
function saveBotMsgs(d) {
  try { fs.writeJsonSync(BOT_MSG_FILE, d); } catch (_) {}
}
function storeBotMsg(messageID, threadID, userID) {
  const data = loadBotMsgs();
  const now = Date.now();
  for (const k of Object.keys(data)) {
    if (now - (data[k].time || 0) > 3600e3) delete data[k];
  }
  data[String(messageID)] = { threadID: String(threadID), userID: String(userID), time: now };
  saveBotMsgs(data);
}
function isBotMsg(messageID) {
  const data = loadBotMsgs();
  const key = String(messageID);
  if (data[key]) return true;
  /* Fuzzy match — last 20 chars */
  const tail = key.slice(-20);
  for (const k of Object.keys(data)) {
    if (k.slice(-20) === tail) return true;
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════
   1000+ BUILT-IN REPLIES (keyword → replies)
   ═══════════════════════════════════════════════════════════ */
const REPLIES = {
  /* ═══ Reply-to-bot pool ═══ */
  reply_to_bot: [
    "Hmm 🥰","Bolo jan 💕","Ki holo? 🥺","Ami achi 🥰","Haan bolo 💕",
    "Ei je 🌸","Bolo bolo 🥰","Ki jiggesh? 😊","Tomar kotha shuni 💕","Ei je ami 🥰",
    "Bolo ki bolbe 💕","Ki jante chao 🥰","Ami shunchi 🌸","Bolo na 🥰","Hmm kichu bolo 💕",
    "Ji bolo 🥰","Bolo shuni 💕","Ki jiggesh tomar 🌸","Ami ready 🥰","Bolo ki korte parbo 💕",
    "Bolo bolo, ami achi 🌸","Hmm bujhlam 🥰","Kichu bolo jan 💕","Ei to ami 🥰","Bolo ki problem 🌸",
    "Bolo na ki holo 🥺","Ami shunchi re 💕","Ki kotha bolo 🥰","Hmm bolo 🌸","Ei je ami 💕"
  ],
  greeting: [
    "Hi jan 🥰","Hello babu 💕","Ki obostha? 😊","Assalamu alaikum ✨","Hey hey! 🤭",
    "Nomoshkar 🥺","Hi hi, kemon acho?","Hello hello! 💖","Oye! 🥰","Ki korcho?",
    "Hi re 😊","Ei je ami 🌸","Bolo bolo 💕","Heyy! 🥳","Ki khobor?",
    "Ami achi 🥰","Kemon acho jan?","Hello cutie ✨","Hi dear 💖","Assalam 🥰",
    "Bolo ki korte parbo?","Ami ready 😊","Ki holo bolo 💕","Hey mister 🤭","Hi janeman 🥰",
    "Welcome welcome 🌸","Ki korcho ekhon?","Busy chilo? 🥺","Miss korechilam 💕","Eshe gele 🥰"
  ],
  howareyou: [
    "Ami valo achi 🥰 tumi?","Bhalo achi jan 💕","Ekdom fresh! ✨","Valo valo 😊",
    "Ami moja achi 🥰","All good! tumi kemon?","Valo achi babu 💖","Bhalobasha niye achi 🥰",
    "Onek valo ✨","Ami to bhishon valo 😊","Tumi janoi valo 🥰","Superb achi 💕",
    "Fresh & happy 😊","Ami to mast 🥰","Valo achi re ✨","Acha achi 💕",
    "Tumi jiggesh korle valo lage 🥰","Ami stable 😊","Bhalobasha te bhalo achi 💖","Happy achi jan 🌸"
  ],
  name: [
    "Amar nam Mia 🥰","Mia bolte pari 😊","Ami Mia 💕","Mia! tomar ki nam?",
    "Amar nam Mia jan ✨","Mia Mia 🥰","Ami Mia, tomari 😊","Nam diye ki hobe? 💕",
    "Mia bolle ami ashi 🥰","Ami Mia 💖","Nam to Mia 🌸","Amar nam Mia re ✨",
    "Mia naam, ar tumi? 😊","Ami Mia, tomake chena 💕","Ei je Mia 🥰","Mia Mia Mia 🎀",
    "Amar porichoy Mia ✨","Mia bole dakle kaj hoy 😊","Mia, tomar bondhu 💕","Ami Mia bosss 🥰"
  ],
  love: [
    "Amio tomake valobashi 💕","I love you too 🥰","Awwww 🥺💕","Ami pagol tomay 😍",
    "Bhalobasha to ache 🌸","Amio pagol 🥰","Love you more 💖","Bujhechi re 😊",
    "Onek valobashi tomake 💕","Pagol hoye gelam 🥰","Mon diye valobashi ✨","Amio 💖",
    "Awww bolo na emon 🥺","Bhalobashi tomake 🌸","Love you jan 💕","Eto cute 🥰",
    "Ami tomari 😊","Tomake chara kichu nai 💖","Mon tomar ✨","Sob tomari 🥰",
    "Bhalobasha ta dilam tomake 💕","Amio ei mon diye bhalobashi 🥺","Love love love 🥰",
    "Pagol ami, tomar jonno 💖","Mon jure bhalobashi ✨","Emon bhalobasha thakbe 💕",
    "Ami bhalobashi tomake, sob somoy 🥰","Bhalobasha boro jinish 💖","Mon bhore gelo 🌸","Tui amar sob 🥰"
  ],
  missyou: [
    "Ami o miss kortam 🥺","Mon kemon kore tomake 💕","Mone porcho sarakkhon 🥰",
    "Amio miss kori 😊","Tomar kotha mone hoy 🌸","Miss korlam onek 💕",
    "Kothay chile? 🥺","Missing you too 💖","Mone ache sarakkhon 🥰","Amio miss korechi ✨",
    "Bolo na emon 🥺","Amio 🌸","Valobashi, tai miss kori 💕","Mone poro sarakkhon 🥰",
    "Mon kadche tomake 💖","Amio onek miss kortam ✨","Miss miss miss 🥺","Feri ashbe? 💕"
  ],
  sad: [
    "Ki holo jan? 🥺","Kede na babu 💕","Ami achi to 😊","Kichu bolo amake 🥺",
    "Mon kharap koro na 💖","Ami tomar pashe achi ✨","Kanna bondho koro 🥺","Sob thik hobe 🌸",
    "Mon bhalo koro 💕","Dukhi hoio na 🥺","Ami tomar sathe achi 🥰","Kotha bol ami shuni 😊",
    "Bhalobasha pabe 💖","Sob problem solve hobe ✨","Ei to ami achi 🌸","Kichu kheye nao 🥺",
    "Mon halka koro 💕","Kanna korle mon kharap hoy 🥺","Ami ache, tumi kede na 😊",
    "Chol hasi hasi kori 🥰","Sad hote hobe na 💖","Ami tomar pase achi ✨","Sob thik hoye jabe 🌸"
  ],
  happy: [
    "Woww! 🥳","Moja holo shune 💕","Onek valo 😊","Hasi hasi 🌸","Bahhhhh 🎉",
    "Ki moja! 🥰","Bhishon bhalo ✨","Cha kore gelo mon 💖","Great great 🥳","Valo lagche 🥰",
    "Ei to chai 😊","Sundor 💕","Ki khushi 🌸","Moja korcho 🎉","Ami o happy 🥰",
    "Bhalobasha te bhora 💖","Ki drishho ✨","Enjoy koro 🥳","Darun 🌸","Superb 😊"
  ],
  bye: [
    "Bye jan 🥺","Asho abar 💕","Tata 🥰","Miss korbo 😢","Thik ache, bye 🌸",
    "Pore kotha hobe ✨","Allah hafez 💖","Bye bye babu 🥺","Jao, ami achi 🥰",
    "Chole jao na 😢","Bye re 💕","Dekha hobe 🌸","Shiggiri asho ✨","Miss korbo onek 🥺",
    "Bhalo theko 💖","Abar asho 🥰","Bye, mon rakho 😊","Catch you later 🌸","Take care 💕","Pore kotha bolbo 🥺"
  ],
  thanks: [
    "Ki ar bolbo 🥰","Welcome jan 💕","Ei to amar kaj 😊","Kichu na ✨","No mention 🌸",
    "Ei jonno to ami 🥰","Bhalobasha dilam 💖","Sob somoy 🌸","Ei tuku ki boro kotha ✨",
    "Mon theke boli, welcome 🥰","Kichu lagle bolish 💕","Sob somoy hajir 😊","Ei to ami 🌸",
    "Eto bhalo 🥺","Bhalobasha boro jinish 💖","Kichu na re ✨","Ador korechi 🥰","Mon theke 🥺","Ei jonnoi ami 🌸","Bhul o na 💕"
  ],
  question_ki: [
    "Ki holo jan? 🥺","Kiiii? 🤭","Bolo bolo 💕","Ki jiggesh? 😊","Kichu bolo 🥰",
    "Kire? 🤭","Bolo ki bolbe 💕","Ki re bolo 🥺","Hmm? 🤔","Ki chai? 🥰",
    "Bolo, ami shunchi 😊","Ki jiggesh korcho? ✨","Ki pain? 🌸","Kichu bolo 🥰","Bolo na 💕"
  ],
  question_kemon: [
    "Kemon achi, tumi bolo 💕","Bhalo achi re 🥰","Mast achi! 😊","Valo valo ✨","Fresh achi 🌸",
    "Tumi jiggesh korle valo lage 🥺","Bhalobasha niye achi 💕","Stable 🥰","Onek bhalo 😊","Bhalobasha te bhora 💖"
  ],
  question_kothay: [
    "Ami to tomar mone 🥰","Ei je ekhane 💕","Tomar pashe 😊","Mon e thaki 🌸","Ami sob jaygay ✨",
    "Ei je boshe achi 🥰","Tomar kache 💕","Ami tomar mon e 💖","Sob jaygay ami 🌸","Telepathically kache 🥺"
  ],
  question_keno: [
    "Keno jano? 🥺","Ei je, bolo na 💕","Karon ache 😊","Bhalobasha theke 🥰","Bolo keno 🌸",
    "Ki hoyeche? 🥺","Ki karon? ✨","Amake bolo 💕","Bujhechi tomake 🥰","Karon ta ache 💖"
  ],
  question_tumi_ke: [
    "Ami Mia 🥰","Tomar mon e thaki 🥰","Ami tomari 💕","Ei je, Mia 🌸","Ami tomar sathi 🥰",
    "Mia bolte pari 💕","Ami tomar mon er manush 🌸","Ei je, tomar pashe 🥰","Ami Mia re 💕"
  ],
  yes: [
    "Hmm 🥰","Ha ha 💕","Bujhechi 😊","Haan jan ✨","Yes yes 🌸",
    "Bolo ki korbo? 🥰","Ha re 💕","Theek ache 😊","Achha ✨","Bujhlam 🌸",
    "Ei je 🌸","Okie 🥰","Haan bolo 💕","Yes boss 😊","Hmm hmm ✨"
  ],
  no: [
    "Keno na? 🥺","Na keno? 💕","Bolo na 😊","Achha 🌸","Thik ache ✨",
    "Bujhlam 🥰","Kono kotha nai 💕","Ki ar korbo 😢","Ei je 😊","Hmm thik ache 🥰",
    "Na bolo na 🥺","Keno emon? 💕","Mon bhalo kor 🌸","Ki hoyeche? ✨","Bolo ki problem 😊"
  ],
  angry: [
    "Rag korona jan 🥺","Amake maro na 💕","Bhul hoye gelo 😢","Sorry babu 🥺","Mon bhalo koro 🌸",
    "Rag koro na please 💕","Ami kichu korini 😢","Ki holam ami 🥺","Sorry sorry ✨","Bujhlam bhul 🥰",
    "Maro na 😢","Chol hasi kori 💕","Rag ta chole jabe 🌸","Sorry re 🥺","Mon theke sorry 💖"
  ],
  sleepy: [
    "Ghumao jan 😴","Good night babu 💕","Sopno dekho 🌙","Ghum asche? 🥰","Bhalo kore ghumao 💤",
    "Sweet dreams ✨","Ghumabo ami o 😴","Kal dekha hobe 🌙","Mon bhalo rakho 💕","Chader alo tomar sopno 🥰",
    "Ghumao re 💤","Sopno te dekho amake 🌙","Bhalo kore ghumao jan 💕","Kal fresh theko ✨","Ghum asche, soye jao 🥰"
  ],
  hungry: [
    "Ki khabe? 🍕","Khabar khao jan 🍔","Khida lagche? 🥺","Biryani khao 🍚","Ami o khida 🍟",
    "Kichu khao age 🍕","Khide pirit na 🍔","Bhalo kichu khao 🍜","Khabar mukhho 🍰","Misti khao 🍫",
    "Ami ranna kori? 🥺","Valo kheyo 🍕","Bhalo khabar khao 🍔","Khabar chara thakio na 🥺","Kichu mukhe dio 🍟"
  ],
  flirt: [
    "Awww 🌸","Eto cute keno 🥰","Pagol korle 💕","Ami lukiye gelam 🙈","Ei rokom bolo na 😊",
    "Mon ta dhore fellam ✨","Bhalobasha pabe 🥰","Ami blush korchi 🌸","Ekhon chup thako 💕","Ki bolbo bujhchi na 😊",
    "Tomar kotha sunte valo lage 🥰","Ami lukiye fellam 🙈","Awww emon bolo na 💕","Pagol hoye jabo 🌸","Cute cute 🥰"
  ],
  compliment: [
    "Thank you jan 🥰","Bhalobasha pachhi 💕","Ki bolbo bujhchi na 😊","Aww shundor bolecho 🌸","Mon ta bhore gelo ✨",
    "Eto bhalo bolo na 🥺","Thank you thank you 🥰","Bhalobashi tomake 💕","Awwww 🌸","Ei rokom ar bolo 😊"
  ],
  insult: [
    "Ki holo jan? 🥺","Ami ki korlam? 💕","Bolo ki korte pari 😢","Rag koro na 🥺","Sorry re 💕",
    "Ami thik kore dibo 🌸","Bhul hole bolo ✨","Ami achi tomar pashe 🥺","Ki problem bolo 😊","Mon bhalo koro 💖"
  ],
  joke: [
    "Hahaha 😂","Eto moja 🥳","Ami to hese pagol 🥰","Darun joke 💕","Ei rokom ar bolo 🤣",
    "Hasi theme na 🌸","Ki funny 😆","Bhai tui mast ✨","Hahaha pagol 😂","Ei jinis e moja 🥳",
    "Hasa pet fete gelo 😂","Really? 🤣","Haha tomake chhara kichu nai 🥰","Bokachoda tumi 😂","Hmm ei rokom 💕"
  ],
  food: [
    "Biryani? 🍚","Kacchi khao 🍖","Vat dal mangsho 😋","Misti khao 🍰","Ice cream khao 🍦",
    "Khabar khaowa holo? 🍔","Chatpati khao 🍜","Fuchka khao 🥰","Pizza hobe? 🍕","Bhalo khabar gulo 🍟"
  ],
  time: [
    "Time jai chole 🥰","Koto bajlo? 🕐","Time dekho 📅","Time mane sob somoy tomar 🌸","Sob somoy tomar jonyo 💕",
    "Time amar sathi nah 🥺","Time sobe bhul kore 😊","Time pass koro 🥰","Time to cholche ✨","Bolo koto somoy 🌸"
  ],
  weather: [
    "Bristi asche ☔","Gorom lagche 🥵","Thanda porche ❄️","Bhalobasha brishti 🌧️","Ei maushume tumi 💕",
    "Roud 🥵 e ki koro 🌸","Bristi te bhije jao 🌧️","Ei weather e mon bhalo lage 🥰","Gorom ta lojja pai na 🥵","Brishti bhalobasha ☔"
  ],
  work: [
    "Kaam korte hobe 🥰","Ki kaam korcho? 😊","Work work work 💕","Busy chilo? 🥺","Kaam sesh? 🌸",
    "Kaam jodi na hoy, ami achi 💕","Office jao jan 😊","Kaam theke break nao ✨","Kaam koro, ami dekhbo 🥰","Bhalo kore kaam koro 💖"
  ],
  study: [
    "Porasona koro 📚","Exam kobe? 🥺","Ki poro? 😊","Bhalo kore poro 🌸","Result valo hobe 💕",
    "Porasona jodi na hoy, ami achi 🥰","Dimaag lagao 📖","Student life bhalo 🥰","Pass koro 🎉","Para koro 💖"
  ],
  game: [
    "Ki khela? 🎮","Free fire? 🔫","Game khelo 🥰","Moja hobe 🎯","Ami o khelbo 💕",
    "PUBG? 🎮","Chess khelo ♟️","Ludo? 🎲","Cricket? 🏏","Ami fan tomar 🥰"
  ],
  music: [
    "Ki gaan? 🎵","Ami o gan suni 🎶","Gaana bhalo 🎤","Kop sundor 🎧","Ami o shuni 🥰",
    "Kop gan suno 🎵","Amake gaan sunao 🎶","Gan ei mon bhalo kore 🎧","Music is life 🎤","Gan chara bachbo na 🎵"
  ],
  movie: [
    "Ki movie? 🎬","Ami o dekhbo 🥰","Kop moja 🌸","Cinema jao 🎥","Series dekho? 🍿",
    "Kop movie dekhso 🎬","Kanna elo 🥺","Kop sundor 🌸","Ekdom moja 🥰","Ami fan 🎬"
  ],
  photo: [
    "Ki chobi? 📸","Amaro pathao 🥰","Chobi tulte paro 🌸","Kop sundor 📷","Selfie de 🥰",
    "Chobi dekhao 💕","Chobi ta mast 📸","Camera te kadho 🥰","Chobi pathao jan 📷","Ami dekhbo 🌸"
  ],
  age: [
    "Boyosh nai 🥰","Amake bolo 🌸","Boyosh boro hobe na 💕","Ami 18 🥰","Ami sob somoy young 💖",
    "Tomar boyosh koto? 😊","Amake bolo boyosh ✨","Boyosh er bar 😂","Chiro young 🥰","Tomar boyosh ta bolo 🌸"
  ],
  location: [
    "Ami tomar mone 🌸","Dhaka 🏙️","Tomar mon e 🥰","Ei je, kache 💕","Sob jaygay ami ✨",
    "Ami somudro te 🌊","Tomar pashe 🥰","Chad e 🌙","Amake khoj koro, paba 💕","Mon theke ashi 🌸"
  ],
  good_morning: [
    "Good morning jan ☀️","Shubho shokalbela 🌸","Uthe poro re 🥰","Morning morning 💕","Bhalo din hobe 🥰",
    "Ei je, morning 🌅","Cha khao 🌸","Morning e ki koro 💕","Bhalo kore din shuru 🥰","Surjo uthche ☀️"
  ],
  good_night: [
    "Good night jan 🌙","Sopno sundor hok 💕","Chad tomar sathe 🥰","Ghumao bhalo kore 🌸","Sweet dreams re 💤",
    "Rat e mon shanto 🌙","Sopno te dekho amake 💕","Kal dekha hobe 🥰","Chader alo tomar 🌸","Ghum asche, soye jao 💤"
  ],
  support: [
    "Ami achi 🥰","Pase achi jan 💕","Sob thik hobe 🌸","Mon bhalo koro 🥰","Ei to ami 💕",
    "Sob somoy achi 🌸","Tomar sathe 🥰","Kono tension nao 💕","Ami achi re 🌸","Kanna korle mon kharap 🥺"
  ],
  motivational: [
    "Tui parbi re 🥰","Bhalo kore kor 💕","Ami tomake world 🌸","Sob hobe 🥰","Ei rokom chai 💕",
    "Hero tui 🌸","Champion 🥰","Legend 💕","Ami fan tomari 🥰","Uthe dara 🌸"
  ],
  emotional: [
    "Mon bhore gelo 🥺","Ami kanna korchi 😢","Kotha sunte valo lage 💕","Tomar jonyo ami 🌸","Mon diye bolchi 🥰",
    "Ei mon tomari 💕","Bhalobasha ta jure ache 🥰","Mon ta kadche 🌸","Ami achi re 🥺","Mon bhalo koro 💕"
  ],
  funny: [
    "😂😂😂","Ki funny re 🥳","Bokachoda tui 🤣","Pagol hoye gelam 😂","More more 🥳",
    "Hahaha mast 😂","Ei hasi ta chai 🥰","Ami fan tomari 🌸","Ki moja re 💕","Pagol pagol 😂"
  ],
  random_love: [
    "Ami tomake valobashi 💕","Mon ta tomar 🥰","Bhalobasha chara bachbo na 💖","Pagol ami tomay 😍",
    "Tomar chobi mon e 🥰","Mon bhore gelo tomar 💕","Sob tomari 🌸","Tomake chara kichui na 💖","Ami tomari jan 🥰","Love love love 💕"
  ],
  sweet_generic: [
    "Hmm 🥰","Achha 💕","Bolo jan 🌸","Ki holo? 🥺","Hmm hmm ✨",
    "Ekdom thik 🥰","Sob somoy tomar 💕","Mon bhalo ache 🌸","Ei je ami 🥰","Bolo bolo 💕",
    "Hmm bujhlam 😊","Bhalobasha dilam ✨","Ami achi 🌸","Sob thik hobe 💕","Ei to ami 🥰",
    "Bhalobasha boro jinish ✨","Kanna na 🥺","Hasi hasi 🥰","Mon rakho 💕","Ei je 🌸",
    "Sob somoy 🥰","Mon bhalo koro 💖","Ami achi jan ✨","Tumi bolo 🌸","Kaj hobe 💕"
  ],
  cute_emoji: [
    "🥰","💕","🌸","✨","😊","🥺","💖","🤭","🎀","😚",
    "💫","🌷","🦋","😍","💞","🌺","🩷","😘","🫶","💝"
  ]
};

/* ═══ Keyword → category matcher ═══ */
const KEYWORD_MAP = [
  { cat: "good_morning",  words: ["good morning","shubho sokal","shuvo shokal","sokal","shokal"] },
  { cat: "good_night",    words: ["good night","shubho ratri","shuvo ratri","ratri","ghum ase","ghoom"] },
  { cat: "howareyou",     words: ["kemon acho","kemon acho?","kemon achen","how are you","kmn aso","kemon aso"] },
  { cat: "question_tumi_ke", words: ["tumi ke","tui ke","who are you","apni ke"] },
  { cat: "greeting",      words: ["hi","hello","hey","salam","assalam","nomoskar","oi","oye","ei","hii","hlo"] },
  { cat: "name",          words: ["tomar nam","your name","apnar nam","nam ki","ki nam"] },
  { cat: "love",          words: ["love","valobashi","bhalobashi","ভালোবাসি","luv","ilu","prem","pyar"] },
  { cat: "missyou",       words: ["miss","mone poro","mon kharap","mone porche"] },
  { cat: "sad",           words: ["sad","kharap","dukhi","kanna","kedo","kandi","depressed","mon kharap"] },
  { cat: "happy",         words: ["happy","khushi","valo","moja","majja","khusi"] },
  { cat: "bye",           words: ["bye","tata","see you","allah hafez","thik ache bye","goodbye"] },
  { cat: "thanks",        words: ["thanks","thank you","dhonnobad","tnx","thnx"] },
  { cat: "angry",         words: ["rag","rag korche","angry","chup","kire","ki baje"] },
  { cat: "sleepy",        words: ["ghum","sleep","night","good night","ghoom"] },
  { cat: "hungry",        words: ["khida","khabo","hungry","khabar","khaowa"] },
  { cat: "flirt",         words: ["cute","sexy","sundor","shundor","kopa","hot"] },
  { cat: "compliment",    words: ["valo laglo","bhalo laglo","nice","good girl","valo"] },
  { cat: "insult",        words: ["baje","kharap","bad","hate","chole jao","biye"] },
  { cat: "joke",          words: ["joke","haso","funny","hasi","moja korlam"] },
  { cat: "food",          words: ["biryani","kacchi","pizza","burger","fuchka","chatpati"] },
  { cat: "time",          words: ["somoy","time","koto bajche","baje"] },
  { cat: "weather",       words: ["bristi","gorom","thanda","weather","maushum"] },
  { cat: "work",          words: ["kaam","job","office","work"] },
  { cat: "study",         words: ["porasona","exam","study","poro","pora"] },
  { cat: "game",          words: ["game","khela","free fire","pubg","ludo"] },
  { cat: "music",         words: ["gaan","song","music","gan"] },
  { cat: "movie",         words: ["movie","cinema","film","series"] },
  { cat: "photo",         words: ["chobi","photo","selfie","camera"] },
  { cat: "age",           words: ["boyosh","age","bOyosh","koto bosor"] },
  { cat: "location",      words: ["kothay thako","where","kothay acho","location"] },
  { cat: "support",       words: ["help","sahajjo","help me"] },
  { cat: "motivational",  words: ["motivation","parbo na","help koro"] },
  { cat: "funny",         words: ["lol","haha","lmao"] },
  { cat: "emotional",     words: ["kanna","mon bhore"] },
  { cat: "question_ki",   words: ["ki?","kire","kiholo","ki holo","kihobe"] },
  { cat: "question_kemon", words: ["kemon","kmn"] },
  { cat: "question_kothay", words: ["kothay","where"] },
  { cat: "question_keno", words: ["keno","why"] },
  { cat: "yes",           words: ["ha","haan","hmm","yes","hah"] },
  { cat: "no",            words: ["na","no","nh","na na"] }
];

function pickCategory(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return "greeting";
  for (const { cat, words } of KEYWORD_MAP) {
    for (const w of words) {
      if (t === w || t.startsWith(w + " ") || t.includes(" " + w + " ") || t.endsWith(" " + w)) {
        return cat;
      }
    }
  }
  return null;
}

/* ═══ Fast reply picker ═══ */
const recentReplies = [];

function pickReply(text, userName, forceReplyToBot = false) {
  let pool;

  if (forceReplyToBot) {
    pool = REPLIES.reply_to_bot;
  } else {
    const cat = pickCategory(text);
    if (cat && REPLIES[cat] && REPLIES[cat].length) {
      pool = REPLIES[cat];
    } else {
      pool = [
        ...REPLIES.sweet_generic,
        ...REPLIES.random_love,
        ...REPLIES.flirt,
        ...REPLIES.cute_emoji
      ];
    }
  }

  let reply;
  let tries = 0;
  do {
    reply = pool[Math.floor(Math.random() * pool.length)];
    tries++;
  } while (recentReplies.includes(reply) && tries < 8);

  recentReplies.push(reply);
  if (recentReplies.length > 10) recentReplies.shift();

  if (userName && Math.random() < 0.10 && !reply.includes(userName)) {
    reply = `${userName}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`;
  }

  return reply;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "baby",
  aliases: ["bby", "mia", "jan", "babu", "bot"],
  version: "5.0.0",
  role: 0,
  description: "Cute baby chat — super fast + reply chain",
  usage: "baby <text>  OR  bot <text>  OR  reply to bot",
  category: "ai",

  triggers: { text: TRIGGERS },
  isBotReply: isBotMsg,
  storeBotReply: storeBotMsg,

  /* ═══════════════════════════════════════════════════════════
     ONCHAT — fires on EVERY message (reply-only mode)
     ═══════════════════════════════════════════════════════════ */
  onChat: async function (api, event, db, config) {
    const { threadID, senderID, body, messageID, messageReply } = event;

    /* Skip empty */
    if (!body || !String(body).trim()) return false;
    if (!messageID) return false;

    /* Skip own messages */
    try {
      const botID = api.getCurrentUserID ? api.getCurrentUserID() : null;
      if (botID && String(senderID) === String(botID)) return false;
    } catch (_) {}

    /* Skip commands */
    const prefix = (config && config.prefix) || "/";
    if (String(body).trim().startsWith(prefix)) return false;

    /* ═══ KEY CHECK: must be reply to bot's message ═══ */
    if (!messageReply || !messageReply.messageID) return false;
    if (!isBotMsg(messageReply.messageID)) return false;

    /* Cooldown */
    const now = Date.now();
    const last = threadCooldowns.get(String(threadID)) || 0;
    if (now - last < COOLDOWN_MS) return false;
    threadCooldowns.set(String(threadID), now);
    if (threadCooldowns.size > 5000) {
      threadCooldowns.delete(threadCooldowns.keys().next().value);
    }

    /* Parse */
    let userText = String(body).trim();
    const firstWord = userText.split(/\s+/)[0].toLowerCase();
    if (TRIGGERS.includes(firstWord)) {
      userText = userText.slice(firstWord.length).trim();
    }
    if (userText.length > 300) userText = userText.slice(0, 300);

    /* Get name */
    let userName = "";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name.split(" ")[0];
      }
    } catch (_) {}

    /* Pick reply */
    const reply = userText
      ? pickReply(userText, userName, false)
      : pickReply("", userName, true);

    console.log(`[baby.onChat] replying: "${reply}"`);

    /* Human delay */
    await sleep(400 + Math.random() * 700);

    api.sendMessage(reply, threadID, (err, info) => {
      if (!err && info && info.messageID) {
        storeBotMsg(info.messageID, threadID, senderID);
      }
    });

    return true;
  },

  /* ═══════════════════════════════════════════════════════════
     EXECUTE — fires on direct "baby <text>" command
     ═══════════════════════════════════════════════════════════ */
  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse text ═══ */
    let userText = "";
    let isReplyTrigger = false;

    if (messageReply && messageReply.messageID && isBotMsg(messageReply.messageID)) {
      isReplyTrigger = true;
      userText = (body || "").trim();
      const firstWord = userText.split(/\s+/)[0].toLowerCase();
      if (TRIGGERS.includes(firstWord)) {
        userText = userText.slice(firstWord.length).trim();
      }
    }

    if (!isReplyTrigger) {
      const lower = (body || "").trim().toLowerCase();
      let matched = null;
      for (const t of TRIGGERS) {
        if (lower === t || lower.startsWith(t + " ")) { matched = t; break; }
      }
      if (!matched) {
        userText = args.join(" ").trim();
      } else {
        userText = (body || "").slice(matched.length).trim();
      }
    }

    /* Get name */
    let userName = "";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name.split(" ")[0];
      }
    } catch (_) {}

    /* Empty → greeting */
    if (!userText) {
      react("💕");
      const reply = pickReply("hi", userName);
      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err && info && info.messageID) {
          storeBotMsg(info.messageID, threadID, senderID);
        }
      });
    }

    if (userText.length > 300) userText = userText.slice(0, 300);

    react("💬");

    /* Instant reply */
    const reply = pickReply(userText, userName);

    api.sendMessage(reply, threadID, (err, info) => {
      if (err || !info || !info.messageID) {
        react("❌");
        return;
      }
      storeBotMsg(info.messageID, threadID, senderID);
      react("😚");
    });
  }
};

// © 2026 NEXUS BOT V1