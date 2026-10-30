/**
 * Local icon entry points. Keep interface glyphs in Phosphor and fantasy
 * vocabulary in Game Icons; both libraries render inline SVG and work offline.
 */
export {
  ArrowsClockwise,
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  CalendarBlank,
  Camera,
  CaretDown,
  Check,
  DotsThree,
  Eye,
  EyeSlash,
  Gear,
  List,
  MagnifyingGlass,
  Minus,
  PencilSimple,
  Plus,
  UploadSimple,
  User,
  Warning,
  WifiSlash,
  X,
} from "@phosphor-icons/react";

// Keep only the named symbols used by the shell and common controls. The
// generated Game Icons catalogue is intentionally not imported here; screens
// that need the full picker load it from their own lazy boundary.
export {
  GiArmorVest,
  GiBackpack,
  GiBed,
  GiBoots,
  GiCoffeeCup,
  GiCrossedSwords,
  GiD4,
  GiD10,
  GiD12,
  GiDiceEightFacesEight,
  GiDiceSixFacesSix,
  GiDiceTwentyFacesTwenty,
  GiHeartPlus,
  GiMagicSwirl,
  GiPerson,
  GiScrollUnfurled,
  GiShield,
  GiSkills,
  GiSkullCrossedBones,
  GiSpellBook,
} from "./known-game-icons";
