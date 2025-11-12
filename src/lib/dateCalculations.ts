import { differenceInDays, addDays, addMonths, addYears, isSameDay, startOfDay } from "date-fns";

export interface Anniversary {
  id: string;
  title: string;
  date: Date;
  daysUntil: number;
  isPast: boolean;
  icon?: string;
}

export const calculateAnniversaries = (
  metDate: Date,
  togetherDate: Date
): Anniversary[] => {
  const today = startOfDay(new Date());
  const anniversaries: Anniversary[] = [];

  // 计算从在一起日期开始的各种纪念日
  const milestones = [
    { days: 30, title: "在一起 1 个月" },
    { days: 100, title: "在一起 100 天" },
    { days: 200, title: "在一起 200 天" },
    { days: 300, title: "在一起 300 天" },
    { days: 365, title: "在一起 1 周年" },
    { days: 500, title: "在一起 500 天" },
    { days: 730, title: "在一起 2 周年" },
    { days: 1000, title: "在一起 1000 天" },
    { days: 1095, title: "在一起 3 周年" },
  ];

  milestones.forEach((milestone) => {
    const anniversaryDate = addDays(togetherDate, milestone.days);
    const daysUntil = differenceInDays(anniversaryDate, today);
    
    anniversaries.push({
      id: `milestone-${milestone.days}`,
      title: milestone.title,
      date: anniversaryDate,
      daysUntil,
      isPast: daysUntil < 0,
    });
  });

  // 计算每年的情人节、圣诞节等节日
  const currentYear = new Date().getFullYear();
  const festivals = [
    { month: 1, day: 14, title: "情人节" },
    { month: 4, day: 1, title: "愚人节" },
    { month: 4, day: 5, title: "清明节（约）" },
    { month: 5, day: 20, title: "520表白日" },
    { month: 6, day: 10, title: "端午节（约）" },
    { month: 7, day: 7, title: "七夕节" },
    { month: 8, day: 15, title: "中秋节（约）" },
    { month: 9, day: 9, title: "重阳节" },
    { month: 11, day: 11, title: "光棍节" },
    { month: 11, day: 24, title: "感恩节（约）" },
    { month: 11, day: 25, title: "圣诞节" },
    { month: 11, day: 31, title: "跨年夜" },
  ];

  for (let year = currentYear; year <= currentYear + 1; year++) {
    festivals.forEach((festival) => {
      const festivalDate = new Date(year, festival.month - 1, festival.day);
      const daysUntil = differenceInDays(festivalDate, today);
      
      if (daysUntil >= -7) { // 显示过去7天内和未来的节日
        anniversaries.push({
          id: `festival-${year}-${festival.month}-${festival.day}`,
          title: festival.title,
          date: festivalDate,
          daysUntil,
          isPast: daysUntil < 0,
        });
      }
    });
  }

  // 计算每年的相识纪念日和在一起纪念日
  for (let i = 0; i <= 5; i++) {
    const metAnniversary = addYears(metDate, i);
    const togetherAnniversary = addYears(togetherDate, i);
    
    const daysUntilMet = differenceInDays(metAnniversary, today);
    const daysUntilTogether = differenceInDays(togetherAnniversary, today);

    if (i > 0 && daysUntilMet >= -7) {
      anniversaries.push({
        id: `met-${i}`,
        title: `相识 ${i} 周年`,
        date: metAnniversary,
        daysUntil: daysUntilMet,
        isPast: daysUntilMet < 0,
      });
    }

    if (i > 0 && daysUntilTogether >= -7) {
      anniversaries.push({
        id: `together-${i}`,
        title: `在一起 ${i} 周年`,
        date: togetherAnniversary,
        daysUntil: daysUntilTogether,
        isPast: daysUntilTogether < 0,
      });
    }
  }

  // 按日期排序
  return anniversaries.sort((a, b) => {
    // 未来的日期按升序，过去的日期按降序
    if (a.isPast && b.isPast) {
      return b.daysUntil - a.daysUntil;
    }
    if (!a.isPast && !b.isPast) {
      return a.daysUntil - b.daysUntil;
    }
    return a.isPast ? 1 : -1;
  });
};

export const getDaysTogether = (togetherDate: Date): number => {
  return differenceInDays(new Date(), togetherDate);
};
