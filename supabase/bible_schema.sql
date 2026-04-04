-- =============================================
-- BIBLE TABLES AND DATA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Bible Books Table
CREATE TABLE IF NOT EXISTS bible_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_short TEXT NOT NULL,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  chapter_count INTEGER NOT NULL,
  sort_order INTEGER NOT NULL UNIQUE
);

-- 2. Bible Verses Table (stores both KJV and Tagalog)
CREATE TABLE IF NOT EXISTS bible_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES bible_books(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text_kjv TEXT NOT NULL,
  text_tagalog TEXT,
  UNIQUE(book_id, chapter, verse)
);

-- 3. Favorites Table (users can save favorite verses)
CREATE TABLE IF NOT EXISTS bible_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES bible_verses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verse_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bible_verses_book_chapter ON bible_verses(book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_bible_verses_search ON bible_verses USING gin(to_tsvector('english', text_kjv));
CREATE INDEX IF NOT EXISTS idx_bible_favorites_user ON bible_favorites(user_id);

-- Enable RLS
ALTER TABLE bible_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_favorites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Everyone can read Bible data
DROP POLICY IF EXISTS "Anyone can read bible books" ON bible_books;
CREATE POLICY "Anyone can read bible books"
  ON bible_books FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read bible verses" ON bible_verses;
CREATE POLICY "Anyone can read bible verses"
  ON bible_verses FOR SELECT USING (true);

-- Users can manage their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON bible_favorites;
CREATE POLICY "Users can view own favorites"
  ON bible_favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON bible_favorites;
CREATE POLICY "Users can add favorites"
  ON bible_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON bible_favorites;
CREATE POLICY "Users can delete own favorites"
  ON bible_favorites FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA: Bible Books (66 books)
-- =============================================
INSERT INTO bible_books (id, name, name_short, testament, chapter_count, sort_order) VALUES
  -- Old Testament (39 books)
  ('11111111-1111-1111-1111-111111111001', 'Genesis', 'Gen', 'OT', 50, 1),
  ('11111111-1111-1111-1111-111111111002', 'Exodus', 'Exo', 'OT', 40, 2),
  ('11111111-1111-1111-1111-111111111003', 'Leviticus', 'Lev', 'OT', 27, 3),
  ('11111111-1111-1111-1111-111111111004', 'Numbers', 'Num', 'OT', 36, 4),
  ('11111111-1111-1111-1111-111111111005', 'Deuteronomy', 'Deu', 'OT', 34, 5),
  ('11111111-1111-1111-1111-111111111006', 'Joshua', 'Jos', 'OT', 24, 6),
  ('11111111-1111-1111-1111-111111111007', 'Judges', 'Jdg', 'OT', 21, 7),
  ('11111111-1111-1111-1111-111111111008', 'Ruth', 'Rut', 'OT', 4, 8),
  ('11111111-1111-1111-1111-111111111009', '1 Samuel', '1Sa', 'OT', 31, 9),
  ('11111111-1111-1111-1111-111111111010', '2 Samuel', '2Sa', 'OT', 24, 10),
  ('11111111-1111-1111-1111-111111111011', '1 Kings', '1Ki', 'OT', 22, 11),
  ('11111111-1111-1111-1111-111111111012', '2 Kings', '2Ki', 'OT', 25, 12),
  ('11111111-1111-1111-1111-111111111013', '1 Chronicles', '1Ch', 'OT', 29, 13),
  ('11111111-1111-1111-1111-111111111014', '2 Chronicles', '2Ch', 'OT', 36, 14),
  ('11111111-1111-1111-1111-111111111015', 'Ezra', 'Ezr', 'OT', 10, 15),
  ('11111111-1111-1111-1111-111111111016', 'Nehemiah', 'Neh', 'OT', 13, 16),
  ('11111111-1111-1111-1111-111111111017', 'Esther', 'Est', 'OT', 10, 17),
  ('11111111-1111-1111-1111-111111111018', 'Job', 'Job', 'OT', 42, 18),
  ('11111111-1111-1111-1111-111111111019', 'Psalms', 'Psa', 'OT', 150, 19),
  ('11111111-1111-1111-1111-111111111020', 'Proverbs', 'Pro', 'OT', 31, 20),
  ('11111111-1111-1111-1111-111111111021', 'Ecclesiastes', 'Ecc', 'OT', 12, 21),
  ('11111111-1111-1111-1111-111111111022', 'Song of Solomon', 'Sol', 'OT', 8, 22),
  ('11111111-1111-1111-1111-111111111023', 'Isaiah', 'Isa', 'OT', 66, 23),
  ('11111111-1111-1111-1111-111111111024', 'Jeremiah', 'Jer', 'OT', 52, 24),
  ('11111111-1111-1111-1111-111111111025', 'Lamentations', 'Lam', 'OT', 5, 25),
  ('11111111-1111-1111-1111-111111111026', 'Ezekiel', 'Eze', 'OT', 48, 26),
  ('11111111-1111-1111-1111-111111111027', 'Daniel', 'Dan', 'OT', 12, 27),
  ('11111111-1111-1111-1111-111111111028', 'Hosea', 'Hos', 'OT', 14, 28),
  ('11111111-1111-1111-1111-111111111029', 'Joel', 'Joe', 'OT', 3, 29),
  ('11111111-1111-1111-1111-111111111030', 'Amos', 'Amo', 'OT', 9, 30),
  ('11111111-1111-1111-1111-111111111031', 'Obadiah', 'Oba', 'OT', 1, 31),
  ('11111111-1111-1111-1111-111111111032', 'Jonah', 'Jon', 'OT', 4, 32),
  ('11111111-1111-1111-1111-111111111033', 'Micah', 'Mic', 'OT', 7, 33),
  ('11111111-1111-1111-1111-111111111034', 'Nahum', 'Nah', 'OT', 3, 34),
  ('11111111-1111-1111-1111-111111111035', 'Habakkuk', 'Hab', 'OT', 3, 35),
  ('11111111-1111-1111-1111-111111111036', 'Zephaniah', 'Zep', 'OT', 3, 36),
  ('11111111-1111-1111-1111-111111111037', 'Haggai', 'Hag', 'OT', 2, 37),
  ('11111111-1111-1111-1111-111111111038', 'Zechariah', 'Zec', 'OT', 14, 38),
  ('11111111-1111-1111-1111-111111111039', 'Malachi', 'Mal', 'OT', 4, 39),
  -- New Testament (27 books)
  ('11111111-1111-1111-1111-111111111040', 'Matthew', 'Mat', 'NT', 28, 40),
  ('11111111-1111-1111-1111-111111111041', 'Mark', 'Mar', 'NT', 16, 41),
  ('11111111-1111-1111-1111-111111111042', 'Luke', 'Luk', 'NT', 24, 42),
  ('11111111-1111-1111-1111-111111111043', 'John', 'Joh', 'NT', 21, 43),
  ('11111111-1111-1111-1111-111111111044', 'Acts', 'Act', 'NT', 28, 44),
  ('11111111-1111-1111-1111-111111111045', 'Romans', 'Rom', 'NT', 16, 45),
  ('11111111-1111-1111-1111-111111111046', '1 Corinthians', '1Co', 'NT', 16, 46),
  ('11111111-1111-1111-1111-111111111047', '2 Corinthians', '2Co', 'NT', 13, 47),
  ('11111111-1111-1111-1111-111111111048', 'Galatians', 'Gal', 'NT', 6, 48),
  ('11111111-1111-1111-1111-111111111049', 'Ephesians', 'Eph', 'NT', 6, 49),
  ('11111111-1111-1111-1111-111111111050', 'Philippians', 'Phi', 'NT', 4, 50),
  ('11111111-1111-1111-1111-111111111051', 'Colossians', 'Col', 'NT', 4, 51),
  ('11111111-1111-1111-1111-111111111052', '1 Thessalonians', '1Th', 'NT', 5, 52),
  ('11111111-1111-1111-1111-111111111053', '2 Thessalonians', '2Th', 'NT', 3, 53),
  ('11111111-1111-1111-1111-111111111054', '1 Timothy', '1Ti', 'NT', 6, 54),
  ('11111111-1111-1111-1111-111111111055', '2 Timothy', '2Ti', 'NT', 4, 55),
  ('11111111-1111-1111-1111-111111111056', 'Titus', 'Tit', 'NT', 3, 56),
  ('11111111-1111-1111-1111-111111111057', 'Philemon', 'Phm', 'NT', 1, 57),
  ('11111111-1111-1111-1111-111111111058', 'Hebrews', 'Heb', 'NT', 13, 58),
  ('11111111-1111-1111-1111-111111111059', 'James', 'Jam', 'NT', 5, 59),
  ('11111111-1111-1111-1111-111111111060', '1 Peter', '1Pe', 'NT', 5, 60),
  ('11111111-1111-1111-1111-111111111061', '2 Peter', '2Pe', 'NT', 3, 61),
  ('11111111-1111-1111-1111-111111111062', '1 John', '1Jo', 'NT', 5, 62),
  ('11111111-1111-1111-1111-111111111063', '2 John', '2Jo', 'NT', 1, 63),
  ('11111111-1111-1111-1111-111111111064', '3 John', '3Jo', 'NT', 1, 64),
  ('11111111-1111-1111-1111-111111111065', 'Jude', 'Jud', 'NT', 1, 65),
  ('11111111-1111-1111-1111-111111111066', 'Revelation', 'Rev', 'NT', 22, 66)
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE DATA: John 3 (popular chapter for testing)
-- =============================================
INSERT INTO bible_verses (book_id, chapter, verse, text_kjv, text_tagalog) VALUES
  ('11111111-1111-1111-1111-111111111043', 3, 1, 'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:', 'May isang lalaki sa mga Pariseo, na nagngangalang Nicodemo, na puno ng mga Judio:'),
  ('11111111-1111-1111-1111-111111111043', 3, 2, 'The same came to Jesus by night, and said unto him, Rabbi, we know that thou art a teacher come from God: for no man can do these miracles that thou doest, except God be with him.', 'Ang lalaking ito ay dumating kay Jesus sa gabi, at sinabi sa kanya, Rabbi, alam namin na ikaw ay isang guro na nanggagaling sa Dios: sapagkat walang taong makagagawa ng mga himalang iyong ginagawa, maliban na ang Dios ay kasama niya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 3, 'Jesus answered and said unto him, Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God.', 'Sumagot si Jesus at sinabi sa kanya, Katotohanan, katotohanan, ay sinasabi ko sa iyo, Maliban na isang tao ay ipanganap muli, hindi niya makikita ang kaharian ng Dios.'),
  ('11111111-1111-1111-1111-111111111043', 3, 4, 'Nicodemus saith unto him, How can a man be born when he is old? can he enter the second time into his mother''s womb, and be born?', 'Sinabi ni Nicodemo sa kanya, Paano makapanganap ang isang tao nang siya ay matanda na? makapasok pa baga siya sa ikalawang pagkakataon sa sinapupunan ng kanyang ina, at ipanganap?'),
  ('11111111-1111-1111-1111-111111111043', 3, 5, 'Jesus answered, Verily, verily, I say unto thee, Except a man be born of water and of the Spirit, he cannot enter into the kingdom of God.', 'Sumagot si Jesus, Katotohanan, katotohanan, ay sinasabi ko sa iyo, Maliban na isang tao ay ipanganap ng tubig at ng Espiritu, hindi siya makapasok sa kaharian ng Dios.'),
  ('11111111-1111-1111-1111-111111111043', 3, 6, 'That which is born of the flesh is flesh; and that which is born of the Spirit is spirit.', 'Ang ipinanganak ng laman ay laman; at ang ipinanganak ng Espiritu ay espiritu.'),
  ('11111111-1111-1111-1111-111111111043', 3, 7, 'Marvel not that I said unto thee, Ye must be born again.', 'Huwag magtaka na sinabi ko sa iyo, Kailangan ninyong ipanganap muli.'),
  ('11111111-1111-1111-1111-111111111043', 3, 8, 'The wind bloweth where it listeth, and thou hearest the sound thereof, but canst not tell whence it cometh, and whither it goeth: so is every one that is born of the Spirit.', 'Ang hangin ay humihip kung saan ibig, at naririnig mo ang tunog niya, ngunit hindi mo malaman kung saan siya nanggagaling, at saan siya napupunta: gayon ang bawa''t ipinanganak ng Espiritu.'),
  ('11111111-1111-1111-1111-111111111043', 3, 9, 'Nicodemus answered and said unto him, How can these things be?', 'Sumagot si Nicodemo at sinabi sa kanya, Paano mangyayari ang mga bagay na ito?'),
  ('11111111-1111-1111-1111-111111111043', 3, 10, 'Jesus answered and said unto him, Art thou a master of Israel, and knowest not these things?', 'Sumagot si Jesus at sinabi sa kanya, Ikaw ba ay isang guro ng Israel, at hindi mo alam ang mga bagay na ito?'),
  ('11111111-1111-1111-1111-111111111043', 3, 11, 'Verily, verily, I say unto thee, We speak that we do know; and testify that we have seen; and ye receive not our witness.', 'Katotohanan, katotohanan, ay sinasabi ko sa iyo, Nagsasalita kami ng aming alam; at pinatutunayan namin ang aming nakita; at hindi ninyo tinatanggap ang aming patotoo.'),
  ('11111111-1111-1111-1111-111111111043', 3, 12, 'If I have told you earthly things, and ye believe not, how shall ye believe, if I tell you of heavenly things?', 'Kung sinabi ko sa inyo ang mga bagay na lupa, at hindi ninyo pinaniwalaan, paano ninyo mananampalataya, kung sabihin ko sa inyo ang mga bagay na langit?'),
  ('11111111-1111-1111-1111-111111111043', 3, 13, 'And no man hath ascended up to heaven, but he that came down from heaven, even the Son of man which is in heaven.', 'At walang taong nakaakyat sa langit, kundi siya na nanggaling sa langit, ang Anak ng tao na nasa langit.'),
  ('11111111-1111-1111-1111-111111111043', 3, 14, 'And as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up:', 'At gaya ni Moises na nagtaas ng ahas sa ilang, gayon dapat na itaas ang Anak ng tao:'),
  ('11111111-1111-1111-1111-111111111043', 3, 15, 'That whosoever believeth in him should not perish, but have eternal life.', 'Upang ang sinomang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan.'),
  ('11111111-1111-1111-1111-111111111043', 3, 16, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', 'Sapagka''t gayon na lamang ang pag-ibig ng Dios sa sanlibutan, na ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinomang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan.'),
  ('11111111-1111-1111-1111-111111111043', 3, 17, 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', 'Sapagka''t hindi sinugo ng Dios ang kanyang Anak sa sanlibutan upang hatulan ang sanlibutan; kundi upang iligtas ang sanlibutan sa pamamagitan niya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 18, 'He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God.', 'Ang sumampalataya sa kanya ay hindi hinahatulan: ngunit ang hindi sumampalataya ay hinahatulan na, sapagka''t hindi siya sumampalataya sa pangalan ng kaisa-isang Anak ng Dios.'),
  ('11111111-1111-1111-1111-111111111043', 3, 19, 'And this is the condemnation, that light is come into the world, and men loved darkness rather than light, because their deeds were evil.', 'At ito ang hatol, na ang liwanag ay napasa sanlibutan, at mas ibinigay ng mga tao ang kadiliman kay sa liwanag, sapagka''t ang kanilang mga gawa ay masama.'),
  ('11111111-1111-1111-1111-111111111043', 3, 20, 'For every one that doeth evil hateth the light, neither cometh to the light, lest his deeds should be reproved.', 'Sapagka''t ang bawa''t gumagawa ng masama ay ayaw sa liwanag, at hindi napapasa liwanag, baka ang kanyang mga gawa ay mapahiya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 21, 'But he that doeth truth cometh to the light, that his deeds may be made manifest, that they are wrought in God.', 'Ngunit ang gumagawa ng katotohanan ay napapasa liwanag, upang ang kanyang mga gawa ay mahayag, na sila ay ginawa sa Dios.'),
  ('11111111-1111-1111-1111-111111111043', 3, 22, 'After these things came Jesus and his disciples into the land of Judaea; and there he tarried with them, and baptized.', 'Pagkatapos ng mga bagay na ito ay napasa lupain ng Judea si Jesus at ang kanyang mga alagad; at doon siya nanatili sa kanila, at nagbinyag.'),
  ('11111111-1111-1111-1111-111111111043', 3, 23, 'And John also was baptizing in Aenon near to Salim, because there was much water there: and they came, and were baptized.', 'At si Juan ay nagbinyag din sa Aenon malapit sa Salim, sapagka''t doon ay maraming tubig: at sila ay naparoon, at nagbinyag.'),
  ('11111111-1111-1111-1111-111111111043', 3, 24, 'For John was not yet cast into prison.', 'Sapagka''t si Juan ay hindi pa nakabilanggo.'),
  ('11111111-1111-1111-1111-111111111043', 3, 25, 'Then there arose a question between some of John''s disciples and the Jews about purifying.', 'Kaya''t may nagkaroon ng pagtatalo sa ilang mga alagad ni Juan at sa mga Judio tungkol sa paglilinis.'),
  ('11111111-1111-1111-1111-111111111043', 3, 26, 'And they came unto John, and said unto him, Rabbi, he that was with thee beyond Jordan, to whom thou barest witness, behold, the same baptizeth, and all men come to him.', 'At sila ay naparoon kay Juan, at sinabi sa kanya, Rabbi, siya na kasama mo sa kabilang ibaba ng Jordan, na iyong pinatotohanan, narito, siya ay nagbinyag, at lahat ng tao ay napapasa kanya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 27, 'John answered and said, A man can receive nothing, except it be given him from heaven.', 'Sumagot si Juan at sinabi, Walang taong makatanggap ng anoman, maliban na ito ay ibinigay sa kanya mula sa langit.'),
  ('11111111-1111-1111-1111-111111111043', 3, 28, 'Ye yourselves bear me witness, that I said, I am not the Christ, but that I am sent before him.', 'Kayo mismo ay mga saksi ninyo, na aking sinabi, Hindi ako ang Cristo, kundi ako ay sinugo bago niya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 29, 'He that hath the bride is the bridegroom: but the friend of the bridegroom, which standeth and heareth him, rejoiceth greatly because of the bridegroom''s voice: this my joy therefore is fulfilled.', 'Siya na may asawa ay ang asawa: ngunit ang kaibigan ng asawa, na nakatayo at nakikinig sa kanya, ay lubos na natutuwa dahil sa tinig ng asawa: ito ang aking kagalakan ay natupad.'),
  ('11111111-1111-1111-1111-111111111043', 3, 30, 'He must increase, but I must decrease.', 'Dapat siyang lalong dumami, ngunit ako ay lalong kumonti.'),
  ('11111111-1111-1111-1111-111111111043', 3, 31, 'He that cometh from above is above all: he that is of the earth is earthly, and speaketh of the earth: he that cometh from heaven is above all.', 'Siya na nanggagaling sa taas ay nasa lahat: siya na mula sa lupa ay lupa, at nagsasalita ng lupa: siya na nanggagaling sa langit ay nasa lahat.'),
  ('11111111-1111-1111-1111-111111111043', 3, 32, 'And what he hath seen and heard, that he testifieth; and no man receiveth his testimony.', 'At ang kanyang nakita at narinig, iyon ang kanyang pinatutunayan; at walang taong tumatanggap ng kanyang patotoo.'),
  ('11111111-1111-1111-1111-111111111043', 3, 33, 'He that hath received his testimony hath set to his seal that God is true.', 'Siya na tumanggap ng kanyang patotoo ay naglagay ng kanyang tatak na ang Dios ay tunay.'),
  ('11111111-1111-1111-1111-111111111043', 3, 34, 'For he whom God hath sent speaketh the words of God: for God giveth not the Spirit by measure unto him.', 'Sapagka''t siya na sinugo ng Dios ay nagsasalita ng mga salita ng Dios: sapagka''t hindi bigay ng Dios ang Espiritu na may sukat sa kanya.'),
  ('11111111-1111-1111-1111-111111111043', 3, 35, 'The Father loveth the Son, and hath given all things into his hand.', 'Iniibig ng Ama ang Anak, at ibinigay sa kanya ang lahat ng mga bagay sa kanyang kamay.'),
  ('11111111-1111-1111-1111-111111111043', 3, 36, 'He that believeth on the Son hath everlasting life: and he that believeth not the Son shall not see life; but the wrath of God abideth on him.', 'Ang sumampalataya sa Anak ay magkaroon ng buhay na walang hanggan: at ang hindi sumampalataya sa Anak ay hindi makakakita ng buhay; ngunit ang galit ng Dios ay nananatili sa kanya.')
ON CONFLICT DO NOTHING;
