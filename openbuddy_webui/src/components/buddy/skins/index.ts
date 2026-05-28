import type { ComponentType } from "react";
import { RoyalCrownGear } from "./RoyalCrown";
import { ScholarGear } from "./Scholar";
import { NavigatorGear } from "./Navigator";
import { ToolsmithGear } from "./Toolsmith";
import { WarriorGear } from "./Warrior";
import { LibrarianGear } from "./Librarian";

export type SkinId =
  | "royal-crown"
  | "scholar"
  | "navigator"
  | "toolsmith"
  | "warrior"
  | "librarian";

export type SkinMeta = {
  id: SkinId;
  name: string;
  nickname: string;
  emoji: string;
  theme: string;
  color: string;
  bodyType: "base" | "act3" | "act4";
  Gear: ComponentType;
  tagline: string;
  intro: string;
  story: string;
};

export const SKINS: SkinMeta[] = [
  {
    id: "royal-crown",
    name: "Royal Crown",
    nickname: "皇冠小王子",
    emoji: "👑",
    theme: "gold",
    color: "#d4a02a",
    bodyType: "base",
    Gear: RoyalCrownGear,
    tagline: "善良与勇气的化身",
    intro:
      "你好呀！我是皇冠小王子，我最喜欢帮助朋友解决难题啦！有什么需要帮忙的，尽管跟我说吧~",
    story:
      "在糖果王国的城堡里，住着一位善良的小王子。他头戴闪闪发光的金色皇冠，手握权杖，最大的愿望就是让每个小伙伴都开开心心。每当有人遇到困难，他总是第一个跑去帮忙！",
  },
  {
    id: "scholar",
    name: "Scholar",
    nickname: "书卷小博士",
    emoji: "📚",
    theme: "violet",
    color: "#7a4ec4",
    bodyType: "base",
    Gear: ScholarGear,
    tagline: "知识就是超能力",
    intro:
      "嗨！我是书卷小博士，我读过好多好多书呢！从星星的秘密到海底的宝藏，问我什么都可以哦~",
    story:
      "小博士的房间里堆满了各种各样的书，从地板一直叠到天花板！他戴着紫色的博士帽，总是拿着一支魔法笔，随时准备记录新发现。据说他连做梦都在看书呢！",
  },
  {
    id: "navigator",
    name: "Navigator",
    nickname: "星图探险家",
    emoji: "🧭",
    theme: "blue",
    color: "#26408b",
    bodyType: "act3",
    Gear: NavigatorGear,
    tagline: "世界那么大，一起去看看",
    intro:
      "嘿！我是星图探险家，我去过好多神奇的地方！跟我一起去冒险吧，保证每天都有新发现！",
    story:
      "探险家随身带着一个古老的罗盘和一张神奇的星图。他走过高山、穿过大海，收集了无数奇妙的故事。每当夜幕降临，他就在星空下规划下一次冒险旅程。",
  },
  {
    id: "toolsmith",
    name: "Toolsmith",
    nickname: "齿轮小工匠",
    emoji: "🔧",
    theme: "blue",
    color: "#26408b",
    bodyType: "act3",
    Gear: ToolsmithGear,
    tagline: "没有修不好的东西",
    intro:
      "哈喽！我是齿轮小工匠，没有我修不好的东西！不管是坏掉的玩具还是奇怪的机关，交给我就对啦~",
    story:
      "小工匠的工作台上摆满了各种工具和零件。他能把一堆乱七八糟的齿轮和螺丝，组装成全世界最酷的发明。他的梦想是——造一座能飞上天的城堡！",
  },
  {
    id: "warrior",
    name: "Warrior",
    nickname: "烈焰小勇士",
    emoji: "⚔️",
    theme: "red",
    color: "#a8341f",
    bodyType: "act4",
    Gear: WarriorGear,
    tagline: "保护朋友，绝不退缩",
    intro:
      "哟！我是烈焰小勇士，正义的火焰在我心中燃烧！有我在，谁也别想欺负你！",
    story:
      "小勇士背着一把火焰剑，披着红色的战斗披风。别看他个子小，勇气可是一点都不少！他的信条是：保护朋友，绝不退缩！每次冒险，他总是冲在最前面。",
  },
  {
    id: "librarian",
    name: "Librarian",
    nickname: "故事守护者",
    emoji: "📖",
    theme: "taupe",
    color: "#4a4640",
    bodyType: "base",
    Gear: LibrarianGear,
    tagline: "每个故事都值得被记住",
    intro:
      "嘘……你好呀~我是故事守护者，我守护着世界上最珍贵的故事。想听一个吗？",
    story:
      "在一个安静的角落里，守护者照看着一座巨大的故事图书馆。每一本书里都住着一个活生生的故事，他的任务就是确保这些美好的故事永远不会被遗忘。",
  },
];

export function getSkin(id: SkinId): SkinMeta {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
