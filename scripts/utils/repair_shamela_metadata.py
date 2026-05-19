from surrealdb import Surreal
import os

SURREAL_URL = "ws://192.168.100.33:8000/rpc"
SURREAL_USER = "root"
SURREAL_PASS = "RwAbXjBc2z36z"
SURREAL_NS = "openbayan"
SURREAL_DB = "openbayan"

books_metadata = {
    "shamela_أساس_البلاغة__الزمخشري__ت_عيون_السود__ط_العلمية_12_محمود_بن_عمر_بن_أحمد_الزمخشري_": {
        "title": "أساس البلاغة",
        "author": "الزمخشري",
        "type": "book",
        "language": "ar"
    },
    "shamela_البداية_والنهاية__ابن_كثير__ت_التركي__ط_دار_هجر_12_عماد_الدين_ابن_كثير": {
        "title": "البداية والنهاية",
        "author": "ابن كثير",
        "type": "book",
        "language": "ar"
    },
    "shamela_الصحاح_تاج_اللغة_وصحاح_العربية__الجوهري__ط_دار_الع_إسماعيل_بن_حماد_الجوهري_أبو_نص": {
        "title": "الصحاح تاج اللغة وصحاح العربية",
        "author": "الجوهري",
        "type": "book",
        "language": "ar"
    },
    "shamela_القاموس_المحيط__الفيروزآبادي__ط_الرسالة__ط8_غيرملو_محمد_بن_يعقوب_الفيروز_آبادي_مج": {
        "title": "القاموس المحيط",
        "author": "الفيروزآبادي",
        "type": "book",
        "language": "ar"
    },
    "shamela_المسند__أحمد_بن_حنبل__ت_الأرناؤوط__ط_الرسالة_150_أحمد_بن_حنبل": {
        "title": "المسند",
        "author": "أحمد بن حنبل",
        "type": "book",
        "language": "ar"
    },
    "shamela_المفردات_في_غريب_القرآن__الأصفهاني__ط_القلم_الراغب_الأصفهاني": {
        "title": "المفردات في غريب القرآن",
        "author": "الراغب الأصفهاني",
        "type": "book",
        "language": "ar"
    },
    "shamela_تفسير_القرآن_العظيم__ابن_كثير__ط_دار_طيبة__ط2_18_إسماعيل_بن_عمر_بن_كثير_القرشي_": {
        "title": "تفسير القرآن العظيم",
        "author": "ابن كثير",
        "type": "book",
        "language": "ar"
    },
    "shamela_سير_أعلام_النبلاء__الذهبي__ت_الأرناؤوط_وآخرون__ط_ا_محمد_بن_أحمد_بن_عثمان_الذهبي_ش": {
        "title": "سير أعلام النبلاء",
        "author": "الذهبي",
        "type": "book",
        "language": "ar"
    },
    "shamela_لسان_العرب__ابن_منظور__ط_دار_صادر_115_محمد_بن_مكرم_بن_منظور_الافريقي": {
        "title": "لسان العرب",
        "author": "ابن منظور",
        "type": "book",
        "language": "ar"
    },
    "shamela_معجم_مقاييس_اللغة__ابن_فارس__ت_هارون__ط_الفكر_16_أحمد_بن_فارس_بن_زكريا_أبو_الحس": {
        "title": "معجم مقاييس اللغة",
        "author": "ابن فارس",
        "type": "book",
        "language": "ar"
    },
    "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي": {
        "title": "ميزان الاعتدال في نقد الرجال",
        "author": "الذهبي",
        "type": "book",
        "language": "ar"
    }
}

def repair_sources():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for record_id, meta in books_metadata.items():
            print(f"Repairing source: {record_id}...")
            db.query("""
                UPSERT type::record('source', $id) SET
                    identifier = $id,
                    title = $title,
                    author = $author,
                    type = $type,
                    language = $lang,
                    created_at = time::now();
            """, {
                "id": record_id,
                "title": meta["title"],
                "author": meta["author"],
                "type": meta["type"],
                "lang": meta["language"]
            })
        print("Repair complete.")

if __name__ == "__main__":
    repair_sources()
