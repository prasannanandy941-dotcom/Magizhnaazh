# Translation rules (read before translating any chunk)

Files: `work/chunks/NN.txt` = English, one per line as `id | English   ⟦context⟧`.
Output: `work/<lang>/NN.txt` = one line per id, `id | translation` (same ids, same order).
`⟦…⟧` is CONTEXT ONLY (the whole sentence a fragment belongs to) — never copy it.
Then run `node packages/shared-ui/i18n/scripts/build-locales.cjs` (validates placeholders).

Languages: ta hi te ml kn bn mr gu pa or as

## Rules
1. Natural, polite, everyday UI language — what a native speaker would see in a good app. Short for buttons/labels.
2. Keep unchanged (Latin): brand/product names (Magizhnaazh, Razorpay, Google, WhatsApp, Instagram, Cashfree, Canva, Brevo), acronyms (UPI, GST, GSTIN, PAN, OTP, FSSAI, HD, 4K, PDF, QR, DJ, ID, AC, RSVP, CCTV), the ₹ sign, digits, emails, URLs, and every `{0}` `{1}` … placeholder (keep them exactly, move them where the grammar needs).
3. Fragments (strings that have a ⟦context⟧): the fragment is displayed next to other pieces (bold words, values). Translate ONLY the marked fragment, choosing a split so the pieces read as one grammatical sentence in that language (verb-final languages: put the verb in the piece that comes last). Keep any leading/trailing punctuation the fragment has (e.g. a leading ", " or trailing " (").
4. Keep the same punctuation style: "..." / "…" / "!" / ":" / "—" as in the English. Use the language's own sentence-ending mark only if the English ends with "." — use "." for bn/hi/mr etc.? NO: keep "." (do not use ।) so pieces join consistently.
5. Digits stay Latin (0-9) in every language.
6. Days/months/relative words are translated. Units (km, hrs, pcs) → local short word where natural, otherwise keep.
7. Cultural/ceremony names (Nichayathartham, Upanayanam, Valaikappu, Baraat, Saptapadi, Annaprasanam, Namakaranam, Brahmopadesam …): use the language's own established name/spelling in its own script.
8. Food/dish names (Sambar, Rasam, Payasam, Naan, Jalebi …): write in the language's script (transliterate); brand names (Pepsi, Coca-Cola, Fanta, Sprite, Mastercard, Visa, RuPay) stay Latin.
9. City / state names: the standard name in that language's script.
10. If a string is only a code/name that must stay as is, repeat it unchanged.
11. Never leave English words that have a normal native equivalent, except the acronyms/brands above and the terms in the table below where "Latin" is shown.

