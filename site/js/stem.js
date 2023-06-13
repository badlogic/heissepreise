/* by Joder Illi, Snowball mailing list */
function stem(word) {
    /*
    Put u and y between vowels into upper case
    */
    word = word.replace(/([aeiouyäöü])u([aeiouyäöü])/g, "$1U$2");
    word = word.replace(/([aeiouyäöü])y([aeiouyäöü])/g, "$1Y$2");

    /*
    and then do the following mappings,
    (a) replace ß with ss,
    (a) replace ae with ä, Not doing these,
    have trouble with diphtongs
    (a) replace oe with ö, Not doing these,
    have trouble with diphtongs
    (a) replace ue with ü unless preceded by q. Not doing these,
    have trouble with diphtongs
    So in quelle, ue is not mapped to ü because it follows q, and in
    feuer it is not mapped because the first part of the rule changes it to
    feUer, so the u is not found.
    */
    word = word.replace(/ß/g, "ss");
    //word = word.replace(/ae/g, 'ä');
    //word = word.replace(/oe/g, 'ö');
    //word = word.replace(/([^q])ue/g, '$1ü');

    /*
    R1 and R2 are first set up in the standard way (see the note on R1
    and R2), but then R1 is adjusted so that the region before it contains at
    least 3 letters.
    R1 is the region after the first non-vowel following a vowel, or is
    the null region at the end of the word if there is no such non-vowel.
    R2 is the region after the first non-vowel following a vowel in R1,
    or is the null region at the end of the word if there is no such non-vowel.
    */

    var r1Index = word.search(/[aeiouyäöü][^aeiouyäöü]/);
    var r1 = "";
    if (r1Index != -1) {
        r1Index += 2;
        r1 = word.substring(r1Index);
    }

    var r2Index = -1;
    var r2 = "";

    if (r1Index != -1) {
        var r2Index = r1.search(/[aeiouyäöü][^aeiouyäöü]/);
        if (r2Index != -1) {
            r2Index += 2;
            r2 = r1.substring(r2Index);
            r2Index += r1Index;
        } else {
            r2 = "";
        }
    }

    if (r1Index != -1 && r1Index < 3) {
        r1Index = 3;
        r1 = word.substring(r1Index);
    }

    /*
    Define a valid s-ending as one of b, d, f, g, h, k, l, m, n, r or t.
    Define a valid st-ending as the same list, excluding letter r.
    */

    /*
    Do each of steps 1, 2 and 3.
    */

    /*
    Step 1:
    Search for the longest among the following suffixes,
    (a) em ern er
    (b) e en es
    (c) s (preceded by a valid s-ending)
    */
    var a1Index = word.search(/(em|ern|er)$/g);
    var b1Index = word.search(/(e|en|es)$/g);
    var c1Index = word.search(/([bdfghklmnrt]s)$/g);
    if (c1Index != -1) {
        c1Index++;
    }
    var index1 = 10000;
    var optionUsed1 = "";
    if (a1Index != -1 && a1Index < index1) {
        optionUsed1 = "a";
        index1 = a1Index;
    }
    if (b1Index != -1 && b1Index < index1) {
        optionUsed1 = "b";
        index1 = b1Index;
    }
    if (c1Index != -1 && c1Index < index1) {
        optionUsed1 = "c";
        index1 = c1Index;
    }

    /*
    and delete if in R1. (Of course the letter of the valid s-ending is
    not necessarily in R1.) If an ending of group (b) is deleted, and the ending
    is preceded by niss, delete the final s.
    (For example, äckern -> äck, ackers -> acker, armes -> arm,
    bedürfnissen -> bedürfnis)
    */

    if (index1 != 10000 && r1Index != -1) {
        if (index1 >= r1Index) {
            word = word.substring(0, index1);
            if (optionUsed1 == "b") {
                if (word.search(/niss$/) != -1) {
                    word = word.substring(0, word.length - 1);
                }
            }
        }
    }
    /*
    Step 2:
    Search for the longest among the following suffixes,
    (a) en er est
    (b) st (preceded by a valid st-ending, itself preceded by at least 3
    letters)
    */

    var a2Index = word.search(/(en|er|est)$/g);
    var b2Index = word.search(/(.{3}[bdfghklmnt]st)$/g);
    if (b2Index != -1) {
        b2Index += 4;
    }

    var index2 = 10000;
    var optionUsed2 = "";
    if (a2Index != -1 && a2Index < index2) {
        optionUsed2 = "a";
        index2 = a2Index;
    }
    if (b2Index != -1 && b2Index < index2) {
        optionUsed2 = "b";
        index2 = b2Index;
    }

    /*
    and delete if in R1.
    (For example, derbsten -> derbst by step 1, and derbst -> derb by
    step 2, since b is a valid st-ending, and is preceded by just 3 letters)
    */

    if (index2 != 10000 && r1Index != -1) {
        if (index2 >= r1Index) {
            word = word.substring(0, index2);
        }
    }

    /*
    Step 3: d-suffixes (*)
    Search for the longest among the following suffixes, and perform the
    action indicated.
    end ung
    delete if in R2
    if preceded by ig, delete if in R2 and not preceded by e
    ig ik isch
    delete if in R2 and not preceded by e
    lich heit
    delete if in R2
    if preceded by er or en, delete if in R1
    keit
    delete if in R2
    if preceded by lich or ig, delete if in R2
    */

    var a3Index = word.search(/(end|ung)$/g);
    var b3Index = word.search(/[^e](ig|ik|isch)$/g);
    var c3Index = word.search(/(lich|heit)$/g);
    var d3Index = word.search(/(keit)$/g);
    if (b3Index != -1) {
        b3Index++;
    }

    var index3 = 10000;
    var optionUsed3 = "";
    if (a3Index != -1 && a3Index < index3) {
        optionUsed3 = "a";
        index3 = a3Index;
    }
    if (b3Index != -1 && b3Index < index3) {
        optionUsed3 = "b";
        index3 = b3Index;
    }
    if (c3Index != -1 && c3Index < index3) {
        optionUsed3 = "c";
        index3 = c3Index;
    }
    if (d3Index != -1 && d3Index < index3) {
        optionUsed3 = "d";
        index3 = d3Index;
    }

    if (index3 != 10000 && r2Index != -1) {
        if (index3 >= r2Index) {
            word = word.substring(0, index3);
            var optionIndex = -1;
            var optionSubsrt = "";
            if (optionUsed3 == "a") {
                optionIndex = word.search(/[^e](ig)$/);
                if (optionIndex != -1) {
                    optionIndex++;
                    if (optionIndex >= r2Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == "c") {
                optionIndex = word.search(/(er|en)$/);
                if (optionIndex != -1) {
                    if (optionIndex >= r1Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == "d") {
                optionIndex = word.search(/(lich|ig)$/);
                if (optionIndex != -1) {
                    if (optionIndex >= r2Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            }
        }
    }

    /*
    Finally,
    turn U and Y back into lower case, and remove the umlaut accent from
    a, o and u.
    */
    word = word.replace(/U/g, "u");
    word = word.replace(/Y/g, "y");
    word = word.replace(/ä/g, "a");
    word = word.replace(/ö/g, "o");
    word = word.replace(/ü/g, "u");

    return word;
}
exports.stem = stem;

exports.stopWords = [
    "ab",
    "aber",
    "alle",
    "allein",
    "allem",
    "allen",
    "aller",
    "allerdings",
    "allerlei",
    "alles",
    "allmählich",
    "allzu",
    "als",
    "alsbald",
    "also",
    "am",
    "an",
    "and",
    "ander",
    "andere",
    "anderem",
    "anderen",
    "anderer",
    "andererseits",
    "anderes",
    "anderm",
    "andern",
    "andernfalls",
    "anders",
    "anstatt",
    "auch",
    "auf",
    "aus",
    "ausgenommen",
    "ausser",
    "ausserdem",
    "außer",
    "außerdem",
    "außerhalb",
    "bald",
    "bei",
    "beide",
    "beiden",
    "beiderlei",
    "beides",
    "beim",
    "beinahe",
    "bereits",
    "besonders",
    "besser",
    "beträchtlich",
    "bevor",
    "bezüglich",
    "bin",
    "bis",
    "bisher",
    "bislang",
    "bist",
    "bloß",
    "bsp.",
    "bzw",
    "ca",
    "ca.",
    "content",
    "da",
    "dabei",
    "dadurch",
    "dafür",
    "dagegen",
    "daher",
    "dahin",
    "damals",
    "damit",
    "danach",
    "daneben",
    "dann",
    "daran",
    "darauf",
    "daraus",
    "darin",
    "darum",
    "darunter",
    "darüber",
    "darüberhinaus",
    "das",
    "dass",
    "dasselbe",
    "davon",
    "davor",
    "dazu",
    "daß",
    "dein",
    "deine",
    "deinem",
    "deinen",
    "deiner",
    "deines",
    "dem",
    "demnach",
    "demselben",
    "den",
    "denen",
    "denn",
    "dennoch",
    "denselben",
    "der",
    "derart",
    "derartig",
    "derem",
    "deren",
    "derer",
    "derjenige",
    "derjenigen",
    "derselbe",
    "derselben",
    "derzeit",
    "des",
    "deshalb",
    "desselben",
    "dessen",
    "desto",
    "deswegen",
    "dich",
    "die",
    "diejenige",
    "dies",
    "diese",
    "dieselbe",
    "dieselben",
    "diesem",
    "diesen",
    "dieser",
    "dieses",
    "diesseits",
    "dir",
    "direkt",
    "direkte",
    "direkten",
    "direkter",
    "doch",
    "dort",
    "dorther",
    "dorthin",
    "drauf",
    "drin",
    "drunter",
    "drüber",
    "du",
    "dunklen",
    "durch",
    "durchaus",
    "eben",
    "ebenfalls",
    "ebenso",
    "eher",
    "eigenen",
    "eigenes",
    "eigentlich",
    "ein",
    "eine",
    "einem",
    "einen",
    "einer",
    "einerseits",
    "eines",
    "einfach",
    "einführen",
    "einführte",
    "einführten",
    "eingesetzt",
    "einig",
    "einige",
    "einigem",
    "einigen",
    "einiger",
    "einigermaßen",
    "einiges",
    "einmal",
    "eins",
    "einseitig",
    "einseitige",
    "einseitigen",
    "einseitiger",
    "einst",
    "einstmals",
    "einzig",
    "entsprechend",
    "entweder",
    "er",
    "erst",
    "es",
    "etc",
    "etliche",
    "etwa",
    "etwas",
    "euch",
    "euer",
    "eure",
    "eurem",
    "euren",
    "eurer",
    "eures",
    "falls",
    "fast",
    "ferner",
    "folgende",
    "folgenden",
    "folgender",
    "folgendes",
    "folglich",
    "fuer",
    "für",
    "gab",
    "ganze",
    "ganzem",
    "ganzen",
    "ganzer",
    "ganzes",
    "gar",
    "gegen",
    "gemäss",
    "ggf",
    "gleich",
    "gleichwohl",
    "gleichzeitig",
    "glücklicherweise",
    "gänzlich",
    "hab",
    "habe",
    "haben",
    "haette",
    "hast",
    "hat",
    "hatte",
    "hatten",
    "hattest",
    "hattet",
    "heraus",
    "herein",
    "hier",
    "hier",
    "hinter",
    "hiermit",
    "hiesige",
    "hin",
    "hinein",
    "hinten",
    "hinter",
    "hinterher",
    "http",
    "hätt",
    "hätte",
    "hätten",
    "höchstens",
    "ich",
    "igitt",
    "ihm",
    "ihn",
    "ihnen",
    "ihr",
    "ihre",
    "ihrem",
    "ihren",
    "ihrer",
    "ihres",
    "im",
    "immer",
    "immerhin",
    "in",
    "indem",
    "indessen",
    "infolge",
    "innen",
    "innerhalb",
    "ins",
    "insofern",
    "inzwischen",
    "irgend",
    "irgendeine",
    "irgendwas",
    "irgendwen",
    "irgendwer",
    "irgendwie",
    "irgendwo",
    "ist",
    "ja",
    "je",
    "jed",
    "jede",
    "jedem",
    "jeden",
    "jedenfalls",
    "jeder",
    "jederlei",
    "jedes",
    "jedoch",
    "jemand",
    "jene",
    "jenem",
    "jenen",
    "jener",
    "jenes",
    "jenseits",
    "jetzt",
    "jährig",
    "jährige",
    "jährigen",
    "jähriges",
    "kam",
    "kann",
    "kannst",
    "kaum",
    "kein",
    "keine",
    "keinem",
    "keinen",
    "keiner",
    "keinerlei",
    "keines",
    "keineswegs",
    "klar",
    "klare",
    "klaren",
    "klares",
    "klein",
    "kleinen",
    "kleiner",
    "kleines",
    "koennen",
    "koennt",
    "koennte",
    "koennten",
    "komme",
    "kommen",
    "kommt",
    "konkret",
    "konkrete",
    "konkreten",
    "konkreter",
    "konkretes",
    "können",
    "könnt",
    "künftig",
    "leider",
    "machen",
    "man",
    "manche",
    "manchem",
    "manchen",
    "mancher",
    "mancherorts",
    "manches",
    "manchmal",
    "mehr",
    "mehrere",
    "mein",
    "meine",
    "meinem",
    "meinen",
    "meiner",
    "meines",
    "mich",
    "mir",
    "mit",
    "mithin",
    "muessen",
    "muesst",
    "muesste",
    "muss",
    "musst",
    "musste",
    "mussten",
    "muß",
    "mußt",
    "müssen",
    "müsste",
    "müssten",
    "müßt",
    "müßte",
    "nach",
    "nachdem",
    "nachher",
    "nachhinein",
    "nahm",
    "natürlich",
    "neben",
    "nebenan",
    "nehmen",
    "nein",
    "nicht",
    "nichts",
    "nie",
    "niemals",
    "niemand",
    "nirgends",
    "nirgendwo",
    "noch",
    "nun",
    "nur",
    "nächste",
    "nämlich",
    "nötigenfalls",
    "ob",
    "oben",
    "oberhalb",
    "obgleich",
    "obschon",
    "obwohl",
    "oder",
    "oft",
    "per",
    "plötzlich",
    "schließlich",
    "schon",
    "sehr",
    "sehrwohl",
    "seid",
    "sein",
    "seine",
    "seinem",
    "seinen",
    "seiner",
    "seines",
    "seit",
    "seitdem",
    "seither",
    "selber",
    "selbst",
    "sich",
    "sicher",
    "sicherlich",
    "sie",
    "sind",
    "so",
    "sobald",
    "sodass",
    "sofort",
    "sofern",
    "sog",
    "sogar",
    "solange",
    "solch",
    "solche",
    "solchem",
    "solchen",
    "solcher",
    "solches",
    "soll",
    "sollen",
    "sollst",
    "sollt",
    "sollte",
    "sollten",
    "somit",
    "sondern",
    "sonst",
    "sonstige",
    "sonstigen",
    "sonstiger",
    "sonstiges",
    "sooft",
    "soviel",
    "soweit",
    "sowie",
    "sowieso",
    "sowohl",
    "später",
    "statt",
    "stattfinden",
    "stattfand",
    "stattgefunden",
    "steht",
    "stets",
    "such",
    "suche",
    "suchen",
    "tatsächlich",
    "tatsächlichen",
    "tatsächlicher",
    "tatsächliches",
    "tatsächlich",
    "tatsächlichen",
    "tatsächlicher",
    "tatsächliches",
    "tief",
    "tiefer",
    "trotz",
    "trotzdem",
    "tun",
    "über",
    "überall",
    "überallhin",
    "überdies",
    "überhaupt",
    "übrig",
    "übrigens",
    "um",
    "umso",
    "umsoweniger",
    "unbedingt",
    "und",
    "unmöglich",
    "unnötig",
    "unser",
    "unsere",
    "unserem",
    "unseren",
    "unserer",
    "unseres",
    "unserseits",
    "unter",
    "unterhalb",
    "unterhalb",
    "untereinander",
    "untergebracht",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterschiedlich",
    "unterschiedliche",
    "unterschiedlichen",
    "unterschiedlicher",
    "unterschiedliches",
    "unterschiedlich",
    "unterschiedliche",
    "unterschiedlichen",
    "unterschiedlicher",
    "unterschiedliches",
    "unzwar",
    "usw",
    "usw.",
    "vermag",
    "vermögen",
    "vermutlich",
    "verrate",
    "verraten",
    "verrätst",
    "verschieden",
    "verschiedene",
    "verschiedenen",
    "verschiedener",
    "verschiedenes",
    "versorgen",
    "versorgt",
    "versorgte",
    "versorgten",
    "viel",
    "viele",
    "vielem",
    "vielen",
    "vieler",
    "vieles",
    "vielleicht",
    "vielmals",
    "vier",
    "vierte",
    "viertel",
    "vierten",
    "vierter",
    "viertes",
    "vom",
    "von",
    "vor",
    "vorbei",
    "vorgestern",
    "vorher",
    "vorüber",
    "wach",
    "wachen",
    "wahrend",
    "wann",
    "war",
    "warauf",
    "ward",
    "waren",
    "warst",
    "wart",
    "warum",
    "was",
    "weder",
    "weil",
    "weiter",
    "weitere",
    "weiterem",
    "weiteren",
    "weiterer",
    "weiteres",
    "weiterhin",
    "weitgehend",
    "welche",
    "welchem",
    "welchen",
    "welcher",
    "welches",
    "wem",
    "wen",
    "wenig",
    "wenige",
    "wenigem",
    "wenigen",
    "weniger",
    "wenigstens",
    "wenn",
    "wenngleich",
    "wer",
    "werde",
    "werden",
    "werdet",
    "weshalb",
    "wessen",
    "wichtig",
    "wie",
    "wieder",
    "wiederum",
    "wieso",
    "will",
    "willst",
    "wir",
    "wird",
    "wirklich",
    "wirst",
    "wissen",
    "wo",
    "woanders",
    "wohl",
    "woher",
    "wohin",
    "wohingegen",
    "wohl",
    "wohlweislich",
    "wollen",
    "wollt",
    "wollte",
    "wollten",
    "womit",
    "woraufhin",
    "woraus",
    "woraussichtlich",
    "worauf",
    "woraus",
    "worin",
    "worüber",
    "wovon",
    "wovor",
    "wozu",
    "während",
    "währenddessen",
    "wär",
    "wäre",
    "wären",
    "wärst",
    "wäre",
    "wären",
    "wärst",
    "würde",
    "würden",
    "würdest",
    "würdet",
    "zB",
    "z.b.",
    "zehn",
    "zeigen",
    "zeitweise",
    "zu",
    "zufolge",
    "zugleich",
    "zuletzt",
    "zum",
    "zumal",
    "zumeist",
    "zunächst",
    "zur",
    "zurück",
    "zurückgehend",
    "zurückgehen",
    "zurückgegangen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgezogen",
    "zusammen",
    "zusätzlich",
    "zusammen",
    "zuvor",
    "zuviel",
    "zuweilen",
    "zwanzig",
    "zwar",
    "zwei",
    "zweite",
    "zweiten",
    "zweiter",
    "zweites",
    "zwischen",
    "zwischendurch",
    "zwölf",
    "überall",
    "überallhin",
    "überdies",
    "überhaupt",
    "übrig",
    "übrigens",
];
