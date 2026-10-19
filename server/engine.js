"use strict";
var R=Math.random;
function rnd(a,b){return a+Math.floor(R()*(b-a+1))}
function pick(a){return a[Math.floor(R()*a.length)]}
function cl(v){return Math.max(0,Math.min(100,Math.round(v)))}
var EDU=['कोई नहीं','दसवीं पास','बारहवीं पास','स्नातक','स्नातकोत्तर'];
var S=null;
function newGame(name,g){
 if(g==='r')g=R()<.5?'m':'f';
 return {name:name||(g==='m'?'आरव':'अनन्या'),g:g,age:0,money:0,h:90,j:80,r:70,
  edu:0,stream:'',job:'',inc:0,biz:0,married:false,partner:'',kids:0,house:false,car:false,
  smoke:false,inv:0,used:{},log:[],hl:[],dead:false,cause:'',cur:null,res:null,parents:2};
}
function hl(s,t){s.hl.push({a:s.age,t:t})}
function job(s,n,i){s.job=n;s.inc=i}
var PN={m:['प्रिया','नेहा','स्नेहा','काव्या','पूजा'],f:['रोहन','अमित','विक्रम','सिद्धार्थ','करण']};
var KN=['चिंटू','पिंकी','गुड्डू','मुन्नी','बबलू','सोनू'];
/* Event: id,a:[min,max],c:cond,t:text,o:[{t,e:[money,health,happy,rel],p:prob,b:badEffect,gt,bt,x:fn}] */
var EV=[
{id:'birth',a:[0,0],t:'पुणे की बरसाती जुलाई रात, दो कमरों के छोटे से फ्लैट में तुम्हारा जन्म हुआ। माँ अंजलि स्कूल में पढ़ाती हैं, पापा राकेश की छोटी सी इलेक्ट्रॉनिक्स रिपेयर दुकान है। पैसे कम हैं, पर घर में प्यार भरपूर। बचपन (0-4 साल) कैसा बीता?',o:[
 {t:'शांत और खुशमिज़ाज बच्चा',e:[0,5,10,10]},{t:'शरारती, पूरे मोहल्ले की जान',e:[0,0,15,5]},{t:'हर चीज़ खोलकर देखने वाला जिज्ञासु',e:[0,0,5,0],gt:'पापा कहते हैं — ये तो इंजीनियर बनेगा!'}]},
{id:'school1',a:[5,5],t:'स्कूल जाने का समय आ गया। पापा सरकारी स्कूल कहते हैं, माँ चाहती हैं इंग्लिश मीडियम प्राइवेट स्कूल — फीस भारी है।',o:[
 {t:'सरकारी मराठी/हिंदी मीडियम स्कूल',e:[0,0,5,5]},{t:'प्राइवेट इंग्लिश मीडियम (माँ ट्यूशन लेकर फीस भरेंगी)',e:[0,-2,0,8],x:function(s){s.eng=1;return 'माँ ने शाम को ट्यूशन लेना शुरू किया।'}}]},
{id:'friend',a:[6,9],t:'क्लास में एक नया लड़का/लड़की अकेला बैठा है।',o:[{t:'जाकर दोस्ती करो',e:[0,0,8,12],x:function(s){s.bff=1;hl(s,'बचपन का पक्का दोस्त मिला');return ''}},{t:'अपने पुराने दोस्तों के साथ ही रहो',e:[0,0,2,0]}]},
{id:'cricket',a:[6,12],t:'मोहल्ले में शाम को क्रिकेट होता है, पर होमवर्क बाकी है।',o:[{t:'पहले होमवर्क',e:[0,0,-3,0],x:function(s){s.study=(s.study||0)+1;return ''}},{t:'क्रिकेट! होमवर्क बाद में',e:[0,5,8,4],p:.6,b:[0,0,-5,-3],bt:'टीचर ने डाँटा, घर पर शिकायत भी आई।'}]},
{id:'fever',a:[5,10],t:'तुम्हें तेज़ बुखार है, डॉक्टर इंजेक्शन की बात कर रहे हैं।',o:[{t:'बहादुरी से इंजेक्शन लगवाओ',e:[0,8,-2,3]},{t:'रो-रोकर घर लौट जाओ, दादी के नुस्खे',e:[0,-6,2,0],p:.5,b:[0,-12,-5,0],bt:'बुखार बिगड़ गया, एक हफ्ता बिस्तर पर।'}]},
{id:'diwali',a:[5,12],t:'दिवाली पर पापा के पास सिर्फ थोड़े पैसे हैं। तुम्हें क्या चाहिए?',o:[{t:'पटाखे',e:[0,-2,10,0]},{t:'नई किताबें',e:[0,0,3,3],x:function(s){s.study=(s.study||0)+1;return ''}},{t:'कुछ नहीं, पैसे बचाओ',e:[0,0,0,10],gt:'पापा की आँखें भर आईं।'}]},
{id:'shop',a:[8,13],t:'पापा की दुकान पर छुट्टियों में मदद करोगे?',o:[{t:'हाँ, रेडियो-मोबाइल रिपेयर सीखूँगा',e:[500,0,3,10],x:function(s){s.tech=1;return 'तुम्हें सर्किट समझ आने लगे!'}},{t:'नहीं, छुट्टियाँ खेलने के लिए हैं',e:[0,2,8,-3]}]},
{id:'olymp',a:[9,13],t:'स्कूल में गणित ओलंपियाड का फॉर्म आया है।',o:[{t:'तैयारी करके भाग लो',e:[0,-2,0,2],p:.5,gt:'तुमने ज़िले में पहला स्थान पाया! 🏅',b:[0,0,-4,0],bt:'इनाम नहीं मिला, पर बहुत कुछ सीखा।',x:function(s){s.study=(s.study||0)+1;return ''}},{t:'रहने दो',e:[0,0,0,0]}]},
{id:'bully',a:[9,14],t:'एक बड़ा लड़का रोज़ तुम्हारा टिफिन छीन लेता है।',o:[{t:'टीचर से शिकायत',e:[0,0,3,0]},{t:'उससे भिड़ जाओ',e:[0,-8,5,0],p:.5,gt:'उसके बाद उसने कभी परेशान नहीं किया।',b:[0,-12,-8,0],bt:'चोट लगी और प्रिंसिपल ने भी डाँटा।'},{t:'चुपचाप सह लो',e:[0,0,-10,0]}]},
{id:'phone',a:[12,15],t:'सब दोस्तों के पास स्मार्टफोन है। तुम ज़िद करते हो?',o:[{t:'ज़िद करो',e:[0,0,8,-8],x:function(s){s.phone=1;return ''}},{t:'पापा की दुकान से पुराना फोन ठीक करके चलाओ',e:[0,0,6,5],c:function(s){return s.tech}},{t:'रहने दो, पढ़ाई पर ध्यान',e:[0,0,-3,3],x:function(s){s.study=(s.study||0)+1;return ''}}]},
{id:'crush',a:[13,16],t:'क्लास में किसी पर तुम्हारा दिल आ गया है।',o:[{t:'चिट्ठी लिखकर दे दो',e:[0,0,0,0],p:.4,gt:'जवाब "हाँ" में आया! 💌',b:[0,0,-10,-2],bt:'पूरी क्लास में मज़ाक बन गया।'},{t:'दिल की बात दिल में रखो',e:[0,0,-3,0]}]},
{id:'sport',a:[11,15],t:'स्कूल की कबड्डी टीम में चयन का मौका।',o:[{t:'टीम में जाओ',e:[0,10,8,5]},{t:'पढ़ाई पर ध्यान',e:[0,0,-2,0],x:function(s){s.study=(s.study||0)+1;return ''}}]},
{id:'grand',a:[10,16],c:function(s){return !s.used.granddie},t:'दादी बहुत बीमार हैं। वो तुम्हें बार-बार बुला रही हैं।',o:[{t:'स्कूल छोड़कर रोज़ उनके पास बैठो',e:[0,0,-8,15],gt:'दादी ने आशीर्वाद दिया — "डॉक्टर बनना"। कुछ दिन बाद वो चली गईं।'},{t:'परीक्षा है, कभी-कभी मिल आओ',e:[0,0,-12,-5],gt:'दादी चली गईं। मन में अफ़सोस रह गया।'}]},
{id:'board10',a:[15,15],t:'दसवीं बोर्ड परीक्षा! तैयारी कैसे करोगे?',o:[{t:'दिन-रात पढ़ाई',e:[0,-5,-5,3],x:function(s){s.edu=1;s.study=(s.study||0)+2;s.m10=rnd(80,96);hl(s,'दसवीं में '+s.m10+'%');return 'तुम्हें '+s.m10+'% मिले!'}},{t:'संतुलित पढ़ाई और आराम',e:[0,0,0,2],x:function(s){s.edu=1;s.study=(s.study||0)+1;s.m10=rnd(65,85);hl(s,'दसवीं में '+s.m10+'%');return s.m10+'% मिले।'}},{t:'दोस्तों के साथ मस्ती',e:[0,0,8,-5],x:function(s){s.edu=1;s.m10=rnd(40,62);hl(s,'दसवीं में '+s.m10+'%');return 'सिर्फ '+s.m10+'%... पापा नाराज़ हैं।'}}]},
{id:'stream',a:[16,16],t:'ग्यारहवीं में कौन सी स्ट्रीम?',o:[{t:'साइंस (इंजीनियर/डॉक्टर बनने का सपना)',e:[0,-3,0,5],x:function(s){s.stream='sci';return ''}},{t:'कॉमर्स (बिज़नेस/CA)',e:[0,0,3,0],x:function(s){s.stream='com';return ''}},{t:'आर्ट्स (अपनी पसंद)',e:[0,0,8,-3],x:function(s){s.stream='art';return ''}},{t:'पढ़ाई छोड़कर पापा की दुकान',e:[0,0,0,0],x:function(s){s.stream='shop';job(s,'दुकान सहायक',36000);hl(s,'पढ़ाई छोड़ दुकान संभाली');return ''}}]},
{id:'coaching',a:[16,17],c:function(s){return s.stream==='sci'},t:'कोटा जैसी महंगी कोचिंग? पापा कर्ज़ ले सकते हैं।',o:[{t:'हाँ, कोचिंग जॉइन करो',e:[0,-6,-6,5],x:function(s){s.coach=1;s.loan=(s.loan||0)+80000;return 'परिवार पर ₹80,000 का कर्ज़ हुआ।'}},{t:'यूट्यूब और सेल्फ-स्टडी',e:[0,0,0,0],x:function(s){s.study=(s.study||0)+1;return ''}}]},
{id:'board12',a:[17,17],c:function(s){return s.stream!=='shop'},t:'बारहवीं बोर्ड और प्रवेश परीक्षा का साल।',o:[{t:'पूरी ताकत लगा दो',e:[0,-6,-4,0],x:function(s){s.edu=2;var sc=(s.study||0)+(s.coach?2:0)+rnd(0,4);s.top=sc>=6;hl(s,s.top?'प्रवेश परीक्षा में शानदार रैंक!':'बारहवीं पास');return s.top?'शानदार रैंक! अच्छे कॉलेज के दरवाज़े खुले।':'ठीक-ठाक नंबर आए।'}},{t:'जितना हो सके उतना',e:[0,0,0,0],x:function(s){s.edu=2;s.top=R()<.2;hl(s,'बारहवीं पास');return s.top?'किस्मत से अच्छी रैंक आ गई!':'औसत नंबर।'}}]},
{id:'college',a:[18,18],c:function(s){return s.edu>=2},t:'कॉलेज का फैसला करना है।',o:[
 {t:'इंजीनियरिंग (COEP पुणे)',c:function(s){return s.stream==='sci'&&s.top},e:[-20000,0,10,5],x:function(s){s.deg='eng';return 'COEP में दाखिला! 🎓'}},
 {t:'मेडिकल (MBBS) — दादी का सपना',c:function(s){return s.stream==='sci'&&s.top},e:[-30000,-3,8,10],x:function(s){s.deg='med';return 'मेडिकल कॉलेज में दाखिला!'}},
 {t:'B.Sc / B.Com सरकारी कॉलेज',e:[-5000,0,3,0],x:function(s){s.deg=s.stream==='sci'?'bsc':'bcom';return ''}},
 {t:'B.A. और साथ में कोई कला',c:function(s){return s.stream==='art'},e:[-4000,0,8,0],x:function(s){s.deg='ba';return ''}},
 {t:'पढ़ाई छोड़ो, नौकरी करो',e:[0,0,0,-3],x:function(s){job(s,'कॉल सेंटर एजेंट',150000);hl(s,'कॉल सेंटर में पहली नौकरी');return ''}}]},
{id:'hostel',a:[18,21],c:function(s){return !!s.deg},t:'कॉलेज के दोस्त रात भर पार्टी करना चाहते हैं।',o:[{t:'चलो, ज़िंदगी एक बार मिलती है',e:[-2000,-4,10,6]},{t:'लाइब्रेरी',e:[0,0,-2,0],x:function(s){s.study=(s.study||0)+1;return ''}}]},
{id:'smoke',a:[16,25],t:'दोस्त सिगरेट ऑफर करता है।',o:[{t:'एक कश में क्या जाता है',e:[0,-3,3,2],x:function(s){s.smoke=true;return 'धीरे-धीरे आदत लग गई।'}},{t:'मना कर दो',e:[0,2,0,0]}]},
{id:'intern',a:[19,22],c:function(s){return !!s.deg},t:'गर्मी की छुट्टियों में इंटर्नशिप का मौका।',o:[{t:'बिना पैसे की बड़ी कंपनी इंटर्नशिप',e:[0,-2,0,0],x:function(s){s.exp=(s.exp||0)+2;return 'रिज़्यूमे चमक गया।'}},{t:'पैसे वाली छोटी नौकरी',e:[15000,0,3,0],x:function(s){s.exp=(s.exp||0)+1;return ''}},{t:'घूमने जाओ (गोवा!)',e:[-8000,3,12,5]}]},
{id:'love1',a:[19,24],c:function(s){return !s.married&&!s.partner},t:'कॉलेज/काम पर कोई खास इंसान मिला है।',o:[{t:'प्रपोज़ करो',e:[0,0,0,0],p:.55,x:function(s){},gt:'',b:[0,0,-10,0],bt:'उन्होंने मना कर दिया। दिल टूटा। 💔',y:function(s){s.partner=pick(PN[s.g]);hl(s,s.partner+' से प्यार हुआ');return s.partner+' ने हाँ कह दिया! ❤️'}},{t:'करियर पहले',e:[0,0,-2,0]}]},
{id:'grad',a:[21,22],c:function(s){return !!s.deg&&!s.gradDone},t:'डिग्री पूरी हुई! कैंपस प्लेसमेंट का दिन।',o:[{t:'जो पहली नौकरी मिले, ले लो',e:[0,0,8,5],x:function(s){s.gradDone=1;s.edu=3;var m={eng:['सॉफ्टवेयर इंजीनियर',700000],med:['जूनियर डॉक्टर',600000],bsc:['लैब टेक्नीशियन',300000],bcom:['अकाउंटेंट',320000],ba:['कंटेंट राइटर',260000]}[s.deg];var inc=Math.round(m[1]*(1+(s.exp||0)*.1));job(s,m[0],inc);hl(s,'स्नातक; '+m[0]+' की नौकरी');return m[0]+' बने! सालाना ₹'+fmt(inc)}},
 {t:'आगे पढ़ो — MBA/MS (कर्ज़ लेकर)',e:[0,-3,0,0],x:function(s){s.gradDone=1;s.edu=4;s.loan=(s.loan||0)+600000;var inc=s.deg==='med'?1200000:1000000;job(s,s.deg==='med'?'विशेषज्ञ डॉक्टर':'मैनेजर',inc);hl(s,'स्नातकोत्तर पूरा; ऊँची नौकरी');return 'दो साल बाद ₹'+fmt(inc)+' की नौकरी, पर ₹6 लाख का एजुकेशन लोन।'}},
 {t:'सरकारी नौकरी (UPSC/MPSC) की तैयारी',e:[0,-4,-6,-3],p:.3,x:function(s){s.gradDone=1;s.edu=3},y:function(s){job(s,'सरकारी अधिकारी',800000);hl(s,'सरकारी अधिकारी बने!');return 'चयन हो गया! पूरा मोहल्ला मिठाई बाँट रहा है।'},b:[0,0,-10,0],bt:'तीन साल बाद भी चयन नहीं। छोटी प्राइवेट नौकरी ले ली।',z:function(s){job(s,'क्लर्क',240000)}}]},
{id:'nojob',a:[18,30],c:function(s){return !s.job&&!s.biz&&!(s.deg&&!s.gradDone)},t:'तुम्हारे पास कोई काम नहीं है। अब क्या?',o:[{t:'डिलीवरी बॉय/ड्राइवर का काम',e:[0,-3,-2,0],x:function(s){job(s,'डिलीवरी पार्टनर',180000);return ''}},{t:'पापा की रिपेयर दुकान संभालो',e:[0,0,3,8],x:function(s){job(s,'रिपेयर दुकान मालिक',220000);s.shopOwn=1;hl(s,'पापा की दुकान संभाली');return ''}},{t:'सेल्स की नौकरी',e:[0,-2,0,0],x:function(s){job(s,'सेल्स एग्ज़ीक्यूटिव',240000);return ''}}]},
{id:'firstsal',a:[20,26],c:function(s){return s.inc>0},t:'पहली सैलरी हाथ में! क्या करोगे?',o:[{t:'माँ-पापा के लिए तोहफ़ा',e:[-10000,0,10,15],gt:'माँ ने पहली बार तुम्हारे सामने खुशी के आँसू बहाए।'},{t:'नया फोन खुद के लिए',e:[-25000,0,10,0]},{t:'सब बचत खाते में',e:[0,0,2,0],x:function(s){s.inv+=20000;return ''}}]},
{id:'loanpay',a:[22,30],c:function(s){return (s.loan||0)>0},t:'परिवार/पढ़ाई का कर्ज़ बाकी है: ₹'+'कई हज़ार।',o:[{t:'एकमुश्त चुका दो (जितना हो सके)',e:[0,0,8,8],x:function(s){var p=Math.min(s.loan,Math.max(0,s.money));s.money-=p;s.loan-=p;return '₹'+fmt(p)+' चुकाए।'+(s.loan>0?' बाकी किस्तों में।':' कर्ज़ खत्म!')}},{t:'किस्तों में चलने दो',e:[0,0,-2,0]}]},
{id:'switch',a:[24,40],c:function(s){return s.inc>200000&&!s.biz},t:'दूसरी कंपनी से 40% ज़्यादा सैलरी का ऑफर, पर बेंगलुरु जाना होगा।',o:[{t:'ऑफर ले लो',e:[-30000,0,5,-8],x:function(s){s.inc=Math.round(s.inc*1.4);return 'नई सैलरी ₹'+fmt(s.inc)}},{t:'पुणे में परिवार के पास रहो',e:[0,0,3,8]}]},
{id:'boss',a:[23,50],c:function(s){return s.inc>0&&!s.biz},t:'बॉस रोज़ देर रात तक काम करवाता है।',o:[{t:'चुपचाप करते रहो',e:[0,-6,-6,-3],p:.5,gt:'प्रमोशन मिला!',x:function(s){},y:function(s){s.inc=Math.round(s.inc*1.2);return 'प्रमोशन! सैलरी अब ₹'+fmt(s.inc)},b:[0,0,-3,0],bt:'मेहनत किसी ने नहीं देखी।'},{t:'साफ़ बात करो, सीमा तय करो',e:[0,3,4,0],p:.7,b:[0,0,-5,0],bt:'बॉस नाराज़ हो गया।'},{t:'नौकरी छोड़ दो',e:[0,5,5,0],x:function(s){job(s,'',0);return 'अब नई नौकरी ढूँढनी होगी।'}}]},
{id:'startup',a:[24,45],c:function(s){return !s.biz},t:'तुम्हारे मन में अपना बिज़नेस शुरू करने का आइडिया है।',o:[{t:'मोबाइल रिपेयर-ऐप स्टार्टअप (₹2 लाख लगाओ)',e:[-200000,-4,5,-3],p:.45,x:function(s){},y:function(s){s.biz=1;job(s,'स्टार्टअप फाउंडर',1200000);hl(s,'अपना स्टार्टअप सफल हुआ!');return 'बिज़नेस चल निकला! 🚀'},b:[0,0,-12,-3],bt:'स्टार्टअप डूब गया। पैसे गए।'},{t:'छोटा कैफ़े (₹1 लाख)',e:[-100000,-2,6,0],p:.6,y:function(s){s.biz=1;job(s,'कैफ़े मालिक',500000);hl(s,'अपना कैफ़े खोला');return 'कैफ़े लोगों को पसंद आया ☕'},b:[0,0,-8,0],bt:'किराया और घाटा, कैफ़े बंद करना पड़ा।'},{t:'जोखिम नहीं, नौकरी ठीक है',e:[0,0,0,0]}]},
{id:'marry',a:[24,35],c:function(s){return !s.married},t:'घर वाले शादी की बात कर रहे हैं।',o:[
 {t:function(s){return s.partner+' से शादी (लव मैरिज)'},c:function(s){return !!s.partner},e:[-150000,0,15,10],x:function(s){s.married=true;hl(s,s.partner+' से शादी');return 'शादी हो गई! 💍'}},
 {t:'अरेंज्ड मैरिज के लिए हाँ',e:[-250000,0,8,10],x:function(s){s.partner=s.partner||pick(PN[s.g]);s.married=true;hl(s,s.partner+' से अरेंज्ड शादी');return s.partner+' जीवनसाथी बने।'}},
 {t:'अभी नहीं',e:[0,0,0,-8]}]},
{id:'bigwed',a:[24,36],c:function(s){return s.married&&!s.wedDone},t:'शादी का समारोह कैसा हो?',o:[{t:'धूमधाम से, 500 मेहमान',e:[-300000,0,10,8],x:function(s){s.wedDone=1;return ''}},{t:'सादा रजिस्टर्ड, पैसे बचाओ',e:[0,0,3,-2],x:function(s){s.wedDone=1;return ''}}]},
{id:'kid',a:[25,42],c:function(s){return s.married&&s.kids<3},t:'क्या परिवार बढ़ाने का समय है?',o:[{t:'हाँ, बच्चा चाहिए',e:[-50000,-2,15,10],x:function(s){s.kids++;var k=pick(KN);hl(s,'बच्चे '+k+' का जन्म');return k+' का जन्म हुआ! 👶'}},{t:'अभी नहीं',e:[0,0,0,-3]}]},
{id:'kidschool',a:[30,50],c:function(s){return s.kids>0&&!s.kidsch},t:'बच्चे का स्कूल चुनना है — अब तुम उसी दुविधा में हो जिसमें तुम्हारी माँ थीं।',o:[{t:'महँगा इंटरनेशनल स्कूल',e:[-150000,0,3,8],x:function(s){s.kidsch=2;return ''}},{t:'अच्छा सीबीएसई स्कूल',e:[-50000,0,3,5],x:function(s){s.kidsch=1;return ''}}]},
{id:'house',a:[27,55],c:function(s){return !s.house},t:'पुणे में अपना 2BHK फ्लैट — ₹15 लाख डाउन पेमेंट चाहिए।',o:[{t:'होम लोन लेकर खरीदो',c:function(s){return s.money>=1500000},e:[-1500000,0,15,10],x:function(s){s.house=true;hl(s,'अपना घर खरीदा 🏠');return 'अपना घर! माँ-पापा का सपना पूरा।'}},{t:'छोटा पुराना फ्लैट (₹5 लाख)',c:function(s){return s.money>=500000},e:[-500000,0,10,6],x:function(s){s.house=true;hl(s,'छोटा अपना घर खरीदा');return ''}},{t:'अभी किराया ठीक है',e:[0,0,-2,0]}]},
{id:'car',a:[25,55],c:function(s){return !s.car&&s.money>300000},t:'कार खरीदें?',o:[{t:'नई SUV (₹12 लाख)',c:function(s){return s.money>1200000},e:[-1200000,0,10,3],x:function(s){s.car=true;return ''}},{t:'सेकेंड-हैंड छोटी कार (₹3 लाख)',e:[-300000,0,6,3],x:function(s){s.car=true;return ''}},{t:'बस और बाइक काफी है',e:[0,0,0,0]}]},
{id:'stock',a:[23,65],c:function(s){return s.money>50000},t:'दोस्त कहता है एक स्टॉक दोगुना होने वाला है।',o:[{t:'आधी बचत लगा दो',e:[0,0,0,0],x:function(s){var a=Math.floor(s.money/2);if(R()<.4){s.money+=a;return '₹'+fmt(a)+' का मुनाफ़ा! 📈'}s.money-=Math.floor(a*.6);s.j=cl(s.j-8);return '₹'+fmt(Math.floor(a*.6))+' डूब गए। 📉'}},{t:'म्यूचुअल फंड SIP शुरू करो',e:[0,0,3,0],x:function(s){var a=Math.floor(s.money*.3);s.money-=a;s.inv+=a;return '₹'+fmt(a)+' निवेश किए।'}},{t:'कुछ मत करो',e:[0,0,0,0]}]},
{id:'gym',a:[22,60],t:'वज़न बढ़ रहा है, डॉक्टर ने व्यायाम कहा है।',o:[{t:'जिम/योग शुरू करो',e:[-12000,10,5,0],x:function(s){s.fit=1;return ''}},{t:'सुबह की सैर',e:[0,6,3,0]},{t:'कल से पक्का...',e:[0,-5,0,0]}]},
{id:'quitsmoke',a:[25,70],c:function(s){return s.smoke},t:'खाँसी बढ़ रही है। सिगरेट छोड़ोगे?',o:[{t:'हाँ, आज से बंद',e:[0,8,-6,5],p:.6,x:function(s){},y:function(s){s.smoke=false;hl(s,'सिगरेट छोड़ी');return 'तुमने सच में छोड़ दी! 💪'},b:[0,0,-4,0],bt:'तीन हफ्ते बाद फिर शुरू हो गई।'},{t:'नहीं',e:[0,-5,2,-3]}]},
{id:'parentill',a:[28,50],c:function(s){return s.parents>0},t:'पापा राकेश को दिल का दौरा पड़ा। ऑपरेशन में ₹3 लाख लगेंगे।',o:[{t:'जो भी हो, ऑपरेशन करवाओ',e:[-300000,-2,-5,15],p:.8,gt:'पापा बच गए और दुकान पर फिर बैठने लगे।',b:[0,0,-15,5],bt:'ऑपरेशन के बाद भी पापा नहीं बचे। 🕯️',z:function(s){s.parents--;hl(s,'पापा का निधन')}},{t:'सरकारी अस्पताल',e:[-30000,0,-8,0],p:.5,gt:'पापा ठीक हो गए।',b:[0,0,-20,-5],bt:'पापा नहीं रहे। मन में अफ़सोस रहेगा।',z:function(s){s.parents--;hl(s,'पापा का निधन')}}]},
{id:'momretire',a:[30,45],c:function(s){return s.parents>0},t:'माँ अंजलि रिटायर हो गई हैं। उन्हें अपने साथ रखोगे?',o:[{t:'हाँ, माँ साथ रहेंगी',e:[-20000,0,8,12]},{t:'हर महीने पैसे भेजूँगा',e:[-60000,0,0,3]}]},
{id:'parentdie',a:[50,70],c:function(s){return s.parents>0},t:'माँ बहुत बूढ़ी हो गई हैं और बीमार हैं।',o:[{t:'आखिरी दिनों में पास रहो',e:[-50000,0,-10,15],x:function(s){s.parents=0;hl(s,'माँ का निधन');return 'माँ तुम्हारा हाथ पकड़कर शांति से चली गईं।'}},{t:'काम ज़रूरी है',e:[0,0,-18,-10],x:function(s){s.parents=0;hl(s,'माँ का निधन');return 'तुम पहुँचे तब तक देर हो चुकी थी।'}}]},
{id:'fight',a:[27,60],c:function(s){return s.married},t:function(s){return s.partner+' से पैसों को लेकर बड़ा झगड़ा हुआ।'},o:[{t:'माफ़ी माँगो और बात करो',e:[0,0,3,10]},{t:'अड़े रहो',e:[0,-2,-8,-12],p:.8,b:[-200000,0,-20,-20],bt:'बात तलाक तक पहुँच गई। 💔',z:function(s){s.married=false;hl(s,'तलाक');s.partner=''}}]},
{id:'affair',a:[30,50],c:function(s){return s.married},t:'ऑफिस में कोई तुमसे नज़दीकियाँ बढ़ा रहा है।',o:[{t:'सख़्ती से दूरी बनाओ',e:[0,0,0,5]},{t:'थोड़ी बात करने में क्या है',e:[0,0,5,-5],p:.6,b:[-300000,0,-20,-30],bt:'सब पकड़ा गया। तलाक हो गया।',z:function(s){s.married=false;s.partner='';hl(s,'धोखे के बाद तलाक')}}]},
{id:'vacation',a:[25,70],c:function(s){return s.money>100000},t:'छुट्टी की योजना।',o:[{t:'विदेश यात्रा (₹2 लाख)',c:function(s){return s.money>200000},e:[-200000,3,15,8],x:function(s){hl(s,'पहली विदेश यात्रा ✈️');return ''}},{t:'कोंकण/महाबलेश्वर ट्रिप',e:[-30000,3,8,5]},{t:'घर पर आराम',e:[0,2,2,0]}]},
{id:'kidtrouble',a:[38,60],c:function(s){return s.kids>0},t:'तुम्हारा बच्चा पढ़ाई छोड़कर म्यूज़िक/खेल में करियर चाहता है।',o:[{t:'उसके सपने का साथ दो',e:[-50000,0,5,12],p:.5,gt:'बच्चे ने कमाल कर दिया, राज्य स्तर पर नाम हुआ!',b:[0,0,-3,5],bt:'आसान नहीं रहा, पर रिश्ता मज़बूत हुआ।'},{t:'नहीं, पहले डिग्री',e:[0,0,-3,-10]}]},
{id:'kidwed',a:[50,70],c:function(s){return s.kids>0&&!s.kidwed},t:'बच्चे की शादी तय हुई।',o:[{t:'धूमधाम से करो',e:[-600000,0,12,10],x:function(s){s.kidwed=1;hl(s,'बच्चे की शादी');return ''}},{t:'सादगी से',e:[-100000,0,8,8],x:function(s){s.kidwed=1;hl(s,'बच्चे की शादी');return ''}}]},
{id:'grandkid',a:[55,80],c:function(s){return s.kidwed&&!s.gk},t:'तुम दादा/दादी (या नाना/नानी) बन गए! 👶',o:[{t:'पोते-पोती के साथ खूब समय बिताओ',e:[0,3,15,12],x:function(s){s.gk=1;hl(s,'दादा/दादी बने');return ''}},{t:'बच्चों को अपनी तरह से पालने दो',e:[0,0,8,5],x:function(s){s.gk=1;return ''}}]},
{id:'midlife',a:[40,50],t:'40 पार... लगता है ज़िंदगी में कुछ छूट गया।',o:[{t:'नया शौक — गिटार/पेंटिंग',e:[-15000,0,12,3]},{t:'मैराथन की ट्रेनिंग',e:[-5000,8,8,0]},{t:'बाइक लेकर लद्दाख',e:[-80000,-3,18,0],p:.85,b:[-50000,-15,0,0],bt:'रास्ते में दुर्घटना, कुछ हफ्ते अस्पताल में।'}]},
{id:'checkup',a:[40,80],t:'सालाना हेल्थ चेकअप करवाओगे?',o:[{t:'हाँ, पूरा चेकअप',e:[-8000,6,0,0],x:function(s){if(R()<.3){s.h=cl(s.h+6);return 'शुगर की शुरुआत पकड़ी गई, समय पर इलाज शुरू।'}return 'सब ठीक है।'}},{t:'मैं ठीक हूँ',e:[0,-3,0,0]}]},
{id:'diabetes',a:[45,75],c:function(s){return !s.fit},t:'डॉक्टर: "तुम्हें डायबिटीज़ है।"',o:[{t:'खान-पान बदलो, रोज़ सैर',e:[-10000,0,-5,0],x:function(s){s.fit=1;return 'शुगर कंट्रोल में आ गई।'}},{t:'सिर्फ दवाई, मिठाई चालू',e:[-15000,-10,3,0]}]},
{id:'layoff',a:[35,58],c:function(s){return s.inc>0&&!s.biz&&s.job!=='सरकारी अधिकारी'},t:'कंपनी में छँटनी की अफ़वाह है।',o:[{t:'नई स्किल सीखो (AI कोर्स)',e:[-40000,-2,0,0],x:function(s){if(R()<.7){s.inc=Math.round(s.inc*1.15);return 'तुम बचे और प्रमोशन भी मिला!'}return 'फिर भी नौकरी पर तलवार लटकी है।'}},{t:'कुछ नहीं होगा',e:[0,0,0,0],p:.6,b:[0,0,-15,0],bt:'तुम्हारा नाम छँटनी की लिस्ट में था।',z:function(s){s.inc=Math.round(s.inc*.5);s.job='फ्रीलांसर';hl(s,'नौकरी गई, फ्रीलांसिंग शुरू')}}]},
{id:'bizgrow',a:[28,60],c:function(s){return s.biz},t:'बिज़नेस बढ़ाने के लिए इन्वेस्टर पैसा देना चाहता है, पर 40% हिस्सा माँगता है।',o:[{t:'डील करो',e:[0,-3,5,0],p:.6,y:function(s){s.inc=Math.round(s.inc*1.8);hl(s,'बिज़नेस में बड़ा निवेश मिला');return 'कमाई लगभग दोगुनी! 💼'},b:[0,0,-10,0],bt:'इन्वेस्टर से विवाद हुआ, कमाई घटी।',z:function(s){s.inc=Math.round(s.inc*.7)}},{t:'अपनी रफ़्तार से',e:[0,2,3,0]}]},
{id:'bizsell',a:[45,65],c:function(s){return s.biz},t:'एक बड़ी कंपनी तुम्हारा बिज़नेस खरीदना चाहती है।',o:[{t:'बेच दो (₹'+'50 लाख)',e:[5000000,0,10,0],x:function(s){s.biz=0;job(s,'सलाहकार',600000);hl(s,'बिज़नेस बेचा ₹50 लाख में');return ''}},{t:'यह मेरा बच्चा है, नहीं बेचूँगा',e:[0,0,3,0]}]},
{id:'land',a:[30,60],c:function(s){return s.money>800000},t:'गाँव के पास ज़मीन सस्ते में मिल रही है (₹8 लाख)।',o:[{t:'खरीद लो',e:[-800000,0,3,0],x:function(s){s.land=1;return ''}},{t:'नहीं',e:[0,0,0,0]}]},
{id:'landboom',a:[40,75],c:function(s){return s.land},t:'तुम्हारी ज़मीन के पास हाईवे बन रहा है!',o:[{t:'बेच दो (₹40 लाख)',e:[4000000,0,15,0],x:function(s){s.land=0;hl(s,'ज़मीन से ₹40 लाख कमाए');return ''}},{t:'रखो, और बढ़ेगी',e:[0,0,3,0]}]},
{id:'charity',a:[35,85],c:function(s){return s.money>200000},t:'तुम्हारे पुराने सरकारी स्कूल को नई लाइब्रेरी की ज़रूरत है।',o:[{t:'₹1 लाख दान करो',e:[-100000,0,12,10],x:function(s){hl(s,'पुराने स्कूल को लाइब्रेरी दान की');return ''}},{t:'₹10,000 दो',e:[-10000,0,4,3]},{t:'माफ़ करो',e:[0,0,0,0]}]},
{id:'reunion',a:[30,70],t:'स्कूल रीयूनियन का बुलावा आया।',o:[{t:'ज़रूर जाओ',e:[-3000,0,10,10],x:function(s){return s.bff?'बचपन के पक्के दोस्त से मिलकर आँखें भर आईं।':''}},{t:'नहीं जाना',e:[0,0,0,-3]}]},
{id:'politics',a:[35,65],t:'मोहल्ले वाले चाहते हैं तुम नगरसेवक का चुनाव लड़ो।',o:[{t:'लड़ो! (₹2 लाख खर्च)',e:[-200000,-3,0,5],p:.35,y:function(s){hl(s,'नगरसेवक का चुनाव जीते');return 'तुम जीत गए! 🗳️'},gt:'',b:[0,0,-10,0],bt:'चुनाव हार गए।'},{t:'राजनीति मेरे बस की नहीं',e:[0,0,0,0]}]},
{id:'retire',a:[58,62],c:function(s){return s.inc>0&&!s.retired},t:'रिटायरमेंट का समय आ गया।',o:[{t:'रिटायर हो जाओ',e:[0,5,10,5],x:function(s){s.retired=1;s.inc=s.job==='सरकारी अधिकारी'?Math.round(s.inc*.5):Math.round(s.inc*.1);s.job='सेवानिवृत्त';hl(s,'सेवानिवृत्ति');return 'पेंशन/आय: ₹'+fmt(s.inc)+' सालाना'}},{t:'कुछ साल और काम करो',e:[0,-4,-3,0]}]},
{id:'retire2',a:[66,70],c:function(s){return s.inc>0&&!s.retired},t:'अब शरीर थकने लगा है। काम छोड़ोगे?',o:[{t:'हाँ, अब आराम',e:[0,5,8,3],x:function(s){s.retired=1;s.inc=Math.round(s.inc*.1);s.job='सेवानिवृत्त';hl(s,'सेवानिवृत्ति');return ''}}]},
{id:'pilgrim',a:[60,85],t:'तीर्थ यात्रा पर जाने का मन है — पंढरपुर की वारी।',o:[{t:'पैदल वारी में शामिल हो',e:[-5000,-4,15,8]},{t:'बस से जाओ',e:[-10000,0,8,3]},{t:'घर पर भजन',e:[0,0,3,0]}]},
{id:'lonely',a:[65,95],t:'बुढ़ापे में अकेलापन महसूस होता है।',o:[{t:'सीनियर सिटिज़न क्लब जॉइन करो',e:[-2000,3,10,10]},{t:'मोहल्ले के बच्चों को मुफ़्त पढ़ाओ, माँ की तरह',e:[0,0,12,12],gt:'बच्चे तुम्हें "गुरुजी" कहने लगे।'},{t:'टीवी ही साथी है',e:[0,-3,-5,-5]}]},
{id:'will',a:[70,90],c:function(s){return !s.will},t:'वसीयत बनाने का समय है।',o:[{t:'बच्चों/परिवार के नाम',e:[0,0,3,8],x:function(s){s.will=1;return ''}},{t:'आधा दान, आधा परिवार',e:[0,0,8,3],x:function(s){s.will=1;hl(s,'आधी संपत्ति दान की वसीयत');return ''}}]},
{id:'fall',a:[70,95],t:'बाथरूम में फिसलने का डर रहता है।',o:[{t:'ग्रैब-बार लगवाओ, सावधान रहो',e:[-10000,3,0,0]},{t:'कुछ नहीं होगा',e:[0,0,0,0],p:.7,b:[-80000,-20,-10,0],bt:'गिर गए, कूल्हे की हड्डी टूटी।'}]},
{id:'memoir',a:[68,95],t:'पोता-पोती पूछते हैं: "आपकी ज़िंदगी की कहानी क्या है?"',o:[{t:'डायरी में आत्मकथा लिखो',e:[0,0,12,8],x:function(s){hl(s,'आत्मकथा लिखी');return ''}},{t:'पुरानी तस्वीरें दिखाकर किस्से सुनाओ',e:[0,0,10,10]}]},
{id:'tech',a:[60,90],t:'बच्चों ने स्मार्टफोन पर UPI सिखाने की कोशिश की।',o:[{t:'सीखो!',e:[0,0,6,5]},{t:'नहीं, कैश ही ठीक',e:[0,0,0,-2],p:.7,b:[-20000,0,-5,0],bt:'नकली नोट थमा दिया किसी ने।'}]},
{id:'garden',a:[55,95],t:'घर की बालकनी में कुछ उगाओगे?',o:[{t:'तुलसी और सब्ज़ियाँ',e:[-1000,4,8,0]},{t:'नहीं',e:[0,0,0,0]}]},
{id:'scamcall',a:[50,95],c:function(s){return s.money>50000},t:'फ़ोन आया: "आपका बैंक खाता बंद होगा, OTP बताइए।"',o:[{t:'OTP बता दो',e:[0,0,0,0],x:function(s){var l=Math.min(s.money,Math.floor(s.money*.3));s.money-=l;s.j=cl(s.j-15);hl(s,'ऑनलाइन ठगी का शिकार');return '₹'+fmt(l)+' खाते से गायब! 😱'}},{t:'फ़ोन काट दो',e:[0,0,3,0]}]},
{id:'sidegig',a:[22,55],c:function(s){return s.tech},t:'मोहल्ले में लोग अपने फोन ठीक करवाने तुम्हारे पास आते हैं।',o:[{t:'वीकेंड पर साइड-बिज़नेस',e:[40000,-3,3,5]},{t:'मुफ़्त में कर दो',e:[0,0,5,10]}]},
{id:'teacher',a:[22,40],c:function(s){return s.edu>=3},t:'माँ की तरह टीचर बनने का ऑफर आया — कम पैसा, ज़्यादा सुकून।',o:[{t:'टीचर बनो',e:[0,3,10,8],x:function(s){job(s,'शिक्षक',350000);hl(s,'शिक्षक बने, माँ की तरह');return ''}},{t:'नहीं',e:[0,0,0,0]}]},
{id:'abroad',a:[23,35],c:function(s){return s.edu>=3},t:'जर्मनी में नौकरी का ऑफर!',o:[{t:'विदेश चले जाओ',e:[-150000,0,8,-15],x:function(s){job(s,'विदेश में इंजीनियर',4000000);hl(s,'जर्मनी में बसे');return 'यूरो में कमाई! पर घर की याद आती है।'}},{t:'भारत में ही रहो',e:[0,0,0,5]}]}
];
var RE=[
{t:'🎟️ तुमने लॉटरी जीती!',a:[18,99],e:[200000,0,15,0],g:1},
{t:'📈 शानदार काम के लिए प्रमोशन!',a:[23,58],c:function(s){return s.inc>0&&!s.retired},e:[0,0,10,0],x:function(s){s.inc=Math.round(s.inc*1.25);return 'नई आय ₹'+fmt(s.inc)},g:1},
{t:'📜 दूर के चाचा से विरासत मिली।',a:[20,80],e:[500000,0,5,0],g:1},
{t:'🎁 बचपन में तुमने एक इनाम जीता।',a:[6,15],e:[2000,0,10,3],g:1},
{t:'🏆 पुराने दोस्त ने बड़ा बिज़नेस डील दिलाया।',a:[25,60],e:[150000,0,8,5],g:1},
{t:'🤒 डेंगू हो गया।',a:[3,90],e:[-20000,-15,-8,0]},
{t:'🚗 सड़क दुर्घटना!',a:[16,90],e:[-60000,-25,-10,0]},
{t:'🌊 पुणे में बाढ़, घर में पानी भर गया।',a:[1,99],e:[-50000,-5,-10,5]},
{t:'💸 चिट-फंड घोटाले में पैसा फँसा।',a:[25,80],c:function(s){return s.money>100000},x:function(s){var l=Math.floor(s.money*.25);s.money-=l;return '₹'+fmt(l)+' डूबे।'},e:[0,0,-12,0]},
{t:'📉 नौकरी चली गई!',a:[23,57],c:function(s){return s.inc>0&&!s.biz&&!s.retired},x:function(s){s.inc=Math.round(s.inc*.6);s.job='कम वेतन की नौकरी';hl(s,'नौकरी छूटी');return 'नई नौकरी मिली, पर आय कम: ₹'+fmt(s.inc)},e:[-30000,0,-15,0]},
{t:'😷 महामारी का लॉकडाउन।',a:[5,99],e:[-30000,-8,-10,8]},
{t:'🫀 सीने में दर्द, अस्पताल में भर्ती।',a:[45,99],e:[-150000,-20,-8,5]},
{t:'🦷 दाँत में भयंकर दर्द, रूट कैनाल।',a:[20,90],e:[-12000,-4,-3,0]}
];
function fmt(n){n=Math.round(n);var neg=n<0;n=Math.abs(n);var s=String(n),l=s.slice(-3),r=s.slice(0,-3);if(r)l=r.replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+l;return (neg?'-':'')+l}
function txt(v,s){return typeof v==='function'?v(s):v}
function okOpt(o,s){return !o.c||o.c(s)}
function fallback(s){
 var st=s.age<18?'पढ़ाई और खेल-कूद में':(s.age<60?'काम और घर-परिवार में':'आराम और यादों में');
 return {id:'gen',t:'एक और साल '+st+' बीत रहा है। इस साल किस पर ध्यान दोगे?',o:[
 {t:'सेहत पर',e:[s.age<18?0:-5000,6,2,0]},{t:'परिवार-दोस्तों पर',e:[s.age<18?0:-5000,0,4,8]},
 {t:s.age<18?'पढ़ाई पर':(s.age<60?'कमाई पर':'शौक पर'),e:[s.age<18||s.age>=60?0:30000,-3,s.age>=60?6:0,-2],x:function(s){if(s.age<18)s.study=(s.study||0)+1;return ''}}]};
}
function pickEvent(s){
 var el=EV.filter(function(e){return !s.used[e.id]&&s.age>=e.a[0]&&s.age<=e.a[1]&&(!e.c||e.c(s))&&e.o.some(function(o){return okOpt(o,s)})});
 // milestone events (single-age window) get priority
 var must=el.filter(function(e){return e.a[0]===e.a[1]||s.age===e.a[1]&&e.a[1]-e.a[0]<=2});
 if(must.length)return must[0];
 if(el.length&&R()<.9)return pick(el);
 return fallback(s);
}
function addFx(fx,e){if(!e)return;for(var i=0;i<4;i++)fx[i]+=e[i]||0}
function applyFx(s,e){s.money+=e[0];s.h=cl(s.h+e[1]);s.j=cl(s.j+e[2]);s.r=cl(s.r+e[3])}
function choose(s,idx){
 var ev=curEv(s);var opts=ev.o.filter(function(o){return okOpt(o,s)});var o=opts[idx];if(!o)return null;
 if(ev.id!=='gen')s.used[ev.id]=1;
 var b={m:s.money,h:s.h,j:s.j,r:s.r};var msg=[];
 applyFx(s,o.e||[0,0,0,0]);
 if(o.x){var m=o.x(s);if(m)msg.push(m)}
 if(o.p!==undefined){
  if(R()<o.p){if(o.y){var m2=o.y(s);if(m2)msg.push(m2)}if(o.gt)msg.push(o.gt)}
  else{applyFx(s,o.b||[0,0,0,0]);if(o.z)o.z(s);if(o.bt)msg.push(o.bt)}
 }else if(o.gt)msg.push(o.gt);
 var d=[s.money-b.m,s.h-b.h,s.j-b.j,s.r-b.r];
 s.log.unshift({a:s.age,t:txt(o.t,s),m:msg.join(' '),k:false});
 if(s.log.length>80)s.log.length=80;
 s.res={msg:msg.join(' '),d:d,choice:txt(o.t,s)};
 s.cur=null;
 if(s.h<=0){die(s,'बीमारी और कमज़ोरी');}
 return s.res;
}
function yearly(s){
 var d=[0,0,0,0];
 if(s.age>=18){var exp=s.age<22&&!s.inc?20000:60000+s.kids*30000+(s.house?0:48000);if(s.retired)exp=50000+(s.house?0:48000);
  var net=s.inc-exp;if(s.loan>0){var emi=Math.min(s.loan,s.inc>0?Math.max(50000,s.loan*.15):0);s.loan-=emi;net-=emi}
  s.money+=net;d[0]+=net;
  if(s.inv>0){var g=Math.round(s.inv*(R()*.2-.02));s.inv+=g;d[0]+=0}
 }
 var hd=0;if(s.age<50&&s.h<70)hd+=2;if(s.age>45)hd-=(s.age-45)/22+R();if(s.age>75)hd-=(s.age-75)/8;if(s.smoke)hd-=2;if(s.fit)hd+=1;if(s.age<30)hd+=1;
 if(s.money<0&&s.age>=18){s.j=cl(s.j-6);d[2]-=6}
 if(s.j<20){hd-=2}
 s.h=cl(s.h+hd);d[1]+=Math.round(hd);
 // relationships drift
 s.r=cl(s.r+(s.married?1:-1)+(s.kids?1:0));
 return d;
}
function die(s,c){s.dead=true;s.cause=c;s.hl.push({a:s.age,t:'निधन — '+c});save()}
function deathCheck(s){
 if(s.h<=0){die(s,s.age>70?'बुढ़ापे की बीमारी':'गंभीर बीमारी');return true}
 var p=0;if(s.age>60)p+=Math.pow((s.age-60)/40,3)*.35;if(s.h<25)p+=(25-s.h)/250;if(s.age<5)p=0;
 if(R()<p){die(s,s.h<30?'लंबी बीमारी':(s.age>75?'नींद में शांति से, बुढ़ापे में':'अचानक दिल का दौरा'));return true}
 if(s.age>=100){die(s,'पूरे सौ साल जीकर, शांति से');return true}
 return false;
}
function nextYear(s){
 s.res=null;
 if(s.age===0&&s.used.birth)s.age=5;else if(s.used.birth)s.age++;
 var rnd_=null,d=[0,0,0,0];
 if(s.age>0){d=yearly(s);if(deathCheck(s))return;
  if(R()<.18){var pool=RE.filter(function(e){return s.age>=e.a[0]&&s.age<=e.a[1]&&(!e.c||e.c(s))});
   if(pool.length){var e=pick(pool);var b=[s.money,s.h,s.j,s.r];applyFx(s,e.e);var m=e.x?e.x(s):'';
    rnd_={t:e.t,m:m,g:!!e.g,d:[s.money-b[0],s.h-b[1],s.j-b[2],s.r-b[3]]};
    s.log.unshift({a:s.age,t:e.t,m:m,k:true});if(Math.abs(e.e[0])>=100000||e.e[1]<=-20)hl(s,e.t);
    if(deathCheck(s))return;}}
 }
 s.rnd=rnd_;s.yd=d;
 var ev=pickEvent(s);s.cur={id:ev.id,src:ev};
}
function curEv(s){if(!s.cur)return null;return s.cur.id==='gen'?fallback(s):EV.filter(function(e){return e.id===s.cur.id})[0]}
function score(s){
 var sc=s.age*0.5+s.j*0.15+s.r*0.15+s.edu*3+(s.married?5:0)+s.kids*3+(s.house?5:0)+Math.min(15,Math.max(0,Math.log10(Math.max(1,s.money+s.inv))*2-6));
 return Math.max(1,Math.min(100,Math.round(sc)));
}
function rating(n){return n>=80?'⭐⭐⭐⭐⭐ असाधारण जीवन':n>=65?'⭐⭐⭐⭐ बहुत अच्छा जीवन':n>=50?'⭐⭐⭐ संतोषजनक जीवन':n>=35?'⭐⭐ संघर्ष भरा जीवन':'⭐ कठिन जीवन'}
function save(){try{if(typeof localStorage!=='undefined')localStorage.setItem('zindagi_save',JSON.stringify(S))}catch(e){}}
function load(){try{var d=localStorage.getItem('zindagi_save');return d?JSON.parse(d):null}catch(e){return null}}

module.exports={newGame,nextYear,choose,curEv,okOpt,score,rating,EV,RE,fmt,txt,EDU,cl};