## Key terms (use exactly these everywhere)
| English | ta | hi | te | ml | kn | bn | mr | gu | pa | or | as |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Vendor | விற்பனையாளர் | विक्रेता | విక్రేత | വെണ്ടർ | ಮಾರಾಟಗಾರ | বিক্রেতা | विक्रेता | વિક્રેતા | ਵਿਕਰੇਤਾ | ବିକ୍ରେତା | বিক্ৰেতা |
| Customer | வாடிக்கையாளர் | ग्राहक | కస్టమర్ | ഉപഭോക്താവ് | ಗ್ರಾಹಕ | গ্রাহক | ग्राहक | ગ્રાહક | ਗਾਹਕ | ଗ୍ରାହକ | গ্ৰাহক |
| Booking | முன்பதிவு | बुकिंग | బుకింగ్ | ബുക്കിംഗ് | ಬುಕಿಂಗ್ | বুকিং | बुकिंग | બુકિંગ | ਬੁਕਿੰਗ | ବୁକିଂ | বুকিং |
| Event | நிகழ்வு | कार्यक्रम | ఈవెంట్ | പരിപാടി | ಕಾರ್ಯಕ್ರಮ | অনুষ্ঠান | कार्यक्रम | કાર્યક્રમ | ਸਮਾਗਮ | କାର୍ଯ୍ୟକ୍ରମ | অনুষ্ঠান |
| Advance (payment) | முன்பணம் | अग्रिम राशि | అడ్వాన్స్ | അഡ്വാൻസ് | ಮುಂಗಡ | অগ্রিম | आगाऊ रक्कम | એડવાન્સ | ਅਗਾਊਂ ਰਕਮ | ଅଗ୍ରିମ | অগ্ৰিম |
| Balance | மீதித் தொகை | शेष राशि | మిగిలిన మొత్తం | ബാക്കി തുക | ಬಾಕಿ ಮೊತ್ತ | বাকি টাকা | उर्वरित रक्कम | બાકી રકમ | ਬਕਾਇਆ ਰਕਮ | ବାକି ଟଙ୍କା | বাকী ধন |
| Package | பேக்கேஜ் | पैकेज | ప్యాకేజీ | പാക്കേജ് | ಪ್ಯಾಕೇಜ್ | প্যাকেজ | पॅकेज | પેકેજ | ਪੈਕੇਜ | ପ୍ୟାକେଜ୍ | পেকেজ |
| Quote | மதிப்பீடு | कोटेशन | కోటేషన్ | ക്വട്ടേഷൻ | ಕೊಟೇಶನ್ | কোটেশন | कोटेशन | ક્વોટેશન | ਕੋਟੇਸ਼ਨ | କୋଟେସନ୍ | কোটেচন |
| Invoice | விலைப்பட்டியல் | चालान | ఇన్వాయిస్ | ഇൻവോയ്സ് | ಇನ್‌ವಾಯ್ಸ್ | ইনভয়েস | बिल | ઇન્વૉઇસ | ਇਨਵੌਇਸ | ଇନଭଏସ୍ | ইনভইচ |
| Settlement / Payout | தீர்வு / பட்டுவாடா | निपटान / भुगतान | సెటిల్‌మెంట్ / చెల్లింపు | സെറ്റിൽമെന്റ് / പേഔട്ട് | ಇತ್ಯರ್ಥ / ಪಾವತಿ | নিষ্পত্তি / পরিশোধ | सेटलमेंट / देयक | પતાવટ / ચુકવણી | ਨਿਪਟਾਰਾ / ਭੁਗਤਾਨ | ନିଷ୍ପତ୍ତି / ପ୍ରଦାନ | নিষ্পত্তি / প্ৰদান |
| Commission | கமிஷன் | कमीशन | కమిషన్ | കമ്മീഷൻ | ಕಮಿಷನ್ | কমিশন | कमिशन | કમિશન | ਕਮਿਸ਼ਨ | କମିଶନ୍ | কমিচন |
| Guest | விருந்தினர் | अतिथि | అతిథి | അതിഥി | ಅತಿಥಿ | অতিথি | पाहुणे | મહેમાન | ਮਹਿਮਾਨ | ଅତିଥି | অতিথি |
| Budget | பட்ஜெட் | बजट | బడ్జెట్ | ബജറ്റ് | ಬಜೆಟ್ | বাজেট | बजेट | બજેટ | ਬਜਟ | ବଜେଟ୍ | বাজেট |
| Sign In | உள்நுழை | साइन इन | సైన్ ఇన్ | സൈൻ ഇൻ | ಸೈನ್ ಇನ್ | সাইন ইন | साइन इन | સાઇન ઇન | ਸਾਈਨ ਇਨ | ସାଇନ୍ ଇନ୍ | ছাইন ইন |
| Sign Out | வெளியேறு | साइन आउट | సైన్ అవుట్ | സൈൻ ഔട്ട് | ಸೈನ್ ಔಟ್ | সাইন আউট | साइन आउट | સાઇન આઉટ | ਸਾਈਨ ਆਊਟ | ସାଇନ୍ ଆଉଟ୍ | ছাইন আউট |
| Create account / Register | கணக்கை உருவாக்கு | खाता बनाएँ | ఖాతా సృష్టించండి | അക്കൗണ്ട് സൃഷ്ടിക്കുക | ಖಾತೆ ರಚಿಸಿ | অ্যাকাউন্ট তৈরি করুন | खाते तयार करा | એકાઉન્ટ બનાવો | ਖਾਤਾ ਬਣਾਓ | ଆକାଉଣ୍ଟ ତିଆରି କରନ୍ତୁ | একাউণ্ট সৃষ্টি কৰক |
| Password | கடவுச்சொல் | पासवर्ड | పాస్‌వర్డ్ | പാസ്‌വേഡ് | ಪಾಸ್‌ವರ್ಡ್ | পাসওয়ার্ড | पासवर्ड | પાસવર્ડ | ਪਾਸਵਰਡ | ପାସୱାର୍ଡ | পাছৱৰ্ড |
| Email | மின்னஞ்சல் | ईमेल | ఇమెయిల్ | ഇമെയിൽ | ಇಮೇಲ್ | ইমেইল | ईमेल | ઈમેલ | ਈਮੇਲ | ଇମେଲ୍ | ইমেইল |
| Phone | தொலைபேசி | फ़ोन | ఫోన్ | ഫോൺ | ಫೋನ್ | ফোন | फोन | ફોન | ਫ਼ੋਨ | ଫୋନ୍ | ফোন |
| Verification code (OTP) | சரிபார்ப்புக் குறியீடு (OTP) | सत्यापन कोड (OTP) | ధృవీకరణ కోడ్ (OTP) | സ്ഥിരീകരണ കോഡ് (OTP) | ಪರಿಶೀಲನಾ ಕೋಡ್ (OTP) | যাচাইকরণ কোড (OTP) | पडताळणी कोड (OTP) | ચકાસણી કોડ (OTP) | ਪੁਸ਼ਟੀਕਰਨ ਕੋਡ (OTP) | ଯାଞ୍ଚ କୋଡ୍ (OTP) | সত্যাপন কোড (OTP) |
| Wishlist | விருப்பப் பட்டியல் | पसंदीदा सूची | ఇష్టమైన జాబితా | ഇഷ്ടപ്പട്ടിക | ಇಷ್ಟದ ಪಟ್ಟಿ | পছন্দের তালিকা | आवडीची यादी | મનપસંદ યાદી | ਪਸੰਦ ਸੂਚੀ | ପସନ୍ଦ ତାଲିକା | পছন্দৰ তালিকা |
| Marketplace | சந்தை | बाज़ार | మార్కెట్‌ప్లేస్ | മാർക്കറ്റ്‌പ്ലേസ് | ಮಾರುಕಟ್ಟೆ | মার্কেটপ্লেস | बाजारपेठ | માર્કેટપ્લેસ | ਬਾਜ਼ਾਰ | ମାର୍କେଟପ୍ଲେସ୍ | মাৰ্কেটপ্লেচ |
| Dashboard | டாஷ்போர்டு | डैशबोर्ड | డ్యాష్‌బోర్డ్ | ഡാഷ്‌ബോർഡ് | ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ | ড্যাশবোর্ড | डॅशबोर्ड | ડેશબોર્ડ | ਡੈਸ਼ਬੋਰਡ | ଡ୍ୟାସବୋର୍ଡ୍ | ডেছব’ৰ্ড |
| Settings | அமைப்புகள் | सेटिंग्स | సెట్టింగ్‌లు | ക്രമീകരണങ്ങൾ | ಸೆಟ್ಟಿಂಗ್‌ಗಳು | সেটিংস | सेटिंग्ज | સેટિંગ્સ | ਸੈਟਿੰਗਾਂ | ସେଟିଂସ୍ | ছেটিংছ |
| Cancel | ரத்து செய் | रद्द करें | రద్దు చేయండి | റദ്ദാക്കുക | ರದ್ದುಮಾಡಿ | বাতিল করুন | रद्द करा | રદ કરો | ਰੱਦ ਕਰੋ | ବାତିଲ୍ କରନ୍ତୁ | বাতিল কৰক |
| Save | சேமி | सहेजें | సేవ్ చేయండి | സേവ് ചെയ്യുക | ಉಳಿಸಿ | সংরক্ষণ করুন | जतन करा | સાચવો | ਸੰਭਾਲੋ | ସଞ୍ଚୟ କରନ୍ତୁ | সংৰক্ষণ কৰক |
| Delete | நீக்கு | हटाएँ | తొలగించండి | ഇല്ലാതാക്കുക | ಅಳಿಸಿ | মুছুন | हटवा | કાઢી નાખો | ਮਿਟਾਓ | ବିଲୋପ କରନ୍ତୁ | মচি পেলাওক |
| Submit | சமர்ப்பி | जमा करें | సమర్పించండి | സമർപ്പിക്കുക | ಸಲ್ಲಿಸಿ | জমা দিন | सबमिट करा | સબમિટ કરો | ਜਮ੍ਹਾਂ ਕਰੋ | ଦାଖଲ କରନ୍ତୁ | দাখিল কৰক |
| Search | தேடு | खोजें | శోధించండి | തിരയുക | ಹುಡುಕಿ | অনুসন্ধান করুন | शोधा | શોધો | ਖੋਜੋ | ଖୋଜନ୍ତୁ | সন্ধান কৰক |
| Confirmed | உறுதிசெய்யப்பட்டது | पुष्टि हो गई | నిర్ధారించబడింది | സ്ഥിരീകരിച്ചു | ದೃಢೀಕರಿಸಲಾಗಿದೆ | নিশ্চিত হয়েছে | निश्चित झाले | પુષ્ટિ થઈ | ਪੱਕਾ ਹੋ ਗਿਆ | ନିଶ୍ଚିତ ହୋଇଛି | নিশ্চিত হৈছে |
| Pending | நிலுவையில் | लंबित | పెండింగ్‌లో ఉంది | തീർപ്പാക്കാനുണ്ട് | ಬಾಕಿ ಇದೆ | অপেক্ষমাণ | प्रलंबित | બાકી | ਬਕਾਇਆ | ବାକି ଅଛି | বাকী আছে |
| Completed | முடிந்தது | पूर्ण हुआ | పూర్తయింది | പൂർത്തിയായി | ಪೂರ್ಣಗೊಂಡಿದೆ | সম্পন্ন হয়েছে | पूर्ण झाले | પૂર્ણ થયું | ਪੂਰਾ ਹੋ ਗਿਆ | ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି | সম্পূৰ্ণ হৈছে |
| Cancelled | ரத்து செய்யப்பட்டது | रद्द किया गया | రద్దు చేయబడింది | റദ്ദാക്കി | ರದ್ದುಗೊಂಡಿದೆ | বাতিল করা হয়েছে | रद्द केले | રદ થયું | ਰੱਦ ਕੀਤਾ ਗਿਆ | ବାତିଲ୍ ହୋଇଛି | বাতিল কৰা হৈছে |
| Refund | பணத்திருப்பம் | रिफंड | రీఫండ్ | റീഫണ്ട് | ಮರುಪಾವತಿ | ফেরত | परतावा | રિફંડ | ਰਿਫੰਡ | ଫେରସ୍ତ | ঘূৰাই দিয়া |
| Venue | அரங்கம் | स्थल | వేదిక | വേദി | ಸ್ಥಳ | ভেন্যু | स्थळ | સ્થળ | ਸਥਾਨ | ସ୍ଥାନ | স্থান |
| Catering | உணவு வழங்கல் | केटरिंग | క్యాటరింగ్ | കാറ്ററിംഗ് | ಕ್ಯಾಟರಿಂಗ್ | ক্যাটারিং | केटरिंग | કેટરિંગ | ਕੇਟਰਿੰਗ | କ୍ୟାଟେରିଂ | কেটাৰিং |
| Photography | புகைப்படம் | फ़ोटोग्राफ़ी | ఫోటోగ్రఫీ | ഫോട്ടോഗ്രഫി | ಛಾಯಾಗ್ರಹಣ | ফটোগ্রাফি | छायाचित्रण | ફોટોગ્રાફી | ਫੋਟੋਗ੍ਰਾਫ਼ੀ | ଫଟୋଗ୍ରାଫି | ফটোগ্ৰাফী |
| Decoration | அலங்காரம் | सजावट | అలంకరణ | അലങ്കാരം | ಅಲಂಕಾರ | সাজসজ্জা | सजावट | સજાવટ | ਸਜਾਵਟ | ସଜ୍ଜା | সজ্জা |
| Makeup | ஒப்பனை | मेकअप | మేకప్ | മേക്കപ്പ് | ಮೇಕಪ್ | মেকআপ | मेकअप | મેકઅપ | ਮੇਕਅੱਪ | ମେକଅପ୍ | মেকআপ |
| Invitation | அழைப்பிதழ் | निमंत्रण | ఆహ్వానం | ക്ഷണക്കത്ത് | ಆಹ್ವಾನ | আমন্ত্রণ | निमंत्रण | આમંત્રણ | ਸੱਦਾ | ନିମନ୍ତ୍ରଣ | নিমন্ত্ৰণ |
| Feedback | கருத்து | प्रतिक्रिया | అభిప్రాయం | അഭിപ്രായം | ಪ್ರತಿಕ್ರಿಯೆ | মতামত | अभिप्राय | પ્રતિભાવ | ਫੀਡਬੈਕ | ମତାମତ | মতামত |
| Review / Rating | மதிப்புரை / மதிப்பீடு | समीक्षा / रेटिंग | సమీక్ష / రేటింగ్ | അവലോകനം / റേറ്റിംഗ് | ವಿಮರ್ಶೆ / ರೇಟಿಂಗ್ | পর্যালোচনা / রেটিং | पुनरावलोकन / रेटिंग | સમીક્ષા / રેટિંગ | ਸਮੀਖਿਆ / ਰੇਟਿੰਗ | ସମୀକ୍ଷା / ରେଟିଂ | পৰ্যালোচনা / ৰেটিং |
| Admin | நிர்வாகி | एडमिन | అడ్మిన్ | അഡ്മിൻ | ಅಡ್ಮಿನ್ | অ্যাডমিন | अ‍ॅडमिन | એડમિન | ਐਡਮਿਨ | ଆଡମିନ୍ | এডমিন |

(Where a row above conflicts with a natural reading of the context, keep the row's WORD for consistency but adapt grammar/endings.)
