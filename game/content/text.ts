// Generated from ringside-mvps/promoter/index.html by scripts/extract-promoter.cjs. Edit the content here going forward.
import type { EndingDef, EndingKey } from '../types';

export const HEADLINES = {
  "win": ["{F} ROLLS ON: {O} outclassed on fight night","{F} TAKES CARE OF BUSINESS against {O}"],
  "ko": ["{F} DETONATES: {O} flattened in round {R}","KO OF THE YEAR? {F} stops {O} cold"],
  "loss": ["UPSET: {O} hands {F} a painful lesson","{F} EXPOSED? {O} takes the decision"],
  "kolost": ["DISASTER: {F} knocked out by {O} in round {R}","{O} STUNS THE ARENA with brutal stoppage of {F}"],
  "draw": ["CONTROVERSY: {F} and {O} fight to a draw"],
  "title": ["NEW CHAMPION! {F} claims the belt against {O}","CORONATION: {F} is champion of the world"],
  "flavour": ["Rival promoter Vale “not worried” about anything, says Vale","Ticket demand “encouraging”, says someone who sells tickets","Commission reviewing something, declines to say what","Fans demand bigger fights, cheaper beer, earlier walkouts"]
} as const;

export const LINES = {
  "dom": ["{F} lands a crisp right hand and {O} wobbles.","{F} walks {O} down and lands at will.","Big round for {F}. {O} is eating clean shots.","{F} doubles the jab and follows with a hook that lands flush.","{O} is on the ropes and {F} is teeing off."],
  "edge": ["{F} edges it with the cleaner work.","Close round. {F} probably nicked it with the jab.","{F} lands the better shots in a tight one.","Scrappy round, {F} finishing stronger."],
  "ledge": ["{O} edges it, busier down the stretch.","Close round, but {O} landed the eye-catching shot.","{O} nicks it. {F} needs to let his hands go.","{O} controls the distance and steals the round late."],
  "ldom": ["{O} is tagging {F} at will. Ugly round.","{F} is getting outworked badly here.","{O} lands a huge right hand and {F} is holding on.","{F} is backed up and {O} is piling it on."],
  "kdThem": ["DOWN GOES {O}! A huge shot from {F}!","{O} is on the canvas! The crowd are on their feet!"],
  "kdUs": ["{F} IS DOWN! The corner can’t believe it.","{F} hits the deck. Up at seven, legs wobbling."],
  "hurtUs": ["{F} is badly hurt. The corner are screaming."],
  "hurtThem": ["{O} is on unsteady legs. Finish him."],
  "koThem": ["IT’S OVER! {F} wins by knockout!"],
  "tkoThem": ["The referee has seen enough! {F} wins by TKO!"],
  "koUs": ["It’s over. {O} knocks {F} out cold."],
  "tkoUs": ["The referee waves it off. {O} wins by stoppage."],
  "towel": ["The towel comes in from the corner. {O} wins by TKO."]
} as const;

export const ENDINGS: Record<EndingKey, EndingDef> = {
  "cash_lo": {"title":"Bust","story":"The bailiffs took the ring. Your last fighter walked out carrying the bell under his arm. Nobody stopped him."},
  "cash_hi": {"title":"Sold out","story":"A hedge fund bought you out, renamed the company and put a logo on the canvas. You are on a yacht. Nobody calls."},
  "hype_lo": {"title":"Silence","story":"The last show drew 212 people and a dog. The dog left before the main event."},
  "hype_hi": {"title":"Circus","story":"The hype outgrew the sport. A crowd crush at a free weigh-in ended it. The commission pulled your licence that night."},
  "stable_lo": {"title":"Mutiny","story":"Every fighter you had signed with Tommy Vale on the same morning. He sent flowers."},
  "stable_hi": {"title":"Outgrown","story":"Your fighters are now bigger than you. They formed their own promotion and offered you a job in ticketing."},
  "rep_lo": {"title":"Licence revoked","story":"The commission read everything. All of it. You are banned from the sport for life."},
  "rep_hi": {"title":"Saint","story":"So respected that they made you commissioner. Commissioners cannot promote. The game is over, in a nice way."}
};
